# LernApp — Claude Code Kontext

## Projektübersicht
Kompetitive Lernplattform mit Quiz-Spielmodi, Echtzeit-Multiplayer und Turniersystem.

**Stack:** React 18 + TypeScript + Vite · Supabase (Auth, DB, Realtime) · Tailwind CSS v4 · Zustand · React Router v6

---

## Projektstruktur

```
src/
├── components/
│   ├── game/          # QuestionCard, GameChat, Scoreboard, CategorySelector, GameResultScreen
│   ├── layout/        # Navbar
│   ├── notifications/ # NotificationPanel
│   └── ui/            # Button, Card, Input, Modal, Badge, Avatar
├── pages/             # Eine Datei pro Route
├── stores/            # Zustand-Stores: authStore, gameStore, notificationStore
├── lib/               # supabase.ts (Client-Singleton)
├── types/             # index.ts (alle TypeScript-Typen)
└── data/              # (leer — Fragen sind in Supabase DB)
supabase/
└── schema.sql         # Vollständiges DB-Schema + RLS-Policies + Functions
```

---

## Architekturregeln

### Datenzugriff
- **Seiten rufen Supabase nie direkt auf** — nur über Stores oder direkte Hooks
- Alle Datenbankoperationen laufen über `src/lib/supabase.ts`
- Stores verwalten den lokalen State; Supabase ist die einzige Quelle der Wahrheit

### Authentifizierung
- Kein E-Mail-Login — nur Username + Passwort
- Intern wird eine synthetische E-Mail verwendet: `username@lernapp.local`
- Hilfsfunktion: `usernameToEmail(username)` in `src/lib/supabase.ts`
- Auth-State liegt in `useAuthStore` (Zustand)

### Echtzeit (Realtime)
- Supabase Realtime für: Benachrichtigungen, Chat, Live-Scores, Lobby-Updates
- Channel-Schema: `user:{userId}`, `game:{sessionId}`, `chat:{sessionId}`, `lobby:{sessionId}`
- Channels immer in `useEffect` mit Cleanup abmelden: `channel.unsubscribe()`
- Heartbeat für Online-Status alle 30 Sekunden

### Komponenten
- UI-Primitives (Button, Card, Input etc.) aus `src/components/ui/` verwenden
- `clsx` für bedingte Klassen, kein `cn()` Wrapper
- Tailwind v4 — kein `tailwind.config.js`, Konfiguration via CSS

---

## Datenbank-Schema (Kurzreferenz)

| Tabelle | Zweck |
|---|---|
| `profiles` | Benutzerprofil, Stats, Admin-Flag |
| `question_categories` | Fragekategorien (z.B. exam_prep) |
| `subjects` | Themengebiete mit Metadaten (icon, color) |
| `questions` | Fragendatenbank mit Tags, Schwierigkeit, sort_order |
| `game_sessions` | Spielsitzung (solo/challenge/group/tournament) |
| `game_players` | Spieler pro Sitzung mit Score |
| `game_answers` | Einzelne Antworten mit Zeitnahme + question_id |
| `challenges` | 1v1 Herausforderungen (gezielt oder offen) |
| `tournaments` | Turnierregistrierung und -status |
| `tournament_participants` | Turnierteilnehmer |
| `achievements` | Errungenschaftsdefinitionen |
| `user_achievements` | Verdiente Errungenschaften pro User |
| `chat_messages` | Spielchat (sitzungsbezogen) |
| `notifications` | Echtzeit-Benachrichtigungen |

**Wichtige DB-Funktionen:**
- `update_player_stats(user_id, score, won, correct)` — nach jedem Spiel aufrufen
- `check_achievements(user_id)` — wird von `update_player_stats` automatisch aufgerufen

---

## Spielmodi

| Modus | Route | Beschreibung |
|---|---|---|
| Solo | `/learn` | Einzelspieler, konfigurierbare Kategorie & Fragenanzahl |
| Herausforderung | `/challenge` | 1v1 gezielt (Username) oder offener Pool |
| Gruppe | `/groups` → `/lobby/:id` | 2v2 / 3v3 / 4v4 Teams |
| Turnier | `/tournament` | Mehrspielerturniere |
| Spiel | `/game/:sessionId` | Gemeinsamer Spielbildschirm für alle Modi |

---

## Fragendatenbank (Supabase)

Fragen liegen vollständig in der Datenbank (Tabellen `question_categories`, `subjects`, `questions`).

**Neue Fragen hinzufügen:** `INSERT INTO questions (category_id, question, answers, correct_index, difficulty, tags, sort_order)` — `sort_order` muss immer am Ende angehängt werden (append-only), damit bestehende Seeds nicht brechen.

**Neue Kategorie:** Zeile in `question_categories` einfügen.
**Neues Thema:** Zeile in `subjects` einfügen mit Verweis auf `category_id`.

**Deterministisches Shuffling:** Fragen werden per `ORDER BY sort_order ASC` geladen, dann client-seitig mit Mulberry32 PRNG (Seed aus `game_sessions.question_seed`) gemischt. Gleicher Seed = gleiche Fragenreihenfolge für alle Spieler.

**Soft-Delete:** Fragen nie hart löschen, sondern `is_active = false` setzen.

---

## Punktesystem
- Richtige Antwort: **100 Punkte** + Zeitbonus
- Zeitbonus: `Math.floor((20000 - timeTakenMs) / 200)` — max. ~100 Zusatzpunkte bei sofortiger Antwort
- Falsche Antwort oder Zeit abgelaufen: **0 Punkte**

---

## Umgebung einrichten

```bash
cp .env.example .env
# VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen

npm install
npm run dev
```

**Supabase-Einrichtung:**
1. Neues Projekt auf supabase.com erstellen
2. `supabase/schema.sql` im SQL-Editor ausführen
3. Authentication → Settings → **"Enable email confirmations" deaktivieren**

---

## Entwicklungshinweise

- `npm run build` — TypeScript-Prüfung + Vite-Build (muss fehlerfrei sein)
- `npm run dev` — Entwicklungsserver mit HMR
- Neue Seiten immer in `src/App.tsx` in `<Routes>` registrieren
- Admin-Funktionen prüfen immer `user.is_admin` (client + RLS auf DB-Seite)
- Alle neuen Tabellen brauchen RLS-Policies — Vorlage in `supabase/schema.sql`

---

## Branch-Konvention
Entwicklung auf: `claude/learning-platform-multiplayer-rASDi`