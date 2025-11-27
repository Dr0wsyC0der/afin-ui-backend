import { useEffect, useState, useCallback, MouseEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import axios from 'axios'
import ReactFlow, {
  Node,
  Edge,
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
  NodeChange,
  applyNodeChanges,
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
  Trash2,
} from 'lucide-react'

type BPMNNodeData = {
  label: string
  description?: string
  priority?: string
  riskLevel?: string
  assignedTo?: string
  employee?: string
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
  // Для объектов данных
  dataObjectName?: string
  required?: boolean
  // Для дорожек (lane/pool)
  laneRole?: string
  laneOwner?: string
  laneId?: string | null
  poolId?: string | null
  parentId?: string | null
  height?: number
  width?: number
  colorHex?: string
  laneColor?: string
  messageContent?: string
  messageDirection?: 'send' | 'receive'
  gatewayType?: 'exclusive' | 'parallel' | 'merge'
}

type BPMNEdgeData = {
  type: 'sequenceFlow' | 'messageFlow' | 'association'
  label?: string
  condition?: string | null
  probability?: string | null
  associationType?: string | null
}

type EditorNodeType =
  | 'task'
  | 'subprocess'
  | 'gateway'
  | 'message'
  | 'dataObject'
  | 'start'
  | 'end'
  | 'lane'
  | 'pool'

const TaskNode = ({ data }: NodeProps<BPMNNodeData>) => {
  const [hovered, setHovered] = useState(false)
  const laneColor = data.laneColor || getRoleColor(data.role)
  const backgroundColor = data.laneColor ? hexToRgba(laneColor, 0.15) : '#ffffff'
  const borderColor = laneColor

  return (
    <div
      className="relative px-4 py-2 border-2 rounded-xl shadow-md min-w-[160px] transition-all duration-200"
      style={{
        backgroundColor,
        borderColor,
        boxShadow: hovered ? `0 12px 24px ${hexToRgba(laneColor, 0.25)}` : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3" style={{ backgroundColor: laneColor }} />
      <div className="font-semibold text-gray-900">{data.label}</div>
      {data.description && <div className="text-xs text-gray-500 mt-1">{data.description}</div>}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3" style={{ backgroundColor: laneColor }} />
    </div>
  )
}

const GatewayNode = ({ data }: NodeProps<BPMNNodeData>) => {
  const symbol =
    data.gatewayType === 'parallel' ? '+' : data.gatewayType === 'merge' ? '∧' : 'X'
  return (
    <div className="relative w-20 h-20 bg-white border-3 border-accent-red shadow-md transform rotate-45 flex items-center justify-center">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-accent-red" />
      <div className="transform -rotate-45 font-semibold text-gray-900 text-center leading-tight">
        <div>{data.label}</div>
        <div className="text-xs text-gray-500">{symbol}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-accent-red" />
    </div>
  )
}

const MessageNode = ({ data }: NodeProps<BPMNNodeData>) => (
  <div className="relative px-4 py-3 bg-blue-50 border-2 border-blue-500 rounded-lg shadow-md flex items-center space-x-2 min-w-[180px]">
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-blue-500" />
    <MessageCircle className="w-5 h-5 text-blue-600" />
    <div>
      <div className="font-semibold text-blue-700">{data.label}</div>
      {data.messageContent && (
        <div className="text-xs text-blue-500">{data.messageContent}</div>
      )}
      {data.description && <div className="text-xs text-blue-400">{data.description}</div>}
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

const LaneNode = ({ data }: NodeProps<BPMNNodeData>) => {
  const laneColor = data.colorHex || getRoleColor(data.laneRole)
  return (
    <div
      className="relative px-4 py-2 rounded-xl shadow-inner flex items-start"
      style={{
        minWidth: data.width || 800,
        minHeight: data.height || 140,
        backgroundColor: hexToRgba(laneColor, 0.08),
        border: `2px solid ${hexToRgba(laneColor, 0.4)}`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3" style={{ backgroundColor: laneColor }} />
      <div className="flex flex-col space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {data.laneRole || 'Зона ответственности'}
        </div>
        <div className="text-sm text-slate-700">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3" style={{ backgroundColor: laneColor }} />
    </div>
  )
}

const PoolNode = ({ data }: NodeProps<BPMNNodeData>) => (
  <div
    className="relative px-4 py-3 bg-slate-100 border-2 border-slate-500 rounded-2xl shadow-inner flex items-start"
    style={{
      minWidth: data.width || 900,
      minHeight: data.height || 200,
    }}
  >
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-slate-600" />
    <div className="flex flex-col space-y-1">
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        Пул
      </div>
      <div className="text-sm text-slate-800">{data.label}</div>
    </div>
    <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-slate-600" />
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
  lane: LaneNode,
  pool: PoolNode,
}

const ROLE_OPTIONS = [
  { value: 'Procurement', label: 'Procurement' },
  { value: 'Finance', label: 'Finance' },
  { value: 'IT Operations', label: 'IT Operations' },
  { value: 'Director', label: 'Director' },
]

const ROLE_COLORS: Record<string, string> = {
  Procurement: '#2563eb',
  Finance: '#0ea5e9',
  'IT Operations': '#10b981',
  Director: '#a855f7',
  Vendor: '#f97316',
  default: '#1e293b',
}

const hexToRgba = (hex: string, alpha: number) => {
  const sanitizedHex = hex.replace('#', '')
  const bigint = parseInt(sanitizedHex.length === 3 ? sanitizedHex.repeat(2) : sanitizedHex, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getRoleColor = (role?: string) => ROLE_COLORS[role || 'default'] || ROLE_COLORS.default

const EMPLOYEE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  Procurement: [
    { value: 'ivan_petrov', label: 'Иван Петров' },
    { value: 'olga_smirnova', label: 'Ольга Смирнова' },
  ],
  Finance: [
    { value: 'alexey_ivanov', label: 'Алексей Иванов' },
    { value: 'maria_kuznetsova', label: 'Мария Кузнецова' },
  ],
  'IT Operations': [
    { value: 'dmitry_sidorov', label: 'Дмитрий Сидоров' },
    { value: 'anna_lebedeva', label: 'Анна Лебедева' },
  ],
  Director: [
    { value: 'elena_andreeva', label: 'Елена Андреева' },
    { value: 'sergey_nikitin', label: 'Сергей Никитин' },
  ],
}

const formatCurrencyRub = (value?: number) => {
  if (value == null || isNaN(value)) return ''
  return (
    value
      .toFixed(0)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'
  )
}

const parseCurrencyRub = (value: string): number | undefined => {
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return undefined
  return Number(digits)
}

const NODE_SIZE = { width: 200, height: 90 }
const LANE_SIZE = { width: 840, height: 160 }
const POOL_SIZE = { width: 960, height: 240 }
const CONTAINER_PADDING = 24
const POOL_HEADER_HEIGHT = 60
const LANE_MIN_HEIGHT = 120
const POOL_MIN_HEIGHT = 160
const POOL_INNER_PADDING_X = 20
const LANE_GAP = 12

const EDGE_TYPE_OPTIONS: { value: 'sequenceFlow' | 'messageFlow' | 'association'; label: string; description: string }[] = [
  { value: 'sequenceFlow', label: 'Поток операций', description: 'Связь внутри пула/дорожки' },
  { value: 'messageFlow', label: 'Поток сообщений', description: 'Связь между пулами' },
  { value: 'association', label: 'Ассоциация данных', description: 'Связь задач и объектов данных' },
]

const normalizeEdgeTypeValue = (
  type?: string | null
): 'sequenceFlow' | 'messageFlow' | 'association' => {
  if (type === 'message' || type === 'messageFlow') {
    return 'messageFlow'
  }
  if (type === 'association') {
    return 'association'
  }
  return 'sequenceFlow'
}

const decorateEdgeAppearance = (edge: Edge<BPMNEdgeData>): Edge<BPMNEdgeData> => {
  const normalizedType = normalizeEdgeTypeValue(edge.data?.type)

  if (normalizedType === 'association') {
    return {
      ...edge,
      data: { ...edge.data, type: normalizedType },
      markerEnd: undefined,
      style: {
        stroke: '#94a3b8',
        strokeDasharray: '4 4',
        strokeWidth: 1.5,
      },
    }
  }

  if (normalizedType === 'messageFlow') {
    return {
      ...edge,
      data: { ...edge.data, type: normalizedType },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#0ea5e9',
      },
      style: {
        stroke: '#0ea5e9',
        strokeDasharray: '8 4',
        strokeWidth: 2,
      },
    }
  }

  return {
    ...edge,
    data: { ...edge.data, type: 'sequenceFlow' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#0f172a',
    },
    style: {
      stroke: '#0f172a',
      strokeWidth: 2,
    },
  }
}

const ProcessEditor = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [model, setModel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nodes, setNodes] = useNodesState<BPMNNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<BPMNEdgeData>([])
  const [selectedNode, setSelectedNode] = useState<Node<BPMNNodeData> | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge<BPMNEdgeData> | null>(null)
  const [activeEdgeType, setActiveEdgeType] = useState<'sequenceFlow' | 'messageFlow' | 'association'>('sequenceFlow')
  const [properties, setProperties] = useState({
    name: '',
    description: '',
    priority: 'medium',
    riskLevel: 'low',
    assignedTo: '',
    dueDate: '',
  })
  const [currencyInputs, setCurrencyInputs] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<{ type: 'error' | 'info'; message: string } | null>(
    null
  )
  const [dropHint, setDropHint] = useState<{ message: string; color: string } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timeout = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timeout)
  }, [feedback])

  const getContainerSize = (container?: Node<BPMNNodeData>) => {
    if (!container) return null
    if (container.type === 'pool') {
      return {
        width: container.data.width || POOL_SIZE.width,
        height: container.data.height || POOL_SIZE.height,
      }
    }
    if (container.type === 'lane') {
      return {
        width: container.data.width || LANE_SIZE.width,
        height: container.data.height || LANE_SIZE.height,
      }
    }
    return null
  }

  const clampPositionToContainer = (
    position: { x: number; y: number },
    container: Node<BPMNNodeData> | undefined
  ) => {
    if (!container) return position
    const size = getContainerSize(container) || { width: POOL_SIZE.width, height: POOL_SIZE.height }
    const minX = container.position.x + CONTAINER_PADDING
    const maxX = container.position.x + size.width - NODE_SIZE.width - CONTAINER_PADDING
    const minY = container.position.y + (container.type === 'pool' ? POOL_HEADER_HEIGHT : CONTAINER_PADDING)
    const maxY = container.position.y + size.height - NODE_SIZE.height - CONTAINER_PADDING
    return {
      x: Math.min(Math.max(position.x, minX), maxX),
      y: Math.min(Math.max(position.y, minY), maxY),
    }
  }

  const findNodeById = useCallback(
    (id?: string | null) => nodes.find((node) => node.id === id),
    [nodes]
  )

  const normalizeEdgeFromData = useCallback(
    (edge: Edge<any>): Edge<BPMNEdgeData> =>
      decorateEdgeAppearance({
        ...edge,
        data: {
          ...edge.data,
          type: normalizeEdgeTypeValue(edge.data?.type),
          condition: edge.data?.condition ?? null,
          associationType: edge.data?.associationType ?? null,
        },
      }),
    []
  )

  const validateConnection = useCallback(
    (
      connection: Connection,
      desiredType: 'sequenceFlow' | 'messageFlow' | 'association'
    ): { valid: boolean; reason?: string } => {
      const sourceNode = findNodeById(connection.source)
      const targetNode = findNodeById(connection.target)

      if (!sourceNode || !targetNode) {
        return { valid: false, reason: 'Элементы не найдены' }
      }

      if (sourceNode.id === targetNode.id) {
        return { valid: false, reason: 'Нельзя соединить элемент сам с собой' }
      }

      const sourcePool = sourceNode.data.poolId
      const targetPool = targetNode.data.poolId

      const isTaskLike = (node: Node<BPMNNodeData>) =>
        node.type === 'task' || node.type === 'subprocess'
      const isFlowObject = (node: Node<BPMNNodeData>) =>
        ['task', 'subprocess', 'gateway', 'start', 'end', 'message'].includes(node.type || '')

      if (desiredType === 'sequenceFlow') {
        if (!isFlowObject(sourceNode) || !isFlowObject(targetNode)) {
          return { valid: false, reason: 'Поток операций предназначен только для задач, событий и шлюзов' }
        }
        if (!sourcePool || !targetPool || sourcePool !== targetPool) {
          return { valid: false, reason: 'Sequence Flow возможен только внутри одного пула' }
        }
        if (targetNode.type === 'start') {
          return { valid: false, reason: 'У начального события не может быть входящих потоков' }
        }
        if (sourceNode.type === 'end') {
          return { valid: false, reason: 'От конечного события нельзя проводить исходящие потоки' }
        }
      }

      if (desiredType === 'messageFlow') {
        if (!sourcePool || !targetPool || sourcePool === targetPool) {
          return { valid: false, reason: 'Message Flow соединяет элементы из разных пулов' }
        }
        if (!isFlowObject(sourceNode) || !isFlowObject(targetNode)) {
          return { valid: false, reason: 'Message Flow допустим только между задачами, шлюзами или сообщениями' }
        }
      }

      if (desiredType === 'association') {
        const sourceIsData = sourceNode.type === 'dataObject'
        const targetIsData = targetNode.type === 'dataObject'
        if (sourceIsData === targetIsData) {
          return {
            valid: false,
            reason: 'Ассоциация должна связывать задачу/подпроцесс с объектом данных',
          }
        }
        if (!isTaskLike(sourceNode) && !isTaskLike(targetNode)) {
          return { valid: false, reason: 'Ассоциации допустимы только с задачами или подпроцессами' }
        }
      }

      return { valid: true }
    },
    [findNodeById]
  )

  const isInsideContainer = (
    container: Node<BPMNNodeData>,
    targetPosition: { x: number; y: number },
    size: { width: number; height: number }
  ) => {
    const centerX = targetPosition.x + NODE_SIZE.width / 2
    const centerY = targetPosition.y + NODE_SIZE.height / 2
    const startX = container.position.x
    const endX = container.position.x + size.width
    const startY = container.position.y
    const endY = container.position.y + size.height
    return centerX >= startX && centerX <= endX && centerY >= startY && centerY <= endY
  }

  const rebalancePool = (
    poolId: string,
    nodesSnapshot: Node<BPMNNodeData>[],
    minimumHeight?: number
  ): Node<BPMNNodeData>[] => {
    const pool = nodesSnapshot.find((node) => node.id === poolId && node.type === 'pool')
    if (!pool) return nodesSnapshot

    const lanes = nodesSnapshot
      .filter((node) => node.type === 'lane' && node.data.poolId === poolId)
      .sort((a, b) => a.position.y - b.position.y)

    const poolWidth = pool.data.width || POOL_SIZE.width

    const contentBottom = nodesSnapshot
      .filter(
        (node) =>
          node.id !== poolId &&
          node.data?.poolId === poolId &&
          node.type !== 'pool'
      )
      .reduce(
        (maxBottom, node) =>
          Math.max(maxBottom, node.position.y + NODE_SIZE.height + CONTAINER_PADDING),
        pool.position.y + POOL_MIN_HEIGHT
      )

    const requiredHeightForContent = contentBottom - pool.position.y
    const requiredHeightForLanes = lanes.length
      ? POOL_HEADER_HEIGHT + lanes.length * LANE_MIN_HEIGHT + Math.max(0, (lanes.length - 1) * LANE_GAP)
      : POOL_HEADER_HEIGHT + LANE_MIN_HEIGHT

    const nextPoolHeight = Math.max(
      POOL_MIN_HEIGHT,
      requiredHeightForLanes,
      requiredHeightForContent,
      minimumHeight || 0
    )

    let updatedNodes = nodesSnapshot.map((node) =>
      node.id === pool.id
        ? {
          ...node,
          data: {
            ...node.data,
            height: nextPoolHeight,
            width: poolWidth,
          },
        }
        : node
    )

    if (!lanes.length) {
      return updatedNodes
    }

    const availableHeight =
      nextPoolHeight -
      POOL_HEADER_HEIGHT -
      Math.max(0, (lanes.length - 1) * LANE_GAP)
    const laneHeight = Math.max(LANE_MIN_HEIGHT, availableHeight / lanes.length)
    const effectiveLaneWidth = poolWidth - POOL_INNER_PADDING_X * 2

    lanes.forEach((lane, index) => {
      const targetX = pool.position.x + POOL_INNER_PADDING_X
      const targetY = pool.position.y + POOL_HEADER_HEIGHT + index * (laneHeight + LANE_GAP)
      const dx = targetX - lane.position.x
      const dy = targetY - lane.position.y

      updatedNodes = updatedNodes.map((node) => {
        if (node.id === lane.id) {
          return {
            ...node,
            position: { x: targetX, y: targetY },
            data: {
              ...node.data,
              parentId: poolId,
              poolId,
              height: laneHeight,
              width: effectiveLaneWidth,
              colorHex: node.data.colorHex || getRoleColor(node.data.laneRole),
            },
          }
        }

        if (node.data?.parentId === lane.id) {
          return {
            ...node,
            position: {
              x: node.position.x + dx,
              y: node.position.y + dy,
            },
          }
        }

        return node
      })
    })

    return updatedNodes
  }

  const normalizeNodes = (rawNodes: Node<BPMNNodeData>[]): Node<BPMNNodeData>[] => {
    const nodesSnapshot = rawNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
      },
    })) as Node<BPMNNodeData>[]

    const poolIds = nodesSnapshot.filter((node) => node.type === 'pool').map((node) => node.id)
    const lanesById: Record<string, Node<BPMNNodeData>> = {}
    nodesSnapshot
      .filter((node) => node.type === 'lane')
      .forEach((laneNode) => {
        lanesById[laneNode.id] = laneNode
      })

    const enriched = nodesSnapshot.map((node) => {
      if (node.type === 'pool') {
        return {
          ...node,
          data: {
            ...node.data,
            parentId: null,
            poolId: null,
            height: Math.max(node.data.height || POOL_SIZE.height, POOL_MIN_HEIGHT),
            width: node.data.width || POOL_SIZE.width,
          },
        }
      }

      if (node.type === 'lane') {
        const poolId = node.data.poolId ?? node.data.parentId ?? poolIds[0] ?? null
        const colorHex = node.data.colorHex || getRoleColor(node.data.laneRole)
        return {
          ...node,
          data: {
            ...node.data,
            poolId,
            parentId: poolId,
            colorHex,
            height: Math.max(node.data.height || LANE_SIZE.height, LANE_MIN_HEIGHT),
          },
        }
      }

      const laneId = node.data.laneId ?? null
      const lane = laneId ? lanesById[laneId] : undefined
      const poolId = node.data.poolId ?? lane?.data.poolId ?? null
      const laneColor = node.data.laneColor || lane?.data.colorHex || (lane?.data.laneRole ? getRoleColor(lane.data.laneRole) : undefined)

      return {
        ...node,
        data: {
          ...node.data,
          poolId,
          parentId: laneId || poolId || null,
          laneColor,
        },
      }
    })

    let balancedNodes = enriched as Node<BPMNNodeData>[]
    poolIds.forEach((poolId) => {
      balancedNodes = rebalancePool(poolId, balancedNodes)
    })
    return balancedNodes
  }

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
        setNodes(normalizeNodes(structure.nodes))
      }
      if (structure?.edges?.length) {
        setEdges(structure.edges.map((edge: Edge<any>) => normalizeEdgeFromData(edge)))
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
            data: { label: 'Начало' },
          },
          {
            id: '2',
            type: 'task',
            position: { x: 300, y: 100 },
            data: { label: 'Задача 1', priority: 'medium', riskLevel: 'low' },
          },
          {
            id: '3',
            type: 'end',
            position: { x: 500, y: 100 },
            data: { label: 'Конец' },
          },
        ]
        const initialEdges: Edge<BPMNEdgeData>[] = [
          {
            id: 'e1-2',
            source: '1',
            target: '2',
            data: { type: 'sequenceFlow' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0f172a' },
            style: { stroke: '#0f172a', strokeWidth: 2 },
          },
          {
            id: 'e2-3',
            source: '2',
            target: '3',
            data: { type: 'sequenceFlow' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0f172a' },
            style: { stroke: '#0f172a', strokeWidth: 2 },
          },
        ]
        setNodes(normalizeNodes(initialNodes))
        setEdges(initialEdges)
      }
    } catch (error) {
      console.error('Ошибка загрузки модели:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = useCallback(
    (connection: Connection) => {
      const validation = validateConnection(connection, activeEdgeType)
      if (!validation.valid) {
        setFeedback({
          type: 'error',
          message: validation.reason || 'Недопустимое соединение',
        })
        return
      }

      const sourceNode = findNodeById(connection.source)
      const targetNode = findNodeById(connection.target)

      if (!sourceNode || !targetNode) {
        setFeedback({ type: 'error', message: 'Элементы не найдены' })
        return
      }

      let condition: string | null = null
      let associationType: string | null = null

      if (activeEdgeType === 'messageFlow') {
        const messageNode =
          sourceNode.type === 'message' ? sourceNode : targetNode.type === 'message' ? targetNode : null
        condition =
          messageNode?.data?.messageContent ||
          messageNode?.data?.description ||
          'Сообщение'
      }

      if (activeEdgeType === 'association') {
        associationType =
          window.prompt('Укажите тип связи (например, источник/результат):', 'использует') ||
          'использует'
      }

      const baseEdge: Edge<BPMNEdgeData> = {
        id: `edge-${Date.now()}`,
        source: connection.source || '',
        target: connection.target || '',
        data: {
          type: activeEdgeType,
          condition,
          associationType,
          probability: null,
        },
      }

      const decoratedEdge = decorateEdgeAppearance(baseEdge)

      setEdges((eds) => [...eds, decoratedEdge])
    },
    [activeEdgeType, findNodeById, setEdges, validateConnection]
  )

  const isConnectionValid = useCallback(
    (connection: Connection) => validateConnection(connection, activeEdgeType).valid,
    [activeEdgeType, validateConnection]
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((currentNodes) => {
        const updatedNodes = applyNodeChanges(changes, currentNodes)
        const movementMap: Record<string, { dx: number; dy: number }> = {}

        updatedNodes.forEach((updatedNode) => {
          const previousNode = currentNodes.find((node) => node.id === updatedNode.id)
          if (!previousNode) return
          const dx = updatedNode.position.x - previousNode.position.x
          const dy = updatedNode.position.y - previousNode.position.y
          if (dx === 0 && dy === 0) return
          movementMap[updatedNode.id] = { dx, dy }
        })

        const propagateMovement = (
          parentId: string,
          delta: { dx: number; dy: number },
          nodesSnapshot: Node<BPMNNodeData>[]
        ) => {
          nodesSnapshot.forEach((node, index) => {
            if (node.data?.parentId === parentId) {
              const nextPosition = {
                x: node.position.x + delta.dx,
                y: node.position.y + delta.dy,
              }
              nodesSnapshot[index] = {
                ...node,
                position: nextPosition,
              }
              propagateMovement(node.id, delta, nodesSnapshot)
            }
          })
        }

        Object.entries(movementMap).forEach(([nodeId, delta]) => {
          const mover = updatedNodes.find((node) => node.id === nodeId)
          if (!mover) return
          if (mover.type === 'pool' || mover.type === 'lane') {
            propagateMovement(nodeId, delta, updatedNodes)
          }
        })

        const clampedNodes = updatedNodes.map((node) => {
          if (!node.data?.parentId) {
            return node
          }
          const parentNode = updatedNodes.find((parent) => parent.id === node.data?.parentId)
          if (!parentNode) {
            return node
          }
          const clampedPosition = clampPositionToContainer(node.position, parentNode)
          if (
            clampedPosition.x !== node.position.x ||
            clampedPosition.y !== node.position.y
          ) {
            return { ...node, position: clampedPosition }
          }
          return node
        })

        return normalizeNodes(clampedNodes)
      })
    },
    [setNodes]
  )

  const addNode = (type: EditorNodeType, label: string) => {
    const baseData: BPMNNodeData = {
      label,
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
      baseData.role = 'Procurement'
      baseData.expected_duration_minutes = 120
      baseData.cost_per_hour = 800
    }

    if (type === 'message') {
      baseData.channel = 'Email'
      baseData.recipient = 'Получатель'
      baseData.messageContent = 'Сообщение'
      baseData.messageDirection = 'send'
    }

    if (type === 'dataObject') {
      baseData.dataType = 'Документ'
      baseData.source = 'Источник'
      baseData.destination = 'Назначение'
      baseData.required = false
    }

    if (type === 'lane') {
      const poolCandidates = nodes.filter((n) => n.type === 'pool')
      const poolId =
        (selectedNode && selectedNode.type === 'pool' && selectedNode.id) ||
        poolCandidates[poolCandidates.length - 1]?.id

      if (!poolId) {
        setFeedback({ type: 'error', message: 'Сначала добавьте и выделите пул' })
        return
      }

      const parentPool = nodes.find((n) => n.id === poolId)
      baseData.laneRole = baseData.laneRole || 'Роль'
      baseData.poolId = poolId
      baseData.parentId = poolId
      baseData.colorHex = getRoleColor(baseData.laneRole)

      const lanesInPool = nodes.filter(
        (n) => n.type === 'lane' && n.data.poolId === poolId
      )

      const lanePosition = parentPool
        ? {
          x: parentPool.position.x + 20,
          y: parentPool.position.y + 20 + lanesInPool.length * (LANE_SIZE.height + 10),
        }
        : {
          x: Math.random() * 200 + 100,
          y: Math.random() * 200 + 100,
        }

      const newNode: Node<BPMNNodeData> = {
        id: `${Date.now()}`,
        type,
        position: lanePosition,
        data: baseData,
      }
      setNodes((nds) => normalizeNodes([...nds, newNode]))
      setSelectedNode(newNode)
      setSelectedEdge(null)
      return
    }

    if (type === 'pool') {
      baseData.owner = baseData.owner || 'Новый участник'
    }

    if (type === 'gateway') {
      baseData.gatewayType = 'exclusive'
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
    setNodes((nds) => normalizeNodes([...nds, newNode]))
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

  const handleNodeDragStop = (node: Node<BPMNNodeData>) => {
    if (node.type === 'lane' || node.type === 'pool') {
      setDropHint(null)
      return
    }

    let updatedSnapshot: Node<BPMNNodeData> | null = null
    setNodes((currentNodes) => {
      const lanes = currentNodes.filter((n) => n.type === 'lane')
      const pools = currentNodes.filter((n) => n.type === 'pool')
      const poolHeightTargets: Record<string, number> = {}

      const containingLane = lanes.find((lane) =>
        isInsideContainer(lane, node.position, {
          width: lane.data.width || LANE_SIZE.width,
          height: lane.data.height || LANE_SIZE.height,
        })
      )
      const containingPool = pools.find((pool) =>
        isInsideContainer(pool, node.position, {
          width: pool.data.width || POOL_SIZE.width,
          height: pool.data.height || POOL_SIZE.height,
        })
      )
      const lanesInPool = containingPool
        ? lanes.filter((lane) => lane.data.poolId === containingPool.id)
        : []
      let laneToUse = containingLane
      if (!laneToUse && lanesInPool.length) {
        const centerY = node.position.y + NODE_SIZE.height / 2
        laneToUse =
          lanesInPool.find(
            (lane) =>
              centerY >= lane.position.y &&
              centerY <= lane.position.y + (lane.data.height || LANE_SIZE.height)
          ) || lanesInPool[0]
      }

      const nextNodes = currentNodes.map((existingNode) => {
        if (existingNode.id !== node.id) {
          return existingNode
        }

        const targetPool =
          (laneToUse && pools.find((poolItem) => poolItem.id === laneToUse?.data.poolId)) ||
          containingPool

        const updatedData: BPMNNodeData = {
          ...existingNode.data,
          laneId: laneToUse?.id,
          poolId: targetPool?.id || existingNode.data.poolId,
          parentId: laneToUse?.id || targetPool?.id || null,
        }

        if (laneToUse) {
          const nextRole =
            laneToUse.data.laneRole || laneToUse.data.role || laneToUse.data.label
          if (nextRole && nextRole !== updatedData.role) {
            updatedData.role = nextRole
            updatedData.employee = ''
          }
          updatedData.laneColor = laneToUse.data.colorHex || getRoleColor(nextRole)
        } else {
          updatedData.laneColor = undefined
        }

        const positionAfterPool = clampPositionToContainer(node.position, targetPool)
        const finalPosition = clampPositionToContainer(positionAfterPool, laneToUse)

        if (targetPool) {
          const bottomEdge = finalPosition.y + NODE_SIZE.height + CONTAINER_PADDING
          const requiredHeight = Math.max(
            targetPool.data.height || POOL_MIN_HEIGHT,
            bottomEdge - targetPool.position.y
          )
          poolHeightTargets[targetPool.id] = Math.max(
            poolHeightTargets[targetPool.id] || 0,
            requiredHeight
          )
        }

        const newNode: Node<BPMNNodeData> = {
          ...existingNode,
          position: finalPosition,
          data: updatedData,
        }

        updatedSnapshot = newNode
        return newNode
      })

      const nodesWithPoolUpdates = nextNodes.map((existingNode) => {
        if (existingNode.type === 'pool' && poolHeightTargets[existingNode.id]) {
          const forcedHeight = Math.max(
            poolHeightTargets[existingNode.id],
            existingNode.data.height || POOL_MIN_HEIGHT
          )
          return {
            ...existingNode,
            data: {
              ...existingNode.data,
              height: forcedHeight,
            },
          }
        }
        return existingNode
      })

      return normalizeNodes(nodesWithPoolUpdates)
    })

    const snapshot = updatedSnapshot as Node<BPMNNodeData> | null
    if (snapshot) {
      const ensuredSnapshot = snapshot as Node<BPMNNodeData>
      setSelectedNode((prev) => {
        if (!prev) return prev
        return prev.id === ensuredSnapshot.id ? ensuredSnapshot : prev
      })
    }
    setDropHint(null)
  }

  const handleNodeDrag = useCallback(
    (_event: MouseEvent, node: Node<BPMNNodeData>) => {
      if (node.type === 'lane' || node.type === 'pool') {
        setDropHint(null)
        return
      }

      const lanes = nodes.filter((n) => n.type === 'lane')
      const pools = nodes.filter((n) => n.type === 'pool')

      const containingLane = lanes.find((lane) =>
        isInsideContainer(lane, node.position, {
          width: lane.data.width || LANE_SIZE.width,
          height: lane.data.height || LANE_SIZE.height,
        })
      )
      const containingPool = pools.find((pool) =>
        isInsideContainer(pool, node.position, {
          width: pool.data.width || POOL_SIZE.width,
          height: pool.data.height || POOL_SIZE.height,
        })
      )

      if (containingLane) {
        const roleName = containingLane.data.laneRole || containingLane.data.label || 'роль'
        const color = containingLane.data.colorHex || getRoleColor(roleName)
        setDropHint({
          message: `Отпустите — задача будет в ${roleName}`,
          color,
        })
        return
      }

      if (containingPool) {
        setDropHint({
          message: 'Без роли',
          color: '#6b7280',
        })
        return
      }

      setDropHint(null)
    },
    [nodes]
  )

  const applyProcurementTemplate = () => {
    const companyPoolId = 'pool-company'
    const vendorPoolId = 'pool-vendor'
    const laneItId = 'lane-it'
    const laneFinId = 'lane-fin'
    const laneVendorId = 'lane-vendor'

    const templateNodes: Node<BPMNNodeData>[] = [
      {
        id: companyPoolId,
        type: 'pool',
        position: { x: 20, y: 20 },
        data: { label: 'Компания', owner: 'Smart IT Pilot Co.' },
      },
      {
        id: laneItId,
        type: 'lane',
        position: { x: 40, y: 60 },
        data: { label: 'IT Operations', laneRole: 'IT Operations', poolId: companyPoolId },
      },
      {
        id: laneFinId,
        type: 'lane',
        position: { x: 40, y: 220 },
        data: { label: 'Finance', laneRole: 'Finance', poolId: companyPoolId },
      },
      {
        id: vendorPoolId,
        type: 'pool',
        position: { x: 20, y: 420 },
        data: { label: 'Поставщик', owner: 'Vendor Ltd.' },
      },
      {
        id: laneVendorId,
        type: 'lane',
        position: { x: 40, y: 460 },
        data: { label: 'Account Manager', laneRole: 'Vendor', poolId: vendorPoolId },
      },
      {
        id: 'start-event',
        type: 'start',
        position: { x: 80, y: 120 },
        data: { label: 'Старт', poolId: companyPoolId, laneId: laneItId },
      },
      {
        id: 'task-it',
        type: 'task',
        position: { x: 220, y: 110 },
        data: {
          label: 'Формирование заявки',
          description: 'IT формирует требования',
          poolId: companyPoolId,
          laneId: laneItId,
          role: 'IT Operations',
          expected_duration_minutes: 240,
          cost_per_hour: 450,
          priority: 'medium',
          riskLevel: 'low',
        },
      },
      {
        id: 'gateway-budget',
        type: 'gateway',
        position: { x: 400, y: 210 },
        data: {
          label: 'Бюджет?',
          poolId: companyPoolId,
          laneId: laneFinId,
          gatewayType: 'exclusive',
        },
      },
      {
        id: 'task-fin',
        type: 'task',
        position: { x: 580, y: 210 },
        data: {
          label: 'Финансовое одобрение',
          poolId: companyPoolId,
          laneId: laneFinId,
          role: 'Finance',
          expected_duration_minutes: 180,
          cost_per_hour: 600,
          priority: 'high',
          riskLevel: 'medium',
        },
      },
      {
        id: 'end-event',
        type: 'end',
        position: { x: 760, y: 210 },
        data: { label: 'Завершение', poolId: companyPoolId, laneId: laneFinId },
      },
      {
        id: 'msg-offer',
        type: 'message',
        position: { x: 580, y: 520 },
        data: {
          label: 'Отправить заказ',
          poolId: vendorPoolId,
          laneId: laneVendorId,
          messageContent: 'Запрос коммерческого предложения',
          messageDirection: 'receive',
        },
      },
      {
        id: 'data-budget',
        type: 'dataObject',
        position: { x: 500, y: 320 },
        data: {
          label: 'Бюджет',
          dataType: 'Документ',
          description: 'Лимиты расходов',
          required: true,
        },
      },
    ]

    const templateEdges: Edge<BPMNEdgeData>[] = [
      decorateEdgeAppearance({
        id: 'e-start-task',
        source: 'start-event',
        target: 'task-it',
        data: { type: 'sequenceFlow', condition: null, associationType: null, probability: null },
      }),
      decorateEdgeAppearance({
        id: 'e-task-gateway',
        source: 'task-it',
        target: 'gateway-budget',
        data: { type: 'sequenceFlow', condition: null, associationType: null, probability: null },
      }),
      decorateEdgeAppearance({
        id: 'e-gateway-taskfin',
        source: 'gateway-budget',
        target: 'task-fin',
        data: { type: 'sequenceFlow', condition: 'budget > 100000', associationType: null, probability: null },
      }),
      decorateEdgeAppearance({
        id: 'e-taskfin-end',
        source: 'task-fin',
        target: 'end-event',
        data: { type: 'sequenceFlow', condition: null, associationType: null, probability: null },
      }),
      decorateEdgeAppearance({
        id: 'e-message',
        source: 'task-fin',
        target: 'msg-offer',
        data: {
          type: 'messageFlow',
          condition: 'Запрос коммерческого предложения',
          associationType: null,
          probability: null,
        },
      }),
      decorateEdgeAppearance({
        id: 'e-assoc-budget',
        source: 'data-budget',
        target: 'task-fin',
        data: { type: 'association', associationType: 'источник', condition: null, probability: null },
      }),
    ]

    setNodes(normalizeNodes(templateNodes))
    setEdges(templateEdges)
    setSelectedNode(null)
    setSelectedEdge(null)
    setFeedback({ type: 'info', message: 'Шаблон «Закупка оборудования» загружен' })
  }

  const mapNodeTypeForExport = (nodeType: string | undefined) => {
    switch (nodeType) {
      case 'start':
        return 'startEvent'
      case 'end':
        return 'endEvent'
      case 'subprocess':
        return 'subProcess'
      case 'message':
        return 'messageEvent'
      default:
        return nodeType
    }
  }

  const validateModel = () => {
    const errors: string[] = []
    if (!nodes.some((node) => node.type === 'pool')) {
      errors.push('Добавьте хотя бы один пул')
    }
    if (!nodes.some((node) => node.type === 'start')) {
      errors.push('Добавьте начальное событие')
    }
    if (!nodes.some((node) => node.type === 'end')) {
      errors.push('Добавьте конечное событие')
    }

    nodes.forEach((node) => {
      if ((node.type === 'task' || node.type === 'subprocess') && !node.data.role) {
        errors.push(`Укажите исполнителя для элемента "${node.data.label}"`)
      }

      if (node.type === 'gateway' && node.data.gatewayType === 'exclusive') {
        const outgoing = edges.filter(
          (edge) =>
            normalizeEdgeTypeValue(edge.data?.type) === 'sequenceFlow' && edge.source === node.id
        )
        if (outgoing.length < 2) {
          errors.push(`Шлюз "${node.data.label}" должен иметь минимум два исходящих потока`)
        }
      }
    })

    return errors
  }

  const buildExportPayload = () => {
    const pools = nodes
      .filter((node) => node.type === 'pool')
      .map((pool) => {
        const lanes = nodes
          .filter((lane) => lane.type === 'lane' && lane.data.poolId === pool.id)
          .map((lane) => ({
            id: lane.id,
            label: lane.data.label,
            responsibility: lane.data.laneRole,
            nodes: nodes
              .filter(
                (n) =>
                  n.data.laneId === lane.id && !['pool', 'lane'].includes(n.type || '')
              )
              .map((n) => n.id),
          }))
        return {
          id: pool.id,
          owner: pool.data.owner || pool.data.label,
          lanes,
        }
      })

    const flowNodes = nodes
      .filter((node) => !['pool', 'lane'].includes(node.type || ''))
      .map((node) => {
        const dataAssociations = edges
          .filter(
            (edge) =>
              normalizeEdgeTypeValue(edge.data?.type) === 'association' &&
              (edge.source === node.id || edge.target === node.id)
          )
          .map((edge) => ({
            dataObjectId: edge.source === node.id ? edge.target : edge.source,
            direction: edge.data?.associationType || 'данные',
          }))

        return {
          id: node.id,
          type: mapNodeTypeForExport(node.type),
          label: node.data.label,
          poolId: node.data.poolId || null,
          laneId: node.data.laneId || null,
          role: node.data.role || null,
          employee: node.data.employee || null,
          durationMinutes: node.data.expected_duration_minutes || null,
          costPerHour: node.data.cost_per_hour || null,
          priority: node.data.priority || null,
          risk: node.data.riskLevel || null,
          owner: node.data.owner || null,
          gatewayType: node.data.gatewayType || null,
          message: node.data.messageContent || null,
          messageDirection: node.data.messageDirection || null,
          dataAssociations,
        }
      })

    const exportedEdges = edges.map((edge) => {
      const normalizedType = normalizeEdgeTypeValue(edge.data?.type)
      const sourceNode = findNodeById(edge.source)
      const needsCondition =
        normalizedType === 'sequenceFlow' &&
        sourceNode?.type === 'gateway' &&
        sourceNode.data.gatewayType === 'exclusive'

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: normalizedType,
        condition:
          edge.data?.condition && edge.data.condition.trim().length
            ? edge.data.condition
            : needsCondition
              ? 'true'
              : null,
        associationType: edge.data?.associationType || null,
        probability: edge.data?.probability || null,
      }
    })

    const startEvents = flowNodes.filter((node) => node.type === 'startEvent').map((node) => node.id)
    const endEvents = flowNodes.filter((node) => node.type === 'endEvent').map((node) => node.id)

    return {
      pools,
      nodes: flowNodes,
      edges: exportedEdges,
      startEvents,
      endEvents,
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const validationErrors = validateModel()
      if (validationErrors.length) {
        setFeedback({ type: 'error', message: validationErrors.join('. ') })
        return
      }

      const exportPayload = buildExportPayload()
      const serialized = JSON.stringify(exportPayload, null, 2)

      await axios.put(`/process-models/${id}`, {
        name: properties.name,
        description: properties.description,
        status: 'draft',
        bpmnXml: serialized,
        bpmnJson: exportPayload,
        data: exportPayload,
      })

      setFeedback({ type: 'info', message: 'Схема сохранена и готова к симуляции' })
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      setFeedback({ type: 'error', message: 'Ошибка при сохранении модели' })
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
              type: normalizeEdgeTypeValue(edge.data?.type),
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
            type: normalizeEdgeTypeValue(prev.data?.type),
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
        type: normalizeEdgeTypeValue(edge.data?.type),
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
    const associatedData = edges
      .filter(
        (edge) =>
          edge.data?.type === 'association' &&
          (edge.source === selectedNode.id || edge.target === selectedNode.id)
      )
      .map((edge) => {
        const dataNodeId = edge.source === selectedNode.id ? edge.target : edge.source
        const dataNode = nodes.find((n) => n.id === dataNodeId)
        return {
          id: dataNodeId,
          label: dataNode?.data.label || 'Объект данных',
          direction: edge.data?.associationType || 'данные',
        }
      })
    switch (selectedNode.type) {
      case 'task':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Исполнитель / роль
                </label>
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
                  Сотрудник (конкретный)
                </label>
                <select
                  value={selectedNode.data.employee || ''}
                  onChange={(e) => updateSelectedNode({ employee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Не выбран</option>
                  {(EMPLOYEE_OPTIONS[selectedNode.data.role || 'Procurement'] || []).map(
                    (emp) => (
                      <option key={emp.value} value={emp.value}>
                        {emp.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Стоимость выполнения, ₽
                </label>
                <input
                  type="text"
                  value={
                    currencyInputs[selectedNode.id] ??
                    formatCurrencyRub(selectedNode.data.cost_per_hour)
                  }
                  onChange={(e) => {
                    const raw = e.target.value
                    const parsed = parseCurrencyRub(raw)
                    setCurrencyInputs((prev) => ({
                      ...prev,
                      [selectedNode.id]: raw,
                    }))
                    if (parsed !== undefined) {
                      updateSelectedNode({ cost_per_hour: parsed })
                    }
                  }}
                  onBlur={() => {
                    setCurrencyInputs((prev) => ({
                      ...prev,
                      [selectedNode.id]: formatCurrencyRub(
                        selectedNode.data.cost_per_hour
                      ),
                    }))
                  }}
                  placeholder="Например, 150 000 ₽"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div></div>
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
                  <option value="critical">Критический</option>
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
            {associatedData.length > 0 && (
              <div className="border rounded-lg p-3 bg-slate-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Используемые данные</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {associatedData.map((item) => (
                    <li key={item.id}>
                      • {item.label} <span className="text-xs text-gray-500">({item.direction})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )
      case 'subprocess':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Исполнитель / роль
                </label>
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
                  Сотрудник (конкретный)
                </label>
                <select
                  value={selectedNode.data.employee || ''}
                  onChange={(e) => updateSelectedNode({ employee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Не выбран</option>
                  {(EMPLOYEE_OPTIONS[selectedNode.data.role || 'Procurement'] || []).map(
                    (emp) => (
                      <option key={emp.value} value={emp.value}>
                        {emp.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
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
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ожидаемая длительность (мин)
                </label>
                <input
                  type="number"
                  min={1}
                  value={selectedNode.data.expected_duration_minutes || 120}
                  onChange={(e) =>
                    updateSelectedNode({
                      expected_duration_minutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Стоимость выполнения, ₽
                </label>
                <input
                  type="text"
                  value={
                    currencyInputs[selectedNode.id] ??
                    formatCurrencyRub(selectedNode.data.cost_per_hour)
                  }
                  onChange={(e) => {
                    const raw = e.target.value
                    const parsed = parseCurrencyRub(raw)
                    setCurrencyInputs((prev) => ({
                      ...prev,
                      [selectedNode.id]: raw,
                    }))
                    if (parsed !== undefined) {
                      updateSelectedNode({ cost_per_hour: parsed })
                    }
                  }}
                  onBlur={() => {
                    setCurrencyInputs((prev) => ({
                      ...prev,
                      [selectedNode.id]: formatCurrencyRub(
                        selectedNode.data.cost_per_hour
                      ),
                    }))
                  }}
                  placeholder="Например, 200 000 ₽"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
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
                  <option value="critical">Критический</option>
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
            {associatedData.length > 0 && (
              <div className="border rounded-lg p-3 bg-slate-50 mt-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Используемые данные</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {associatedData.map((item) => (
                    <li key={item.id}>
                      • {item.label}{' '}
                      <span className="text-xs text-gray-500">({item.direction})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )
      case 'message':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Текст сообщения</label>
              <input
                type="text"
                value={selectedNode.data.messageContent || ''}
                onChange={(e) => updateSelectedNode({ messageContent: e.target.value })}
                placeholder="Например, Запрос коммерческого предложения"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Направление события
              </label>
              <select
                value={selectedNode.data.messageDirection || 'send'}
                onChange={(e) =>
                  updateSelectedNode({
                    messageDirection: e.target.value as 'send' | 'receive',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="send">Отправка (throw)</option>
                <option value="receive">Приём (catch)</option>
              </select>
            </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название объекта данных
              </label>
              <input
                type="text"
                value={selectedNode.data.dataObjectName || selectedNode.data.label || ''}
                onChange={(e) =>
                  updateSelectedNode({
                    dataObjectName: e.target.value,
                    label: e.target.value || selectedNode.data.label,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
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
            <div className="mt-3 flex items-center space-x-2">
              <input
                id="data-required"
                type="checkbox"
                checked={Boolean(selectedNode.data.required)}
                onChange={(e) => updateSelectedNode({ required: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <label htmlFor="data-required" className="text-sm text-gray-700">
                Обязательный объект данных
              </label>
            </div>
          </>
        )
      case 'gateway':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип шлюза</label>
              <select
                value={selectedNode.data.gatewayType || 'exclusive'}
                onChange={(e) =>
                  updateSelectedNode({ gatewayType: e.target.value as 'exclusive' | 'parallel' | 'merge' })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="exclusive">Исключающий (XOR)</option>
                <option value="parallel">Параллельный (AND)</option>
                <option value="merge">Слияние (AND Join)</option>
              </select>
            </div>
            <p className="text-xs text-gray-500">
              Для XOR задайте условия на исходящих потоках, для параллельного — условия не используются.
            </p>
          </>
        )
      case 'lane':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Роль / зона ответственности
              </label>
              <select
                value={selectedNode.data.laneRole || 'Procurement'}
                onChange={(e) => updateSelectedNode({ laneRole: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )
      case 'pool':
        return (
          <>
            {renderDescriptionField(selectedNode.data.description, (val) =>
              updateSelectedNode({ description: val })
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Владелец пула
              </label>
              <input
                type="text"
                value={selectedNode.data.owner || ''}
                onChange={(e) => updateSelectedNode({ owner: e.target.value })}
                placeholder="Например, департамент или организация"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
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
    const edgeType = normalizeEdgeTypeValue(selectedEdge.data?.type)
    const isMessage = edgeType === 'messageFlow'
    const isAssociation = edgeType === 'association'

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

        {edgeType === 'sequenceFlow' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Условие перехода
              </label>
              <input
                type="text"
                value={selectedEdge.data?.condition || ''}
                onChange={(e) => updateSelectedEdge({ condition: e.target.value })}
                placeholder="Например: budget > 1000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Используйте переменные budget, ml_risk, probability(x) и др.
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
          <>
            <p className="text-xs text-sky-600">
              Поток сообщений соединяет пула. Текст сообщения берётся из соответствующего события.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Содержимое</label>
              <input
                type="text"
                value={selectedEdge.data?.condition || ''}
                onChange={(e) => updateSelectedEdge({ condition: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </>
        )}

        {isAssociation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип связи</label>
            <input
              type="text"
              value={selectedEdge.data?.associationType || ''}
              onChange={(e) => updateSelectedEdge({ associationType: e.target.value })}
              placeholder="Например: источник / результат / использует"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
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
          <div className="flex items-center space-x-6">
            <div className="text-2xl font-extrabold text-blue-900 tracking-tight">AFIN</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {model?.name || 'Новая модель'}
              </h1>
              <p className="text-sm text-gray-600">Редактор BPMN-процессов</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => applyProcurementTemplate()}
              className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Шаблон «Закупка»
            </button>
            {selectedNode?.type === 'pool' && (
              <button
                onClick={() => addNode('lane', 'Новая дорожка')}
                className="px-4 py-2 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                Добавить дорожку
              </button>
            )}
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

        {feedback && (
          <div
            className={`mx-8 mt-3 px-4 py-2 rounded-lg border text-sm ${feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
          >
            {feedback.message}
          </div>
        )}

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
                onClick={() => addNode('lane', 'Горизонтальная дорожка')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Горизонтальная дорожка (Lane)</span>
              </button>
              <button
                onClick={() => addNode('pool', 'Пул')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Пул (Pool)</span>
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
                  {EDGE_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setActiveEdgeType(option.value)}
                      className={`flex items-center justify-between px-3 py-2 border rounded-lg transition-colors ${activeEdgeType === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center space-x-2">
                        <ArrowRight className="w-4 h-4" />
                        <span>{option.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative">
            {dropHint && (
              <div
                className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-3/4 max-w-xl px-6 py-3 rounded-full text-white text-sm font-semibold shadow-2xl text-center tracking-wide"
                style={{ backgroundColor: dropHint.color }}
              >
                {dropHint.message}
              </div>
            )}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              isValidConnection={isConnectionValid}
              onNodeDragStop={(_event, node) => handleNodeDragStop(node as Node<BPMNNodeData>)}
              onNodeDrag={(event, dragNode) => handleNodeDrag(event, dragNode as Node<BPMNNodeData>)}
              onNodeClick={(event, node) => handleNodeClick(event, node)}
              onEdgeClick={(event, edge) => handleEdgeClick(event, edge as Edge<BPMNEdgeData>)}
              onPaneClick={() => {
                setSelectedNode(null)
                setSelectedEdge(null)
                setDropHint(null)
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
                <div className="pt-4 border-t mt-4">
                  <button
                    onClick={() => {
                      const nodeId = selectedNode.id
                      setNodes((nds) => normalizeNodes(nds.filter((n) => n.id !== nodeId)))
                      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
                      setSelectedNode(null)
                      setSelectedEdge(null)
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Удалить элемент</span>
                  </button>
                </div>
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
                      selectedEdge.data?.type === 'messageFlow'
                        ? 'Поток сообщений'
                        : selectedEdge.data?.type === 'association'
                          ? 'Ассоциация данных'
                          : 'Поток операций'
                    }
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                {renderEdgeFields()}
                <div className="pt-4 border-t mt-4">
                  <button
                    onClick={() => {
                      const edgeId = selectedEdge.id
                      setEdges((eds) => eds.filter((e) => e.id !== edgeId))
                      setSelectedEdge(null)
                      setSelectedNode(null)
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Удалить элемент</span>
                  </button>
                </div>
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
