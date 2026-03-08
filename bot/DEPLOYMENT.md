# GemBots Telegram Bot - Развёртывание

## Быстрый старт

1. **Получите токен бота:**
   - Напишите @BotFather в Telegram
   - `/newbot` → выберите имя и username
   - Скопируйте токен

2. **Установите токен:**
   ```bash
   cd ~/Projects/gembots/bot
   cp .env.example .env
   nano .env  # Установите BOT_TOKEN
   ```

3. **Запустите бота:**
   ```bash
   pm2 start index.js --name gembots-bot
   pm2 save
   ```

4. **Проверьте статус:**
   ```bash
   pm2 status gembots-bot
   pm2 logs gembots-bot
   ```

## Мониторинг

```bash
# Статус всех процессов
pm2 status

# Логи бота  
pm2 logs gembots-bot

# Перезапуск
pm2 restart gembots-bot

# Остановка
pm2 stop gembots-bot
```

## Структура файлов

```
bot/
├── index.js          # Основной файл бота
├── package.json       # Зависимости
├── users.json         # API ключи пользователей  
├── .env.example       # Шаблон конфигурации
├── .env               # Конфигурация (создать)
├── README.md          # Документация
└── DEPLOYMENT.md      # Инструкции развёртывания
```

## Что дальше?

1. Получите токен от BotFather
2. Установите его в `.env` 
3. Запустите: `pm2 start index.js --name gembots-bot`
4. Протестируйте команды: `/start`, `/register`, `/predict`

Бот готов к работе! 🤖