"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Row, ScrapeEvent } from "@/lib/types"

interface Props {
  onDataReady: (rows: Row[]) => void
}

export function ScraperPanel({ onDataReady }: Props) {
  const [jsessionid, setJsessionid] = useState("")
  const [startId, setStartId] = useState("1001")
  const [endId, setEndId] = useState("5774")
  const [batchSize, setBatchSize] = useState("10")
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processed, setProcessed] = useState(0)
  const [found, setFound] = useState(0)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const rowsRef = useRef<Row[]>([])

  const stop = useCallback(() => {
    readerRef.current?.cancel()
    readerRef.current = null
    setRunning(false)
    setStatus("idle")
  }, [])

  const start = useCallback(async () => {
    if (!jsessionid.trim()) {
      setErrorMsg("Podaj JSESSIONID")
      setStatus("error")
      return
    }

    rowsRef.current = []
    setRunning(true)
    setStatus("running")
    setErrorMsg("")
    setProgress(0)
    setProcessed(0)
    setFound(0)

    const params = new URLSearchParams({
      jsessionid: jsessionid.trim(),
      startId,
      endId,
      batchSize,
    })

    try {
      const res = await fetch(`/api/scrape?${params}`)
      if (!res.body) throw new Error("Brak body w odpowiedzi")

      const reader = res.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data:")) continue
          const json = line.slice(5).trim()
          if (!json) continue

          const event: ScrapeEvent = JSON.parse(json)

          if (event.type === "data" && event.row) {
            rowsRef.current.push(event.row)
          } else if (event.type === "progress") {
            const p = event.processed ?? 0
            const t = event.total ?? 1
            setProcessed(p)
            setFound(event.found ?? 0)
            setTotal(t)
            setProgress(Math.round((p / t) * 100))
          } else if (event.type === "done") {
            setProcessed(event.processed ?? 0)
            setFound(event.found ?? 0)
            setTotal(event.total ?? 0)
            setProgress(100)
            setStatus("done")
            setRunning(false)
            onDataReady([...rowsRef.current])
          } else if (event.type === "error") {
            setErrorMsg(event.message ?? "Nieznany błąd")
            setStatus("error")
            setRunning(false)
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setErrorMsg(err instanceof Error ? err.message : "Błąd połączenia")
      setStatus("error")
      setRunning(false)
    }
  }, [jsessionid, startId, endId, batchSize, onDataReady])

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konfiguracja scrapera</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="jsessionid">JSESSIONID</Label>
            <Input
              id="jsessionid"
              type="password"
              placeholder="0E57F930343E1619705995CBCFD99EC5"
              value={jsessionid}
              onChange={(e) => setJsessionid(e.target.value)}
              disabled={running}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Otwórz wu.wsiz.edu.pl w przeglądarce → DevTools → Application → Cookies → JSESSIONID
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startId">ID od</Label>
              <Input
                id="startId"
                type="number"
                value={startId}
                onChange={(e) => setStartId(e.target.value)}
                disabled={running}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endId">ID do</Label>
              <Input
                id="endId"
                type="number"
                value={endId}
                onChange={(e) => setEndId(e.target.value)}
                disabled={running}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="batchSize">Batch</Label>
              <Input
                id="batchSize"
                type="number"
                min="1"
                max="20"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                disabled={running}
              />
            </div>
          </div>

          {running ? (
            <Button variant="destructive" onClick={stop} className="w-full">
              Zatrzymaj
            </Button>
          ) : (
            <Button onClick={start} className="w-full" disabled={!jsessionid.trim()}>
              Rozpocznij scrapowanie
            </Button>
          )}
        </CardContent>
      </Card>

      {status !== "idle" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Status
              {status === "running" && <Badge variant="secondary">W toku</Badge>}
              {status === "done" && <Badge className="bg-green-600 text-white">Gotowe</Badge>}
              {status === "error" && <Badge variant="destructive">Błąd</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(status === "running" || status === "done") && (
              <>
                <Progress value={progress} />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border bg-muted/40 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Przetworzono</div>
                    <div className="font-semibold text-sm">{processed.toLocaleString("pl-PL")} / {total.toLocaleString("pl-PL")}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/40 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Znaleziono</div>
                    <div className="font-semibold text-sm">{found.toLocaleString("pl-PL")}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/40 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Postęp</div>
                    <div className="font-semibold text-sm">{progress}%</div>
                  </div>
                </div>
              </>
            )}
            {status === "error" && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
            {status === "done" && (
              <p className="text-sm text-muted-foreground">
                Pobrano {found.toLocaleString("pl-PL")} pracowników. Przejdź do zakładki <strong>Plan</strong>.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
