# Структура проекта afin

## 📁 Полная структура файлов

```
afin-ui/
├── backend/                          # Backend приложение (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── index.ts                  # Точка входа сервера
│   │   ├── middleware/
│   │   │   └── auth.ts               # Middleware для JWT аутентификации
│   │   ├── routes/
│   │   │   ├── auth.ts               # Маршруты аутентификации
│   │   │   ├── processModels.ts      # Маршруты моделей процессов
│   │   │   ├── simulations.ts        # Маршруты симуляций
│   │   │   ├── analytics.ts           # Маршруты аналитики
│   │   │   ├── users.ts              # Маршруты пользователей
│   │   │   └── dashboard.ts          # Маршруты дашборда
│   │   ├── utils/
│   │   │   └── jwt.ts                # Утилиты для работы с JWT
│   │   └── prisma/
│   │       ├── client.ts             # Prisma клиент
│   │       └── seed.ts              # Seed данные для БД
│   ├── prisma/
│   │   └── schema.prisma            # Схема базы данных Prisma
│   ├── Dockerfile                    # Docker образ для backend
│   ├── package.json                  # Зависимости backend
│   └── tsconfig.json                 # TypeScript конфигурация
│
├── frontend/                         # Frontend приложение (React + Vite + TypeScript)
│   ├── src/
│   │   ├── main.tsx                  # Точка входа React
│   │   ├── App.tsx                   # Главный компонент приложения
│   │   ├── index.css                 # Глобальные стили
│   │   ├── vite-env.d.ts            # Типы для Vite
│   │   ├── pages/                    # Страницы приложения
│   │   │   ├── Landing.tsx          # Лендинг страница
│   │   │   ├── Login.tsx             # Страница входа
│   │   │   ├── SignUp.tsx            # Страница регистрации
│   │   │   ├── Dashboard.tsx        # Панель управления
│   │   │   ├── ProcessModels.tsx    # Список моделей процессов
│   │   │   ├── ProcessEditor.tsx    # BPMN редактор
│   │   │   ├── Simulations.tsx      # Симуляции
│   │   │   ├── Analytics.tsx        # Аналитика
│   │   │   └── Profile.tsx          # Профиль пользователя
│   │   ├── components/               # React компоненты
│   │   │   ├── Layout.tsx           # Основной layout с сайдбаром
│   │   │   └── PrivateRoute.tsx     # Защищенный маршрут
│   │   └── contexts/                # React контексты
│   │       └── AuthContext.tsx      # Контекст аутентификации
│   ├── Dockerfile                    # Docker образ для frontend
│   ├── nginx.conf                    # Конфигурация Nginx
│   ├── index.html                    # HTML шаблон
│   ├── package.json                  # Зависимости frontend
│   ├── tailwind.config.js           # Конфигурация Tailwind CSS
│   ├── postcss.config.js            # Конфигурация PostCSS
│   ├── tsconfig.json                 # TypeScript конфигурация
│   └── vite.config.ts               # Конфигурация Vite
│
├── docker-compose.yml                # Docker Compose конфигурация
├── package.json                      # Корневой package.json (workspaces)
├── README.md                         # Основная документация
├── QUICKSTART.md                     # Быстрый старт
└── .gitignore                        # Git ignore правила
```

## 🗄️ База данных (PostgreSQL)

### Модели данных:

1. **User** - Пользователи системы
   - id, email, password, firstName, lastName, role, avatar

2. **RefreshToken** - Refresh токены для JWT
   - id, token, userId, expiresAt

3. **ProcessModel** - Модели бизнес-процессов
   - id, name, version, status, description, bpmnXml, ownerId

4. **Simulation** - Симуляции процессов
   - id, processModelId, name, duration, resourceAvailability, arrivalRate
   - throughput, averageCycleTime, totalCost, resourceUtilization, bottlenecks

5. **Analytics** - Аналитические данные
   - id, processModelId, completedProcesses, averageCycleTime, averageCost
   - bottlenecks, month, year

## 🔐 Аутентификация

- JWT токены (access + refresh)
- Хеширование паролей с bcryptjs
- Защита маршрутов через middleware
- Автоматическое обновление токенов

## 🎨 Frontend компоненты

### Страницы:
- **Landing** - Главная страница для незалогиненных
- **Login/SignUp** - Аутентификация
- **Dashboard** - Панель с метриками и графиками
- **ProcessModels** - Управление моделями процессов
- **ProcessEditor** - BPMN редактор с React Flow
- **Simulations** - Запуск и анализ симуляций
- **Analytics** - Аналитика и отчеты
- **Profile** - Профиль пользователя

### Компоненты:
- **Layout** - Основной layout с сайдбаром
- **PrivateRoute** - Защита маршрутов

## 📡 API Endpoints

Все API endpoints начинаются с `/api`:

- `/api/auth/*` - Аутентификация
- `/api/process-models/*` - Модели процессов
- `/api/simulations/*` - Симуляции
- `/api/analytics/*` - Аналитика
- `/api/users/*` - Пользователи
- `/api/dashboard` - Данные дашборда

## 🐳 Docker сервисы

1. **postgres** - PostgreSQL база данных
2. **backend** - Node.js backend сервер
3. **frontend** - Nginx с React приложением

## 📦 Зависимости

### Backend:
- express, cors, dotenv
- @prisma/client, prisma
- jsonwebtoken, bcryptjs
- express-validator
- typescript, tsx

### Frontend:
- react, react-dom, react-router-dom
- vite, typescript
- tailwindcss, postcss
- @tanstack/react-table
- recharts
- reactflow
- axios
- lucide-react

