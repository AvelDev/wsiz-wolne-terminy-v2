"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScraperPanel } from "@/components/scraper-panel"
import { PlanView } from "@/components/plan-view"
import { loadScrapes, saveScrape, deleteScrape, fmtScrapeLabel } from "@/lib/scrape-store"
import type { Row, SavedScrape } from "@/lib/types"

export default function Home() {
  const [scrapes, setScrapes] = useState<SavedScrape[]>([])
  const [activeScrapeId, setActiveScrapeId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("scraper")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    const loaded = loadScrapes()
    setScrapes(loaded)
    if (loaded.length > 0) setActiveScrapeId(loaded[0].id)
  }, [])

  const activeRows: Row[] = scrapes.find((s) => s.id === activeScrapeId)?.rows ?? []

  const handleDataReady = (rows: Row[]) => {
    const scrape = saveScrape(rows)
    const updated = loadScrapes()
    setScrapes(updated)
    setActiveScrapeId(scrape.id)
    setActiveTab("plan")
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    const updated = deleteScrape(deleteTarget)
    setScrapes(updated)
    if (activeScrapeId === deleteTarget) {
      setActiveScrapeId(updated[0]?.id ?? null)
      if (updated.length === 0) setActiveTab("scraper")
    }
    setDeleteTarget(null)
  }

  const deleteTargetLabel = scrapes.find((s) => s.id === deleteTarget)
    ? fmtScrapeLabel(scrapes.find((s) => s.id === deleteTarget)!)
    : ""

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 border-b bg-background px-6 py-3 flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold">Plan sal WSIiZ</h1>
          <p className="text-xs text-muted-foreground">v2.0 — scraper w przeglądarce</p>
        </div>
        <Separator orientation="vertical" className="h-6" />

        {scrapes.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={activeScrapeId ?? ""} onValueChange={setActiveScrapeId}>
              <SelectTrigger className="h-8 text-xs w-72">
                <SelectValue placeholder="Wybierz scrape..." />
              </SelectTrigger>
              <SelectContent>
                {scrapes.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {fmtScrapeLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteTarget(activeScrapeId)}
              disabled={!activeScrapeId}
              title="Usuń ten scrape"
            >
              <TrashIcon />
            </Button>
          </div>
        )}

        <a
          href="https://github.com/AvelDev/wsiz-wolne-terminy-v2"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          GitHub ↗
        </a>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="shrink-0 w-fit mx-6 mt-3 mb-0">
          <TabsTrigger value="scraper">Scraper</TabsTrigger>
          <TabsTrigger value="plan" disabled={scrapes.length === 0}>
            Plan {activeRows.length > 0 && `(${activeRows.length.toLocaleString("pl-PL")})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scraper" className="flex-1 overflow-auto px-6 py-4 mt-0">
          <ScraperPanel onDataReady={handleDataReady} />
        </TabsContent>

        <TabsContent value="plan" className="flex-1 overflow-hidden mt-0">
          <PlanView rows={activeRows} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń scrape?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetLabel} zostanie trwale usunięty z pamięci przeglądarki.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
