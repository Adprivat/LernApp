# Requirements: LernApp Stabilisierung

**Defined:** 2026-03-30
**Core Value:** Nutzer können jederzeit stabil und sicher gegeneinander spielen — ohne Race Conditions, Memory Leaks oder Sicherheitslücken.

## v1 Requirements

### Bug Fixes

- [x] **BUG-01**: Race Condition bei Challenge-Annahme verhindert doppelte Game Sessions
- [x] **BUG-02**: Real-time Subscription Leaks bei Navigation zwischen Seiten behoben
- [ ] **BUG-03**: Username-Enumeration-Lücke in der Auth-Schicht geschlossen

### Error Handling

- [ ] **ERR-01**: Alle `.single()` Supabase-Queries prüfen auf Fehler und fehlende Daten
- [ ] **ERR-02**: `catch (err: any)` durch typisierte Error-Handler-Utility ersetzt
- [ ] **ERR-03**: Nutzerfreundliche Fehlermeldungen bei DB-Fehlern (kein stilles Scheitern)

## v2 Requirements

### Testing

- **TEST-01**: Unit Tests für kritische Store-Logik (gameStore, authStore)
- **TEST-02**: Integration Tests für Multiplayer-Flow
- **TEST-03**: E2E Tests für Auth-Flow

### Monitoring

- **MON-01**: Error Logging / Monitoring Service (z.B. Sentry)
- **MON-02**: Performance Monitoring für Echtzeit-Kanäle

## Out of Scope

| Feature | Reason |
|---------|--------|
| Neue UI-Features | Erst Stabilisierung, dann Erweiterung |
| DB-Schema-Änderungen | Zu riskant ohne Migrations-Tooling |
| Server-seitige Username-Email Migration | Aufwand unverhältnismäßig für diesen Scope |
| Testing-Framework einrichten | v2 — erst Bugs fixen |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 1 | Complete |
| BUG-02 | Phase 2 | Complete |
| BUG-03 | Phase 3 | Pending |
| ERR-01 | Phase 4 | Pending |
| ERR-02 | Phase 4 | Pending |
| ERR-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after initial definition*
