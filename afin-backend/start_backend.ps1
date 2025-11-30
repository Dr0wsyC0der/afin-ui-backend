# Скрипт для запуска backend сервиса

Write-Host "Запуск AFIN Backend..." -ForegroundColor Green

# Проверяем наличие .env файла
if (-not (Test-Path ".env")) {
    Write-Host "Создание .env файла..." -ForegroundColor Yellow
    @"
DATABASE_URL=sqlite:///./storage/afin.db
JWT_SECRET=super-secret-jwt-key-change-in-prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
"@ | Out-File -FilePath ".env" -Encoding UTF8
}

# Создаем директорию storage если её нет
if (-not (Test-Path "storage")) {
    New-Item -ItemType Directory -Path "storage" | Out-Null
}

# Устанавливаем переменную окружения
$env:DATABASE_URL = "sqlite:///./storage/afin.db"
$env:PYTHONPATH = $PWD

# Запускаем gateway
Write-Host "Запуск Gateway на http://localhost:8000" -ForegroundColor Cyan
Write-Host "Документация API: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""

cd services/gateway
uvicorn main:app --host 0.0.0.0 --port 8000 --reload


