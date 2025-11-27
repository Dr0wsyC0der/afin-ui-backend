import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { User, Lock, Bell, Settings, Save, Globe2, Moon } from 'lucide-react'
import { usePreferences } from '../contexts/PreferencesContext'

const Profile = () => {
  const { user, updateUser } = useAuth()
  const { language, theme, setLanguage, setTheme, t } = usePreferences()
  const [activeTab, setActiveTab] = useState('personal')
  const [saving, setSaving] = useState(false)

  const [personalData, setPersonalData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
  })

  useEffect(() => {
    if (user) {
      setPersonalData({
        firstName: user.firstName,
        lastName: user.lastName || '',
        email: user.email,
      })
    }
  }, [user])

  const handleSavePersonal = async () => {
    setSaving(true)
    try {
      const response = await axios.put('/users/profile', {
        firstName: personalData.firstName,
        lastName: personalData.lastName,
      })
      updateUser(response.data)
      alert('Профиль успешно обновлен')
    } catch (error) {
      console.error('Ошибка обновления профиля:', error)
      alert('Ошибка при обновлении профиля')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Пароли не совпадают')
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert('Новый пароль должен быть не менее 6 символов')
      return
    }

    setSaving(true)
    try {
      await axios.put('/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      alert('Пароль успешно изменен')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка при изменении пароля')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'personal', label: 'Личные данные', icon: User },
    { id: 'security', label: 'Безопасность', icon: Lock },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'settings', label: 'Настройки приложения', icon: Settings },
  ]

  const languageLabel = useMemo(() => (language === 'ru' ? 'Русский' : 'English'), [language])
  const themeLabel = useMemo(() => {
    switch (theme) {
      case 'dark':
        return 'Тёмная'
      case 'auto':
        return 'Автоматически'
      default:
        return 'Светлая'
    }
  }, [theme])

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('profileTitle')}</h1>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-primary to-blue-600 p-8 text-white">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold">
                {user?.firstName?.[0]?.toUpperCase()}
                {user?.lastName?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-blue-100">{user?.email}</p>
                <p className="text-sm text-blue-200 mt-1">
                  {t('profileRole')}: {user?.role || 'Пользователь'}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <div className="flex space-x-1 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'personal' && (
              <div className="max-w-2xl space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={personalData.firstName}
                    onChange={(e) =>
                      setPersonalData({ ...personalData, firstName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фамилия
                  </label>
                  <input
                    type="text"
                    value={personalData.lastName}
                    onChange={(e) =>
                      setPersonalData({ ...personalData, lastName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={personalData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email нельзя изменить</p>
                </div>
                <button
                  onClick={handleSavePersonal}
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
                </button>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="max-w-2xl space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Текущий пароль
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Новый пароль
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подтвердите новый пароль
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Сохранение...' : 'Изменить пароль'}</span>
                </button>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Email уведомления</div>
                    <div className="text-sm text-gray-600">
                      Получать уведомления на email
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.email}
                      onChange={(e) =>
                        setNotifications({ ...notifications, email: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Push уведомления</div>
                    <div className="text-sm text-gray-600">
                      Получать push уведомления в браузере
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.push}
                      onChange={(e) =>
                        setNotifications({ ...notifications, push: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">SMS уведомления</div>
                    <div className="text-sm text-gray-600">
                      Получать уведомления по SMS
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.sms}
                      onChange={(e) =>
                        setNotifications({ ...notifications, sms: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Язык интерфейса</div>
                      <p className="text-sm text-gray-500">
                        Текущий язык: <span className="font-semibold">{languageLabel}</span>
                      </p>
                    </div>
                    <Globe2 className="w-5 h-5 text-primary" />
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'ru' | 'en')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Язык мгновенно применяется ко всем поддерживаемым элементам интерфейса.
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Тема оформления</div>
                      <p className="text-sm text-gray-500">
                        Активная тема: <span className="font-semibold">{themeLabel}</span>
                      </p>
                    </div>
                    <Moon className="w-5 h-5 text-primary" />
                  </div>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="light">Светлая</option>
                    <option value="dark">Тёмная</option>
                    <option value="auto">Автоматически</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Тёмный режим охватывает фон, текст и основные карточки. Опция «Автоматически» следует системным
                    настройкам устройства.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Profile

