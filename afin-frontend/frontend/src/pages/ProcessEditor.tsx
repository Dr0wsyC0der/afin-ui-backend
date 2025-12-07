import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import axios from 'axios'
import ReactFlow, {
  Node,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  Handle,
  Position,
  NodeProps,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Save,
  Layers,
  FileText,
  Upload,
  FileJson,
  FileCode,
  Trash2,
} from 'lucide-react'

// Типы данных
type TaskData = {
  label: string
  type: 'task'
  process_name: string
  comment?: string
  expected_duration: number
  month?: number
  weekday?: number
  status: string
  department: string
  role: string
}

type PoolData = {
  label: string
  type: 'pool'
  department: string
}

type BPMNNodeData = TaskData | PoolData

// Исторические данные для автоподсказок
const HISTORICAL_DATA: any[] = [
  {
    comment: "Классика — закупка в октябре, инженер, 4 часа",
    expected_duration: 240,
    process_name: "Закупка оборудования",
    role: "Engineer",
    department: "Procurement",
    status: "active",
    month: 10,
    weekday: 3
  },
  {
    comment: "Директор в декабре в пятницу — короткое согласование — сюрприз!",
    expected_duration: 60,
    process_name: "Согласование контракта с клиентом",
    role: "Director",
    department: "Management",
    status: "active",
    month: 12,
    weekday: 5
  },
  {
    comment: "Конец марта — большой бюджетный план → почти всегда задержка",
    expected_duration: 480,
    process_name: "Финансовое планирование / изменение бюджета",
    role: "Manager",
    department: "Finance",
    month: 3,
    weekday: 4
  },
  {
    comment: "Лето, оплата поставщику, всё спокойно",
    expected_duration: 90,
    process_name: "Пополнение счета / оплата поставщика",
    role: "specialist",
    department: "Finance",
    status: "in_progress",
    month: 8,
    weekday: 2
  },
  {
    comment: "Пятница 29 декабря — никто ничего не хочет делать",
    expected_duration: 120,
    process_name: "Закупка оборудования",
    role: "specialist",
    department: "Procurement",
    month: 12,
    weekday: 4
  },
  {
    comment: "Понедельник января — все свежие и быстрые",
    expected_duration: 180,
    process_name: "Закупка оборудования",
    role: "Engineer",
    department: "Procurement",
    month: 1,
    weekday: 0
  },
  {
    comment: "Директор в среду в обычном месяце",
    expected_duration: 60,
    process_name: "Согласование контракта с клиентом",
    role: "Director",
    department: "Management",
    month: 6,
    weekday: 2
  },
  {
    comment: "Очень длинная задача в IT-отделе в ноябре",
    expected_duration: 600,
    process_name: "Закупка оборудования",
    role: "specialist",
    department: "IT Operations",
    month: 11,
    weekday: 1
  },
  {
    comment: "Короткая задача в пятницу вечером — почти всегда переносится",
    expected_duration: 30,
    process_name: "Пополнение счета / оплата поставщика",
    role: "specialist",
    department: "Finance",
    month: 9,
    weekday: 4
  }
]

const DEPARTMENT_OPTIONS = ['Procurement', 'Management', 'Finance', 'IT Operations']
const ROLE_OPTIONS = ['Engineer', 'Director', 'Manager', 'specialist']
const STATUS_OPTIONS = ['active', 'in_progress', 'completed', 'cancelled']


// Функции для автоподсказок
const getDurationSuggestion = (processName: string, role: string, department: string, month?: number, weekday?: number): number | null => {
  const matches = HISTORICAL_DATA.filter(item => {
    const matchProcess = !processName || item.process_name === processName
    const matchRole = !role || item.role === role
    const matchDept = !department || item.department === department
    const matchMonth = month === undefined || item.month === month
    const matchWeekday = weekday === undefined || item.weekday === weekday
    
    return matchProcess && matchRole && matchDept && matchMonth && matchWeekday
  })
  
  if (matches.length === 0) return null
  
  const avg = matches.reduce((sum, item) => sum + item.expected_duration, 0) / matches.length
  return Math.round(avg)
}

