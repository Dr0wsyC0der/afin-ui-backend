import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

interface User {
  id: string
  email: string
  firstName: string
  lastName?: string
  role: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, firstName: string, lastName?: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await axios.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      // FastAPI /api/auth/login -> { access_token, token_type }
      const response = await axios.post('/auth/login', { email, password })
      const { access_token } = response.data

      if (!access_token) {
        throw new Error('Токен не получен от сервера')
      }

      localStorage.setItem('accessToken', access_token)
      // refreshToken в текущем FastAPI-бэке нет
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      // Дополнительно подтягиваем пользователя
      const me = await axios.get('/auth/me')
      setUser(me.data)
    } catch (error: any) {
      // Пробрасываем ошибку дальше с правильным форматом
      if (error.response) {
        // Сервер вернул ошибку
        const errorMessage = error.response.data?.detail || error.response.data?.message || 'Ошибка входа'
        throw new Error(errorMessage)
      } else if (error.request) {
        // Запрос был отправлен, но ответа не получено
        throw new Error('Не удалось подключиться к серверу. Убедитесь, что backend запущен на порту 8000')
      } else {
        // Ошибка при настройке запроса
        throw new Error(error.message || 'Ошибка при входе в систему')
      }
    }
  }

  const signup = async (email: string, password: string, _firstName: string, _lastName?: string) => {
    // FastAPI /api/auth/register ожидает только email и password
    await axios.post('/auth/register', {
      email,
      password,
    })
    // После регистрации сразу логинимся теми же данными
    await login(email, password)
  }

  const logout = () => {
    // В текущем FastAPI-бэке нет endpoint-а /auth/logout и refresh-токенов
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData })
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

