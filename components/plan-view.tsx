"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { Row } from "@/lib/types"

interface Props {
  rows: Row[]
}

const ALL = "__all__"

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  return new Date(num)
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("pl-PL", { weekday: "short", day: "2-digit", month: "2-digit" })
}

function fmtDateInput(d: Date) {
  return d.toLocaleDateString("sv-SE")
}

function downloadCSV(rows: Row[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0]) as (keyof Row)[]
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const v = String(row[h] ?? "")
          return v.includes(",") || v.includes("\n") || v.includes('"')
            ? `"${v.replace(/"/g, '""')}"`
            : v
        })
        .join(",")
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "wsiz_plan.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export function PlanView({ rows }: Props) {
  const [search, setSearch] = useState("")
  const [room, setRoom] = useState(ALL)
  const [unit, setUnit] = useState(ALL)
  const [degree, setDegree] = useState(ALL)
  const [minClasses, setMinClasses] = useState(0)
  const [viewMode, setViewMode] = useState<"calendar" | "rows" | "person">("calendar")
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const first = rows.find((r) => toDate(r.poczatek))
    return startOfWeek(first ? toDate(first.poczatek)! : new Date())
  })

  const { units, degrees, rooms } = useMemo(() => {
    const u = new Set<string>()
    const d = new Set<string>()
    const r = new Set<string>()
    for (const row of rows) {
      if (row.jednostka) u.add(row.jednostka)
      if (row.stopienNaukowy) d.add(row.stopienNaukowy)
      if (row.sala || row.budynek) {
        r.add(`${row.sala || "Brak sali"}${row.budynek ? ` · ${row.budynek}` : ""}`)
      }
    }
    return { units: [...u].sort(), degrees: [...d].sort(), rooms: [...r].sort() }
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((row) => {
      if (unit !== ALL && row.jednostka !== unit) return false
      if (degree !== ALL && row.stopienNaukowy !== degree) return false
      if (Number(row.ilosc_zajec || 0) < minClasses) return false
      if (room !== ALL) {
        const label = `${row.sala || "Brak sali"}${row.budynek ? ` · ${row.budynek}` : ""}`
        if (label !== room) return false
      }
      if (!q) return true
      const hay = [
        row.imie, row.nazwisko, row.stopienNaukowy, row.jednostka,
        row.skroconaNazwaJednostki, row.nazwaPrzedmiotu, row.formaZajec,
        row.nrKatalogowy, row.sala, row.budynek,
      ].filter(Boolean).join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, room, unit, degree, minClasses])

  const stats = useMemo(() => {
    const people = new Set(filtered.map((r) => r.idOsoby)).size
    const classes = filtered.filter((r) => r.nazwaPrzedmiotu || r.formaZajec).length
    return { total: filtered.length, people, classes }
  }, [filtered])

  const resetFilters = useCallback(() => {
    setSearch("")
    setRoom(ALL)
    setUnit(ALL)
    setDegree(ALL)
    setMinClasses(0)
    setViewMode("calendar")
  }, [])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    }), [weekStart])

  const weekEvents = useMemo(() => {
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
    return filtered
      .map((row) => {
        const start = toDate(row.poczatek)
        const end = toDate(row.koniec)
        if (!start || !end) return null
        if (start < weekStart || start >= weekEnd) return null
        return { ...row, start, end }
      })
      .filter(Boolean)
      .sort((a, b) => a!.start.getTime() - b!.start.getTime()) as (Row & { start: Date; end: Date })[]
  }, [filtered, weekStart])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, (Row & { start: Date; end: Date })[]>()
    for (const ev of weekEvents) {
      const key = fmtDateInput(ev.start)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [weekEvents])

  const personRows = useMemo(() => {
    const map = new Map<string, Row & { zajeciaList: string[] }>()
    for (const row of filtered) {
      const id = row.idOsoby
      if (!map.has(id)) {
        map.set(id, { ...row, zajeciaList: [] })
      }
      if (row.nazwaPrzedmiotu || row.formaZajec) {
        map.get(id)!.zajeciaList.push(
          `${row.nazwaPrzedmiotu || ""} (${row.formaZajec || ""}) ${row.sala || ""}`.trim()
        )
      }
    }
    return [...map.values()]
  }, [filtered])

  if (!rows.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Brak danych — uruchom scraper w zakładce Scraper.
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r bg-background flex flex-col overflow-auto">
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Rekordy", value: stats.total },
              { label: "Osoby", value: stats.people },
              { label: "Zajęcia", value: stats.classes },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border bg-muted/40 px-2 py-2">
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="text-sm font-semibold">{value.toLocaleString("pl-PL")}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="search" className="text-xs">Szukaj</Label>
            <Input
              id="search"
              placeholder="Imię, nazwisko, przedmiot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Sala</Label>
            <Select value={room} onValueChange={(v) => setRoom(v ?? ALL)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Wszystkie sale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Wszystkie sale</SelectItem>
                {rooms.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Jednostka</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v ?? ALL)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Wszystkie</SelectItem>
                  {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stopień</Label>
              <Select value={degree} onValueChange={(v) => setDegree(v ?? ALL)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Wszystkie</SelectItem>
                  {degrees.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="minClasses" className="text-xs">Min. liczba zajęć</Label>
            <Input
              id="minClasses"
              type="number"
              min="0"
              value={minClasses}
              onChange={(e) => setMinClasses(Number(e.target.value))}
              className="text-sm h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Widok</Label>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Kalendarz</SelectItem>
                <SelectItem value="rows">Wiersze</SelectItem>
                <SelectItem value="person">Po osobie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={resetFilters}>Resetuj</Button>
            <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => downloadCSV(filtered)}>
              Pobierz CSV
            </Button>
          </div>

          {/* Sidebar event list for calendar mode */}
          {viewMode === "calendar" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Zajęcia w tygodniu</p>
              {weekEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Brak zajęć w tym tygodniu.</p>
              ) : weekEvents.slice(0, 30).map((ev, i) => (
                <div key={i} className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
                  <div className="font-semibold text-foreground">{ev.nazwaPrzedmiotu || "Zajęcia"}</div>
                  <div className="text-muted-foreground">{fmtDate(ev.start)} · {fmtTime(ev.start)} – {fmtTime(ev.end)}</div>
                  <div className="text-muted-foreground">{ev.sala || "Brak sali"}{ev.budynek ? ` · ${ev.budynek}` : ""}</div>
                  {(ev.imie || ev.nazwisko) && <div className="text-muted-foreground">{ev.imie} {ev.nazwisko}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-auto">
        {viewMode === "calendar" && (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b bg-background sticky top-0 z-10">
              <div>
                <h2 className="text-sm font-semibold">Kalendarz sal</h2>
                <p className="text-xs text-muted-foreground">
                  {weekStart.toLocaleDateString("pl-PL")} –{" "}
                  {(() => { const e = new Date(weekStart); e.setDate(e.getDate() + 6); return e.toLocaleDateString("pl-PL") })()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return startOfWeek(d) })}>
                  ← Poprzedni
                </Button>
                <input
                  type="date"
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  value={fmtDateInput(weekStart)}
                  onChange={(e) => { if (e.target.value) setWeekStart(startOfWeek(new Date(e.target.value))) }}
                />
                <Button variant="outline" size="sm" onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return startOfWeek(d) })}>
                  Następny →
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="grid grid-cols-7 gap-3 min-w-[980px]">
                {weekDays.map((day) => {
                  const key = fmtDateInput(day)
                  const dayEvents = eventsByDay.get(key) ?? []
                  const byRoom = new Map<string, typeof dayEvents>()
                  for (const ev of dayEvents) {
                    const label = `${ev.sala || "Brak sali"}${ev.budynek ? ` · ${ev.budynek}` : ""}`
                    if (!byRoom.has(label)) byRoom.set(label, [])
                    byRoom.get(label)!.push(ev)
                  }
                  return (
                    <div key={key} className="rounded-xl border bg-card p-3 min-h-[220px]">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">{fmtDate(day)}</div>
                      {dayEvents.length === 0 ? (
                        <div className="text-xs text-muted-foreground/60">Brak zajęć</div>
                      ) : (
                        [...byRoom.entries()].map(([label, evs]) => (
                          <div key={label} className="mb-3 rounded-lg border border-dashed border-indigo-200 bg-slate-50 dark:bg-slate-900 p-2">
                            <div className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 mb-1">{label}</div>
                            {evs.map((ev, i) => (
                              <div key={i} className="mb-2 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950 p-2 text-xs">
                                <div className="font-semibold text-indigo-900 dark:text-indigo-200">
                                  {fmtTime(ev.start)} – {fmtTime(ev.end)}
                                </div>
                                <div>{ev.nazwaPrzedmiotu || "Zajęcia"} ({ev.formaZajec || ""})</div>
                                {(ev.imie || ev.nazwisko) && (
                                  <div className="text-muted-foreground">{ev.imie} {ev.nazwisko}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {viewMode === "rows" && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="overflow-auto rounded-xl border max-h-full">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {["ID", "Imię", "Nazwisko", "Stopień", "Jednostka", "Skrót", "Zajęć", "Przedmiot", "Forma", "Sala", "Budynek", "Od", "Do"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground border-b whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 2000).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="px-3 py-1.5">{row.idOsoby}</td>
                      <td className="px-3 py-1.5">{row.imie}</td>
                      <td className="px-3 py-1.5">{row.nazwisko}</td>
                      <td className="px-3 py-1.5">{row.stopienNaukowy}</td>
                      <td className="px-3 py-1.5 max-w-[120px] truncate">{row.jednostka}</td>
                      <td className="px-3 py-1.5">{row.skroconaNazwaJednostki}</td>
                      <td className="px-3 py-1.5 text-center">{row.ilosc_zajec}</td>
                      <td className="px-3 py-1.5 max-w-[160px] truncate">{row.nazwaPrzedmiotu}</td>
                      <td className="px-3 py-1.5">{row.formaZajec}</td>
                      <td className="px-3 py-1.5">{row.sala}</td>
                      <td className="px-3 py-1.5">{row.budynek}</td>
                      <td className="px-3 py-1.5 font-mono">{toDate(row.poczatek)?.toLocaleString("pl-PL") ?? ""}</td>
                      <td className="px-3 py-1.5 font-mono">{toDate(row.koniec)?.toLocaleString("pl-PL") ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 2000 && (
                <div className="px-4 py-2 text-xs text-muted-foreground">
                  Pokazano 2000 z {filtered.length.toLocaleString("pl-PL")} rekordów. Pobierz CSV aby zobaczyć wszystkie.
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === "person" && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="overflow-auto rounded-xl border max-h-full">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {["ID", "Imię", "Nazwisko", "Stopień", "Jednostka", "Skrót", "Zajęć", "Zajęcia"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground border-b whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {personRows.slice(0, 1000).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="px-3 py-1.5">{row.idOsoby}</td>
                      <td className="px-3 py-1.5">{row.imie}</td>
                      <td className="px-3 py-1.5">{row.nazwisko}</td>
                      <td className="px-3 py-1.5">{row.stopienNaukowy}</td>
                      <td className="px-3 py-1.5 max-w-[120px] truncate">{row.jednostka}</td>
                      <td className="px-3 py-1.5">{row.skroconaNazwaJednostki}</td>
                      <td className="px-3 py-1.5 text-center">{row.ilosc_zajec}</td>
                      <td className="px-3 py-1.5 max-w-[300px]">
                        {row.zajeciaList.length ? (
                          <div className="flex flex-wrap gap-1">
                            {row.zajeciaList.slice(0, 5).map((z, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px] font-normal">{z}</Badge>
                            ))}
                            {row.zajeciaList.length > 5 && (
                              <Badge variant="outline" className="text-[10px]">+{row.zajeciaList.length - 5}</Badge>
                            )}
                          </div>
                        ) : "Brak zajęć"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {personRows.length > 1000 && (
                <div className="px-4 py-2 text-xs text-muted-foreground">
                  Pokazano 1000 z {personRows.length.toLocaleString("pl-PL")} osób.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
