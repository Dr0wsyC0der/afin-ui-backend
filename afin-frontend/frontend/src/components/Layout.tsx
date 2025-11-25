import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Workflow,
  BarChart3,
  PlayCircle,
  User,
  LogOut,
  Activity,
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Панель управления' },
    { path: '/process-models', icon: Workflow, label: 'Модели процессов' },
    { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
    { path: '/simulations', icon: PlayCircle, label: 'Симуляции' },
    { path: '/profile', icon: User, label: 'Профиль пользователя' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-primary" />
            <span className="text-2xl font-bold text-primary">afin</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User info and logout */}
        <div className="p-4 border-t">
          <div className="mb-3 px-4 py-2 text-sm text-gray-600">
            <div className="font-medium">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выход</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default Layout

