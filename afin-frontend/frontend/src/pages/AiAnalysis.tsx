import { DragEvent, useRef, useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { MessageSquare, Send, Sparkles, UploadCloud, Loader2 } from 'lucide-react'
import axios from 'axios'

type ChatRole = 'system' | 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  predictions?: ProcessPrediction[]
}

interface ProcessPrediction {
  process_name: string
  delay_probability: number
  prediction: string
  will_be_delayed: boolean
  expected_duration?: number
  role?: string
  department?: string
  error?: string
}

const PredictiveAnalytics = () => {
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      text: 'Загрузите CSV или JSON с метриками процесса. После обработки файла появится возможность вести диалог.',
    },
  ])
  const [input, setInput] = useState('')
  const [chatUnlocked, setChatUnlocked] = useState(false)
  const [sending, setSending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [lastContext, setLastContext] = useState<ProcessPrediction | null>(null)
  const [models, setModels] = useState<any[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [loadingModels, setLoadingModels] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      setLoadingModels(true)
      const response = await axios.get('/process-models')
      setModels(response.data)
    } catch (error) {
      console.error('Ошибка загрузки моделей:', error)
    } finally {
      setLoadingModels(false)
    }
  }

  const handleModelSelect = async (modelId: string) => {
    if (!modelId) {
      setSelectedModelId('')
      return
    }

    try {
      setSelectedModelId(modelId)
      const response = await axios.get(`/process-models/${modelId}`)
      const model = response.data
      
      // Экспортируем задачи из модели в JSON формат
      const tasks = (model.data?.nodes || [])
        .filter((node: any) => node.type === 'task')
        .map((node: any) => {
          const data = node.data || {}
          return {
            process_name: data.process_name || data.label || 'Задача',
            comment: data.comment || '',
            expected_duration: data.expected_duration || 60,
            month: data.month,
            weekday: data.weekday,
            status: data.status || 'active',
            department: data.department || 'Procurement',
            role: data.role || 'specialist',
          }
        })

      if (tasks.length === 0) {
        alert('В выбранной модели нет задач')
        return
      }

      // Создаем файл из модели
      const jsonContent = JSON.stringify(tasks, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const file = new File([blob], `model_${modelId}.json`, { type: 'application/json' })
      
      validateAndStoreFile(file)
    } catch (error) {
      console.error('Ошибка загрузки модели:', error)
      alert('Ошибка при загрузке модели')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
  }

  const handleSendMessage = async () => {
    if (!chatUnlocked || !input.trim() || !lastContext) return
    const messageText = input.trim()
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: messageText,
    }
    setChat((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)

    try {
      const response = await axios.post('/analytics/llm/chat', {
        message: messageText,
        context: lastContext,
      })

      const aiMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.data.answer || 'LLM не вернул ответ.',
      }
      setChat((prev) => [...prev, aiMessage])
    } catch (error: any) {
      const errText =
        error.response?.data?.detail || error.message || 'Ошибка при обращении к LLM'
      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        text: `Не удалось получить ответ от LLM: ${errText}`,
      }
      setChat((prev) => [...prev, errorMessage])
    } finally {
      setSending(false)
    }
  }

  const processFile = async (file: File) => {
    setProcessing(true)
    setFileError(null)

    // Добавляем сообщение о начале обработки
    const processingMessage: ChatMessage = {
      id: `processing-${Date.now()}`,
      role: 'system',
      text: `Файл «${file.name}» обрабатывается...`,
    }
    setChat((prev) => [...prev, processingMessage])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post('/analytics/process-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const { results } = response.data

      // Сохраняем "контекст" — запись с максимальной вероятностью задержки
      if (results && results.length > 0) {
        const valid = results.filter((r: ProcessPrediction) => !r.error && r.delay_probability != null)
        if (valid.length > 0) {
          const top = valid.reduce((acc: ProcessPrediction, cur: ProcessPrediction) =>
            (cur.delay_probability || 0) > (acc.delay_probability || 0) ? cur : acc
          , valid[0])
          setLastContext(top)
        }
      }

      // Формируем короткое сообщение без списка
      const resultText = `Файл «${file.name}» обработан.\n\nПредсказания нейросети:`

      const systemMessage: ChatMessage = {
        id: `file-${Date.now()}`,
        role: 'assistant',
        text: resultText,
        predictions: results,
      }

      setChat((prev) => [...prev, systemMessage])
      setChatUnlocked(true)

      // Запрашиваем первичное объяснение у LLM
      try {
        const explainResponse = await axios.post('/analytics/llm/explain-file', {
          results,
        })
        const explainMessage: ChatMessage = {
          id: `llm-explain-${Date.now()}`,
          role: 'assistant',
          text: explainResponse.data.explanation || 'LLM не вернул объяснение.',
        }
        setChat((prev) => [...prev, explainMessage])
      } catch (error: any) {
        const errText =
          error.response?.data?.detail || error.message || 'Ошибка при получении объяснения от LLM'
        const errorMessage: ChatMessage = {
          id: `llm-explain-error-${Date.now()}`,
          role: 'assistant',
          text: `Не удалось получить объяснение от LLM: ${errText}`,
        }
        setChat((prev) => [...prev, errorMessage])
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Ошибка при обработке файла'
      setFileError(errorMessage)
      const errorChatMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        text: `Ошибка обработки файла: ${errorMessage}`,
      }
      setChat((prev) => [...prev, errorChatMessage])
    } finally {
      setProcessing(false)
    }
  }

  const validateAndStoreFile = (file: File) => {
    const allowedTypes = ['application/json', 'text/csv', 'application/vnd.ms-excel', 'text/plain']
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(file.type) && !['csv', 'json'].includes(extension || '')) {
      setFileError('Разрешены только файлы CSV или JSON')
      return
    }
    setFileError(null)
    setFileInfo({ name: file.name, size: file.size, type: extension || file.type })
    setUploadedFile(file)

    // Добавляем сообщение о загрузке
    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'system',
      text: `Файл «${file.name}» загружен. Нажмите "Начать анализ" для обработки.`,
    }
    setChat((prev) => [...prev, loadingMessage])
  }

  const handleStartAnalysis = () => {
    if (uploadedFile) {
      processFile(uploadedFile)
    }
  }

  const handleFileInput = (files: FileList | null) => {
    if (!files || !files.length) return
    validateAndStoreFile(files[0])
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFileInput(event.dataTransfer.files)
  }

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Предиктивная аналитика</h1>
            <p className="text-sm text-gray-500">
              Загрузите файл с историческими данными, чтобы виртуальный аналитик смог построить прогнозы и подсказки.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Файл с данными</h2>
                <p className="text-sm text-gray-500">Перетащите CSV/JSON или выберите модель</p>
              </div>
              <UploadCloud className="w-6 h-6 text-primary" />
            </div>
            
            {/* Выбор модели */}
            {models.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Или выберите модель процесса:
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => handleModelSelect(e.target.value)}
                  disabled={loadingModels || processing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">-- Выберите модель --</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.version ? `(v${model.version})` : ''}
                    </option>
                  ))}
                </select>
                {loadingModels && (
                  <p className="text-xs text-gray-500 mt-1">Загрузка моделей...</p>
                )}
              </div>
            )}
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl px-4 py-12 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-primary/40'
              }`}
            >
              <MessageSquare className="w-10 h-10 text-primary mb-3" />
              <p className="text-base font-medium text-gray-900">
                {isDragging ? 'Отпустите файл здесь' : 'Перетащите файл или нажмите для выбора'}
              </p>
              <p className="text-xs text-gray-500 mt-2">Поддерживаются форматы .csv и .json</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={(e) => handleFileInput(e.target.files)}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                if (uploadedFile && !processing) {
                  handleStartAnalysis()
                } else {
                  fileInputRef.current?.click()
                }
              }}
              disabled={processing}
              className="w-full mt-4 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadedFile && !processing ? 'Начать анализ' : 'Выбрать файл'}
            </button>
            {fileInfo && (
              <div className="mt-4 p-3 border border-green-200 bg-green-50 rounded-lg text-sm text-green-800">
                <div className="font-semibold">{fileInfo.name}</div>
                <div>
                  {fileInfo.type.toUpperCase()} · {formatFileSize(fileInfo.size)}
                </div>
              </div>
            )}
            {fileError && (
              <div className="mt-4 p-3 border border-red-200 bg-red-50 rounded-lg text-sm text-red-700">
                {fileError}
              </div>
            )}
            {processing && (
              <div className="mt-4 p-3 border border-blue-200 bg-blue-50 rounded-lg text-sm text-blue-800 flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Обработка файла...</span>
              </div>
            )}
            {!chatUnlocked && (
              <p className="text-xs text-gray-500 mt-2">
                После загрузки файла откроется чат для вопросов и уточнений.
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
                  {message.predictions && message.predictions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.predictions.map((pred, idx) => {
                        if (pred.error) return null
                        const probability = pred.delay_probability * 100
                        // Цветовая маркировка: зеленый < 40%, желтый 40-60%, красный > 60%
                        let bgColor = 'bg-green-50'
                        let borderColor = 'border-green-300'
                        let textColor = 'text-green-800'
                        
                        if (probability >= 40 && probability <= 60) {
                          bgColor = 'bg-yellow-50'
                          borderColor = 'border-yellow-300'
                          textColor = 'text-yellow-800'
                        } else if (probability > 60) {
                          bgColor = 'bg-red-50'
                          borderColor = 'border-red-300'
                          textColor = 'text-red-800'
                        }
                        
                        return (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg text-xs ${bgColor} border ${borderColor} ${textColor}`}
                          >
                            <div className="font-semibold">
                              {pred.process_name} - {probability.toFixed(1)}%
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
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
                      : 'Сначала загрузите файл с данными'
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
                  Чат заблокирован до тех пор, пока вы не загрузите файл с данными.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default PredictiveAnalytics

