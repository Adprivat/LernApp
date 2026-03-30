# Roadmap: LernApp Stabilisierung

**Milestone:** v1.1 — Bugfix & Stabilisierung
**Goal:** Alle bekannten Bugs und kritischer Tech Debt behoben. App ist stabil, sicher und wartbar.

## Phases

### Phase 1 — Race Condition Fix (Challenge)

**Goal:** Verhindere doppelte Game Sessions wenn zwei Spieler gleichzeitig eine offene Challenge annehmen.

**Requirements:** BUG-01

**Scope:**
- Atomare Datenbankoperation für Challenge-Annahme (Check + Update in einer Transaktion)
- RPC-Funktion oder Constraint auf `challenges` Tabelle zur Absicherung
- `ChallengePage.tsx` `joinOpenChallenge()` absichern
- `TournamentPage.tsx` `startTournament()` absichern

**Success Criteria:**
- Zwei simultane Challenge-Annahmen führen zu genau einer Game Session
- Zweiter Spieler erhält verständliche Fehlermeldung

---

### Phase 2 — Subscription Leak Fix

**Goal:** Real-time Supabase-Kanäle werden zuverlässig aufgeräumt bei Navigation.

**Requirements:** BUG-02

**Scope:**
- `GamePage.tsx` — Cleanup-Pattern vereinheitlichen
- `ChallengePage.tsx` — Channel-Cleanup absichern
- `TournamentPage.tsx` — Channel-Cleanup absichern
- `LobbyPage.tsx` — Channel-Cleanup absichern
- Konsistentes Ref-Cleanup-Pattern in allen betroffenen Pages

**Success Criteria:**
- Kein Anstieg offener Channels bei schneller Navigation (DevTools Network tab)
- Keine Memory-Warnungen im Browser

---

### Phase 3 — Auth Security Fix

**Goal:** Username-Enumeration-Angriffe durch vorhersehbares Email-Pattern unterbinden.

**Requirements:** BUG-03

**Scope:**
- `src/lib/supabase.ts` `usernameToEmail()` — zufällige Komponente in generierte Email einbauen (UUID oder Hash)
- `src/stores/authStore.ts` — Login/Register-Flow anpassen
- Rate-Limiting Hinweis in README / Supabase Dashboard (nicht im Code implementierbar client-seitig)

**Success Criteria:**
- Generierte Emails sind nicht vorhersehbar aus dem Username ableitbar
- Bestehende Nutzer können sich weiterhin einloggen (Migration berücksichtigt)

---

### Phase 4 — Error Handling Hardening

**Goal:** Einheitliches, typisiertes Error Handling ersetzt fragile `as any` und `catch (err: any)` Muster.

**Requirements:** ERR-01, ERR-02, ERR-03

**Scope:**
- `src/lib/errorHandler.ts` — Error-Utility erstellen (normalizes Supabase + JS errors)
- Alle `.single()` Queries mit Error-Check absichern (20+ Stellen)
- Alle `catch (err: any)` durch `catch (err: unknown)` + Utility ersetzen (8+ Stellen)
- Nutzerfreundliche Fehlermeldungen statt `alert()` / stilles Scheitern

**Success Criteria:**
- Kein `catch (err: any)` mehr im Codebase
- Alle `.single()` Calls prüfen auf `error` vor Datenzugriff
- TypeScript meldet keine `any`-Warnungen in Error-Handling-Code

---

## Timeline

| Phase | Focus | Requirements |
|-------|-------|--------------|
| 1 | Race Condition (Challenge) | BUG-01 |
| 2 | Subscription Leaks | BUG-02 |
| 3 | Auth Security | BUG-03 |
| 4 | Error Handling | ERR-01, ERR-02, ERR-03 |

**Total:** 4 Phasen → Milestone v1.1

---
*Roadmap created: 2026-03-30*
