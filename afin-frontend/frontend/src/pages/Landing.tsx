import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Zap, BarChart3, PlayCircle, Shield, Clock } from 'lucide-react'

const Landing = () => {
  // Принудительно устанавливаем светлую тему для Landing страницы
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    return () => {
      // Восстанавливаем сохраненную тему при размонтировании
      const savedTheme = localStorage.getItem('afin_theme') || 'light'
      if (savedTheme === 'auto') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      } else {
        document.documentElement.setAttribute('data-theme', savedTheme)
      }
    }
  }, [])
  const features = [
    {
      icon: Zap,
      title: 'Быстрое моделирование',
      description: 'Создавайте бизнес-процессы с помощью интуитивного drag-and-drop редактора',
    },
    {
      icon: BarChart3,
      title: 'Детальная аналитика',
      description: 'Отслеживайте производительность процессов и выявляйте узкие места',
    },
    {
      icon: PlayCircle,
      title: 'Симуляции процессов',
      description: 'Тестируйте различные сценарии перед внедрением в производство',
    },
    {
      icon: Shield,
      title: 'Безопасность',
      description: 'Ваши данные защищены современными стандартами безопасности',
    },
    {
      icon: Clock,
      title: 'Экономия времени',
      description: 'Автоматизируйте рутинные задачи и оптимизируйте рабочие процессы',
    },
    {
      icon: Activity,
      title: 'Мониторинг в реальном времени',
      description: 'Отслеживайте выполнение процессов в режиме реального времени',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white" data-landing="true">
      {/* Header */}
      <header className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-8 h-8 text-primary" />
            <span className="text-3xl font-bold text-primary">afin</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="px-4 py-2 text-gray-700 hover:text-primary transition-colors"
            >
              Вход
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Начать
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Прогнозируемое управление бизнес-процессами
          <br />
          <span className="text-primary">для современного предприятия</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Моделируйте, симулируйте и анализируйте бизнес-процессы с помощью
          передовых инструментов. Оптимизируйте работу вашей организации и
          повышайте эффективность.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link
            to="/signup"
            className="px-8 py-4 bg-primary text-white rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors shadow-lg"
          >
            Начать
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 bg-white text-primary rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-primary"
          >
            Узнать больше
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Ключевые особенности AFIN
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t mt-20">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 afin. Все права защищены.</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing

