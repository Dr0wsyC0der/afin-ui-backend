import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { CheckCircle, Clock, Wallet, AlertTriangle } from 'lucide-react'

interface AnalyticsSummary {
  totalCompleted: number
  averageCycleTime: number
  averageCost: number
  bottlenecksCount: number
}

interface AnalyticsData {
  id: string
  completedProcesses: number
  averageCycleTime: number
  averageCost: number
  bottlenecks?: string
  month: number
  year: number
  processModel: {
    id: string
    name: string
  }
}

const formatCurrencyRub = (value?: number) => {
  if (value == null || isNaN(value)) {
    return '0 ₽'
  }
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`
}

const Analytics = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [summaryResponse, analyticsResponse] = await Promise.all([
        axios.get('/analytics/summary'),
        axios.get('/analytics'),
      ])
      setSummary(summaryResponse.data)
      setAnalytics(analyticsResponse.data)
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  // Группировка по месяцам
  const monthlyData = analytics.reduce((acc: any, item) => {
    const key = `${item.year}-${String(item.month).padStart(2, '0')}`
    if (!acc[key]) {
      acc[key] = { month: key, processes: 0 }
    }
    acc[key].processes += item.completedProcesses
    return acc
  }, {})

  const monthlyChartData = Object.values(monthlyData).sort((a: any, b: any) =>
    a.month.localeCompare(b.month)
  )

  // Группировка по процессам
  const processData = analytics.reduce((acc: any, item) => {
    const processName = item.processModel.name
    if (!acc[processName]) {
      acc[processName] = 0
    }
    acc[processName] += item.completedProcesses
    return acc
  }, {})

  const processChartData = Object.entries(processData).map(([name, value]) => ({
    name,
    utilization: value,
  }))

  const metrics = [
    {
      title: 'Завершено процессов',
      value: summary?.totalCompleted || 0,
      icon: CheckCircle,
      color: 'text-accent-green',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Среднее время цикла',
      value: `${summary?.averageCycleTime.toFixed(1) || 0} ч`,
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Средняя стоимость процесса',
      value: formatCurrencyRub(summary?.averageCost),
      icon: Wallet,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Узкие места',
      value: summary?.bottlenecksCount || 0,
      icon: AlertTriangle,
      color: 'text-accent-red',
      bgColor: 'bg-red-50',
    },
  ]

  const bottlenecks = analytics.filter((a) => a.bottlenecks)

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Аналитика</h1>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${metric.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{metric.title}</h3>
                <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
              </div>
            )
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Completions */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Ежемесячные завершения процессов
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="colorProcesses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0055FF" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0055FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="processes"
                  stroke="#0055FF"
                  fillOpacity={1}
                  fill="url(#colorProcesses)"
                  name="Завершено процессов"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Resource Utilization */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Использование ресурсов по процессу
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="utilization" fill="#0055FF" name="Завершено процессов" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottlenecks Analysis */}
        {bottlenecks.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Анализ узких мест</h2>
            <div className="space-y-3">
              {bottlenecks.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900 mb-1">
                        {item.processModel.name}
                      </div>
                      <div className="text-sm text-gray-600">{item.bottlenecks}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(item.year, item.month - 1).toLocaleDateString('ru-RU', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Analytics

