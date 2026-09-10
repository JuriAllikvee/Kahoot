# Real-Time Quiz Game (Kahoot-like)

A multiplayer real-time quiz application built with **React (Vite)**, **Tailwind CSS**, and **PocketBase**, deployed on **Coolify**.

**Live PocketBase**: http://pocketbase-bzmqz78h0ehdz5mnq2t4eumx.176.112.158.15.sslip.io

## Features

- **Host (Teacher)**: Create quizzes, manage questions, run games, see results in real-time
- **Players**: Join via code, answer questions, earn points based on speed and correctness
- **Real-time**: PocketBase subscriptions — no polling
- **Security**: Server-side logic via PocketBase hooks — impossible to cheat points
- **Game States**: lobby → question → results → finished

## Data Structure

### Collections

| Collection | Purpose |
|-----------|---------|
| `quizzes` | Quiz templates (can have many questions) |
| `questions` | Questions with options and correct answer |
| `games` | Running game instances |
| `players` | Game participants |
| `answers` | Player answers (server-side scoring) |

### Unique Indexes

- `answers(player, question)` — one answer per question per player
- `players(game, nickname)` — unique nickname per game

## Installation & Setup

### 1. Clone & Dependencies

```bash
git clone https://github.com/JuriAllikvee/Kahoot.git
cd Kahoot
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

The `.env.local` already has the PocketBase URL configured.

### 3. Development

```bash
npm run dev
# http://localhost:5173
```

### 4. Production Build

```bash
npm run build
```

## Routes

- `/` — Home page (choose Host or Play)
- `/host` — Host dashboard (create quizzes, manage games)
- `/play` — Join game (enter code + nickname)

## PocketBase Schema Import

1. Visit PocketBase admin: http://pocketbase-bzmqz78h0ehdz5mnq2t4eumx.176.112.158.15.sslip.io
2. Go to **Settings** → **Import collections**
3. Upload `pb_schema.json` from this repo

## PocketBase Hooks

Server-side logic in `pb_hooks/main.pb.js`:

### 1. Game Code Generation

When a game is created, a unique 6-character code (A-Z, 0-9) is automatically generated.

### 2. Answer Processing & Scoring

```javascript
points = max(500, round(1000 * (1 - elapsed / timeLimit / 2)))
```

For correct answers:
- Get question start time (`game.questionStartedAt`)
- Calculate elapsed time
- Formula rewards fast answers
- Minimum 500 points for correct answer

Incorrect answer: 0 points

**Protection**: Client sends only `optionIndex`. Fields `isCorrect` and `points` are stripped and recalculated server-side.

## API Rules

| Collection | Action | Rule |
|-----------|--------|------|
| `quizzes` | list, view | `isPublished = true \|\| owner = @request.auth.id` |
| `quizzes` | create | `@request.auth.id != ""` |
| `quizzes` | update, delete | `owner = @request.auth.id` |
| `questions` | list, view | `quiz.isPublished = true \|\| quiz.owner = @request.auth.id` |
| `questions` | create, update, delete | `quiz.owner = @request.auth.id` |
| `games` | create | `@request.auth.id != "" && host = @request.auth.id` |
| `games` | update | `host = @request.auth.id` |
| `players` | create | `game.status = "lobby"` (anonymous join allowed) |
| `answers` | create | `game.status = "question" && player.game = game && question = game.currentQuestion` |
| `answers` | list, view | `game.host = @request.auth.id` (only host sees answers) |

## Anti-Cheat Protection

### Problem 1: Client fakes `isCorrect` and `points`

**Solution**: Hook strips these fields and recalculates based on server-side verification.

### Problem 2: Player submits multiple answers per question

**Solution**: Unique index `answers(player, question)` blocks duplicates.

### Problem 3: Player answers after time expires

**Solution**: API rule checks `game.status = "question"`. When host moves to results, status changes and new answers are rejected.

## Dependencies

- **React** 19+ — UI
- **React Router** 6+ — Navigation
- **Tailwind CSS** 4+ — Styling (Telegram-like design)
- **PocketBase SDK** — Database client
- **Vite** — Build tool

## Project Structure

```
Kahoot/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   └── pocketbase.js
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── HostPage.jsx
│   │   └── PlayPage.jsx
│   └── components/
│       ├── AuthModal.jsx
│       └── JoinGame.jsx
├── pb_hooks/
│   └── main.pb.js
├── pb_schema.json
├── package.json
├── vite.config.js
├── index.html
├── README.md
└── REPORT.md
```

## Coolify Deployment

See **COOLIFY_SETUP.md** for full deployment instructions.

Quick summary:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Environment**: `VITE_POCKETBASE_URL=http://pocketbase-bzmqz78h0ehdz5mnq2t4eumx.176.112.158.15.sslip.io`

## License

MIT
