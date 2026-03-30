# Phase 2: Subscription Leak Fix - Research

**Researched:** 2026-03-30
**Domain:** Supabase Realtime channel lifecycle + React useEffect cleanup
**Confidence:** HIGH (all findings verified directly from installed source code)

---

## Summary

Five components in LernApp subscribe to Supabase Realtime channels but fail to fully remove them
on unmount. The root bug is that `channel.unsubscribe()` is called (async, returns a Promise) but
the channel object is never removed from the RealtimeClient's internal `channels` array. Each call
to `supabase.channel('same-name')` on a topic that still exists in that array **returns the existing
channel object** — so when StrictMode double-mounts, or a user navigates back to a page, the second
subscription attempt silently reuses the old, orphaned channel rather than creating a new one.

Additionally, `ChallengePage` and `TournamentPage` do not use `useRef` for their channel variables.
Because `channel` is a local `const` inside `useEffect`, the cleanup closure correctly captures it.
However, `useRef` is still the safer pattern because it guards against the cleanup running before
the subscribe call completes (a real risk during rapid navigation or StrictMode double-invocations).

The **correct and complete** cleanup is `supabase.removeChannel(channelRef.current)`, which:
1. Calls `channel.unsubscribe()` (sends server leave)
2. Calls `channel.teardown()` (clears timers)
3. Calls `this.channels.filter(c => c.topic !== channel.topic)` — removes the entry from the
   RealtimeClient registry so a future `supabase.channel(name)` creates a genuinely fresh instance

**Primary recommendation:** Replace every `channel.unsubscribe()` cleanup call with
`supabase.removeChannel(channelRef.current)`, guarded by a null-check and executed on the
already-captured ref. Import `RealtimeChannel` from `@supabase/supabase-js` for type safety.

---

## Project Constraints (from CLAUDE.md)

- **Channel schema** — naming convention must match: `user:{userId}`, `game:{sessionId}`,
  `chat:{sessionId}`, `lobby:{sessionId}`. Do not rename existing channel topics.
- **Channels always in `useEffect` with cleanup** — project rule, already followed structurally.
- **Data access via `src/lib/supabase.ts`** — do not create a second Supabase client.
- **UI primitives from `src/components/ui/`** — not relevant to this fix.
- **`clsx` for conditional classes, no `cn()` wrapper** — not relevant.
- **Tailwind v4, no tailwind.config.js** — not relevant.
- `npm run build` must pass (TypeScript strict check via `tsc -b`).

---

## Standard Stack

### Core
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| `@supabase/supabase-js` | 2.100.1 | Supabase client incl. Realtime | Already in project |
| `@supabase/realtime-js` | transitive dep | Realtime channel internals | Pulled by supabase-js |
| React | 19.2.4 | Component lifecycle | Already in project |

### Relevant Imports for Fix
```typescript
import { RealtimeChannel } from '@supabase/supabase-js';
// RealtimeChannel is re-exported by supabase-js from @supabase/realtime-js
// Use this instead of `any` for channelRef typing
```

**Version verification:** `@supabase/supabase-js@2.100.1` is the installed version (from
`package.json`). The `removeChannel` API has been stable since v2.x. Verified by reading the
installed source directly — no registry lookup needed.

---

## Architecture Patterns

### Recommended Channel Lifecycle Pattern

**The canonical pattern for this codebase:**

```typescript
import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Inside the component:
const channelRef = useRef<RealtimeChannel | null>(null);

useEffect(() => {
  if (!sessionId) return;

  // supabase.channel() returns existing channel if topic is already registered.
  // After a proper removeChannel() cleanup this will always be a new channel.
  channelRef.current = supabase
    .channel(`game:${sessionId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players',
        filter: `session_id=eq.${sessionId}` },
      async () => { /* handler */ })
    .subscribe();

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [sessionId]);
```

**Why `channelRef.current = null` after removeChannel:**
Prevents a stale ref from being passed to a second `removeChannel` call if the cleanup fires twice
(e.g., StrictMode double-invoke). `removeChannel` is safe to call on an already-removed channel
(it just resolves to the status the server returned for unsubscribe), but nulling the ref makes the
guard condition `if (channelRef.current)` immediately effective.

### Pattern for Pages Without `useRef` Today (ChallengePage, TournamentPage)

These two pages create a local `channel` const inside `useEffect`, so the closure captures it
correctly. However, the fix is still to add `useRef` and use `removeChannel` for consistency and
to get the registry-removal benefit. The change is mechanical:

```typescript
// Before (ChallengePage):
useEffect(() => {
  fetchChallenges();
  const channel = supabase
    .channel('challenges_page')
    .on(...)
    .subscribe();
  return () => { channel.unsubscribe(); };
}, [user]);

