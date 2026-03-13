'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import {
    Plus, Trash2, Tag, Edit, X, Check, Building2,
    Search, ChevronRight, Briefcase, LayoutGrid,
    MoreVertical, AlertCircle, Loader2
} from 'lucide-react'
import Link from 'next/link'

export default function PuestosPage() {
    const [departments, setDepartments] = useState<any[]>([])
    const [puestos, setPuestos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDept, setSelectedDept] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Add position state
    const [isAdding, setIsAdding] = useState(false)
    const [newPuesto, setNewPuesto] = useState({ name: '', deptId: '' })

    // Edit position state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        try {
            const [deptsRes, puestosRes] = await Promise.all([
                supabase.from('cat_departamentos').select('*').eq('activo', true),
                supabase.from('cat_puestos').select('*').eq('activo', true)
            ])

            if (deptsRes.error) throw deptsRes.error
            if (puestosRes.error) throw puestosRes.error

            const sortedDepts = (deptsRes.data || []).sort((a: any, b: any) =>
                (a.departamento || '').localeCompare(b.departamento || '')
            )
            setDepartments(sortedDepts)

            const sortedPuestos = (puestosRes.data || []).sort((a: any, b: any) =>
                (a.puesto || '').localeCompare(b.puesto || '')
            )
            setPuestos(sortedPuestos)
        } catch (error: any) {
            console.error("Error fetching data:", error)
            alert("Error al cargar datos: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleAdd() {
        if (!newPuesto.name.trim() || !newPuesto.deptId) {
            return alert("Por favor ingresa un nombre y selecciona un departamento.")
        }

        try {
            const { error } = await supabase.from('cat_puestos').insert([{
                puesto: newPuesto.name.trim(),
                id_departamento: newPuesto.deptId
            }])

            if (error) throw error

            setNewPuesto({ name: '', deptId: '' })
            setIsAdding(false)
            fetchData()
        } catch (error: any) {
            alert("Error al agregar puesto: " + error.message)
        }
    }

    async function handleUpdate(id: string) {
        if (!editValue.trim()) return

        try {
            const { error } = await supabase.from('cat_puestos')
                .update({ puesto: editValue.trim() })
                .eq('id_puesto', id)

            if (error) throw error
            setEditingId(null)
            fetchData()
        } catch (error: any) {
            alert("Error al actualizar: " + error.message)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Seguro que deseas eliminar este puesto?")) return

        try {
            const { error } = await supabase.from('cat_puestos')
                .update({ activo: false })
                .eq('id_puesto', id)

            if (error) throw error
            fetchData()
        } catch (error: any) {
            alert("Error al eliminar: " + error.message)
        }
    }

    const filteredPuestos = puestos.filter((p: any) => {
        const matchesDept = selectedDept === 'all' || p.id_departamento === selectedDept
        const matchesSearch = (p.puesto || '').toLowerCase().includes(searchQuery.toLowerCase())
        return matchesDept && matchesSearch
    })

    // Grouping for "Family" view
    const groupedPuestos = departments.map(dept => ({
        ...dept,
        puestos: puestos.filter(p => p.id_departamento === dept.id_departamento)
    })).filter(dept => selectedDept === 'all' || dept.id_departamento === selectedDept)

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 md:px-0">
            {/* Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-zinc-100 items-center flex justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/catalogos" className="text-xs font-bold text-zinc-400 hover:text-indigo-600 transition-colors">Catálogos</Link>
                        <ChevronRight className="w-3 h-3 text-zinc-300" />
                        <span className="text-xs font-bold text-indigo-600">Puestos</span>
                    </div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Catálogo de <span className="text-indigo-600">Puestos</span></h1>
                    <p className="text-zinc-500 font-medium text-sm mt-1">Administra los puestos de trabajo agrupados por familia de departamento.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-zinc-900 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Puesto
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-2 rounded-2xl border border-zinc-100 flex items-center gap-3">
                    <div className="p-2.5 bg-zinc-50 rounded-xl">
                        <Search className="w-4 h-4 text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar puesto..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-zinc-700"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="bg-white p-2 rounded-2xl border border-zinc-100 flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                    </div>
                    <select
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-zinc-700 outline-none"
                        value={selectedDept}
                        onChange={e => setSelectedDept(e.target.value)}
                    >
                        <option value="all">Todas las Familias (Deptos)</option>
                        {departments.map(d => (
                            <option key={d.id_departamento} value={d.id_departamento}>{d.departamento}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Add Modal/Form overlay */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-zinc-900">Configurar Puesto</h2>
                            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Nombre del Puesto</label>
                                <input
                                    autoFocus
                                    className="w-full bg-zinc-50 border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Ej. Operador de Perforadora"
                                    value={newPuesto.name}
                                    onChange={e => setNewPuesto({ ...newPuesto, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Familia (Departamento)</label>
                                <select
                                    className="w-full bg-zinc-50 border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                    value={newPuesto.deptId}
                                    onChange={e => setNewPuesto({ ...newPuesto, deptId: e.target.value })}
                                >
                                    <option value="">Selecciona Familia...</option>
                                    {departments.map(d => (
                                        <option key={d.id_departamento} value={d.id_departamento}>{d.departamento}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-6 py-4 rounded-2xl font-black text-zinc-500 hover:bg-zinc-100 transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAdd}
                                className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-black transition-all shadow-lg text-sm"
                            >
                                Crear Puesto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Sincronizando Catálogo...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedPuestos.map((dept, idx) => (
                        <div key={dept.id_departamento} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                            {/* Department Family Header */}
                            <div className="flex items-center gap-4 mb-4 ml-2">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                    <LayoutGrid className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">{dept.departamento}</h3>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mt-0.5">{dept.puestos.length} Puestos en Familia</p>
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-zinc-200 via-zinc-100 to-transparent"></div>
                                <button
                                    onClick={() => {
                                        setNewPuesto({ name: '', deptId: dept.id_departamento })
                                        setIsAdding(true)
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100/50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Nuevo Puesto
                                </button>
                            </div>

                            {/* Puestos Grid for this family */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {dept.puestos.length === 0 ? (
                                    <button
                                        onClick={() => {
                                            setNewPuesto({ name: '', deptId: dept.id_departamento })
                                            setIsAdding(true)
                                        }}
                                        className="col-span-full group/empty bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl p-8 flex flex-col items-center justify-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                                    >
                                        <div className="p-3 bg-white rounded-2xl shadow-sm mb-2 group-hover/empty:scale-110 transition-transform">
                                            <Briefcase className="w-6 h-6 text-zinc-300 group-hover/empty:text-indigo-400" />
                                        </div>
                                        <p className="text-xs font-black text-zinc-400 group-hover/empty:text-indigo-600 uppercase tracking-widest">Añadir Primer Puesto</p>
                                    </button>
                                ) : (
                                    dept.puestos.map((p: any) => (
                                        <div key={p.id_puesto} className="group bg-white p-5 rounded-3xl border border-zinc-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden">
                                            {editingId === p.id_puesto ? (
                                                <div className="space-y-3">
                                                    <input
                                                        autoFocus
                                                        className="w-full bg-zinc-50 border-indigo-200 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleUpdate(p.id_puesto)
                                                            if (e.key === 'Escape') setEditingId(null)
                                                        }}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdate(p.id_puesto)}
                                                            className="flex-1 bg-zinc-900 text-white rounded-xl py-2 text-[10px] font-black uppercase tracking-widest hover:bg-black"
                                                        >
                                                            Guardar
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="px-3 bg-zinc-100 text-zinc-500 rounded-xl py-2"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="p-2.5 bg-zinc-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                                                            <Briefcase className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => { setEditingId(p.id_puesto); setEditValue(p.puesto) }}
                                                                className="p-1.5 hover:bg-indigo-50 text-zinc-400 hover:text-indigo-600 rounded-lg transition-colors"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(p.id_puesto)}
                                                                className="p-1.5 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-sm font-black text-zinc-800 leading-tight group-hover:text-indigo-900 transition-colors uppercase tracking-tight">{p.puesto}</h4>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">ID: {p.id_puesto.substring(0, 8)}</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"></div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