const getBestWorstDates = (): { best: { month: number; weekday: number }, worst: { month: number; weekday: number } } => {
  // Простая эвристика: лучшие даты - начало месяца, понедельник; худшие - конец года, пятница
  return {
    best: { month: 1, weekday: 0 },
    worst: { month: 12, weekday: 4 }
  }
}

const getCommentSuggestion = (processName: string, role: string, department: string): string | null => {
  const matches = HISTORICAL_DATA.filter(item => 
    item.process_name === processName && 
    item.role === role && 
    item.department === department
  )
  
  if (matches.length === 0) return null
  return matches[0].comment || null
}

// Компоненты узлов
const PoolNode = ({ data, selected }: NodeProps<PoolData>) => (
  <div className={`relative w-full min-w-[400px] min-h-[200px] border-2 rounded-lg p-6 ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-400 bg-gray-100'}`}>
    <div className="font-bold text-gray-900 text-xl mb-2">{data.label}</div>
    <div className="text-sm text-gray-600">Отдел: {data.department}</div>
    <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">Пул</div>
  </div>
)

const TaskNode = ({ data, selected }: NodeProps<TaskData>) => (
  <div className={`relative px-4 py-3 bg-white border-2 rounded-lg shadow-md min-w-[200px] ${selected ? 'border-blue-500' : 'border-primary'}`}>
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-primary" />
    <div className="font-semibold text-gray-900">{data.label}</div>
    {data.comment && (
      <div className="text-xs text-gray-500 mt-1" title={data.comment}>
        {data.comment.length > 50 ? data.comment.substring(0, 50) + '...' : data.comment}
      </div>
    )}
    <div className="text-xs text-gray-400 mt-1">
      {data.expected_duration} мин · {data.role} · {data.status}
    </div>
    <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-primary" />
  </div>
)

const nodeTypes: NodeTypes = {
  pool: PoolNode,
  task: TaskNode,
}

