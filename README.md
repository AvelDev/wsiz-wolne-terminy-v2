<div align="center">

# 🏫 Plan sal WSIiZ

**Przeglądarkowy scraper planu zajęć Wyższej Szkoły Informatyki i Zarządzania.**  
Pobierz dane, przeglądaj kalendarz sal, filtruj, eksportuj do CSV — wszystko bez instalacji.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Funkcje

- 📅 **Widok kalendarza** — plan tygodniowy pogrupowany po salach
- 📋 **Widok tabeli** — surowe wiersze z pełnymi danymi zajęć
- 👤 **Widok po osobie** — zestawienie pracowników z listą ich zajęć
- 🔍 **Filtrowanie** — po imieniu, nazwisku, sali, jednostce, stopniu naukowym
- 📥 **Eksport CSV** — pobierz przefiltrowane dane jednym kliknięciem
- ⚡ **Streaming w czasie rzeczywistym** — postęp scrapowania na żywo (Server-Sent Events)

---

## 🚀 Uruchomienie

```bash
git clone https://github.com/AvelDev/wsiz-wolne-terminy-v2.git
cd wsiz-wolne-terminy-v2
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

### Wymagania

- Node.js 18+
- Aktywna sesja na portalu [wu.wsiz.edu.pl](https://wu.wsiz.edu.pl)

### Jak uzyskać JSESSIONID?

1. Zaloguj się na `wu.wsiz.edu.pl`
2. Otwórz DevTools (`F12`) → zakładka **Application** → **Cookies**
3. Skopiuj wartość ciasteczka `JSESSIONID`
4. Wklej ją w pole w aplikacji i kliknij **Rozpocznij scrapowanie**

---

## 🏗️ Jak to działa

```
Przeglądarka
  └─▶ Next.js API Route  (app/api/scrape/route.ts)
        └─▶ wu.wsiz.edu.pl REST API  /profil-dydaktyka/osoba/{id}
```

1. 🔑 Użytkownik wkleja `JSESSIONID` — ciasteczko swojej sesji uczelnianej.
2. 📡 Frontend wysyła żądanie GET do `/api/scrape`.
3. ⚙️ Route handler iteruje po zakresie ID pracowników w partiach (domyślnie 10 równoległych żądań), dołączając `JSESSIONID` jako nagłówek `Cookie` do każdego żądania do WSIZ.
4. 🌊 Wyniki są strumieniowane jako **Server-Sent Events** — postęp aktualizuje się na bieżąco.
5. 📊 Po zakończeniu dane trafiają do widoku planu — filtruj i przeglądaj.

### 🍪 Przepływ ciasteczka

Ciasteczko sesji (`JSESSIONID`) nigdy nie jest przechowywane — istnieje wyłącznie jako:

| Krok | Lokalizacja | Forma |
|------|-------------|-------|
| Wpisanie przez użytkownika | `components/scraper-panel.tsx:53` | stan React (pamięć przeglądarki) |
| Przesłanie do serwera | `components/scraper-panel.tsx:54` | parametr URL `?jsessionid=...` (HTTPS) |
| Przekazanie do WSIZ API | `app/api/scrape/route.ts:57` | nagłówek `Cookie: JSESSIONID=...` |

Po zamknięciu zakładki ciasteczko znika. ✅

---

## 🔒 Bezpieczeństwo i prywatność

> **Żadne dane nie są zapisywane, logowane ani przesyłane do zewnętrznych usług.**

- 🚫 Brak bazy danych, brak systemu logowania.
- 🚫 `JSESSIONID` nie trafia do żadnych plików — używany wyłącznie podczas aktywnego żądania HTTP.
- 🚫 Odpowiedzi nie są cache'owane (`Cache-Control: no-store`).
- 💾 Dane pracowników istnieją tylko w pamięci przeglądarki podczas sesji — odświeżenie strony je usuwa.
- 🔍 Kod jest w pełni open source — możesz samodzielnie zweryfikować każdą linię.

Aplikacja działa jako **transparentny proxy** — odpytuje dokładnie to samo API, które odpytuje Twoja przeglądarka po zalogowaniu do portalu uczelnianego.

---

## 🗂️ Struktura projektu

```
app/
  page.tsx                  # Główny układ, zakładki Scraper / Plan
  layout.tsx                # Root layout
  api/
    scrape/
      route.ts              # GET handler — scraping + SSE stream
components/
  scraper-panel.tsx         # Formularz konfiguracji i pasek postępu
  plan-view.tsx             # Widok kalendarza, tabeli, eksport CSV
  ui/                       # Komponenty shadcn/ui
lib/
  types.ts                  # Typy Row, ScrapeEvent
```

---

## 🛠️ Stack

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + shadcn/ui + Tailwind CSS v4 |
| Streaming | Server-Sent Events |
| Typy | TypeScript 5 |

---

## 🤝 Wkład w projekt

Pull requesty są mile widziane! Projekt używa **Conventional Commits**:

| Prefix | Kiedy |
|--------|-------|
| `feat:` | nowa funkcja |
| `fix:` | naprawa błędu |
| `refactor:` | zmiana kodu bez wpływu na działanie |
| `chore:` | zależności, konfiguracja |
| `docs:` | dokumentacja |

```bash
# Przykłady
git commit -m "feat(plan-view): dodaj filtrowanie po sali"
git commit -m "fix(scrape): obsłuż timeout przy batch size > 10"
```

**Zasady:**
- Temat ≤ 72 znaki, tryb rozkazujący, bez kropki na końcu
- Treść commita tylko gdy _dlaczego_ nie jest oczywiste z kodu
- Jeden commit = jedna logiczna zmiana

---

## 📄 Licencja

[MIT](LICENSE) © 2025 [AvelDev](https://github.com/AvelDev)
