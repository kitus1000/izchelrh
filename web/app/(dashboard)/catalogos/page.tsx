'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Plus, Trash2, Tag, FileType, Clock, Edit, X, Briefcase, Building2, Truck, ArrowDownLeft, TimerOff, ChevronRight, Check, AlertCircle, Loader2, Download, Upload } from 'lucide-react'
import Link from 'next/link'
import { downloadTemplate, parseExcelFile, exportToExcel } from '@/utils/excelUtils'
import { useRef } from 'react'

const tabs = [
    { id: 'turnos', label: 'Turnos', icon: Clock, color: 'amber', href: '/catalogos/turnos' },
    { id: 'incidencias', label: 'Incidencias', icon: AlertCircle, color: 'amber' },
    { id: 'solicitudes', label: 'Solicitudes', icon: FileType, color: 'blue' },
    { id: 'roles', label: 'Roles', icon: Briefcase, color: 'green' },
    { id: 'departamentos', label: 'Departamentos', icon: Building2, color: 'purple' },
    { id: 'unidades', label: 'Unidades', icon: Truck, color: 'orange' },
    { id: 'bajas', label: 'Causas de Baja', icon: ArrowDownLeft, color: 'red' },
    { id: 'tipos_checada', label: 'Tolerancias', icon: TimerOff, color: 'indigo' },
]

const colorMap: Record<string, { bg: string, text: string, border: string, light: string, badge: string }> = {
    amber: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500', light: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500', light: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
    green: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500', light: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
    purple: { bg: 'bg-violet-500', text: 'text-violet-600', border: 'border-violet-500', light: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500', light: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
    red: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-500', light: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
    indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', border: 'border-indigo-500', light: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
}

export default function CatalogosPage() {
    const [activeTab, setActiveTab] = useState('incidencias')
    const [selectedDeptForPuestos, setSelectedDeptForPuestos] = useState<any>(null)

    const activeTabInfo = tabs.find(t => t.id === activeTab)!
    const colors = colorMap[activeTabInfo.color]

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-xl">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1">Sistema de RRHH</p>
                        <h1 className="text-2xl font-bold text-white">Administración de Catálogos</h1>
                        <p className="text-zinc-400 text-sm mt-1">Gestiona las opciones disponibles en el sistema de forma centralizada.</p>
                    </div>
                </div>
            </div>

            {/* Tabs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id
                    const c = colorMap[tab.color]
                    const Icon = tab.icon

                    if (tab.href) {
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-200 bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700`}
                            >
                                <div className={`p-2 rounded-lg transition-all duration-200 bg-zinc-100 group-hover:bg-zinc-200`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-semibold leading-tight">{tab.label}</span>
                            </Link>
                        )
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id)
                                setSelectedDeptForPuestos(null)
                            }}
                            className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-200 ${isActive
                                ? `${c.light} ${c.border} ${c.text} shadow-sm`
                                : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700'
                                }`}
                        >
                            <div className={`p-2 rounded-lg transition-all duration-200 ${isActive ? `${c.bg} text-white shadow-sm` : 'bg-zinc-100 group-hover:bg-zinc-200'}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-semibold leading-tight">{tab.label}</span>
                            {isActive && <div className={`w-5 h-0.5 rounded-full ${c.bg}`} />}
                        </button>
                    )
                })}
            </div>

            {/* Content */}
            <div className="relative">
                {activeTab === 'incidencias' && <CatalogManager table="cat_tipos_incidencia" idField="id_tipo_incidencia" nameField="tipo_incidencia" title="Tipos de Incidencia" color="amber" />}
                {activeTab === 'solicitudes' && <CatalogManager table="cat_tipos_solicitud" idField="id_tipo_solicitud" nameField="tipo_solicitud" title="Tipos de Solicitud" color="blue" />}
                {activeTab === 'roles' && <RolesManager />}
                {activeTab === 'departamentos' && (
                    <>
                        <CatalogManager
                            table="cat_departamentos"
                            idField="id_departamento"
                            nameField="departamento"
                            title="Departamentos"
                            color="purple"
                            renderActions={(item: any) => (
                                <button
                                    onClick={() => setSelectedDeptForPuestos(item)}
                                    className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-2 group/btn border border-transparent hover:border-indigo-100 shadow-sm hover:shadow-md transition-all active:scale-95"
                                    title="Gestionar Puestos"
                                >
                                    <Tag className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Ver Puestos</span>
                                </button>
                            )}
                        />
                        {selectedDeptForPuestos && (
                            <div className="mt-6 animate-in slide-in-from-top-4 duration-300">
                                <PuestosSubManager
                                    dept={selectedDeptForPuestos}
                                    onClose={() => setSelectedDeptForPuestos(null)}
                                />
                            </div>
                        )}
                    </>
                )}
                {activeTab === 'unidades' && <CatalogManager table="cat_unidades_trabajo" idField="id_unidad" nameField="unidad_trabajo" title="Unidades de Trabajo" color="orange" />}
                {activeTab === 'bajas' && <CatalogManager table="cat_causas_baja" idField="id_causa_baja" nameField="causa" title="Causas de Baja" color="red" />}
                {activeTab === 'tipos_checada' && <TiposChecadaManager />}
            </div>
        </div>
    )
}

