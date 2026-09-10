# Coolify Deployment Configuration

## Build Pipeline Settings for pocketbase-quiz-app

### Fill in these fields in Coolify:

| Field | Value |
|-------|-------|
| **Build strategy** | Railpack |
| **Site type** | Static (не Dynamic) |
| **Base directory** | `/` |
| **Publish directory** | `dist` |
| **Install command** | `npm install` |
| **Build command** | `npm run build` |
| **Start command** | (leave empty - static site) |
| **Watch paths** | `src/**` |
| **Builder selection** | Deployment server |

### Environment Variables

Add these in Coolify environment variables:

```
VITE_POCKETBASE_URL=https://your-pocketbase-instance.com
NODE_ENV=production
```

### Docker Compose (if using)

```yaml
version: '3.8'
services:
  quiz-app:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./:/app
      - ./dist:/app/dist
    environment:
      - VITE_POCKETBASE_URL=https://your-pocketbase.com
      - NODE_ENV=production
    command: sh -c "npm install && npm run build"
    ports:
      - "5173:5173"

  pocketbase:
    image: pbaa/pocketbase:latest
    volumes:
      - ./pb_data:/pb/pb_data
      - ./pb_hooks:/pb/pb_hooks
    environment:
      - DEBUG=false
    ports:
      - "8090:8090"
    command: serve --http=0.0.0.0:8090
```

### Deployment Steps

1. **Set Base directory**: `/` (где находится package.json)
2. **Set Publish directory**: `dist` (вывод Vite после сборки)
3. **Install command**: `npm install` — установит зависимости
4. **Build command**: `npm run build` — соберет оптимизированный bundle
5. **Environment**: Добавьте `VITE_POCKETBASE_URL` с адресом вашего PocketBase
6. **Click Deploy** — Coolify запустит конвейер

### What Each Command Does

```bash
npm install
# Устанавливает node_modules из package.json

npm run build
# Запускает Vite: 
# - Компилирует JSX в JS
# - Минифицирует CSS
# - Создает dist/ с оптимизированными файлами

# Не нужен Start command — это статический сайт!
# Coolify сам раздает файлы из dist/ через web-server
```

### Important Notes

- **Site type**: Выберите **Static**, не Dynamic (это чистый React SPA, не Node.js server)
- **Publish directory**: Должно быть `dist` (это то, где Vite выпускает готовый сайт)
- **No Start command**: Vite build создает статические файлы — server не нужен
- **PocketBase отдельно**: Если PocketBase тоже на Coolify, создайте отдельный сервис

### Проверка после Deploy

```bash
# Проверьте, что dist/ содержит:
dist/
├── index.html
├── assets/
│   ├── main.*.js
│   ├── index.*.css
│   └── ...
```

Если видите `dist/index.html` — deployment успешен! ✅
