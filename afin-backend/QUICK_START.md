# Быстрый старт - Backend

## Проверка запуска

1. **Проверьте, что backend запущен:**
   ```powershell
   # Проверка порта 8000
   netstat -ano | findstr ":8000"
   ```

2. **Если backend не запущен, запустите его:**
   ```powershell
   cd services/gateway
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Создание тестового пользователя

### Вариант 1: Через API (рекомендуется)

Откройте браузер и перейдите на:
- http://localhost:8000/docs

Или используйте curl/PowerShell:

```powershell
# Регистрация нового пользователя
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@afin.ru","password":"password123","firstName":"Admin","lastName":"User"}'
```

### Вариант 2: Через Python скрипт

```powershell
cd C:\Users\Dodop\Desktop\afin\afin-backend
$env:DATABASE_URL="sqlite:///./storage/afin.db"
python -c "from services.auth.crud import create_user; from shared.database import SessionLocal; db = SessionLocal(); create_user(db, 'admin@afin.ru', 'password123', 'Admin', 'User'); print('User created!')"
```

## Тестовые учетные записи

После создания пользователя используйте:
- **Email:** `admin@afin.ru`
- **Пароль:** `password123`

## Проверка работы

1. Откройте http://localhost:8000/docs
2. Попробуйте зарегистрировать пользователя через `/api/auth/register`
3. Попробуйте войти через `/api/auth/login`


