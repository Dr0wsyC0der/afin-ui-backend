import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type Language = 'ru' | 'en'
type Theme = 'light' | 'dark' | 'auto'

type TranslationKey =
  | 'navDashboard'
  | 'navProcessModels'
  | 'navAnalytics'
  | 'navPredictive'
  | 'navSimulations'
  | 'navProfile'
  | 'profileTitle'
  | 'profileRole'

interface PreferencesContextValue {
  language: Language
  theme: Theme
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  t: (key: TranslationKey) => string
}

const STORAGE_KEYS = {
  language: 'afin_language',
  theme: 'afin_theme',
}

const translations: Record<Language, Record<TranslationKey, string>> = {
  ru: {
    navDashboard: 'Панель управления',
    navProcessModels: 'Модели процессов',
    navAnalytics: 'Аналитика',
    navPredictive: 'Предиктивная аналитика',
    navSimulations: 'Симуляции',
    navProfile: 'Профиль пользователя',
    profileTitle: 'Профиль пользователя',
    profileRole: 'Роль',
  },
  en: {
    navDashboard: 'Dashboard',
    navProcessModels: 'Process Models',
    navAnalytics: 'Analytics',
    navPredictive: 'Predictive Analytics',
    navSimulations: 'Simulations',
    navProfile: 'User Profile',
    profileTitle: 'User Profile',
    profileRole: 'Role',
  },
}

const PreferencesContext = createContext<PreferencesContextValue>({
  language: 'ru',
  theme: 'light',
  setLanguage: () => undefined,
  setTheme: () => undefined,
  t: (key) => translations.ru[key],
})

const applyThemeToDocument = (theme: Theme) => {
  const root = document.documentElement
  const resolvedTheme =
    theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme
  root.dataset.theme = resolvedTheme
  root.setAttribute('data-theme-source', theme)
}

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') {
      return 'ru'
    }
    const stored = localStorage.getItem(STORAGE_KEYS.language) as Language | null
    return stored ?? 'ru'
  })
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }
    const stored = localStorage.getItem(STORAGE_KEYS.theme) as Theme | null
    return stored ?? 'light'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.language, language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, theme)
    applyThemeToDocument(theme)

    if (theme === 'auto') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => applyThemeToDocument('auto')
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language
    applyThemeToDocument(theme)
  }, [])

  const setLanguage = useCallback((value: Language) => {
    setLanguageState(value)
  }, [])

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value)
  }, [])

  const t = useCallback(
    (key: TranslationKey) => translations[language][key] ?? key,
    [language],
  )

  const value = useMemo(
    () => ({ language, theme, setLanguage, setTheme, t }),
    [language, theme, setLanguage, setTheme, t],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export const usePreferences = () => useContext(PreferencesContext)


