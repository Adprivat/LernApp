# LernApp 📚⚡

Kompetitive Lernplattform mit Quiz-Spielmodi, Echtzeit-Multiplayer und Turniersystem — speziell für angehende Fachinformatiker.

**Live:** [lernapp-k5gk.onrender.com](https://lernapp-k5gk.onrender.com)

---

## Features

- **Solo-Modus** — Fragen nach Kategorie, Schwierigkeit und Anzahl konfigurieren
- **1v1 Herausforderung** — Gezielt gegen einen Freund oder aus dem offenen Pool antreten
- **Gruppen** — Teamspiele (2v2, 3v3, 4v4) mit Lobby und Live-Chat
- **Turniere** — Mehrspieler-Turniere mit Bracket-System
- **Echtzeit** — Live-Scores, In-Game-Chat, sofortige Benachrichtigungen
- **Ranglisten** — Globale Bestenliste mit Opt-out-Möglichkeit
- **Achievements** — Automatisch vergebene Errungenschaften
- **Admin-Panel** — Fragen-, Nutzer- und Ankündigungsverwaltung
- **Fragen melden** — Spieler können fehlerhafte Fragen direkt nach dem Spiel melden

---

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 19 · TypeScript · Vite 8 |
| Styling | Tailwind CSS v4 (CSS-first, kein `tailwind.config.js`) |
| State | Zustand |
| Routing | React Router v7 |
| Backend | Supabase (Auth, PostgreSQL, Realtime) |
| Icons | Lucide React |
| Animationen | Motion (Framer Motion) |
| Schrift | Space Grotesk (Google Fonts) |
| Hosting | Render (Static Site) |

---

## Schnellstart

### Voraussetzungen

- Node.js 18+
- npm
- Ein [Supabase](https://supabase.com)-Projekt

### Installation

```bash
# Repository klonen
git clone https://github.com/Adprivat/LernApp.git
cd LernApp

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
```

`.env` ausfüllen:

```env
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
VITE_EMAIL_SALT=zufälliger-string-für-produktion
VITE_WEB3FORMS_KEY=dein-web3forms-key
```

### Datenbank einrichten

1. Neues Supabase-Projekt erstellen
2. Im **SQL Editor** die Datei `supabase/schema.sql` ausführen
3. Unter **Authentication → Settings** die Option **„Enable email confirmations"** deaktivieren

### Starten

```bash
npm run dev        # Entwicklungsserver (http://localhost:5173)
npm run build      # TypeScript-Prüfung + Produktions-Build
npm run preview    # Produktions-Build lokal testen
npm run lint       # ESLint
```

---

## Projektstruktur

```
src/
├── components/
│   ├── game/           # QuestionCard, GameChat, Scoreboard, CategorySelector, GameResultScreen
│   ├── layout/         # Navbar
│   ├── notifications/  # NotificationPanel
│   └── ui/             # Button, Card, Input, Modal, Badge, Avatar, BeamsBackground
├── pages/              # Eine Datei pro Route (LoginPage, HomePage, GamePage, …)
├── stores/             # Zustand-Stores: authStore, gameStore, notificationStore
├── lib/                # supabase.ts (Client-Singleton), errorHandler, utils
├── types/              # TypeScript-Typen (index.ts)
└── data/               # (leer — Fragen liegen in der Supabase-DB)

supabase/
├── schema.sql          # Vollständiges DB-Schema + RLS-Policies + RPC-Funktionen
└── migrations/         # Inkrementelle Migrationen
```

---

## Spielmodi

| Modus | Route | Beschreibung |
|---|---|---|
| Solo | `/learn` | Einzelspieler, konfigurierbare Kategorie & Fragenanzahl |
| Herausforderung | `/challenge` | 1v1 gezielt (Username) oder offener Pool |
| Gruppe | `/groups` → `/lobby/:id` | 2v2 / 3v3 / 4v4 Teams mit Lobby |
| Turnier | `/tournament` | Mehrspieler-Turniere mit Bracket |
| Spiel | `/game/:sessionId` | Gemeinsamer Spielbildschirm für alle Modi |

---

## Punktesystem

| Ergebnis | Punkte |
|---|---|
| Richtige Antwort | **100** + Zeitbonus |
| Zeitbonus | `Math.floor((20000 - ms) / 200)` — max ~100 bei sofortiger Antwort |
| Falsche Antwort / Timeout | **0** |

---

## Authentifizierung

- **Kein E-Mail-Login** — nur Benutzername + Passwort
- Intern wird eine synthetische E-Mail erzeugt (`username@lernapp.local`)
- Salt-basiertes Hashing für opake E-Mail-Derivation (`VITE_EMAIL_SALT`)
- Auth-State in `useAuthStore` (Zustand)

---

## Echtzeit-Features

Über Supabase Realtime Channels:

| Channel | Zweck |
|---|---|
| `user:{userId}` | Persönliche Benachrichtigungen (Herausforderungen, Achievements) |
| `game:{sessionId}` | Spielstatus, Live-Scores |
| `chat:{sessionId}` | In-Game-Chat |
| `lobby:{sessionId}` | Lobby-Updates (Spieler beitreten, Countdown) |

- Benachrichtigungssounds via Web Audio API (verschiedene Sounds je nach Event)
- Online-Heartbeat alle 30 Sekunden
- Auto-Navigation bei angenommener Herausforderung / Turnierstart

---

## Datenbank

### Tabellen

| Tabelle | Zweck |
|---|---|
| `profiles` | Benutzerprofil, Stats, Admin-Flag, Online-Status |
| `question_categories` | Fragekategorien (z.B. Prüfungsvorbereitung) |
| `subjects` | Themengebiete mit Metadaten (Icon, Farbe) |
| `questions` | Fragendatenbank (Multiple Choice, Schwierigkeit, Tags) |
| `game_sessions` | Spielsitzung (Modus, Status, Question-Seed) |
| `game_players` | Spieler pro Sitzung mit Score |
| `game_answers` | Einzelne Antworten mit Zeitnahme |
| `challenges` | 1v1 Herausforderungen |
| `tournaments` | Turniere |
| `tournament_participants` | Turnierteilnehmer |
| `achievements` | Errungenschaftsdefinitionen |
| `user_achievements` | Verdiente Errungenschaften |
| `chat_messages` | Spielchat (sitzungsbezogen) |
| `notifications` | Echtzeit-Benachrichtigungen |
| `announcements` | Systemweite Ankündigungen |

### Wichtige RPC-Funktionen

- `update_player_stats(user_id, score, won, correct)` — nach jedem Spiel
- `check_achievements(user_id)` — wird automatisch aufgerufen

### Deterministisches Shuffling

Fragen werden per `ORDER BY sort_order ASC` geladen, dann client-seitig mit Mulberry32 PRNG (Seed aus `game_sessions.question_seed`) gemischt. Gleicher Seed = gleiche Fragenreihenfolge für alle Spieler.

---

## Alle Routen

| Route | Auth | Seite |
|---|---|---|
| `/login` | ❌ | Login / Registrierung |
| `/` | ✅ | Startseite mit Spielmodus-Auswahl |
| `/learn` | ✅ | Solo-Übungsmodus |
| `/challenge` | ✅ | 1v1 Herausforderung |
| `/groups` | ✅ | Gruppenspiel erstellen/beitreten |
| `/lobby/:sessionId` | ✅ | Wartezimmer vor Spielstart |
| `/game/:sessionId` | ✅ | Spielbildschirm |
| `/tournament` | ✅ | Turnierübersicht |
| `/profile` | ✅ | Profil & Statistiken |
| `/leaderboard` | ✅ | Globale Rangliste |
| `/admin` | ✅ | Admin-Dashboard |
| `/guide` | ✅ | Anleitung |
| `/friends` | ✅ | Freundesliste |
| `/impressum` | ❌ | Impressum |
| `/datenschutz` | ❌ | Datenschutzerklärung |

---

## Architekturprinzipien

- **Seiten rufen Supabase nie direkt auf** — nur über Zustand-Stores
- **RLS auf allen Tabellen** — Admin-Checks sowohl client- als auch DB-seitig
- **Soft-Delete** für Fragen (`is_active = false`, nie hart löschen)
- **UI-Primitives** aus `src/components/ui/` verwenden
- **`clsx`** für bedingte CSS-Klassen
- **Realtime-Channels** immer in `useEffect` mit Cleanup (`channel.unsubscribe()`)

---

## Deployment (Render)

1. Render Static Site erstellen, Branch verbinden
2. **Build Command:** `npm run build`
3. **Publish Directory:** `dist`
4. **Environment Variables** setzen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_EMAIL_SALT`, `VITE_WEB3FORMS_KEY`)
5. **Rewrite Rule** im Dashboard hinzufügen: `/*` → `/index.html` (Action: Rewrite) — notwendig für SPA-Routing

---

## Lizenz

Privates Projekt von [Adrian Schultz](https://www.adrianschultz.de/)

---

## Unterstützung

Wenn dir das Projekt gefällt, freue ich mich über einen Kaffee: [Buy me a Coffee ☕](https://buymeacoffee.com/adrianschuz)
