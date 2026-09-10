# Real-Time Quiz Game (Kahoot-like)

Мультиплеерная викторина в реальном времени на **React (Vite)**, **Tailwind CSS** и **PocketBase**, развернутая на **Coolify**.

## Особенности

- **Хост (учитель)**: Создание викторин, управление вопросами, запуск игры, видение результатов в реальном времени
- **Игроки**: Присоединение по коду, ответы на вопросы, подсчет баллов в зависимости от скорости и правильности
- **Реальное время**: Использование PocketBase subscriptions — без polling
- **Безопасность**: Серверная логика через PocketBase hooks — невозможно подделать баллы
- **Состояния игры**: lobby → question → results → finished

## Структура данных

### Коллекции

| Коллекция | Назначение |
|-----------|-----------|
| `quizzes` | Викторины (может быть много вопросов) |
| `questions` | Вопросы с вариантами ответов и правильным ответом |
| `games` | Экземпляры запущенных игр |
| `players` | Участники игры |
| `answers` | Ответы игроков (обработка баллов на сервере) |

### Уникальные индексы

- `answers(player, question)` — один ответ на вопрос на игрока
- `players(game, nickname)` — уникальный никнейм в пределах игры

## Установка и запуск

### 1. Клонирование и зависимости

```bash
git clone https://github.com/DimaAllikvee/pocketbase-quiz-app.git
cd pocketbase-quiz-app
npm install
```

### 2. PocketBase

Скачайте [PocketBase](https://pocketbase.io) и запустите локально:

```bash
./pocketbase serve
```

Перейдите на http://localhost:8090/_ для администрирования.

**Импорт схемы**: Settings → Collections → Import (`pb_schema.json`)

### 3. Переменные окружения

```bash
cp .env.example .env.local
# Отредактируйте .env.local:
VITE_POCKETBASE_URL=http://localhost:8090
```

### 4. Развитие

```bash
npm run dev
# http://localhost:5173
```

### 5. Production сборка

```bash
npm run build
```

## Маршруты

- `/` — Главная страница (выбор: Host или Play)
- `/host` — Панель хоста (создание викторин, управление играми)
- `/play` — Присоединение к игре (код + никнейм)

## PocketBase Hooks

Серверная логика находится в `pb_hooks/main.pb.js`:

### 1. Создание игры (генерация кода)

При создании игры автоматически генерируется 6-значный код (A-Z, 0-9).

**Почему на сервере?** — Клиент не может генерировать гарантированно уникальные коды.

### 2. Обработка ответов (вычисление баллов)

```javascript
points = max(500, round(1000 * (1 - elapsed / timeLimit / 2)))
```

Если ответ правильный:
- Берем время начала вопроса (`game.questionStartedAt`)
- Вычисляем затраченное время
- Формула вознаграждает быстрые ответы
- Минимум 500 баллов за правильный ответ

Если ответ неправильный: 0 баллов

**Защита**: Клиент отправляет только `optionIndex`. Поля `isCorrect` и `points` удаляются и переписываются сервером.

### Развертывание hooks в Coolify

Hooks хранятся в контейнере PocketBase как volume. В `docker-compose.yml` или настройках Coolify:

```yaml
volumes:
  - ./pb_hooks:/pb/pb_hooks
```

После изменения `pb_hooks/main.pb.js`:
1. Пересоберите контейнер (Coolify → Redeploy)
2. Или используйте горячую перезагрузку PocketBase (если включена)

## API Правила

| Коллекция | Действие | Правило |
|-----------|---------|--------|
| `quizzes` | list, view | `isPublished = true \|\| owner = @request.auth.id` |
| `quizzes` | create | `@request.auth.id != ""` |
| `quizzes` | update, delete | `owner = @request.auth.id` |
| `questions` | list, view | `quiz.isPublished = true \|\| quiz.owner = @request.auth.id` |
| `questions` | create, update, delete | `quiz.owner = @request.auth.id` |
| `games` | create | `@request.auth.id != "" && host = @request.auth.id` |
| `games` | update | `host = @request.auth.id` |
| `players` | create | `game.status = "lobby"` (аноним может присоединиться) |
| `answers` | create | `game.status = "question" && player.game = game && question = game.currentQuestion` |
| `answers` | list, view | `game.host = @request.auth.id` (только хост видит ответы) |

## Защита от читерства

### Проблема 1: Клиент подделывает `isCorrect` и `points`

**Решение**: Hook удаляет эти поля и переписывает их на основе проверки сервера.

### Проблема 2: Игрок отправляет несколько ответов на один вопрос

**Решение**: Уникальный индекс `answers(player, question)` блокирует повторные попытки.

### Проблема 3: Игрок отвечает после истечения времени

**Решение**: API rule проверяет `game.status = "question"`. Когда хост переходит к результатам, статус меняется, и новые ответы отклоняются.

**Оставшаяся уязвимость**: Определение момента окончания времени на клиенте. Игрок с манипулированными часами может отправить ответ после истечения таймера. **Решение**: На сервере проверить `elapsed < timeLimit` в hook'е и отклонить просроченные ответы.

## Зависимости

- **React** 19+ — UI
- **React Router** 6+ — Навигация
- **Tailwind CSS** 4+ — Стили (Telegram-подобный дизайн)
- **PocketBase SDK** — Клиент БД
- **Vite** — Сборщик

## Файловая структура

```
pocketbase-quiz-app/
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
└── README.md
```

## Лицензия

MIT