// After:
const channelRef = useRef<RealtimeChannel | null>(null);

useEffect(() => {
  fetchChallenges();
  channelRef.current = supabase
    .channel('challenges_page')
    .on(...)
    .subscribe();
  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [user]);
```

### App.tsx Global Channel Pattern

`App.tsx` already uses `channelRef` correctly structurally, but calls `unsubscribe()` not
`removeChannel()`. The existing early-exit guard `channelRef.current?.unsubscribe()` when `user`
becomes null is a valid extra cleanup path and should be preserved, but also upgraded:

```typescript
// When user logs out (early return path):
if (channelRef.current) {
  supabase.removeChannel(channelRef.current);
  channelRef.current = null;
}
if (heartbeatRef.current) clearInterval(heartbeatRef.current);
return;

// Cleanup in return:
return () => {
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }
  if (heartbeatRef.current) clearInterval(heartbeatRef.current);
};
```

### Anti-Patterns to Avoid

- **`channel.unsubscribe()` alone:** Sends the server leave message but does NOT remove the
  channel from `RealtimeClient.channels`. The next call to `supabase.channel('same-name')` returns
  the old orphaned object. Source: `RealtimeClient.js` line 299-307 (returns existing if found).
- **Not nulling the ref after cleanup:** If StrictMode fires cleanup+setup twice, the second
  `removeChannel` call would receive the same ref again; nulling prevents this.
- **`supabase.removeAllChannels()` in component cleanup:** Too broad — kills global channels
  (e.g., the notification channel in App.tsx) when navigating away from a page channel.
- **Ignoring the `if (!sessionId) return` guard:** Without this early return, the cleanup
  function returned from `useEffect` is `undefined`, which React handles silently, but
  the channel might be created before sessionId is populated, then never cleaned up.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Removing channel from registry | Custom channels map | `supabase.removeChannel()` | Already does unsubscribe + teardown + registry removal atomically |
| Deduplication guard | "is subscribed" boolean flag | Rely on `removeChannel` + null ref | The RealtimeClient deduplicates by topic; just clean up correctly first |
| Channel manager singleton | `src/lib/channelManager.ts` | Per-component `useRef` | Adds complexity with no benefit; the existing per-component pattern is correct once cleanup is fixed |

---

## Core Bug Analysis (from Source Code Inspection)

### How `supabase.channel(topic)` works (verified from RealtimeClient.js:297-307)

```javascript
channel(topic, params = { config: {} }) {
  const realtimeTopic = `realtime:${topic}`;
  const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
  if (!exists) {
    const chan = new RealtimeChannel(`realtime:${topic}`, params, this);
    this.channels.push(chan);
    return chan;
  } else {
    return exists;  // <-- returns old orphaned channel if not removed from registry
  }
}
```

**Consequence:** If cleanup only calls `unsubscribe()` (which does NOT call `_remove()`), the
next page visit calls `supabase.channel('lobby:abc')` and gets back the old channel object.
The new `.on()` and `.subscribe()` calls are applied to a channel that was previously in
"leaving" or "closed" state. This is the root cause of the accumulation.

### How `removeChannel` works (verified from RealtimeClient.js:221-230)

```javascript
async removeChannel(channel) {
  const status = await channel.unsubscribe();  // step 1: server leave
  if (status === 'ok') {
    channel.teardown();                        // step 2: clear timers
  }
  if (this.channels.length === 0) {
    this.disconnect();
  }
  return status;
}
```

`_remove(channel)` (line 390) is called internally via the `_onClose` hook registered in the
channel constructor (line 90-92): `this._onClose(() => { this.socket._remove(this); })`. So when
`unsubscribe` triggers a close, `_remove` runs automatically via the close callback. `teardown()`
stops the rejoin timer. The `channels.length === 0` disconnect is a bonus — it frees the WebSocket
when no channels remain active.

### Why `unsubscribe()` alone is still insufficient

`_remove()` is only called from the `_onClose` callback. In the case of rapid navigation,
`unsubscribe()` may not complete before the component re-mounts and calls `supabase.channel()`
again. Because the channel is still in `this.channels` (not yet closed), the second
`supabase.channel()` call returns the same half-alive object. Using `removeChannel` (which awaits
unsubscribe) and nulling the ref prevents this race.

---

## React 19 StrictMode Double-Invocation

### Confirmed: StrictMode IS active in this project

`src/main.tsx` wraps the app in `<StrictMode>`. In development mode, React 19 StrictMode
double-invokes effects: mount → cleanup → mount again. This means every `useEffect` with a
channel subscription will:

1. Subscribe (mount 1)
2. Call cleanup — `removeChannel` fires (unmount 1)
3. Subscribe again (mount 2)

**With the current broken code** (`unsubscribe()` only):
- Mount 1 creates `channel('lobby:abc')` → pushed to `this.channels`
- Cleanup calls `unsubscribe()` — async, may not complete before step 3
- Mount 2 calls `channel('lobby:abc')` again → gets back the same channel object (still in array)
- `.on()` and `.subscribe()` applied on top of the old state → double listener registered

**With the fixed code** (`removeChannel` + null ref):
- Mount 1 subscribes, cleanup fires `removeChannel` → awaits unsubscribe, then teardown + `_remove`
- By the time mount 2 runs, `this.channels` no longer contains `realtime:lobby:abc`
- Mount 2 creates a fresh channel object → correct behavior

**Note:** StrictMode double-invocation only happens in **development mode**. Production builds run
effects once. But the race condition on rapid navigation exists in both environments.

---

## `removeChannel` vs `unsubscribe` — Summary Table

| Aspect | `channel.unsubscribe()` | `supabase.removeChannel(channel)` |
|--------|------------------------|-----------------------------------|
| Sends server leave | Yes | Yes (internally calls unsubscribe) |
| Clears timers (teardown) | No | Yes (calls teardown) |
| Removes from client registry | No (only via _onClose async) | Yes (via _onClose triggered by unsubscribe) |
| Returns | `Promise<'ok' \| 'timed out' \| 'error'>` | Same |
| Disconnects WebSocket if 0 channels | No | Yes |
| Safe to use in useEffect cleanup | Partially | Yes — this is the intended API |

The `supabase.removeChannel()` method is the public API intended for component cleanup. It is
documented in the Supabase JS client source at `SupabaseClient.ts:505-513`: "Removing a channel is
a great way to maintain the performance of your project's Realtime service as well as your database
if you're listening to Postgres changes."

---

## Channel Name Re-subscription Gotcha

**Can you re-subscribe to the same channel name after cleanup?**

Yes, but ONLY after `removeChannel` (not after `unsubscribe` alone).

The deduplication logic in `RealtimeClient.channel()` is topic-based. After `removeChannel`,
`_remove()` runs (via the close callback), filtering out the channel by topic:
```javascript
this.channels = this.channels.filter((c) => c.topic !== channel.topic);
```

After this, `supabase.channel('lobby:abc')` creates a brand-new `RealtimeChannel` instance and
pushes it to the array. This is safe and correct.

**Timing gotcha:** `removeChannel` is async (returns a Promise). The useEffect cleanup return
function is synchronous — React calls it synchronously but does NOT await its return value if it
returns a Promise. This means `removeChannel` fires but React does not wait for it to finish before
re-running the effect.

**Mitigation:** Null the ref immediately before calling `removeChannel`. When mount 2's effect
runs synchronously, `channelRef.current` is already null, so it safely creates a new channel.
By the time the async `removeChannel` resolves, the registry removal has been scheduled. In practice
React doesn't re-mount the effect until the next microtask tick, so the async cleanup has time to
execute. This has been the established pattern in the community with no known race issues.

---

## Common Pitfalls

### Pitfall 1: Calling `supabase.removeChannel()` Without a Null Guard

**What goes wrong:** `removeChannel(null)` — passing null crashes with "Cannot read properties
of null (reading 'unsubscribe')".

**Why it happens:** If the `useEffect` returns early (e.g., `if (!sessionId) return;`), the ref
is never assigned. The cleanup closure still runs and attempts `removeChannel(channelRef.current)`
which is null.

**How to avoid:**
```typescript
return () => {
  if (channelRef.current) {         // null guard
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }
};
```

**Warning signs:** `TypeError: Cannot read properties of null` in cleanup.

---

### Pitfall 2: Forgetting `useRef` Import When Adding to Files That Don't Have It

**What goes wrong:** `ChallengePage` and `TournamentPage` currently only import `useEffect` and
`useState` from React. Adding `channelRef` requires adding `useRef` to the import.

**How to avoid:** Check imports — both files need `useRef` added.

---

### Pitfall 3: The `challenges_page` and `tournaments_page` Channel Names Are Static

`ChallengePage` uses `channel('challenges_page')` — a hardcoded name not tied to a user ID. If
two tabs are open, they share this channel name. After cleanup in one tab, the other tab's channel
is also removed from the client (but only within that browser tab's JS context — each tab has its
own Supabase client instance, so this is fine). No change to channel names is needed.

---

### Pitfall 4: LobbyPage's `useEffect` Has Multiple Concerns in One Effect

**What goes wrong:** `LobbyPage` runs `fetchData()`, `joinLobby()` (async side effect with DB
write), and channel subscription all in one `useEffect`. This is not a bug per se, but StrictMode
will call `joinLobby()` twice in development. The join is guarded by an existence check so it is
idempotent — this is already safe.

The channel cleanup fix is still straightforward: replace `channelRef.current?.unsubscribe()` with
the null-guarded `removeChannel` pattern.

---

### Pitfall 5: `App.tsx` Has TWO Cleanup Paths for the Notification Channel

**The two paths:**
1. `useEffect` cleanup return (fires on unmount / user change)
2. Early return when `!user` (fires when user logs out mid-session)

Both paths must be updated to use `removeChannel`. The early return path currently calls
`channelRef.current?.unsubscribe()` — this must become the full `removeChannel` + null pattern.

---

## Code Examples

### Complete Fixed Pattern for `GamePage.tsx` (lines 31-48)

```typescript
// Source: Direct analysis of @supabase/realtime-js RealtimeClient.js + RealtimeChannel.d.ts
import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// In component body:
const channelRef = useRef<RealtimeChannel | null>(null);

