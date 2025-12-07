# Решение проблемы с Backend в Docker

## Проблема решена! ✅

Backend теперь работает на http://localhost:8000

## Что было исправлено:

1. **Добавлены зависимости в requirements.txt:**
   - `lightgbm==4.5.0`
   - `joblib==1.4.2`
   - `email-validator==2.1.0`
   - `pydantic[email]==2.5.0`

2. **Обновлен Dockerfile.test:**
   - Добавлена установка системной библиотеки `libgomp1` (нужна для LightGBM)
   - Теперь использует `requirements.txt` для установки зависимостей

3. **Контейнер пересобран** с новыми зависимостями

## Проверка работы:

```powershell
# Проверка health endpoint
Invoke-RestMethod -Uri "http://localhost:8000/health"

# Должно вернуться: {"status":"ok","service":"gateway"}
```

## Создание пользователя:

### Вариант 1: Через Swagger UI (самый простой)
1. Откройте http://localhost:8000/docs
2. Найдите `/api/auth/register`
3. Нажмите "Try it out"
4. Введите:
   ```json
   {
     "email": "admin@afin.ru",
     "password": "password123",
     "firstName": "Admin",
     "lastName": "User"
   }
   ```
5. Нажмите "Execute"

### Вариант 2: Через PowerShell
```powershell
$body = @{
    email = "admin@afin.ru"
    password = "password123"
    firstName = "Admin"
    lastName = "User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

## Вход в систему:

После создания пользователя используйте:
- **Email:** `admin@afin.ru`
- **Пароль:** `password123`

## Если backend не запускается:

1. **Проверьте логи:**
   ```powershell
   docker logs afin-backend --tail 50
   ```

2. **Перезапустите контейнеры:**
   ```powershell
   cd afin-frontend
   docker-compose restart backend
   ```

3. **Если нужно пересобрать:**
   ```powershell
   cd afin-frontend
   docker-compose build --no-cache backend
   docker-compose up -d
   ```

## Доступные endpoints:

- http://localhost:8000/health - проверка работы
- http://localhost:8000/docs - Swagger UI документация
- http://localhost:8000/api/auth/register - регистрация
- http://localhost:8000/api/auth/login - вход
- http://localhost:8000/api/auth/me - текущий пользователь (требует авторизации)





