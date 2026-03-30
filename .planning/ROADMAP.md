# Roadmap: LernApp Stabilisierung

## Overview

Bugfix- und Stabilisierungs-Milestone für die LernApp. Vier Phasen schließen bekannte Race Conditions, Memory Leaks und Sicherheitslücken, bevor neue Features gebaut werden.

## Phases

- [ ] **Phase 1: Race Condition Fix** - Atomare Challenge-Annahme verhindert doppelte Game Sessions
- [ ] **Phase 2: Subscription Leak Fix** - Real-time Kanäle werden zuverlässig aufgeräumt bei Navigation
- [ ] **Phase 3: Auth Security Fix** - Username-Enumeration-Lücke in der Auth-Schicht geschlossen
- [ ] **Phase 4: Error Handling Hardening** - Einheitliches typisiertes Error Handling ersetzt fragile Muster

## Phase Details

### Phase 1: Race Condition Fix
**Goal**: Verhindere doppelte Game Sessions wenn zwei Spieler gleichzeitig eine offene Challenge annehmen
**Depends on**: Nothing (first phase)
**Requirements**: BUG-01
**Success Criteria** (what must be TRUE):
  1. Zwei simultane Challenge-Annahmen führen zu genau einer Game Session
  2. Zweiter Spieler erhält verständliche Fehlermeldung
  3. Keine doppelten Einträge in game_sessions Tabelle möglich
**Plans:** 1/2 plans executed

Plans:
- [x] 01-01-PLAN.md — SQL RPC functions (accept_open_challenge, accept_targeted_challenge, start_tournament)
- [x] 01-02-PLAN.md — Client-side integration (ChallengePage + TournamentPage updated to use RPCs)

### Phase 2: Subscription Leak Fix
**Goal**: Real-time Supabase-Kanäle werden zuverlässig aufgeräumt bei Navigation
**Depends on**: Phase 1
**Requirements**: BUG-02
**Success Criteria** (what must be TRUE):
  1. Kein Anstieg offener Channels bei schneller Navigation
  2. Konsistentes Cleanup-Pattern in allen betroffenen Pages (GamePage, ChallengePage, TournamentPage, LobbyPage)
  3. Keine Memory-Warnungen im Browser nach längerem Spielen
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Game pages fix (GamePage.tsx + LobbyPage.tsx) — already have useRef, replace unsubscribe with removeChannel
- [ ] 02-02-PLAN.md — Feature pages fix (ChallengePage.tsx + TournamentPage.tsx) — add useRef + replace unsubscribe with removeChannel
- [ ] 02-03-PLAN.md — App.tsx global channel fix — two cleanup paths upgraded to removeChannel

### Phase 3: Auth Security Fix
**Goal**: Username-Enumeration-Angriffe durch vorhersehbares Email-Pattern unterbinden
**Depends on**: Phase 2
**Requirements**: BUG-03
**Success Criteria** (what must be TRUE):
  1. Generierte Emails sind nicht vorhersehbar aus dem Username ableitbar
  2. Bestehende Nutzer können sich weiterhin einloggen
  3. Login und Register funktionieren korrekt mit neuem Email-Schema
**Plans**: TBD

### Phase 4: Error Handling Hardening
**Goal**: Einheitliches typisiertes Error Handling ersetzt fragile catch (err: any) und .single() ohne Checks
**Depends on**: Phase 3
**Requirements**: ERR-01, ERR-02, ERR-03
**Success Criteria** (what must be TRUE):
  1. Kein catch (err: any) mehr im Codebase
  2. Alle .single() Calls prüfen auf error vor Datenzugriff
  3. Error Handler Utility src/lib/errorHandler.ts existiert und wird genutzt
  4. Nutzerfreundliche Fehlermeldungen statt alert() oder stilles Scheitern
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Race Condition Fix | 1/2 | In Progress|  |
| 2. Subscription Leak Fix | 0/3 | Not started | - |
| 3. Auth Security Fix | 0/TBD | Not started | - |
| 4. Error Handling Hardening | 0/TBD | Not started | - |
