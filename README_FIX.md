# Исправление: игра не запускается

## Проблема
Лобби создается, игроки заходят, но кнопка "Start game" не работает.

## Решение (1 минута)

### 1. Откройте PocketBase Admin
http://pocketbase-bzmqz78h0ehdz5mnq2t4eumx.176.112.158.15.sslip.io/_/

### 2. Импортируйте схему
- **Settings** → **Import collections**
- Выберите файл `pb_schema.json`
- **Review** → **Import**

✅ Готово!

## Проверка
1. Создайте новое лобби
2. Зайдите как игрок
3. Нажмите "Start game"
4. Вопрос должен появиться

## Что добавлено
В коллекцию `games` добавлены поля:
- `questionDeadline` (Date)
- `questionSnapshot` (JSON)
- `questionPosition` (Number)