// ─── CatalogManager ─────────────────────────────────────────────────────────
function CatalogManager({ table, idField, nameField, title, color, renderActions }: any) {
    const [items, setItems] = useState<any[]>([])
    const [newItem, setNewItem] = useState('')
    const [loading, setLoading] = useState(true)
    const [editItemId, setEditItemId] = useState<string | null>(null)
    const [editItemValue, setEditItemValue] = useState('')
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const c = colorMap[color] ?? colorMap['amber']
    // Safe lookup for tabInfo and Icon
    const tabInfo = tabs.find(t => t.id === table.replace('cat_tipos_', '').replace('cat_', ''))
    const Icon = tabInfo?.icon ?? Tag

    useEffect(() => { fetchItems() }, [table])

    async function fetchItems() {
        const { data } = await (supabase as any).from(table).select('*').filter('activo', 'eq', true).order(nameField, { ascending: true })
        setItems(data || [])
        setLoading(false)
    }

    async function handleAdd() {
        if (!newItem.trim()) return
        setSaving(true)
        const { error } = await (supabase as any).from(table).insert([{ [nameField]: newItem }])
        if (error) alert('Error: ' + error.message)
        else { setNewItem(''); fetchItems() }
        setSaving(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Desea eliminar este elemento?')) return
        const { error } = await (supabase as any).from(table).update({ activo: false }).eq(idField, id)
        if (error) alert('Error: ' + error.message)
        else fetchItems()
    }

    async function handleSaveEdit(id: string) {
        if (!editItemValue.trim()) return
        const { error } = await (supabase as any).from(table).update({ [nameField]: editItemValue }).eq(idField, id)
        if (error) alert('Error al guardar: ' + error.message)
        else { setEditItemId(null); fetchItems() }
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setSaving(true)
            const data = await parseExcelFile(file)
            if (data.length === 0) return alert('El archivo está vacío')

            // Filter valid rows
            let toInsert: any[] = []

            if (table === 'cat_puestos') {
                // For positions, we need to map department names to IDs
                const { data: depts } = await supabase.from('cat_departamentos').select('id_departamento, departamento')
                const deptMap: Record<string, string> = {}
                depts?.forEach(d => deptMap[d.departamento.toLowerCase().trim()] = d.id_departamento)

                toInsert = data
                    .filter((row: any) => row.puesto?.toString().trim() && row.departamento?.toString().trim())
                    .map((row: any) => {
                        const deptId = deptMap[row.departamento.toString().toLowerCase().trim()]
                        if (!deptId) return null
                        return { puesto: row.puesto.toString().trim(), id_departamento: deptId }
                    })
                    .filter(Boolean)
            } else {
                toInsert = data
                    .filter((row: any) => row[nameField]?.toString().trim())
                    .map((row: any) => ({ [nameField]: row[nameField].toString().trim() }))
            }

            if (toInsert.length === 0) return alert('No hay datos válidos para importar o los departamentos no existen')

            const { error } = await (supabase as any).from(table).insert(toInsert)
            if (error) throw error

            alert(`Se importaron ${toInsert.length} elementos correctamente`)
            fetchItems()
        } catch (err: any) {
            alert('Error en la importación: ' + err.message)
        } finally {
            setSaving(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    function handleExport() {
        const cleanData = items.map(item => ({ [nameField]: item[nameField] }))
        exportToExcel(cleanData, `export_${title.toLowerCase().replace(/ /g, '_')}`)
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden animate-in fade-in duration-300">
            {/* Card Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b border-zinc-100 ${c.light}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 ${c.bg} rounded-xl shadow-sm`}>
                        <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-zinc-900 text-base">{title}</h2>
                        <p className="text-xs text-zinc-500">{items.length} elemento{items.length !== 1 ? 's' : ''} registrado{items.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-white rounded-lg transition-all"
                        title="Exportar a Excel"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-white rounded-lg transition-all"
                        title="Importar de Excel"
                    >
                        <Upload className="w-4 h-4" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx, .xls"
                        onChange={handleImport}
                    />
                    <button
                        onClick={() => {
                            const t = table === 'cat_departamentos' ? 'departamentos' :
                                table === 'cat_puestos' ? 'puestos' : null;
                            if (t) downloadTemplate(t as any)
                        }}
                        className="text-[10px] font-black bg-zinc-900 text-white px-3 py-1 rounded-full uppercase tracking-tighter hover:bg-amber-600 transition-colors"
                    >
                        Plantilla
                    </button>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.badge}`}>Activos: {items.length}</span>
                </div>
            </div>

            {/* Add Form */}
            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Agregar nuevo</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder={`Nombre del ${title.toLowerCase()}...`}
                        className={`flex-1 rounded-xl border border-zinc-200 text-sm text-black bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow`}
                        style={{ ['--tw-ring-color' as any]: c.bg.replace('bg-', '') }}
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={saving || !newItem.trim()}
                        className={`${c.bg} text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-sm`}
                    >
                        <Plus className="w-4 h-4" />
                        Agregar
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-zinc-50">
                {loading ? (
                    <div className="py-12 text-center text-sm text-zinc-400 animate-pulse">Cargando...</div>
                ) : items.length === 0 ? (
                    <div className="py-12 text-center text-sm text-zinc-400 italic">No hay elementos. Agrega el primero arriba.</div>
                ) : (
                    items.map((item) => (
                        <div key={item[idField]} className="group flex items-center px-6 py-3 hover:bg-zinc-50/80 transition-colors">
                            {editItemId === item[idField] ? (
                                <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                                    <div className={`w-1.5 h-8 rounded-full ${c.bg} shrink-0`} />
                                    <input
                                        autoFocus
                                        value={editItemValue}
                                        onChange={e => setEditItemValue(e.target.value)}
                                        className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:border-transparent"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit(item[idField])
                                            if (e.key === 'Escape') setEditItemId(null)
                                        }}
                                    />
                                    <button onClick={() => handleSaveEdit(item[idField])} className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors">
                                        <Check className="w-3.5 h-3.5" /> Guardar
                                    </button>
                                    <button onClick={() => setEditItemId(null)} className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className={`w-1.5 h-8 rounded-full ${c.bg} opacity-0 group-hover:opacity-100 shrink-0 transition-opacity duration-200 mr-3`} />
                                    <span className="flex-1 text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors">{item[nameField]}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        {renderActions && renderActions(item)}
                                        <button
                                            onClick={() => { setEditItemId(item[idField]); setEditItemValue(item[nameField]) }}
                                            className={`p-2 rounded-lg ${c.text} hover:${c.light} transition-colors`}
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item[idField])}
                                            className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

// ─── PuestosSubManager ──────────────────────────────────────────────────────
function PuestosSubManager({ dept, onClose }: { dept: any, onClose: () => void }) {
    const [puestos, setPuestos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newItem, setNewItem] = useState('')
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')

    useEffect(() => { fetchPuestos() }, [dept.id_departamento])

    async function fetchPuestos() {
        setLoading(true)
        const { data } = await supabase.from('cat_puestos')
            .select('*')
            .eq('id_departamento', dept.id_departamento)
            .eq('activo', true)

        const sorted = (data || []).sort((a, b) => (a.puesto || '').localeCompare(b.puesto || ''))
        setPuestos(sorted)
        setLoading(false)
    }

    async function handleAdd() {
        if (!newItem.trim()) return
        setSaving(true)
        try {
            const { error } = await supabase.from('cat_puestos').insert([{
                puesto: newItem.trim(),
                id_departamento: dept.id_departamento
            }])
            if (error) throw error
            setNewItem('')
            fetchPuestos()
        } catch (e: any) {
            alert('Error al agregar puesto: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar puesto?')) return
        await supabase.from('cat_puestos').update({ activo: false }).eq('id_puesto', id)
        fetchPuestos()
    }

    async function handleSaveEdit(id: string) {
        if (!editValue.trim()) return
        await supabase.from('cat_puestos').update({ puesto: editValue.trim() }).eq('id_puesto', id)
        setEditId(null)
        fetchPuestos()
    }

    return (
        <div className="bg-indigo-50/50 rounded-2xl border-2 border-indigo-100 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
                        <Tag className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 leading-tight">Puestos en <span className="text-indigo-600">{dept.departamento}</span></h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Gestionar cargos de esta familia</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-zinc-400 hover:text-zinc-600 shadow-sm">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="bg-white/50 rounded-2xl p-4 mb-4 border border-indigo-100 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">Nuevo Puesto para {dept.departamento}</label>
                    <input
                        placeholder="Ej. Coordinador de Operaciones..."
                        className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-sm text-black font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow shadow-sm"
                        value={newItem}
                        onChange={e => setNewItem(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleAdd}
                        disabled={saving || !newItem.trim()}
                        className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Añadir Cargo
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-indigo-100 divide-y divide-indigo-50 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-xs text-zinc-400 font-bold uppercase tracking-widest animate-pulse">Sincronizando...</div>
                ) : puestos.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-400 italic">No hay puestos en este departamento.</div>
                ) : (
                    puestos.map(p => (
                        <div key={p.id_puesto} className="flex items-center justify-between px-4 py-2.5 group hover:bg-indigo-50/30 transition-colors">
                            {editId === p.id_puesto ? (
                                <div className="flex-1 flex gap-2">
                                    <input
                                        autoFocus
                                        className="flex-1 bg-white border border-indigo-200 rounded-lg px-2 py-1 text-sm text-black"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(p.id_puesto)}
                                    />
                                    <button onClick={() => handleSaveEdit(p.id_puesto)} className="text-green-600 p-1"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setEditId(null)} className="text-zinc-400 p-1"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm font-medium text-zinc-700">{p.puesto}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditId(p.id_puesto); setEditValue(p.puesto) }} className="p-1.5 text-zinc-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors">
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(p.id_puesto)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-white transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

// ─── RolesManager ────────────────────────────────────────────────────────────
function RolesManager() {
    const [roles, setRoles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({ tipo_rol: '', dias_trabajo: 20, dias_descanso: 10, descripcion: '' })
    const [editRolId, setEditRolId] = useState<string | null>(null)
    const [editRolData, setEditRolData] = useState({ tipo_rol: '', dias_trabajo: 0, dias_descanso: 0 })

    useEffect(() => { fetchRoles() }, [])

    async function fetchRoles() {
        const { data } = await supabase.from('cat_tipos_rol').select('*').eq('activo', true).order('tipo_rol')
        setRoles(data || [])
        setLoading(false)
    }

    async function handleAdd() {
        if (!formData.tipo_rol.trim()) return alert('El nombre es requerido')
        try {
            const { error } = await supabase.from('cat_tipos_rol').insert([formData])
            if (error) throw error
            setFormData({ tipo_rol: '', dias_trabajo: 20, dias_descanso: 10, descripcion: '' })
            fetchRoles()
        } catch (e: any) { alert('Error: ' + e.message) }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este rol?')) return
        const { error } = await supabase.from('cat_tipos_rol').update({ activo: false }).eq('id_tipo_rol', id)
        if (!error) fetchRoles()
    }

    async function handleSaveEdit(id: string) {
        if (!editRolData.tipo_rol.trim()) return
        const { error } = await supabase.from('cat_tipos_rol').update(editRolData).eq('id_tipo_rol', id)
        if (error) alert('Error: ' + error.message)
        else { setEditRolId(null); fetchRoles() }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-emerald-50">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500 rounded-xl shadow-sm">
                        <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-zinc-900 text-base">Roles de Trabajo</h2>
                        <p className="text-xs text-zinc-500">Esquemas de días trabajados y días de descanso</p>
                    </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">Activos: {roles.length}</span>
            </div>

            {/* Add Form */}
            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Agregar nuevo rol</label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">Nombre (ej. 20x10)</label>
                        <input className="w-full rounded-xl border border-zinc-200 text-sm text-black bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow" value={formData.tipo_rol} onChange={e => setFormData({ ...formData, tipo_rol: e.target.value })} placeholder="20x10" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">Días Trabajo</label>
                        <input type="number" className="w-full rounded-xl border border-zinc-200 text-sm text-black bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" value={formData.dias_trabajo} onChange={e => setFormData({ ...formData, dias_trabajo: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">Días Descanso</label>
                        <input type="number" className="w-full rounded-xl border border-zinc-200 text-sm text-black bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" value={formData.dias_descanso} onChange={e => setFormData({ ...formData, dias_descanso: parseInt(e.target.value) || 0 })} />
                    </div>
                </div>
                <button onClick={handleAdd} className="mt-3 bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all shadow-sm">
                    <Plus className="w-4 h-4" /> Agregar Rol
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="py-12 text-center text-sm text-zinc-400 animate-pulse">Cargando...</div>
            ) : roles.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-400 italic">No hay roles registrados. Agrega el primero arriba.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-100">
                                <th className="px-6 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Días Trabajo</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Días Descanso</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Esquema</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {roles.map(r => (
                                <tr key={r.id_tipo_rol} className="group hover:bg-zinc-50/80 transition-colors">
                                    <td className="px-6 py-3.5 text-sm font-bold text-zinc-800">
                                        {editRolId === r.id_tipo_rol ? (
                                            <input autoFocus className="w-full text-sm border border-zinc-200 text-black rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" value={editRolData.tipo_rol} onChange={e => setEditRolData({ ...editRolData, tipo_rol: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(r.id_tipo_rol); if (e.key === 'Escape') setEditRolId(null) }} />
                                        ) : r.tipo_rol}
                                    </td>
                                    <td className="px-6 py-3.5 text-sm text-zinc-600">
                                        {editRolId === r.id_tipo_rol ? (
                                            <input type="number" className="w-20 text-sm border border-zinc-200 text-black rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" value={editRolData.dias_trabajo} onChange={e => setEditRolData({ ...editRolData, dias_trabajo: parseInt(e.target.value) || 0 })} onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(r.id_tipo_rol); if (e.key === 'Escape') setEditRolId(null) }} />
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                                {r.dias_trabajo}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 text-sm text-zinc-600">
                                        {editRolId === r.id_tipo_rol ? (
                                            <input type="number" className="w-20 text-sm border border-zinc-200 text-black rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" value={editRolData.dias_descanso} onChange={e => setEditRolData({ ...editRolData, dias_descanso: parseInt(e.target.value) || 0 })} onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(r.id_tipo_rol); if (e.key === 'Escape') setEditRolId(null) }} />
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600">
                                                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                                {r.dias_descanso}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        {editRolId !== r.id_tipo_rol && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600">
                                                {r.dias_trabajo}x{r.dias_descanso}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        {editRolId === r.id_tipo_rol ? (
                                            <div className="flex items-center justify-end gap-2 animate-in slide-in-from-right-2">
                                                <button onClick={() => handleSaveEdit(r.id_tipo_rol)} className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors">
                                                    <Check className="w-3.5 h-3.5" /> Guardar
                                                </button>
                                                <button onClick={() => setEditRolId(null)} className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditRolId(r.id_tipo_rol); setEditRolData({ tipo_rol: r.tipo_rol, dias_trabajo: r.dias_trabajo, dias_descanso: r.dias_descanso }) }} className="p-2 text-zinc-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors" title="Editar">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(r.id_tipo_rol)} className="p-2 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// ─── TiposChecadaManager ─────────────────────────────────────────────────────
function TiposChecadaManager() {
    const [tols, setTols] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchTols() }, [])

    async function fetchTols() {
        const { data } = await supabase.from('cat_tipos_checada')
            .select('tipo, label, tolerancia_retorno_min')
            .in('tipo', ['PERMISO_PERSONAL', 'SALIDA_OPERACIONES'])
            .order('label')
        setTols(data || [])
        setLoading(false)
    }

    async function handleUpdate(tipo: string, nval: number) {
        if (nval < 0) return alert('La tolerancia no puede ser negativa')
        const { error } = await supabase.from('cat_tipos_checada').update({ tolerancia_retorno_min: nval }).eq('tipo', tipo)
        if (error) alert('Error: ' + error.message)
        else { alert('Tolerancia actualizada correctamente'); fetchTols() }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden animate-in fade-in duration-300">
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500 rounded-xl shadow-sm">
                        <TimerOff className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-zinc-900 text-base">Tolerancia de Regresos</h2>
                        <p className="text-xs text-zinc-500">Minutos de gracia antes de marcar Retardo al regresar de un permiso</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center text-sm text-zinc-400 animate-pulse">Cargando...</div>
            ) : (
                <div className="p-6 space-y-4">
                    {tols.length === 0 && (
                        <p className="text-xs text-amber-600 italic">⚠️ No se encontraron los tipos de Permisos. Asegúrese de haber corrido los scripts SQL.</p>
                    )}
                    {tols.map((t) => (
                        <div key={t.tipo} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gradient-to-r from-indigo-50/60 to-white rounded-xl border border-indigo-100 hover:border-indigo-300 hover:shadow-sm transition-all">
                            <div>
                                <h3 className="font-bold text-zinc-800">{t.label}</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Límite de cortesía tras vencer la vigencia autorizada.</p>
                            </div>
                            <div className="mt-4 sm:mt-0 flex items-center gap-3">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tolerancia (min):</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="w-24 text-sm border border-indigo-200 rounded-xl text-black text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 px-3 py-2 bg-white bg-opacity-80"
                                        defaultValue={t.tolerancia_retorno_min}
                                        onBlur={(e) => {
                                            const v = parseInt(e.target.value)
                                            if (!isNaN(v) && v !== t.tolerancia_retorno_min) handleUpdate(t.tipo, v)
                                        }}
                                    />
                                    <span className="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-1.5 rounded-lg border border-indigo-100">min</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
