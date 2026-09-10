# Quiz Game — REPORT.md

## Architecture & Game States

### State Diagram

```
┌─────────┐
│  lobby  │ ← Host starts game, players join
└────┬────┘
     │ host: startQuestion()
     ▼
┌──────────┐
│ question │ ← Show question, players answer
└────┬─────┘
     │ timeout || host: nextQuestion()
     ▼
┌─────────┐
│ results │ ← Show results for this question
└────┬────┘
     │ lastQuestion? → finished : back to question
     ▼
┌──────────┐
│ finished │ ← Final leaderboard
└──────────┘
```

**Who changes state:**
- **Host** (`games.host`) — updates `games.status` and `games.currentQuestion`
- **System** (PocketBase rules) — blocks incompatible operations
- **Clients** — listen to changes via `pb.collection('games').subscribe()`

### Points Security Model

#### Problem 1: Client fakes points

**Threat**: Player sends answer with `isCorrect: true, points: 1000`

**Solution**: PocketBase hook on answer creation:
1. Strips `isCorrect` and `points` from request
2. Fetches question and compares `optionIndex` with `correctIndex`
3. Calculates points server-side using formula
4. Sets final values

**Code**:
```javascript
onRecordCreateRequest((e) => {
  e.record.isCorrect = undefined;
  e.record.points = undefined;
  
  const question = $app.dao().findRecordById('questions', e.record.question);
  e.record.isCorrect = question.correctIndex === e.record.optionIndex;
  
  if (e.record.isCorrect) {
    // Calculate points...
  }
  e.record.points = points;
});
```

#### Problem 2: Multiple answers per question

**Threat**: Player submits multiple answers, system accepts best one

**Solution**: Unique index in PocketBase
```sql
UNIQUE(answers.player, answers.question)
```

Duplicate attempts fail with 409 Conflict.

#### Problem 3: Late answers after timeout

**Threat**: Client ignores `timeLimit` and submits answer later

**Current solution**: API rule checks `game.status = "question"`
```javascript
createRule: "game.status = \"question\" && ..."
```

When host sees results, status changes to `"results"` and new answers are rejected.

**Remaining vulnerability**: If host delays clicking Next, there's a window.

**Enhancement**: Add server-side time check in hook:
```javascript
const elapsed = (now - startTime) / 1000;
if (elapsed > question.timeLimit + 2) { // +2 sec buffer
  throw new BadRequestError("Answer submitted too late");
}
```

#### Problem 4: Changing answer after submission

**Solution**: `answers` create-only — no update rule.
Player cannot modify answer. Host can delete (but score not auto-recalculated).

### Remaining Risks

1. **Local clock manipulation** — requires server-side time verification (see above)
2. **Network latency** — needs +1-2 sec buffer in time check
3. **Browser dev tools** — attacker can modify localStorage, but won't affect server-calculated scores

---

## Deploying PocketBase Hooks

### Locally

1. Download [PocketBase](https://pocketbase.io)
2. Create `pb_hooks` folder in root
3. Place `main.pb.js` in `pb_hooks/`
4. Run PocketBase:
   ```bash
   ./pocketbase serve
   ```
5. Hooks auto-load and recompile on file changes

### On Coolify

1. In `docker-compose.yml` or PocketBase container config, add volume:
   ```yaml
   volumes:
     - ./pb_hooks:/pb/pb_hooks
   ```

2. Redeploy after hook changes:
   ```bash
   coolify redeploy <service_id>
   ```

3. Or edit `pb_hooks/main.pb.js` via Coolify File Storage with auto-reload

### Debugging

- PocketBase logs: `./pocketbase logs` or Coolify Dashboard
- Test hooks locally before deploying
- Check JavaScript syntax in hooks (PocketBase uses Go interpreter)

---

## What's Implemented

✅ **Done**:
- Database schema with collections and indexes
- Server-side game code generation
- PocketBase hooks for answer processing and point calculation
- API rules for authorization
- React components: Home, Auth, JoinGame, HostPage
- Telegram-style design (Tailwind CSS)
- Real-time subscriptions (no polling)

❌ **Next Steps (TODO)**:
- Question editor UI on host
- Player game screen (question + timer + options)
- Results screen with answer distribution
- Final leaderboard
- QR code for quick join
- Audio signals on start/end
- Game history & replay
- Prevent joining mid-game

---

## Issues & Solutions

### 1. Hooks don't auto-reload on Coolify

**Solution**: Add `docker-entrypoint.sh` for rebuild or use PocketBase hot reload.

### 2. Syntax error in hook kills entire PocketBase

**Solution**: Test locally. Check logs carefully — PocketBase may not give clear error messages.

### 3. Race condition: two games get same code

**Solution**: Unique index on `games.code` + retry logic (up to 10 attempts).

---

## Summary

This project demonstrates:
- **Security** via server-side hooks (impossible to cheat)
- **Real-time sync** across many clients
- **Complex state** with multiple participants
- **Proper role separation** (host vs player) in single app

Next: Game UI, Q&A real-time, history tracking.