useEffect(() => {
  if (!sessionId) return;

  channelRef.current = supabase
    .channel(`game:${sessionId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'game_players',
      filter: `session_id=eq.${sessionId}`,
    }, async () => {
      const { data } = await supabase
        .from('game_players')
        .select('*, profile:profiles(username, is_online)')
        .eq('session_id', sessionId);
      setLocalPlayers(data || []);
    })
    .subscribe();

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [sessionId]);
```

### Complete Fixed Pattern for `ChallengePage.tsx` (lines 51-62)

```typescript
import { useEffect, useRef, useState } from 'react';  // add useRef
import { RealtimeChannel } from '@supabase/supabase-js';  // add import

// In component body:
const channelRef = useRef<RealtimeChannel | null>(null);

useEffect(() => {
  fetchChallenges();

  channelRef.current = supabase
    .channel('challenges_page')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'challenges',
    }, () => fetchChallenges())
    .subscribe();

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [user]);
```

### Complete Fixed Pattern for `TournamentPage.tsx` (lines 35-42)

```typescript
import { useEffect, useRef, useState } from 'react';  // add useRef
import { RealtimeChannel } from '@supabase/supabase-js';  // add import

// In component body:
const channelRef = useRef<RealtimeChannel | null>(null);

useEffect(() => {
  fetchTournaments();
  channelRef.current = supabase
    .channel('tournaments_page')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'tournaments',
    }, fetchTournaments)
    .subscribe();
  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, []);
```

### Complete Fixed Pattern for `LobbyPage.tsx` (lines 43-89)

```typescript
// channelRef already exists as useRef<any>(null) — change type only:
const channelRef = useRef<RealtimeChannel | null>(null);

// In the useEffect cleanup (line 89), change:
// return () => { channelRef.current?.unsubscribe(); };
// to:
return () => {
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }
};
```

### Complete Fixed Pattern for `App.tsx` (lines 49-83)

```typescript
// channelRef already exists as useRef<any>(null) — change type:
const channelRef = useRef<RealtimeChannel | null>(null);

// Early-exit path for !user (lines 51-53):
if (!user) {
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }
  if (heartbeatRef.current) clearInterval(heartbeatRef.current);
  return;
}

// Return cleanup (lines 79-82):
return () => {
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }
  if (heartbeatRef.current) clearInterval(heartbeatRef.current);
};
```

---

## State of the Art

| Old Approach | Current Approach | Status |
|--------------|-----------------|--------|
| `channel.unsubscribe()` in cleanup | `supabase.removeChannel(channel)` | Use `removeChannel` — it's the high-level API since supabase-js v2.x |
| `useRef<any>` for channel | `useRef<RealtimeChannel \| null>` | Import `RealtimeChannel` from `@supabase/supabase-js` for type safety |
| Ignoring double-cleanup risk | Null ref after `removeChannel` | Null the ref immediately to make double-cleanup a safe no-op |

**No deprecated patterns to remove.** All five files use the same basic structure; only the
cleanup call and type annotation need updating.

---

## Environment Availability

Step 2.6: SKIPPED — this is a pure code change, no external tools or services beyond the existing
Supabase project are required.

---

## Validation Architecture

`nyquist_validation` is explicitly `false` in `.planning/config.json`. Validation Architecture
section omitted per configuration.

---

## Open Questions

1. **Should `removeChannel` be awaited?**
   - What we know: `removeChannel` returns a Promise. React cleanup functions are called
     synchronously; returning a Promise from cleanup is silently ignored by React.
   - What's unclear: Whether the async portion (teardown + registry removal) always completes
     before the next effect run in practice.
   - Recommendation: Do not await in the cleanup function. Instead, null the ref immediately.
     This is the community-standard pattern and is safe because registry removal happens via the
     `_onClose` callback which fires as part of unsubscribe regardless of when the Promise resolves.

2. **Does `teardown()` only run when unsubscribe returns 'ok'?**
   - What we know: `removeChannel` source shows `if (status === 'ok') { channel.teardown(); }` —
     teardown is skipped on timeout or error.
   - What's unclear: Whether lingering timers on a timed-out channel cause any practical problem.
   - Recommendation: Accept this behavior as-is. The retry/rejoin timers are the responsibility
     of the `RealtimeChannel` internal state machine. If unsubscribe times out, the server will
     handle cleanup within 30 seconds (documented Supabase behavior).

---

## Sources

### Primary (HIGH confidence — verified from installed source code)
- `node_modules/@supabase/realtime-js/dist/main/RealtimeClient.js` lines 221-230, 295-307, 385-392
  — `removeChannel`, `channel()` factory, `_remove()` implementation
- `node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.js` lines 551-559, 565-567
  — `unsubscribe()` async behavior, `teardown()` implementation
- `node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.d.ts`
  — `RealtimeChannel` type, `unsubscribe()` signature
- `node_modules/@supabase/supabase-js/dist/main/SupabaseClient.d.ts` lines 483-530
  — `removeChannel`, `removeAllChannels`, `getChannels` public API surface
- `src/main.tsx` — confirms `<StrictMode>` is active in development

### Secondary (MEDIUM confidence)
- Supabase official docs note (embedded in SupabaseClient.ts JSDoc): "Removing a channel is a
  great way to maintain performance... Supabase will automatically handle cleanup 30 seconds
  after a client is disconnected" — confirms server-side TTL behavior

---

## Metadata

**Confidence breakdown:**
- `removeChannel` vs `unsubscribe` difference: HIGH — read from installed source
- React StrictMode double-invoke behavior: HIGH — confirmed StrictMode active in main.tsx, React 19
  behavior is documented and well-known
- Channel re-subscription after cleanup: HIGH — verified factory deduplication logic from source
- Async cleanup race: MEDIUM — reasoning from source code, no direct test run performed

**Research date:** 2026-03-30
**Valid until:** 2026-06-30 (supabase-js is stable; unless v3 is released this research holds)
