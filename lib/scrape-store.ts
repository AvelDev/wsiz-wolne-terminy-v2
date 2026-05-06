import type { Row, SavedScrape } from "@/lib/types"

const KEY = "wsiz_scrapes"

export function loadScrapes(): SavedScrape[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

export function saveScrape(rows: Row[]): SavedScrape {
  const scrape: SavedScrape = {
    id: Date.now().toString(),
    createdAt: Date.now(),
    rows,
  }
  const existing = loadScrapes()
  try {
    localStorage.setItem(KEY, JSON.stringify([scrape, ...existing]))
  } catch {
    // quota exceeded — keep only 2 oldest besides the new one
    localStorage.setItem(KEY, JSON.stringify([scrape, ...existing.slice(0, 2)]))
  }
  return scrape
}

export function deleteScrape(id: string): SavedScrape[] {
  const updated = loadScrapes().filter((s) => s.id !== id)
  localStorage.setItem(KEY, JSON.stringify(updated))
  return updated
}

export function fmtScrapeLabel(scrape: SavedScrape): string {
  const d = new Date(scrape.createdAt)
  const date = d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })
  const time = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
  return `${date}, ${time} — ${scrape.rows.length.toLocaleString("pl-PL")} rek.`
}
