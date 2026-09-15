# Schema Migration: Add Missing Game State Fields

## Problem
The `games` collection is missing fields required for the server-authoritative gameplay lifecycle:
- `questionDeadline` (date) — server deadline for accepting answers
- `questionSnapshot` (json) — frozen question data at game start
- `questionPosition` (number) — current question index
- `capabilityHash` (text) in `players` — SHA256 for session tokens

## Required Changes

### 1. Add fields to `games` collection

In PocketBase Admin → Collections → games → Edit:

**Field: questionDeadline**
- Type: `date`
- Required: No
- Presentable: No

**Field: questionSnapshot**
- Type: `json`
- Required: No
- Presentable: No

**Field: questionPosition**
- Type: `number`
- Required: No
- Presentable: No
- Only integers: Yes
- Min: 0

### 2. Add field to `players` collection

In PocketBase Admin → Collections → players → Edit:

**Field: capabilityHash**
- Type: `text`
- Required: No
- Presentable: No
- Min: 64
- Max: 64
- Pattern: `^[a-f0-9]{64}$`

### 3. Update API Rules

Games collection rules already allow empty listRule/viewRule (custom routes handle authorization).

### 4. Verify Hooks Are Active

Check that `pb_hooks/main.pb.js` and `pb_hooks/quiz.js` are deployed on the server and restart PocketBase.

### 5. Test

1. Create a lobby as host
2. Join as a player
3. Click "Start game" — should transition to `status=question`
4. Player should see question and timer
5. Submit answer before deadline
6. Host clicks "Show results now" — should show correct answer and scores

## Migration Script (Optional)

If you have existing games, run this in PocketBase console (Admin → Logs → Console):

```javascript
const games = $app.dao().findRecordsByExpr('games');
for (const game of games) {
  if (!game.get('questionPosition')) game.set('questionPosition', 0);
  if (!game.get('questionSnapshot')) game.set('questionSnapshot', []);
  if (!game.get('questionDeadline')) game.set('questionDeadline', '');
  $app.dao().saveRecord(game);
}
```

## Verification

After adding fields, verify schema has all required fields:

```bash
# In PocketBase Admin, export collections and check:
games:
  - code (text, unique)
  - status (select: lobby|question|results|finished)
  - currentQuestion (relation -> questions)
  - questionStartedAt (date)
  - questionDeadline (date) ← NEW
  - questionSnapshot (json) ← NEW
  - questionPosition (number) ← NEW

players:
  - capabilityHash (text, 64 chars) ← NEW
```

## Impact

- **Backward compatible**: Existing games will have NULL values; hooks initialize on first control action
- **No data loss**: Old games remain viewable
- **Frontend unchanged**: React components already consume these fields via /api/quiz/{game}/state
