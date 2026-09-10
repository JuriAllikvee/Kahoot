// pb_hooks/answers.pb.js
// Hook для обработки создания ответов
// Генерирует код игры и вычисляет точки

onRecordCreateRequest((e) => {
  if (e.record.collection === 'answers') {
    // Удаляем клиентские попытки подделать значения
    e.record.isCorrect = undefined;
    e.record.points = undefined;

    try {
      // Получаем вопрос и ответ
      const question = $app
        .dao()
        .findRecordById('questions', e.record.question);

      // Проверяем правильность ответа
      const isCorrect = question.correctIndex === e.record.optionIndex;
      
      // Вычисляем точки (только если ответ правильный)
      let points = 0;
      if (isCorrect) {
        // Получаем игру для времени начала вопроса
        const player = $app.dao().findRecordById('players', e.record.player);
        const game = $app.dao().findRecordById('games', player.game);
        
        const startTime = new Date(game.questionStartedAt).getTime();
        const now = new Date().getTime();
        const elapsed = (now - startTime) / 1000; // в секундах
        
        const timeLimit = question.timeLimit || 20;
        
        // Формула: 1000 * (1 - elapsed / timeLimit / 2), минимум 500
        const calculatedPoints = Math.max(
          500,
          Math.round(1000 * (1 - elapsed / timeLimit / 2))
        );
        
        points = calculatedPoints;
      }

      // Устанавливаем вычисленные значения
      e.record.isCorrect = isCorrect;
      e.record.points = points;

      // Обновляем score игрока
      const player = $app.dao().findRecordById('players', e.record.player);
      player.score = (player.score || 0) + points;
      $app.dao().saveRecord(player);
    } catch (err) {
      throw new BadRequestError('Failed to process answer: ' + err.message);
    }
  }
}, 'answers');

onRecordCreateRequest((e) => {
  if (e.record.collection === 'games') {
    try {
      // Генерируем код игры на сервере (6 символов, A-Z, 0-9)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Проверяем уникальность кода
      let attempts = 0;
      while (attempts < 10) {
        const existing = $app
          .dao()
          .findRecordsByFilter('games', `code = "${code}"`, '', 1, 0);

        if (existing.length === 0) {
          break;
        }

        // Генерируем новый код, если существует
        code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        attempts++;
      }

      e.record.code = code;
      e.record.status = 'lobby';
    } catch (err) {
      throw new BadRequestError('Failed to generate game code: ' + err.message);
    }
  }
}, 'games');
