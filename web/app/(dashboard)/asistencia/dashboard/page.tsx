'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Activity, Clock, LogIn, LogOut, CheckCircle, RefreshCw, AlertCircle, Calendar, Trash2, Edit, Save, X, User } from 'lucide-react'
import Link from 'next/link'

export default function AsistenciaDashboard() {
    const [checadas, setChecadas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [stats, setStats] = useState({
        totalChecadas: 0,
        puntuales: 0,
        retardos: 0,
        faltas: 0
    })

    useEffect(() => {
        fetchChecadas()

        // Supabase Realtime Subscription for live sync
        const channel = supabase
            .channel('realtime-checadas')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'checadas' },
                () => {
                    fetchChecadas()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedDate])

    async function fetchChecadas() {
        setLoading(true)

        try {
            const { data, error } = await supabase
                .from('checadas')
                .select(`
                    *,
                    empleados (nombre, apellido_paterno, apellido_materno, numero_empleado),
                    permisos_autorizados (codigo, motivo)
                `)
                .eq('fecha_local', selectedDate)
                .order('timestamp_checada', { ascending: false })

            if (error) throw error

            const records = data || []
            setChecadas(records)

            // Calculate KPIs
            setStats({
                totalChecadas: records.length,
                puntuales: records.filter(r => r.estatus_puntualidad === 'PUNTUAL').length,
                retardos: records.filter(r => r.estatus_puntualidad === 'RETARDO').length,
                faltas: records.filter(r => r.estatus_puntualidad === 'FALTA').length
            })

        } catch (error) {
            console.error('Error fetching asistence:', error)
        } finally {
            setLoading(false)
        }
    }

    async function eliminarChecada(id: string) {
        if (!confirm('¿Seguro que deseas eliminar este registro de asistencia?')) return
        const { error } = await supabase.from('checadas').delete().eq('id', id)
        if (error) alert('Error al eliminar: ' + error.message)
        else fetchChecadas()
    }

    const formatHora = (isoStr: string) => {
        return new Date(isoStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
            {/* Cabecera / Navegación */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-200">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Monitor de Asistencia Visual</h1>
                    <p className="text-sm text-zinc-500">Visualiza y gestiona los registros de asistencia.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
                    <div className="flex items-center gap-2 bg-zinc-100 px-3 py-2 rounded-lg border border-zinc-200 shadow-sm">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <input
                            type="date"
                            className="bg-transparent border-none p-0 text-sm font-bold text-zinc-800 focus:ring-0"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <Link href="/asistencia/manual" className="text-sm font-semibold text-zinc-600 bg-white px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm">
                        Registros Manuales
                    </Link>
                    <Link href="/asistencia/permisos" className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm">
                        Generar Permisos
                    </Link>
                    <button
                        onClick={fetchChecadas}
                        className="flex items-center space-x-2 bg-white border border-zinc-200 shadow-sm text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-zinc-500 uppercase">Movimientos Hoy</p>
                        <p className="text-2xl font-bold text-zinc-900">{stats.totalChecadas}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-zinc-500 uppercase">Puntuales</p>
                        <p className="text-2xl font-bold text-zinc-900">{stats.puntuales}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 rounded-lg">
                        <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-zinc-500 uppercase">Retardos</p>
                        <p className="text-2xl font-bold text-zinc-900">{stats.retardos}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-red-50 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-zinc-500 uppercase">Faltas</p>
                        <p className="text-2xl font-bold text-zinc-900">{stats.faltas}</p>
                    </div>
                </div>
            </div>

            {/* Tabla Principal */}
            <div className="bg-white border text-left border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50 rounded-t-xl flex justify-between items-center">
                    <h2 className="font-semibold text-zinc-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-zinc-400" />
                        Registros {selectedDate === new Date().toISOString().split('T')[0] ? 'de Hoy' : `del ${selectedDate}`}
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap">
                        <thead>
                            <tr className="bg-white border-b border-zinc-100 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                <th className="px-6 py-4 text-left">Hora</th>
                                <th className="px-6 py-4 text-left">Empleado</th>
                                <th className="px-6 py-4 text-left">Trámite / Tipo</th>
                                <th className="px-6 py-4 text-left">Puntualidad</th>
                                <th className="px-6 py-4 text-left">Origen</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {loading && <tr><td colSpan={5} className="p-8 text-center text-sm text-zinc-400">Cargando datos en vivo...</td></tr>}
                            {!loading && checadas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-zinc-400">
                                        <div className="flex flex-col items-center">
                                            <AlertCircle className="w-10 h-10 text-zinc-300 mb-3" />
                                            <p className="font-medium text-sm">No hay checadas registradas el día de hoy.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : null}
                            {checadas.map(c => {
                                const isEntrada = c.tipo_checada.includes('ENTRADA') || c.tipo_checada.includes('REGRESO')

                                return (
                                    <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-zinc-900 font-mono tracking-tight">{formatHora(c.timestamp_checada)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-zinc-900">{c.empleados?.nombre} {c.empleados?.apellido_paterno}</div>
                                            <div className="text-xs text-zinc-500 font-medium">#{c.empleados?.numero_empleado}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                {isEntrada ? <LogIn className="w-4 h-4 text-green-500" /> : <LogOut className="w-4 h-4 text-red-500" />}
                                                <span className="text-xs font-bold text-zinc-700">{c.tipo_checada.replace('_', ' ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${c.estatus_puntualidad === 'PUNTUAL' ? 'bg-green-50 text-green-700 border-green-200' : c.estatus_puntualidad === 'FALTA' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                {c.estatus_puntualidad} {c.retardo_minutos > 0 ? ` (+${c.retardo_minutos}m)` : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                                    {c.es_manual ? (
                                                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] border border-amber-200">MANUAL</span>
                                                    ) : (
                                                        <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[9px] border border-zinc-200">SISTEMA</span>
                                                    )}
                                                    {c.metodo_identificacion?.replace('_', ' ')}
                                                </div>
                                                {c.id_permiso && (
                                                    <div className="text-[10px] text-indigo-600 font-bold tracking-tight uppercase bg-indigo-50 inline-block px-1.5 py-0.5 rounded border border-indigo-100 w-fit">
                                                        AUTORIZADO: {c.permisos_autorizados?.codigo}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/asistencia/manual?edit=${c.id}`}
                                                    className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => eliminarChecada(c.id)}
                                                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
