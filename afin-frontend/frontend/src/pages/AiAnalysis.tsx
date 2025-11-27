import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { MessageSquare, Send, Sparkles } from 'lucide-react'

interface ProcessModel {
  id: string
  name: string
  description?: string
}

type ChatRole = 'system' | 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
}

const AiAnalysis = () => {
  const [models, setModels] = useState<ProcessModel[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      text: 'Выберите модели процесса и отправьте их в AI — после этого можно будет вести диалог.',
    },
  ])
  const [input, setInput] = useState('')
  const [chatUnlocked, setChatUnlocked] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get('/process-models')
        const normalized = response.data.map((model: any) => ({
          id: String(model.id),
          name: model.name,
          description: model.description,
        }))
        setModels(normalized)
      } catch (error) {
        console.error('Ошибка загрузки моделей для AI анализа:', error)
      }
    }
    fetchModels()
  }, [])

  const selectedModels = useMemo(
    () => models.filter((model) => selectedIds.includes(model.id)),
    [models, selectedIds]
  )

  const toggleModel = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSendSelection = () => {
    if (!selectedModels.length) {
      alert('Выберите хотя бы одну модель для анализа')
      return
    }
    const summaryLines = selectedModels
      .map((model, index) => `${index + 1}. ${model.name}`)
      .join('\n')
    const systemMessage: ChatMessage = {
      id: `selection-${Date.now()}`,
      role: 'system',
      text: `Модели переданы в AI:\n${summaryLines}`,
    }
    setChat((prev) => [...prev, systemMessage])
    setChatUnlocked(true)
  }

  const handleSendMessage = async () => {
    if (!chatUnlocked || !input.trim()) return
    const messageText = input.trim()
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: messageText,
    }
    setChat((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)

    // Имитация ответа AI
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: `AI анализирует выбранные модели (${selectedModels
          .map((model) => model.name)
          .join(', ')}) и предлагает:\n• Сфокусироваться на узких местах\n• Проверить конфигурацию ресурсов\n• Оценить влияние недавних симуляций`,
      }
      setChat((prev) => [...prev, aiMessage])
      setSending(false)
    }, 600)
  }

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Анализирование с AI</h1>
            <p className="text-sm text-gray-500">
              Передайте модели в виртуального помощника, чтобы получить подсказки и идеи по оптимизации процессов
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Выбор моделей</h2>
                <p className="text-sm text-gray-500">Отметьте процессы для анализа</p>
              </div>
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {models.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-start space-x-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    selectedIds.includes(model.id) ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(model.id)}
                    onChange={() => toggleModel(model.id)}
                    className="mt-1 h-4 w-4 text-primary border-gray-300 rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{model.name}</p>
                    {model.description && (
                      <p className="text-sm text-gray-500">{model.description}</p>
                    )}
                  </div>
                </label>
              ))}
              {!models.length && (
                <div className="text-sm text-gray-500">
                  Модели не найдены. Создайте модель, чтобы начать анализ.
                </div>
              )}
            </div>
            <button
              onClick={handleSendSelection}
              disabled={!selectedIds.length}
              className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отправить модели в AI
            </button>
            {!chatUnlocked && (
              <p className="text-xs text-gray-500 mt-2">
                После отправки моделей откроется чат для вопросов и уточнений.
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 lg:col-span-2 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {chat.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-2xl border ${
                    message.role === 'user'
                      ? 'bg-primary text-white border-primary ml-auto max-w-[80%]'
                      : message.role === 'assistant'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900 max-w-[85%]'
                        : 'bg-gray-50 border-gray-200 text-gray-700 max-w-[85%]'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed">{message.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t pt-4">
              <div className="flex items-start space-x-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  disabled={!chatUnlocked}
                  placeholder={
                    chatUnlocked
                      ? 'Опишите проблему, задайте вопрос или попросите рекомендацию...'
                      : 'Сначала выберите и отправьте модели'
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatUnlocked || !input.trim() || sending}
                  className="mt-1 inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {!chatUnlocked && (
                <p className="text-xs text-gray-500 mt-2">
                  Чат заблокирован до тех пор, пока вы не отправите хотя бы одну модель.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AiAnalysis



