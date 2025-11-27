import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import axios from 'axios'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  createColumnHelper,
} from '@tanstack/react-table'
import { Edit, Copy, Trash2, Plus, Search } from 'lucide-react'

interface ProcessModel {
  id: string
  name: string
  version: string
  status: 'active' | 'draft' | 'archived'
  description?: string
  updatedAt: string
  owner: {
    firstName: string
    lastName?: string
    email: string
  }
}

const columnHelper = createColumnHelper<ProcessModel>()

const ProcessModels = () => {
  const [models, setModels] = useState<ProcessModel[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [approvedModelIds, setApprovedModelIds] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    const loadModels = async () => {
      await fetchModels()
    }
    loadModels()
  }, [search])

  useEffect(() => {
    fetchSimulationApprovals()
  }, [])

  const fetchModels = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (search) params.search = search
      const response = await axios.get('/process-models', { params })
      setModels(response.data)
    } catch (error) {
      console.error('Ошибка загрузки моделей:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSimulationApprovals = async () => {
    try {
      const response = await axios.get('/simulations')
      const approvedIds = new Set<string>()
      response.data.forEach((simulation: any) => {
        const modelId =
          simulation.processModel?.id ??
          simulation.processModelId ??
          simulation.processModel?.id
        if (modelId != null) {
          approvedIds.add(String(modelId))
        }
      })
      setApprovedModelIds(approvedIds)
    } catch (error) {
      console.error('Ошибка загрузки истории симуляций:', error)
    }
  }

  const getDerivedStatus = useCallback(
    (model: ProcessModel) => (approvedModelIds.has(String(model.id)) ? 'approved' : 'draft'),
    [approvedModelIds]
  )

  const filteredModels = useMemo(
    () =>
      models.filter((model) => {
        if (statusFilter === 'all') return true
        return getDerivedStatus(model) === statusFilter
      }),
    [models, statusFilter, getDerivedStatus]
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту модель?')) return

    try {
      await axios.delete(`/process-models/${id}`)
      fetchModels()
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Ошибка при удалении модели')
    }
  }

  const handleCopy = async (id: string) => {
    try {
      await axios.post(`/process-models/${id}/copy`)
      fetchModels()
    } catch (error) {
      console.error('Ошибка копирования:', error)
      alert('Ошибка при копировании модели')
    }
  }

  const getStatusBadge = (model: ProcessModel) => {
    const status = getDerivedStatus(model)
    const styles = {
      approved: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
    }
    const labels = {
      approved: 'Одобрена',
      draft: 'Черновик',
    }
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Название модели',
        cell: (info) => (
          <div>
            <div className="font-medium text-gray-900">{info.getValue()}</div>
            {info.row.original.description && (
              <div className="text-sm text-gray-500">{info.row.original.description}</div>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('version', {
        header: 'Версия',
        cell: (info) => <span className="text-gray-700">{info.getValue()}</span>,
      }),
      columnHelper.accessor('status', {
        header: 'Статус',
        cell: (info) => getStatusBadge(info.row.original),
      }),
      columnHelper.accessor('updatedAt', {
        header: 'Последнее изменение',
        cell: (info) => (
          <span className="text-gray-600">
            {new Date(info.getValue()).toLocaleDateString('ru-RU')}
          </span>
        ),
      }),
      columnHelper.accessor('owner', {
        header: 'Владелец',
        cell: (info) => {
          const owner = info.getValue()
          return (
            <span className="text-gray-700">
              {owner.firstName} {owner.lastName || ''}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Действия',
        cell: (info) => (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/process-models/${info.row.original.id}/edit`)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Редактировать"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleCopy(info.row.original.id)}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Копировать"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(info.row.original.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      }),
    ] as ColumnDef<ProcessModel>[],
    [navigate]
  )

  const table = useReactTable({
    data: filteredModels,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Модели процессов</h1>
          <button
            onClick={() => {
              const name = prompt('Введите название модели:')
              if (name) {
                axios
                  .post('/process-models', { name })
                  .then((response) => {
                    navigate(`/process-models/${response.data.id}/edit`)
                  })
                  .catch((error) => {
                    console.error('Ошибка создания:', error)
                    alert('Ошибка при создании модели')
                  })
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Создать новую модель</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Все модели</option>
              <option value="approved">Одобренные</option>
              <option value="draft">Черновики</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredModels.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Модели процессов не найдены
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ProcessModels

