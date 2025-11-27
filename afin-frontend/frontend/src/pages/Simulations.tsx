import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Play } from 'lucide-react'

interface ProcessModel {
  id: string
  name: string
  version?: string
}

interface TimelineEntry {
  stepId: string
  label?: string
  role: string
  employee: string
  department?: string
  expectedDuration: number
  actualDuration: number
  cost: number
  usedML: boolean
  riskScore?: number
  recommendation?: string
}

interface SimulationResult {
  id: number
  processModel: {
    id: number
    name: string
  }
  summary: {
    totalMinutes: number
    totalCost: number
    mlCalls: number
    anomalyCount: number
    overloadedEmployees: { employee: string; usedHours: number; capacityHours: number }[]
    completedTasks?: number
  }
  timeline: TimelineEntry[]
  departmentLoad: { departmentId: string; departmentName: string; hours: number }[]
  riskHeatmap: { stepId: string; label?: string; riskScore: number; employee: string }[]
  anomalies: { stepId: string; label?: string; expected: number; actual: number }[]
}

const formatCurrencyRub = (value?: number) => {
  if (value == null || isNaN(value)) {
    return '0 ₽'
  }
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`
}

const Simulations = () => {
  const [processModels, setProcessModels] = useState<ProcessModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [simulationHistory, setSimulationHistory] = useState<SimulationResult[]>([])
  const [running, setRunning] = useState(false)
  const [currentSimulation, setCurrentSimulation] = useState<SimulationResult | null>(null)

  const summary = currentSimulation?.summary
  const overloaded = summary?.overloadedEmployees ?? []
  const departmentChartData =
    currentSimulation?.departmentLoad?.map((dept) => ({
      name: dept.departmentName || dept.departmentId,
      hours: dept.hours,
    })) ?? []
  const timeline: TimelineEntry[] = currentSimulation?.timeline ?? []
  const riskHeatmap = currentSimulation?.riskHeatmap ?? []
  const anomalies = currentSimulation?.anomalies ?? []

  useEffect(() => {
    fetchProcessModels()
    fetchSimulations()
  }, [])

  const fetchProcessModels = async () => {
    try {
      const response = await axios.get('/process-models')
      setProcessModels(response.data)
      if (response.data.length > 0) {
        setSelectedModelId(String(response.data[0].id))
      }
    } catch (error) {
      console.error('Ошибка загрузки моделей:', error)
    }
  }

  const fetchSimulations = async () => {
    try {
      const response = await axios.get('/simulations')
      setSimulationHistory(response.data)
      if (!currentSimulation && response.data.length > 0) {
        setCurrentSimulation(response.data[0])
      }
    } catch (error) {
      console.error('Ошибка загрузки симуляций:', error)
    }
  }

  const handleRunSimulation = async () => {
    if (!selectedModelId) {
      alert('Выберите модель процесса')
      return
    }

    setRunning(true)
    try {
      const response = await axios.post('/simulations', {
        processModelId: Number(selectedModelId),
      })
      setCurrentSimulation(response.data)
      setSimulationHistory((prev) => [response.data, ...prev])
    } catch (error) {
      console.error('Ошибка запуска симуляции:', error)
      alert('Ошибка при запуске симуляции')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Симуляции</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Конфигурация симуляции</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Модель процесса</label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Выберите модель</option>
                    {processModels.map((model) => (
                      <option key={model.id} value={String(model.id)}>
                        {model.name} {model.version ? `(v${model.version})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleRunSimulation}
                  disabled={running || !selectedModelId}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  <span>{running ? 'Запуск...' : 'Запустить симуляцию'}</span>
                </button>
                <p className="text-xs text-gray-500">
                  Симуляция автоматически распределяет задачи по ролям, учитывая загрузку отделов и бюджет компании.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">История запусков</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {simulationHistory.length === 0 && (
                  <p className="text-sm text-gray-500">Симуляции ещё не запускались.</p>
                )}
                {simulationHistory.map((simulation) => (
                  <button
                    key={simulation.id}
                    onClick={() => setCurrentSimulation(simulation)}
                    className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                      currentSimulation?.id === simulation.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{simulation.processModel.name}</span>
                      <span>{simulation.summary.totalMinutes?.toFixed(1)} мин</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      ML: {simulation.summary.mlCalls} · Аномалии: {simulation.summary.anomalyCount}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {currentSimulation ? (
              <>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Ключевые метрики</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Общее время</div>
                      <div className="text-2xl font-bold text-gray-900">{summary?.totalMinutes?.toFixed(1)} мин</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Общая стоимость</div>
                      <div className="text-2xl font-bold text-gray-900">{formatCurrencyRub(summary?.totalCost)}</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">ML-предсказания</div>
                      <div className="text-2xl font-bold text-gray-900">{summary?.mlCalls || 0}</div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Аномальные шаги</div>
                      <div className="text-2xl font-bold text-gray-900">{summary?.anomalyCount || 0}</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg col-span-2 md:col-span-1">
                      <div className="text-sm text-gray-600 mb-1">Перегруженные сотрудники</div>
                      <div className="text-sm font-medium text-gray-900">
                        {overloaded.length ? overloaded[0].employee : 'Не обнаружены'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Загрузка отделов</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="hours" fill="#0055FF" name="Часы" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Таймлайн исполнителей</h2>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {timeline.map((entry) => (
                      <div key={entry.stepId} className="border rounded-lg px-4 py-3">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{entry.label || entry.stepId}</span>
                          <span>{entry.role}</span>
                        </div>
                        <div className="text-sm text-gray-800">
                          {entry.employee} · {entry.department || '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Ожидание: {entry.expectedDuration} мин · факт {entry.actualDuration.toFixed(1)} мин · стоимость{' '}
                          {entry.cost.toFixed(2)} ₽
                        </div>
                        {entry.usedML && (
                          <div className="text-xs text-primary mt-1">
                            ML-предсказание · риск {entry.riskScore?.toFixed(2)} · {entry.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Риски</h2>
                    {riskHeatmap.length === 0 && <p className="text-sm text-gray-500">Риски не обнаружены.</p>}
                    <div className="space-y-3">
                      {riskHeatmap.map((risk) => (
                        <div key={risk.stepId} className="flex items-center space-x-3">
                          <div className="w-2/3">
                            <p className="text-sm font-medium text-gray-800">{risk.label || risk.stepId}</p>
                            <p className="text-xs text-gray-500">{risk.employee}</p>
                          </div>
                          <div className="flex-1 bg-gray-100 h-3 rounded-full overflow-hidden">
                            <div
                              className="h-3 bg-red-500"
                              style={{ width: `${Math.min(100, risk.riskScore * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-700">{(risk.riskScore * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Аномальные шаги</h2>
                    {anomalies.length === 0 && <p className="text-sm text-gray-500">Аномалий не найдено.</p>}
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {anomalies.map((item) => (
                        <div key={item.stepId} className="border rounded-lg px-4 py-2">
                          <p className="text-sm font-medium text-gray-800">{item.label || item.stepId}</p>
                          <p className="text-xs text-gray-500">
                            Ожидалось {item.expected} мин · факт {item.actual.toFixed(1)} мин
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <p className="text-gray-600">Выберите модель процесса и запустите первую симуляцию.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Simulations