const ProcessEditor = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [model, setModel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<BPMNNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node<BPMNNodeData> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) {
      fetchModel()
    } else {
      setLoading(false)
    }
  }, [id])

  const fetchModel = async () => {
    try {
      const response = await axios.get(`/process-models/${id}`)
      setModel(response.data)
      const structure = response.data.data
      if (structure?.nodes?.length) {
        setNodes(structure.nodes)
        if (structure.edges) {
        setEdges(structure.edges)
      }
      }
    } catch (error) {
      console.error('Ошибка загрузки модели:', error)
    } finally {
      setLoading(false)
    }
  }

  // Разместить задачу в пуле на основе department
  const placeTaskInPool = (taskNode: Node<TaskData>) => {
    const poolNodes = nodes.filter(n => n.type === 'pool' && (n.data as PoolData).department === taskNode.data.department)
    
    if (poolNodes.length > 0) {
      const pool = poolNodes[0]
      // Размещаем задачу внутри пула (смещение вниз)
      const poolY = pool.position.y
      const tasksInPool = nodes.filter(n => 
        n.type === 'task' && 
        (n.data as TaskData).department === taskNode.data.department &&
        n.id !== taskNode.id
      )
      const offsetY = poolY + 100 + (tasksInPool.length * 120)
      
      return {
        x: pool.position.x + 50,
        y: offsetY
      }
    }
    
    return taskNode.position
  }

  const addPool = () => {
    const newPool: Node<PoolData> = {
      id: `pool-${Date.now()}`,
      type: 'pool',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        label: 'Новый пул',
        type: 'pool',
        department: DEPARTMENT_OPTIONS[0],
      },
    }
    setNodes((nds) => [...nds, newPool])
    setSelectedNode(newPool)
  }

  const addTask = () => {
    const newTask: Node<TaskData> = {
      id: `task-${Date.now()}`,
      type: 'task',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        label: 'Новая задача',
        type: 'task',
        process_name: '',
        expected_duration: 60,
        status: 'active',
        department: DEPARTMENT_OPTIONS[0],
        role: ROLE_OPTIONS[0],
      },
    }
    
    // Автоматически размещаем в пуле
    const position = placeTaskInPool(newTask)
    newTask.position = position
    
    setNodes((nds) => {
      const updated = [...nds, newTask]
      // Если пула нет, создаем его
      const poolExists = updated.some(n => 
        n.type === 'pool' && (n.data as PoolData).department === newTask.data.department
      )
      if (!poolExists) {
        const newPool: Node<PoolData> = {
          id: `pool-${Date.now()}-auto`,
          type: 'pool',
          position: { x: position.x - 50, y: position.y - 50 },
          data: {
            label: newTask.data.department,
            type: 'pool',
            department: newTask.data.department,
          },
        }
        updated.push(newPool)
      }
      return updated
    })
    
    setSelectedNode(newTask)
  }

  const updateSelectedNode = (updates: Partial<BPMNNodeData>) => {
    if (!selectedNode) return
    
    const updatedData = { ...selectedNode.data, ...updates } as BPMNNodeData
    
    // Если изменился department задачи, перемещаем в соответствующий пул
    if (selectedNode.type === 'task' && updates.department && updates.department !== (selectedNode.data as TaskData).department) {
      const taskData = updatedData as TaskData
      const newPosition = placeTaskInPool({ ...selectedNode, data: taskData } as Node<TaskData>)
      
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return { ...node, data: updatedData as BPMNNodeData, position: newPosition } as Node<BPMNNodeData>
          }
          return node
        })
      )
      
      setSelectedNode({ ...selectedNode, data: updatedData as BPMNNodeData, position: newPosition } as Node<BPMNNodeData>)
      return
    }
    
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id ? { ...node, data: updatedData as BPMNNodeData } as Node<BPMNNodeData> : node
      )
    )
    setSelectedNode({ ...selectedNode, data: updatedData as BPMNNodeData } as Node<BPMNNodeData>)
  }

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: `edge-${Date.now()}`,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#0f172a',
            },
            style: { stroke: '#0f172a', strokeWidth: 2 },
          },
          eds
        )
      ),
    []
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      const serializedNodes = nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      }))
      const serializedEdges = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: edge.data,
        markerEnd: edge.markerEnd,
        style: edge.style,
      }))

      await axios.put(`/process-models/${id}`, {
        name: model?.name || 'Новая модель',
        description: model?.description || '',
        status: 'draft',
        data: {
          nodes: serializedNodes,
          edges: serializedEdges,
        },
      })

      alert('Модель успешно сохранена!')
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка при сохранении модели')
    } finally {
      setSaving(false)
    }
  }

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const items = Array.isArray(data) ? data : [data]

      // Создаем пулы по department
      const departments = new Set(items.map((item: any) => item.department).filter(Boolean))
      const poolNodes: Node<PoolData>[] = Array.from(departments).map((dept, idx) => ({
        id: `pool-import-${idx}`,
        type: 'pool',
        position: { x: 100, y: 100 + idx * 300 },
              data: {
          label: String(dept),
          type: 'pool',
          department: String(dept),
        },
      }))

      // Создаем задачи
      const taskNodes: Node<TaskData>[] = items.map((item: any, idx) => {
        const dept = item.department || DEPARTMENT_OPTIONS[0]
        const pool = poolNodes.find(p => p.data.department === dept)
        const tasksInPool = items.filter((it: any, i: number) => i < idx && (it.department || DEPARTMENT_OPTIONS[0]) === dept)
        
        return {
          id: `task-import-${idx}`,
          type: 'task',
          position: {
            x: (pool?.position.x || 100) + 50,
            y: (pool?.position.y || 100) + 100 + tasksInPool.length * 120,
          },
            data: {
            label: item.process_name || 'Задача',
            type: 'task',
            process_name: item.process_name || '',
            comment: item.comment || '',
            expected_duration: item.expected_duration || 60,
            month: item.month,
            weekday: item.weekday,
            status: item.status || 'active',
            department: dept,
            role: item.role || ROLE_OPTIONS[0],
          },
        }
      })

      setNodes([...poolNodes, ...taskNodes])
      alert(`Импортировано: ${poolNodes.length} пулов, ${taskNodes.length} задач`)
    } catch (error) {
      console.error('Ошибка импорта:', error)
      alert('Ошибка при импорте JSON файла')
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleExportJSON = () => {
    const tasks = nodes
      .filter(n => n.type === 'task')
      .map(n => {
        const data = n.data as TaskData
        return {
          process_name: data.process_name || data.label,
          comment: data.comment,
          expected_duration: data.expected_duration,
          month: data.month,
          weekday: data.weekday,
          status: data.status,
          department: data.department,
          role: data.role,
        }
      })

    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `model_${id || 'new'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportBPMN = async () => {
    try {
      // Генерируем упрощенный BPMN XML
      const pools = nodes.filter(n => n.type === 'pool')
      const tasks = nodes.filter(n => n.type === 'task')
      
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">`

      pools.forEach((pool) => {
        const poolData = pool.data as PoolData
        xml += `
    <bpmn:participant id="Participant_${pool.id}" name="${poolData.label}" processRef="Process_${pool.id}" />`
      })

      xml += `
  </bpmn:collaboration>`

      pools.forEach((pool) => {
        const poolData = pool.data as PoolData
        const poolTasks = tasks.filter((t) => (t.data as TaskData).department === poolData.department)
        
        xml += `
  <bpmn:process id="Process_${pool.id}" isExecutable="false">
    <bpmn:laneSet id="LaneSet_${pool.id}">
      <bpmn:lane id="Lane_${pool.id}" name="${poolData.label}">`
        
        poolTasks.forEach((task) => {
          const taskData = task.data as TaskData
          xml += `
        <bpmn:task id="Task_${task.id}" name="${taskData.label}" />`
        })
        
        xml += `
      </bpmn:lane>
    </bpmn:laneSet>
  </bpmn:process>`
      })

      xml += `
</bpmn:definitions>`

      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `model_${id || 'new'}.bpmn`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Ошибка экспорта BPMN:', error)
      alert('Ошибка при экспорте BPMN XML')
    }
  }

  const handleNodeClick = (_event: React.MouseEvent, node: Node<BPMNNodeData>) => {
    setSelectedNode(node)
  }

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return
    
    if (confirm(`Вы уверены, что хотите удалить "${selectedNode.data.label}"?`)) {
      const nodeToDelete = selectedNode
      
      // Удаляем узел
      setNodes((nds) => {
        let filtered = nds.filter((node) => node.id !== nodeToDelete.id)
        
        // Если это пул, удаляем также все связанные задачи
        if (nodeToDelete.type === 'pool') {
          const poolData = nodeToDelete.data as PoolData
          filtered = filtered.filter((node) => {
            if (node.type === 'task') {
              const taskData = node.data as TaskData
              return taskData.department !== poolData.department
            }
            return true
          })
        }
        
        return filtered
      })
      
      // Удаляем связанные рёбра
      setEdges((eds) => 
        eds.filter((edge) => 
          edge.source !== nodeToDelete.id && edge.target !== nodeToDelete.id
        )
      )
      
      setSelectedNode(null)
    }
  }, [selectedNode, setNodes, setEdges, setSelectedNode])

  // Обработчик клавиши Delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        // Предотвращаем удаление, если фокус в поле ввода
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
          return
        }
        event.preventDefault()
        handleDeleteNode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, handleDeleteNode])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {model?.name || 'Новая модель'}
            </h1>
            <p className="text-sm text-gray-600">Упрощенный BPMN-редактор</p>
          </div>
          <div className="flex items-center space-x-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Импорт JSON</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileJson className="w-4 h-4" />
              <span>Экспорт JSON</span>
            </button>
            <button
              onClick={handleExportBPMN}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileCode className="w-4 h-4" />
              <span>Экспорт BPMN</span>
            </button>
            <button
              onClick={() => navigate('/process-models')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отменить
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar */}
          <div className="w-64 bg-white border-r p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Инструменты</h3>
            <div className="space-y-2">
              <button
                onClick={addPool}
                className="w-full flex items-center space-x-2 px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Layers className="w-5 h-5" />
                <span className="font-medium">Пул</span>
              </button>
              <button
                onClick={addTask}
                className="w-full flex items-center space-x-2 px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Задача</span>
              </button>
              </div>
            <div className="mt-6 text-xs text-gray-500 border-t pt-4">
              <p>Перетащите элементы на холст для создания модели процесса.</p>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onPaneClick={() => setSelectedNode(null)}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          {/* Properties Panel */}
          <div className="w-96 bg-white border-l p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Свойства</h3>
              {selectedNode && (
                <button
                  onClick={handleDeleteNode}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                  title="Удалить элемент (Delete)"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Удалить</span>
                </button>
              )}
            </div>
            {selectedNode ? (
              selectedNode.type === 'pool' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Название пула
                    </label>
                    <select
                      value={(selectedNode.data as PoolData).department}
                      onChange={(e) => updateSelectedNode({ department: e.target.value, label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Имя задачи (process_name)
                  </label>
                  <input
                    type="text"
                      value={(selectedNode.data as TaskData).process_name || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        updateSelectedNode({ process_name: val, label: val || 'Новая задача' })
                        // Обновляем подсказки при изменении
                        const suggestion = getDurationSuggestion(
                          val,
                          (selectedNode.data as TaskData).role,
                          (selectedNode.data as TaskData).department
                        )
                        if (suggestion) {
                          // Можно показать подсказку в UI
                        }
                      }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      Комментарий
                  </label>
                    <textarea
                      value={(selectedNode.data as TaskData).comment || ''}
                      onChange={(e) => updateSelectedNode({ comment: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {(() => {
                      const suggestion = getCommentSuggestion(
                        (selectedNode.data as TaskData).process_name,
                        (selectedNode.data as TaskData).role,
                        (selectedNode.data as TaskData).department
                      )
                      return suggestion ? (
                        <p className="text-xs text-blue-600 mt-1" title={suggestion}>
                          💡 Подсказка: {suggestion.length > 60 ? suggestion.substring(0, 60) + '...' : suggestion}
                        </p>
                      ) : null
                    })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      Длительность выполнения (минуты)
                  </label>
                  <input
                      type="number"
                      min={1}
                      value={(selectedNode.data as TaskData).expected_duration || 60}
                      onChange={(e) => updateSelectedNode({ expected_duration: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {(() => {
                      const suggestion = getDurationSuggestion(
                        (selectedNode.data as TaskData).process_name,
                        (selectedNode.data as TaskData).role,
                        (selectedNode.data as TaskData).department,
                        (selectedNode.data as TaskData).month,
                        (selectedNode.data as TaskData).weekday
                      )
                      return suggestion ? (
                        <p className="text-xs text-blue-600 mt-1">
                          💡 Средняя длительность: {suggestion} мин
                        </p>
                      ) : null
                    })()}
                </div>
                  <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                        Месяц (1-12)
                  </label>
                  <input
                        type="number"
                        min={1}
                        max={12}
                        value={(selectedNode.data as TaskData).month || ''}
                        onChange={(e) => updateSelectedNode({ month: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                        День недели (0-6)
                  </label>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={(selectedNode.data as TaskData).weekday || ''}
                        onChange={(e) => updateSelectedNode({ weekday: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                  </div>
                  {(() => {
                    const dates = getBestWorstDates()
                    return (
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>💡 Лучшие даты: месяц {dates.best.month}, день недели {dates.best.weekday}</p>
                        <p>⚠️ Худшие даты: месяц {dates.worst.month}, день недели {dates.worst.weekday}</p>
                      </div>
                    )
                  })()}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      Статус
                  </label>
                  <select
                      value={(selectedNode.data as TaskData).status || 'active'}
                      onChange={(e) => updateSelectedNode({ status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                  </label>
                  <select
                      value={(selectedNode.data as TaskData).department || DEPARTMENT_OPTIONS[0]}
                      onChange={(e) => updateSelectedNode({ department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      Роль
                  </label>
                    <select
                      value={(selectedNode.data as TaskData).role || ROLE_OPTIONS[0]}
                      onChange={(e) => updateSelectedNode({ role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                </div>
                </div>
              )
            ) : (
              <div className="text-gray-500 text-sm">
                Выберите элемент на холсте для редактирования свойств
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ProcessEditor
