import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface DashboardData {
  metrics: {
    activeProcesses: number
    pendingApproval: number
    completedTasks: number
    averageCycleTime: number
  }
  monthlyExecution: Record<string, number>
  modelsOverview: {
    active: number
    draft: number
    archived: number
  }
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/dashboard')
      setData(response.data)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
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

  if (!data) {
    return (
      <Layout>
        <div className="p-8">
          <p className="text-gray-600">Не удалось загрузить данные</p>
        </div>
      </Layout>
    )
  }

  // Преобразуем данные для графика
  const monthlyChartData = Object.entries(data.monthlyExecution)
    .map(([key, value]) => ({
      month: key,
      processes: value,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const pieData = [
    { name: 'Запущено', value: data.modelsOverview.active, color: '#34C759' },
    { name: 'Черновик', value: data.modelsOverview.draft, color: '#FF9500' },
    { name: 'Архивировано', value: data.modelsOverview.archived, color: '#8E8E93' },
  ]

  const metrics = [
    {
      title: 'Активные процессы',
      value: data.metrics.activeProcesses,
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Ожидающие утверждения',
      value: data.metrics.pendingApproval,
      icon: AlertCircle,
      color: 'text-accent-red',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Завершённые задачи (за неделю)',
      value: data.metrics.completedTasks,
      icon: CheckCircle,
      color: 'text-accent-green',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Среднее время цикла',
      value: `${data.metrics.averageCycleTime.toFixed(1)} ч`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Панель управления</h1>

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
          {/* Monthly Execution Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Ежемесячное выполнение процессов
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="processes" fill="#0055FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Models Overview Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Обзор моделей процессов
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) =>
                    value === 0 ? '' : `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard

