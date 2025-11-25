import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import axios from 'axios'
import ReactFlow, {
  Node,
  Edge,
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
  X,
  Circle,
  Square,
  GitBranch,
  MessageCircle,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react'

type BPMNNodeData = {
  label: string
  type: string
  description?: string
  priority?: string
  riskLevel?: string
  assignedTo?: string
  dueDate?: string
  recipient?: string
  channel?: string
  dataType?: string
  source?: string
  destination?: string
  owner?: string
  role?: string
  expected_duration_minutes?: number
  cost_per_hour?: number
  ml_prediction?: boolean
}

type BPMNEdgeData = {
  type: 'sequence' | 'message'
  label?: string
  condition?: string
  probability?: string
}

const TaskNode = ({ data }: NodeProps<BPMNNodeData>) => (
  <div className="relative px-4 py-2 bg-white border-2 border-primary rounded-xl shadow-md min-w-[160px]">
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-primary" />
    <div className="font-semibold text-gray-900">{data.label}</div>
    {data.description && <div className="text-xs text-gray-500 mt-1">{data.description}</div>}
    <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-primary" />
  </div>
)

const GatewayNode = ({ data }: NodeProps<BPMNNodeData>) => (
  <div className="relative w-20 h-20 bg-white border-3 border-accent-red shadow-md transform rotate-45 flex items-center justify-center">
    <Handle type="target" position={Position.Top} className="!w-3 !h-3 bg-accent-red" />
    <div className="transform -rotate-45 font-semibold text-gray-900">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 bg-accent-red" />
  </div>
)

const MessageNode = ({ data }: NodeProps<BPMNNodeData>) => (
  <div className="relative px-4 py-3 bg-blue-50 border-2 border-blue-500 rounded-lg shadow-md flex items-center space-x-2 min-w-[150px]">
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-blue-500" />
    <MessageCircle className="w-5 h-5 text-blue-600" />
    <div>
      <div className="font-semibold text-blue-700">{data.label}</div>
      {data.description && <div className="text-xs text-blue-500">{data.description}</div>}
    </div>
    <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-blue-500" />
  </div>
)

const DataNode = ({ data }: NodeProps<BPMNNodeData>) => (
  <div className="relative px-3 py-2 bg-amber-50 border-2 border-amber-500 rounded-lg shadow-md flex items-center space-x-2 min-w-[140px]">
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-amber-500" />
    <FileText className="w-5 h-5 text-amber-600" />
    <div>
      <div className="font-semibold text-amber-700">{data.label}</div>
      {data.description && <div className="text-xs text-amber-500">{data.description}</div>}
    </div>
    <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-amber-500" />
  </div>
)

const SubprocessNode = ({ data }: NodeProps<BPMNNodeData>) => (
  <div className="relative px-4 py-3 bg-green-50 border-2 border-green-500 rounded-2xl shadow-md min-w-[200px]">
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-green-500" />
    <div className="flex items-center space-x-2">
      <Layers className="w-5 h-5 text-green-600" />
      <div>
        <div className="font-semibold text-green-700">{data.label}</div>
        <div className="text-xs text-green-500">Подпроцесс</div>
      </div>
    </div>
    {data.description && <div className="text-xs text-green-500 mt-1">{data.description}</div>}
    <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-green-500" />
    <div className="absolute -bottom-2 right-3 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full shadow">
      +
    </div>
  </div>
)

const StartNode = () => (
  <div className="relative w-16 h-16 bg-white border-2 border-green-600 rounded-full flex items-center justify-center shadow-md">
    <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-green-600" />
    <Circle className="w-6 h-6 text-green-600" />
  </div>
)

const EndNode = () => (
  <div className="relative w-16 h-16 bg-white border-[6px] border-red-600 rounded-full flex items-center justify-center shadow-md">
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-red-600" />
    <X className="w-6 h-6 text-red-600" />
  </div>
)

const nodeTypes: NodeTypes = {
  task: TaskNode,
  gateway: GatewayNode,
  start: StartNode,
  end: EndNode,
  message: MessageNode,
  dataObject: DataNode,
  subprocess: SubprocessNode,
}

const ROLE_OPTIONS = [
  { value: 'Procurement', label: 'Procurement' },
  { value: 'Finance', label: 'Finance' },
  { value: 'IT Operations', label: 'IT Operations' },
  { value: 'Director', label: 'Director' },
]

const ProcessEditor = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [model, setModel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<BPMNNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<BPMNEdgeData>([])
  const [selectedNode, setSelectedNode] = useState<Node<BPMNNodeData> | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge<BPMNEdgeData> | null>(null)
  const [activeEdgeType, setActiveEdgeType] = useState<'sequence' | 'message'>('sequence')
  const [properties, setProperties] = useState({
    name: '',
    description: '',
    priority: 'medium',
    riskLevel: 'low',
    assignedTo: '',
    dueDate: '',
  })

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
      setProperties({
        name: response.data.name,
        description: response.data.description || '',
        priority: 'medium',
        riskLevel: 'low',
        assignedTo: '',
        dueDate: '',
      })
      const structure = response.data.data
      if (structure?.nodes?.length) {
        setNodes(structure.nodes)
      }
      if (structure?.edges?.length) {
        setEdges(structure.edges)
      }

      // Загружаем BPMN XML если есть (упрощенная версия)
      if (!structure?.nodes?.length && response.data.bpmnXml) {
        // В реальном приложении здесь был бы парсер BPMN XML
        // Для демонстрации создаем простые узлы
        const initialNodes: Node<BPMNNodeData>[] = [
          {
            id: '1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Начало', type: 'start' },
          },
          {
            id: '2',
            type: 'task',
            position: { x: 300, y: 100 },
            data: { label: 'Задача 1', type: 'task', priority: 'medium', riskLevel: 'low' },
          },
          {
            id: '3',
            type: 'end',
            position: { x: 500, y: 100 },
            data: { label: 'Конец', type: 'end' },
          },
        ]
        const initialEdges: Edge<BPMNEdgeData>[] = [
          {
            id: 'e1-2',
            source: '1',
            target: '2',
            data: { type: 'sequence' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0f172a' },
            style: { stroke: '#0f172a', strokeWidth: 2 },
          },
          {
            id: 'e2-3',
            source: '2',
            target: '3',
            data: { type: 'sequence' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0f172a' },
            style: { stroke: '#0f172a', strokeWidth: 2 },
          },
        ]
        setNodes(initialNodes)
        setEdges(initialEdges)
      }
    } catch (error) {
      console.error('Ошибка загрузки модели:', error)
    } finally {
      setLoading(false)
    }
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
            color: activeEdgeType === 'message' ? '#0ea5e9' : '#0f172a',
          },
          style:
            activeEdgeType === 'message'
              ? { stroke: '#0ea5e9', strokeDasharray: '8 4', strokeWidth: 2 }
              : { stroke: '#0f172a', strokeWidth: 2 },
          data: { type: activeEdgeType },
        },
        eds
        )
      ),
    [activeEdgeType]
  )

  const addNode = (type: BPMNNodeData['type'], label: string) => {
    const baseData: BPMNNodeData = {
      label,
      type,
    }

    if (type === 'task') {
      baseData.priority = 'medium'
      baseData.riskLevel = 'low'
    baseData.role = 'Procurement'
    baseData.expected_duration_minutes = 60
    baseData.cost_per_hour = 500
    baseData.ml_prediction = false
    }

    if (type === 'subprocess') {
      baseData.priority = 'medium'
      baseData.riskLevel = 'medium'
      baseData.owner = 'Команда'
    }

    if (type === 'message') {
      baseData.channel = 'Email'
      baseData.recipient = 'Получатель'
    }

    if (type === 'dataObject') {
      baseData.dataType = 'Документ'
      baseData.source = 'Источник'
      baseData.destination = 'Назначение'
    }

    const newNode: Node<BPMNNodeData> = {
      id: `${Date.now()}`,
      type,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: baseData,
    }
    setNodes((nds) => [...nds, newNode])
    setSelectedNode(newNode)
    setSelectedEdge(null)
  }

  const updateSelectedNode = (updates: Partial<BPMNNodeData>) => {
    if (!selectedNode) return
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
    setSelectedNode((prev) =>
      prev ? { ...prev, data: { ...prev.data, ...updates } } : prev
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Преобразуем nodes и edges в упрощенный BPMN XML
      const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions>
          <bpmn:process id="Process_1">
            ${nodes
              .map(
                (node) =>
                  `<node id="${node.id}" type="${node.type}" label="${node.data.label}" />`
              )
              .join('\n')}
            ${edges
              .map(
                (edge) =>
                  `<edge id="${edge.id}" source="${edge.source}" target="${edge.target}" type="${
                    edge.data?.type || 'sequence'
                  }" label="${edge.data?.label || ''}" />`
              )
              .join('\n')}
          </bpmn:process>
        </bpmn:definitions>`

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
        name: properties.name,
        description: properties.description,
        bpmnXml,
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

  const updateSelectedEdge = (updates: Partial<BPMNEdgeData>) => {
    if (!selectedEdge) return
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === selectedEdge.id
          ? {
              ...edge,
              data: {
                type: edge.data?.type ?? 'sequence',
                ...edge.data,
                ...updates,
              },
            }
          : edge
      )
    )
    setSelectedEdge((prev) =>
      prev
        ? {
            ...prev,
            data: {
              type: prev.data?.type ?? 'sequence',
              ...prev.data,
              ...updates,
            },
          }
        : prev
    )
  }

  const handleNodeClick = (_event: React.MouseEvent, node: Node<BPMNNodeData>) => {
    setSelectedEdge(null)
    setSelectedNode(node)
  }

  const handleEdgeClick = (_event: React.MouseEvent, edge: Edge<BPMNEdgeData>) => {
    setSelectedNode(null)
    setSelectedEdge({
      ...edge,
      data: {
        type: edge.data?.type ?? 'sequence',
        ...edge.data,
      },
    })
  }

  const renderDescriptionField = (
    value: string | undefined,
    onChange: (val: string) => void
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  )

  const renderNodeSpecificFields = () => {
    if (!selectedNode) return null
    switch (selectedNode.type) {
      case 'task':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                <select
                  value={selectedNode.data.role || 'Procurement'}
                  onChange={(e) => updateSelectedNode({ role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ожидаемая длительность (мин)
                </label>
                <input
                  type="number"
                  min={1}
                  value={selectedNode.data.expected_duration_minutes || 60}
                  onChange={(e) =>
                    updateSelectedNode({ expected_duration_minutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Стоимость / час</label>
                <input
                  type="number"
                  min={0}
                  value={selectedNode.data.cost_per_hour || 500}
                  onChange={(e) => updateSelectedNode({ cost_per_hour: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2 mt-6">
                <input
                  id="ml-prediction"
                  type="checkbox"
                  checked={Boolean(selectedNode.data.ml_prediction)}
                  onChange={(e) => updateSelectedNode({ ml_prediction: e.target.checked })}
                  className="h-4 w-4 text-primary border-gray-300 rounded"
                />
                <label htmlFor="ml-prediction" className="text-sm text-gray-700">
                  Использовать ML-предсказание
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                <select
                  value={selectedNode.data.priority || 'medium'}
                  onChange={(e) => updateSelectedNode({ priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Риск</label>
                <select
                  value={selectedNode.data.riskLevel || 'low'}
                  onChange={(e) => updateSelectedNode({ riskLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Назначено</label>
              <input
                type="text"
                value={selectedNode.data.assignedTo || ''}
                onChange={(e) => updateSelectedNode({ assignedTo: e.target.value })}
                placeholder="Email или роль"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Срок выполнения</label>
              <input
                type="date"
                value={selectedNode.data.dueDate || ''}
                onChange={(e) => updateSelectedNode({ dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </>
        )
      case 'subprocess':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Владелец</label>
              <input
                type="text"
                value={selectedNode.data.owner || ''}
                onChange={(e) => updateSelectedNode({ owner: e.target.value })}
                placeholder="Команда / отдел"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                <select
                  value={selectedNode.data.priority || 'medium'}
                  onChange={(e) => updateSelectedNode({ priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Риск</label>
                <select
                  value={selectedNode.data.riskLevel || 'medium'}
                  onChange={(e) => updateSelectedNode({ riskLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
            </div>
          </>
        )
      case 'message':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Получатель</label>
              <input
                type="text"
                value={selectedNode.data.recipient || ''}
                onChange={(e) => updateSelectedNode({ recipient: e.target.value })}
                placeholder="Команда / роль"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Канал</label>
              <input
                type="text"
                value={selectedNode.data.channel || ''}
                onChange={(e) => updateSelectedNode({ channel: e.target.value })}
                placeholder="Email, Slack, API..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </>
        )
      case 'dataObject':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип данных</label>
              <input
                type="text"
                value={selectedNode.data.dataType || ''}
                onChange={(e) => updateSelectedNode({ dataType: e.target.value })}
                placeholder="Документ, JSON, Таблица..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Источник</label>
                <input
                  type="text"
                  value={selectedNode.data.source || ''}
                  onChange={(e) => updateSelectedNode({ source: e.target.value })}
                  placeholder="Откуда"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Назначение</label>
                <input
                  type="text"
                  value={selectedNode.data.destination || ''}
                  onChange={(e) => updateSelectedNode({ destination: e.target.value })}
                  placeholder="Куда"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </>
        )
      default:
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <p className="text-xs text-gray-500">
              Для событий и шлюзов можно добавить пояснение, которое появится в документации модели.
            </p>
          </>
        )
    }
  }

  const renderEdgeFields = () => {
    if (!selectedEdge) return null
    const isMessage = selectedEdge.data?.type === 'message'
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название потока</label>
          <input
            type="text"
            value={selectedEdge.data?.label || ''}
            onChange={(e) => updateSelectedEdge({ label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        {!isMessage && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Условие перехода
              </label>
              <input
                type="text"
                value={selectedEdge.data?.condition || ''}
                onChange={(e) => updateSelectedEdge({ condition: e.target.value })}
                placeholder="Например: ${budget > 1000000}"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Доступны переменные: budget, department, ml_risk, probability(x).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Вероятность</label>
              <input
                type="text"
                value={selectedEdge.data?.probability || ''}
                onChange={(e) => updateSelectedEdge({ probability: e.target.value })}
                placeholder="Например: 65%"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </>
        )}
        {isMessage && (
          <p className="text-xs text-sky-600">
            Поток сообщений отображается пунктиром. Используйте его для межпроцессного взаимодействия.
          </p>
        )}
      </div>
    )
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

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {model?.name || 'Новая модель'}
            </h1>
            <p className="text-sm text-gray-600">Редактор BPMN-процессов</p>
          </div>
          <div className="flex items-center space-x-3">
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
              <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar */}
          <div className="w-72 bg-white border-r p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Инструменты</h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => addNode('task', 'Задача')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Задача</span>
              </button>
              <button
                onClick={() => addNode('subprocess', 'Подпроцесс')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Подпроцесс</span>
              </button>
              <button
                onClick={() => addNode('gateway', 'Шлюз')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                <span>Шлюз</span>
              </button>
              <button
                onClick={() => addNode('message', 'Сообщение')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Сообщение</span>
              </button>
              <button
                onClick={() => addNode('dataObject', 'Объект данных')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Объект данных</span>
              </button>
              <button
                onClick={() => addNode('start', 'Начало')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Circle className="w-4 h-4" />
                <span>Начальное событие</span>
              </button>
              <button
                onClick={() => addNode('end', 'Конец')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Конечное событие</span>
              </button>
              <div className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg p-3 mt-2">
                Используйте кружки-коннекторы на элементах, чтобы соединять их потоками.
              </div>
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-gray-500 mb-2">Тип создаваемого потока:</p>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => setActiveEdgeType('sequence')}
                    className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${
                      activeEdgeType === 'sequence'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Поток операций</span>
                  </button>
                  <button
                    onClick={() => setActiveEdgeType('message')}
                    className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${
                      activeEdgeType === 'message'
                        ? 'border-sky-500 bg-sky-50 text-sky-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Поток сообщений</span>
                  </button>
                </div>
              </div>
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
              onNodeClick={(event, node) => handleNodeClick(event, node)}
              onEdgeClick={(event, edge) => handleEdgeClick(event, edge as Edge<BPMNEdgeData>)}
              onPaneClick={() => {
                setSelectedNode(null)
                setSelectedEdge(null)
              }}
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
            <h3 className="font-semibold text-gray-900 mb-4">Свойства</h3>
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название элемента
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => updateSelectedNode({ label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип
                  </label>
                  <input
                    type="text"
                    value={selectedNode.type}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                {renderNodeSpecificFields()}
              </div>
            ) : selectedEdge ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип потока
                  </label>
                  <input
                    type="text"
                    value={
                      selectedEdge.data?.type === 'message' ? 'Поток сообщений' : 'Поток операций'
                    }
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                {renderEdgeFields()}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название модели
                  </label>
                  <input
                    type="text"
                    value={properties.name}
                    onChange={(e) => setProperties({ ...properties, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={properties.description}
                    onChange={(e) => setProperties({ ...properties, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Приоритет
                  </label>
                  <select
                    value={properties.priority}
                    onChange={(e) => setProperties({ ...properties, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Уровень риска
                  </label>
                  <select
                    value={properties.riskLevel}
                    onChange={(e) => setProperties({ ...properties, riskLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Назначено
                  </label>
                  <input
                    type="text"
                    value={properties.assignedTo}
                    onChange={(e) => setProperties({ ...properties, assignedTo: e.target.value })}
                    placeholder="Email пользователя"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Срок выполнения
                  </label>
                  <input
                    type="date"
                    value={properties.dueDate}
                    onChange={(e) => setProperties({ ...properties, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )

}

export default ProcessEditor
