"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScraperPanel } from "@/components/scraper-panel"
import { PlanView } from "@/components/plan-view"
import type { Row } from "@/lib/types"

export default function Home() {
  const [rows, setRows] = useState<Row[]>([])
  const [activeTab, setActiveTab] = useState("scraper")

  const handleDataReady = (newRows: Row[]) => {
    setRows(newRows)
    setActiveTab("plan")
  }

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 border-b bg-background px-6 py-3 flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold">Plan sal WSIiZ</h1>
          <p className="text-xs text-muted-foreground">v2.0 — scraper w przeglądarce</p>
        </div>
        <Separator orientation="vertical" className="h-6" />
        {rows.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {rows.length.toLocaleString("pl-PL")} rekordów załadowanych
          </span>
        )}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="shrink-0 w-fit mx-6 mt-3 mb-0">
          <TabsTrigger value="scraper">Scraper</TabsTrigger>
          <TabsTrigger value="plan" disabled={rows.length === 0}>
            Plan {rows.length > 0 && `(${rows.length.toLocaleString("pl-PL")})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scraper" className="flex-1 overflow-auto px-6 py-4 mt-0">
          <ScraperPanel onDataReady={handleDataReady} />
        </TabsContent>

        <TabsContent value="plan" className="flex-1 overflow-hidden mt-0">
          <PlanView rows={rows} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
