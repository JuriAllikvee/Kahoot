# РЕШЕНИЕ: Игра не запускается

## Проблема
Лобби создается ✓, игроки заходят ✓, но Start game не работает ✗

## Причина
В коллекции `games` не хватает 3 полей для управления игрой.

## Исправление (1 минута)

### Откройте PocketBase Admin
http://pocketbase-bzmqz78h0ehdz5mnq2t4eumx.176.112.158.15.sslip.io/_/

### Импортируйте схему
1. Settings → Import collections
2. Выберите `pb_schema.json` из репозитория
3. Review → Import

✅ Готово! Все поля добавлены.

## Проверка
1. Создайте новое лобби как host
2. Зайдите как игрок (код + имя)
3. Нажмите "Start game"
4. ✓ Вопрос появится с таймером

## Что изменено
`pb_schema.json` теперь содержит:
- questionDeadline (Date) — время окончания вопроса
- questionSnapshot (JSON) — данные вопроса
- questionPosition (Number) — номер текущего вопроса

Файл готов к импорту в PocketBase.
