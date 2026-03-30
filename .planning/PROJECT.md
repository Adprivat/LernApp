# LernApp

## What This Is

Eine browserbasierte Lernplattform für Quiz-basiertes Lernen mit Multiplayer, Turnieren und Challenges. Nutzer können alleine oder gegeneinander Wissensquizze spielen, Herausforderungen starten und Turniere ausrichten. Gebaut mit React + TypeScript + Supabase.

## Core Value

Nutzer können jederzeit stabil und sicher gegeneinander spielen — ohne Race Conditions, Memory Leaks oder Sicherheitslücken.

## Requirements

### Validated

- ✓ Benutzer-Authentifizierung (Registrierung, Login, Session-Persistenz) — existing
- ✓ Solo-Quizspiel mit Kategorien, Timer und Punktesystem — existing
- ✓ Multiplayer-Lobby mit Echtzeit-Synchronisation via Supabase Realtime — existing
- ✓ 1v1 Challenge-System (Herausforderungen senden/annehmen) — existing
- ✓ Turniermodus (Erstellung, Teilnahme, Fortschritt) — existing
- ✓ Gruppen-Funktionalität — existing
- ✓ Leaderboard (globale Rangliste) — existing
- ✓ Echtzeit-Benachrichtigungen — existing
- ✓ Achievements-System — existing
- ✓ Admin-Panel (User-Verwaltung, Score-Reset) — existing
- ✓ Lernmodus (LearnPage) — existing
- ✓ Profil-Seite mit Statistiken — existing

### Active

- [ ] Race Condition bei Challenge-Annahme behoben (doppelte Sessions verhindert)
- [ ] Echtzeit-Subscription Leaks bei schneller Navigation behoben
- [ ] Username-Enumeration-Lücke geschlossen
- [ ] Alle `.single()` Queries mit Error Handling abgesichert
- [ ] `catch (err: any)` durch typisierte Error-Handler ersetzt

### Out of Scope

- Mobil-App — Web-first, kein natives App geplant
- Video-Inhalte — zu komplex für aktuellen Scope
- OAuth / Social Login — Email/Username-Auth ausreichend für v1
- Neues Feature-Set — erst Stabilisierung, dann Erweiterung

## Context

Brownfield-Codebase mit vollständigem Feature-Set. Kerntechnologien: React 19, TypeScript (strict mode), Zustand für State Management, Supabase für Auth + DB + Realtime. Keine Tests vorhanden. Aktueller Fokus: Stabilitäts- und Sicherheitsfixes bevor weitere Features gebaut werden.

**Bekannte kritische Schwachstellen:**
- `src/pages/ChallengePage.tsx` — Race condition bei `joinOpenChallenge()`
- `src/pages/GamePage.tsx`, `ChallengePage.tsx`, `TournamentPage.tsx`, `LobbyPage.tsx` — Subscription Leaks
- `src/lib/supabase.ts` — deterministisches `usernameToEmail()` ermöglicht User-Enumeration
- 20+ `.single()` Calls ohne Error Handling in Stores und Pages
- 8+ `catch (err: any)` Blöcke ohne Typisierung

## Constraints

- **Tech Stack**: React + TypeScript + Supabase — kein Wechsel
- **Breaking Changes**: Keine DB-Schema-Änderungen ohne Migration
- **Supabase Auth**: Username-Auth-Pattern muss beibehalten werden (UX), aber sicher gemacht werden

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bugs vor Features | Instabile Basis macht neue Features riskant | — Pending |
| Error Handler Utility anlegen | Einheitliches Error Handling statt Einzellösungen | — Pending |
| Username-Email weiterhin client-seitig | Server-Migration zu aufwändig für diesen Scope | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*
