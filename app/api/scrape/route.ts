import { NextRequest } from "next/server"
import type { Row, ScrapeEvent } from "@/lib/types"

const URL_TEMPLATE = "https://wu.wsiz.edu.pl/wsiz-wu-app/ledge/view/REST/profil-dydaktyka/osoba/{id}"

interface WsizZajecie {
  nazwaPrzedmiotu?: string
  formaZajec?: string
  nrKatalogowy?: string
  sala?: { nazwaSali?: string; nazwaBudynku?: string }
  poczatek?: string
  koniec?: string
}

interface WsizPerson {
  idOsoby?: number
  imie?: string
  nazwisko?: string
  stopienNaukowy?: string
  nazwaJednostki?: { translations?: { pl_PL?: string } }
  skroconaNazwaJednostki?: string
  zajecia?: WsizZajecie[]
}

function parsePersonToRows(json: WsizPerson): Row[] {
  const jednostka = json.nazwaJednostki?.translations?.pl_PL ?? ""
  const base: Omit<Row, "nazwaPrzedmiotu" | "formaZajec" | "nrKatalogowy" | "sala" | "budynek" | "poczatek" | "koniec"> = {
    idOsoby: String(json.idOsoby ?? ""),
    imie: json.imie ?? "",
    nazwisko: json.nazwisko ?? "",
    stopienNaukowy: json.stopienNaukowy ?? "",
    jednostka,
    skroconaNazwaJednostki: json.skroconaNazwaJednostki ?? "",
    ilosc_zajec: String(json.zajecia?.length ?? 0),
  }

  const zajecia = json.zajecia ?? []
  if (!zajecia.length) return [base as Row]

  return zajecia.map((z) => ({
    ...base,
    nazwaPrzedmiotu: z.nazwaPrzedmiotu ?? "",
    formaZajec: z.formaZajec ?? "",
    nrKatalogowy: z.nrKatalogowy ?? "",
    sala: z.sala?.nazwaSali ?? "",
    budynek: z.sala?.nazwaBudynku ?? "",
    poczatek: z.poczatek ?? "",
    koniec: z.koniec ?? "",
  }))
}

async function fetchPerson(id: number, jsessionid: string): Promise<WsizPerson | null> {
  const url = URL_TEMPLATE.replace("{id}", String(id))
  try {
    const res = await fetch(url, {
      headers: {
        Cookie: `JSESSIONID=${jsessionid}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        Referer: "https://wu.wsiz.edu.pl/wsiz-wu-app/student/zaliczenia",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 200) return res.json() as Promise<WsizPerson>
    if (res.status === 404) return null
    if ([302, 401, 403].includes(res.status)) {
      throw new Error(`SESSION_EXPIRED:${res.status}`)
    }
    return null
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("SESSION_EXPIRED")) throw err
    return null
  }
}

function encode(event: ScrapeEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const jsessionid = params.get("jsessionid") ?? ""
  const startId = parseInt(params.get("startId") ?? "1001")
  const endId = parseInt(params.get("endId") ?? "5774")
  const batchSize = Math.min(parseInt(params.get("batchSize") ?? "10"), 20)

  if (!jsessionid) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Brak JSESSIONID" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    )
  }

  const total = endId - startId + 1
  const ids = Array.from({ length: total }, (_, i) => startId + i)

  const stream = new ReadableStream({
    async start(controller) {
      let processed = 0
      let found = 0
      let sessionExpired = false

      for (let i = 0; i < ids.length; i += batchSize) {
        if (sessionExpired) break
        const batch = ids.slice(i, i + batchSize)

        const results = await Promise.allSettled(
          batch.map((id) => fetchPerson(id, jsessionid))
        )

        for (let j = 0; j < results.length; j++) {
          const result = results[j]
          const id = batch[j]
          processed++

          if (result.status === "rejected") {
            const msg = result.reason instanceof Error ? result.reason.message : ""
            if (msg.startsWith("SESSION_EXPIRED")) {
              sessionExpired = true
              controller.enqueue(encode({
                type: "error",
                message: "Sesja wygasła — odśwież JSESSIONID w przeglądarce i spróbuj ponownie.",
              }))
              break
            }
            controller.enqueue(encode({ type: "progress", id, processed, found, total }))
            continue
          }

          const json = result.value
          if (json) {
            found++
            const rows = parsePersonToRows(json)
            for (const row of rows) {
              controller.enqueue(encode({ type: "data", row }))
            }
          }

          controller.enqueue(encode({ type: "progress", id, processed, found, total }))
        }

        if (sessionExpired) break
      }

      if (!sessionExpired) {
        controller.enqueue(encode({ type: "done", processed, found, total }))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
