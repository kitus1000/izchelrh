'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Calendar, Plus, Trash2, Save, Search, Sparkles, AlertCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function FestivosPage() {
    const [festivos, setFestivos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [newFestivo, setNewFestivo] = useState({ fecha: '', nombre: '', descripcion: '' })

    useEffect(() => {
        fetchFestivos()
    }, [])

    async function fetchFestivos() {
        setLoading(true)
        const { data, error } = await supabase
            .from('cat_festivos')
            .select('*')
            .order('fecha', { ascending: true })
        if (error) console.error(error)
        else setFestivos(data || [])
        setLoading(false)
    }

    async function handleAdd() {
        if (!newFestivo.fecha || !newFestivo.nombre) return

        const { error } = await supabase
            .from('cat_festivos')
            .insert([{
                fecha: newFestivo.fecha,
                nombre: newFestivo.nombre,
                descripcion: newFestivo.descripcion,
                activo: true
            }])

        if (error) {
            alert('Error al guardar: ' + error.message)
        } else {
            setNewFestivo({ fecha: '', nombre: '', descripcion: '' })
            setIsAdding(false)
            fetchFestivos()
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este día festivo?')) return
        const { error } = await supabase
            .from('cat_festivos')
            .delete()
            .eq('id', id)
        if (error) alert(error.message)
        else fetchFestivos()
    }

    const filteredFestivos = festivos.filter(f =>
        f.nombre.toLowerCase().includes(search.toLowerCase()) ||
        f.fecha.includes(search)
    )

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border-b-4 border-indigo-900">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">Configuración</span>
                        </div>
                        <h1 className="text-3xl font-black text-zinc-900 tracking-tighter">Días <span className="text-indigo-900">Festivos</span></h1>
                        <p className="text-zinc-500 font-medium text-sm">Gestiona los feriados oficiales para el cálculo de nómina y asistencia.</p>
                    </div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-indigo-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-100"
                    >
                        {isAdding ? <Plus className="w-4 h-4 rotate-45 transition-transform" /> : <Plus className="w-4 h-4" />}
                        {isAdding ? 'Cancelar' : 'Nuevo Festivo'}
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-indigo-100 animate-in slide-in-from-top duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Fecha</label>
                            <input
                                type="date"
                                value={newFestivo.fecha}
                                onChange={e => setNewFestivo({ ...newFestivo, fecha: e.target.value })}
                                className="w-full bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Nombre del Festivo</label>
                            <input
                                type="text"
                                placeholder="Ej. Navidad, Día de la Independencia..."
                                value={newFestivo.nombre}
                                onChange={e => setNewFestivo({ ...newFestivo, nombre: e.target.value })}
                                className="w-full bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            onClick={handleAdd}
                            className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm"
                        >
                            <Save className="w-4 h-4" /> Guardar Festivo
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
                <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center gap-3">
                    <Search className="w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o fecha..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Festivo</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estatus de Pago</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 italic-none">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-indigo-900/20 border-t-indigo-900 rounded-full animate-spin"></div>
                                            <span className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Cargando catálogo...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredFestivos.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-zinc-300">
                                            <Calendar className="w-12 h-12 mb-2" />
                                            <span className="font-bold text-sm">No se encontraron días festivos</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredFestivos.map((f) => (
                                <tr key={f.id} className="hover:bg-zinc-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-zinc-900">{format(parseISO(f.fecha), 'dd MMM yyyy', { locale: es })}</span>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase capitalize">{format(parseISO(f.fecha), 'EEEE', { locale: es })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></div>
                                            <span className="text-sm font-bold text-zinc-700">{f.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-tighter">
                                            Pago Triple (LFT)
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(f.id)}
                                            className="p-2 text-zinc-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="space-y-1">
                    <p className="text-xs font-black text-amber-900 uppercase">Nota sobre Ley Federal del Trabajo</p>
                    <p className="text-xs text-amber-800 font-medium">Los días registrados aquí se considerarán festivos oficiales. Según la LFT, si un empleado labora en estos días, tiene derecho a un pago doble adicional a su salario normal (pago triple total).</p>
                </div>
            </div>
        </div>
    )
}
