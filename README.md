# Plan sal WSIiZ

Przeglądarkowy scraper planu zajęć WSIiZ. Pobiera dane o pracownikach i ich zajęciach z API uczelnianego, wyświetla je w widoku kalendarza, tabeli lub pogrupowane po osobie, z możliwością eksportu do CSV.

## Jak to działa

```
Przeglądarka
  └─▶ Next.js API Route  (app/api/scrape/route.ts)
        └─▶ wu.wsiz.edu.pl REST API  /profil-dydaktyka/osoba/{id}
```

1. Użytkownik wkleja swój `JSESSIONID` z przeglądarki.
2. Frontend (`components/scraper-panel.tsx`) wysyła żądanie GET do `/api/scrape` z ciasteczkiem w parametrze URL.
3. Route handler (`app/api/scrape/route.ts`) iteruje po zakresie ID pracowników w partiach (domyślnie 10 równoległych żądań), dołączając `JSESSIONID` jako nagłówek `Cookie` do każdego żądania do WSIZ.
4. Wyniki są strumieniowane do przeglądarki jako **Server-Sent Events** — frontend aktualizuje postęp na bieżąco.
5. Po zakończeniu dane trafiają do `components/plan-view.tsx`, gdzie można je filtrować i przeglądać.

### Przekazywanie ciasteczka

Ciasteczko sesji (`JSESSIONID`) nigdy nie jest przechowywane — istnieje wyłącznie jako:

| Krok | Lokalizacja | Forma |
|------|-------------|-------|
| Wpisanie przez użytkownika | `components/scraper-panel.tsx:53` | stan React (pamięć przeglądarki) |
| Przesłanie do serwera | `components/scraper-panel.tsx:54` | parametr URL `?jsessionid=...` (HTTPS) |
| Przekazanie do WSIZ API | `app/api/scrape/route.ts:57` | nagłówek `Cookie: JSESSIONID=...` |

Po zamknięciu zakładki ciasteczko znika.

## Bezpieczeństwo i prywatność

> **Żadne dane nie są zapisywane ani logowane.**

- Serwer nie posiada bazy danych ani systemu logowania.
- `JSESSIONID` nie trafia do żadnych plików — jest używany wyłącznie podczas aktywnego żądania HTTP i nie jest cache'owany (nagłówek `Cache-Control: no-store`).
- Dane pracowników istnieją tylko w pamięci przeglądarki podczas sesji i są tracone po odświeżeniu strony.
- Aplikacja działa jako **transparentny proxy** — odpytuje to samo API, które odpytuje przeglądarka po zalogowaniu do portalu uczelnianego.

## Uruchomienie

```bash
npm install
npm run dev
```

Otwórz `http://localhost:3000`, zaloguj się na `wu.wsiz.edu.pl`, skopiuj `JSESSIONID` z DevTools (Application → Cookies) i wklej go do pola w aplikacji.

### Wymagania

- Node.js 18+
- Aktywna sesja na portalu wu.wsiz.edu.pl

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + shadcn/ui + Tailwind CSS v4 |
| Dane | WSIZ REST API (SSE streaming) |
| Typy | TypeScript 5 |

## Struktura projektu

```
app/
  page.tsx                  # Główny układ, zakładki Scraper / Plan
  layout.tsx                # Root layout
  api/
    scrape/
      route.ts              # GET handler — scraping + SSE stream
components/
  scraper-panel.tsx         # Formularz konfiguracji i pasek postępu
  plan-view.tsx             # Widok kalendarza, tabeli i eksport CSV
  ui/                       # Komponenty shadcn/ui
lib/
  types.ts                  # Typy Row, ScrapeEvent
```

## Commitowanie

Projekt używa **Conventional Commits**:

```
<typ>(<zakres>): <opis>

feat:     nowa funkcja
fix:      naprawa błędu
refactor: zmiana kodu bez wpływu na działanie
style:    formatowanie, brak zmian logiki
chore:    aktualizacja zależności, konfiguracja
docs:     dokumentacja
```

Przykłady:

```bash
git commit -m "feat(plan-view): dodaj filtrowanie po sali"
git commit -m "fix(scrape): obsłuż timeout przy batch size > 10"
git commit -m "chore: aktualizuj Next.js do 16.3"
```

Zasady:

- Temat ≤ 72 znaki, tryb rozkazujący, bez kropki na końcu.
- Treść commita tylko gdy _dlaczego_ nie jest oczywiste z kodu.
- Jeden commit = jedna logiczna zmiana.

## Licencja

MIT
