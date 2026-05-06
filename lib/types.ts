export interface Zajecie {
  nazwaPrzedmiotu: string
  formaZajec: string
  nrKatalogowy: string
  sala: string
  budynek: string
  poczatek: string
  koniec: string
}

export interface Row {
  idOsoby: string
  imie: string
  nazwisko: string
  stopienNaukowy: string
  jednostka: string
  skroconaNazwaJednostki: string
  ilosc_zajec: string
  nazwaPrzedmiotu?: string
  formaZajec?: string
  nrKatalogowy?: string
  sala?: string
  budynek?: string
  poczatek?: string
  koniec?: string
}

export interface ScrapeEvent {
  type: "progress" | "data" | "done" | "error"
  id?: number
  processed?: number
  found?: number
  total?: number
  row?: Row
  message?: string
}

export interface ScrapeConfig {
  jsessionid: string
  startId: number
  endId: number
  batchSize: number
}
