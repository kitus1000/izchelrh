'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { KeyRound, Plus, Copy, AlertCircle, RefreshCw, XCircle, TimerReset } from 'lucide-react'

export default function GeneradorPermisos() {
    const [empleados, setEmpleados] = useState<any[]>([])
    const [permisos, setPermisos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [form, setForm] = useState({
        id_empleado: '',
        tipo_checada: 'PERMISO_PERSONAL',
        vigenciaHoras: 24, // Vigencia por defecto (horas)
        motivo: ''
    })

    const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchEmpleados()
        fetchPermisosAutorizados()
    }, [])

    async function fetchEmpleados() {
        const { data } = await supabase
            .from('empleados')
            .select('id_empleado, nombre, apellido_paterno, apellido_materno, numero_empleado')
            .eq('estado_empleado', 'Activo')
            .order('nombre')
        setEmpleados(data || [])
    }

    async function fetchPermisosAutorizados() {
        setLoading(true)
        const { data } = await supabase
            .from('permisos_autorizados')
            .select(`
                *,
                empleados (nombre, apellido_paterno, apellido_materno, numero_empleado)
            `)
            .order('creado_el', { ascending: false })
            .limit(50)

        setPermisos(data || [])
        setLoading(false)
    }

    async function handleGenerar(e: React.FormEvent) {
        e.preventDefault()
        if (!form.id_empleado) return alert('Selecciona un empleado')
        setIsSubmitting(true)

        const now = new Date()
        const vigencia_desde = now.toISOString()
        const vigencia_hasta = new Date(now.getTime() + form.vigenciaHoras * 3600000).toISOString()

        try {
            const res = await fetch('/api/permisos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_empleado: form.id_empleado,
                    tipo_checada: form.tipo_checada,
                    vigencia_desde,
                    vigencia_hasta,
                    motivo: form.motivo
                })
            })
            const data = await res.json()
            if (data.ok) {
                setCodigoGenerado(data.codigo)
                fetchPermisosAutorizados()
                setForm(prev => ({ ...prev, motivo: '' }))
            } else {
                alert(data.error || 'Ocurrió un error')
            }
        } catch (e) {
            alert('Error de conexión')
        } finally {
            setIsSubmitting(false)
        }
    }

    async function cancelarPermiso(id: string) {
        if (!confirm('¿Seguro que deseas cancelar este código? Ya no servirá para checar.')) return
        await supabase
            .from('permisos_autorizados')
            .update({ estatus: 'Cancelado', cancelado_el: new Date().toISOString() })
            .eq('id', id)

        fetchPermisosAutorizados()
    }

    async function extenderPermiso(id: string, vigenciaActual: string) {
        const adic = prompt('¿Cuántas HORAS adicionales deseas otorgarle a este permiso?', '2')
        if (!adic || isNaN(Number(adic))) return

        const nuevaVigencia = new Date(new Date(vigenciaActual).getTime() + Number(adic) * 3600000).toISOString()
        const { error } = await supabase
            .from('permisos_autorizados')
            .update({ vigencia_hasta: nuevaVigencia })
            .eq('id', id)

        if (error) alert('Error extendiendo tiempo: ' + error.message)
        else {
            alert(`Tiempo extendido en ${adic} horas.`)
            fetchPermisosAutorizados()
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Generador de Autorizaciones</h1>
                    <p className="text-sm text-zinc-500">Crea códigos dinámicos para justificar permisos o salidas de operaciones.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Columna Izquierda: Formulario nuevo permiso */}
                <div className="col-span-1 bg-white p-6 rounded-lg border border-zinc-200 shadow-sm animate-in fade-in slide-in-from-left-4">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <KeyRound className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-bold text-zinc-800">Cí¤digo Nuevo</h2>
                    </div>

                    <form onSubmit={handleGenerar} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1">Empleado</label>
                            <select
                                required
                                className="w-full text-black rounded-md border-zinc-300 text-sm focus:ring-black focus:border-black"
                                value={form.id_empleado}
                                onChange={e => setForm({ ...form, id_empleado: e.target.value })}
                            >
                                <option value="">-- Seleccionar --</option>
                                {empleados.map(e => (
                                    <option key={e.id_empleado} value={e.id_empleado}>
                                        {e.nombre} {e.apellido_paterno} (#{e.numero_empleado})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1">Tipo de Trámite</label>
                            <select
                                className="w-full text-black rounded-md border-zinc-300 text-sm focus:ring-black focus:border-black"
                                value={form.tipo_checada}
                                onChange={e => setForm({ ...form, tipo_checada: e.target.value })}
                            >
                                <option value="PERMISO_PERSONAL">Permiso de Salida Personal</option>
                                <option value="SALIDA_OPERACIONES">Salida de Operaciones / Trabajo</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1">Vigencia</label>
                            <select
                                className="w-full text-black rounded-md border-zinc-300 text-sm focus:ring-black focus:border-black"
                                value={form.vigenciaHoras}
                                onChange={e => setForm({ ...form, vigenciaHoras: Number(e.target.value) })}
                            >
                                <option value={1}>1 Hora (Solo hoy)</option>
                                <option value={8}>8 Horas (Turno Actual)</option>
                                <option value={24}>24 Horas</option>
                                <option value={72}>72 Horas (3 Días)</option>
                            </select>
                            <p className="text-xs text-zinc-400 mt-1">Tiempo que este código será válido.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1">Motivo (Opcional)</label>
                            <textarea
                                rows={2}
                                className="w-full text-black rounded-md border-zinc-300 text-sm focus:ring-black focus:border-black"
                                placeholder="Ej: Cita médica IMSS..."
                                value={form.motivo}
                                onChange={e => setForm({ ...form, motivo: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            <span>Generar Código</span>
                        </button>
                    </form>

                    {/* Mostrar código si se generó */}
                    {codigoGenerado && (
                        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center animate-in zoom-in-95">
                            <p className="text-indigo-600 font-semibold mb-2 text-sm uppercase">Código Creado Exitosamente</p>
                            <div className="text-4xl font-mono font-black text-indigo-900 tracking-[0.25em] mb-2">{codigoGenerado}</div>
                            <button
                                onClick={() => navigator.clipboard.writeText(codigoGenerado)}
                                className="text-xs flex items-center justify-center space-x-1 mx-auto text-indigo-500 hover:text-indigo-700"
                            >
                                <Copy className="w-3 h-3" /> <span>Copiar</span>
                            </button>
                            <p className="text-xs text-zinc-500 mt-3">Compártelo con el empleado. Lo necesitará para checar su salida en el kiosko.</p>
                        </div>
                    )}
                </div>

                {/* Columna Derecha: Tabla Histórico */}
                <div className="col-span-1 md:col-span-2 bg-white rounded-lg border border-zinc-200 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Últimos Códigos Generados</h2>
                        <button onClick={fetchPermisosAutorizados} className="text-zinc-400 hover:text-black">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="overflow-x-auto flex-1 p-0">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Código</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Empleado</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Estatus</th>
                                    <th className="px-4 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 bg-white">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-sm text-zinc-400">Cargando códigos...</td></tr>
                                ) : permisos.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-sm text-zinc-400">No hay códigos recientes.</td></tr>
                                ) : permisos.map(p => (
                                    <tr key={p.id} className="hover:bg-zinc-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`font-mono font-bold tracking-widest ${p.estatus === 'Activo' ? 'text-black' : 'text-zinc-400 line-through'}`}>
                                                {p.codigo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-medium text-zinc-900">{p.empleados?.nombre} {p.empleados?.apellido_paterno}</div>
                                            <div className="text-xs text-zinc-500">#{p.empleados?.numero_empleado}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                                                {p.tipo_checada.replace('_', ' ')}
                                            </span>
                                            <div className="text-[10px] text-zinc-500 mt-1 font-bold">Límite: {new Date(p.vigencia_hasta).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                                            {p.motivo && <div className="text-[10px] text-zinc-500 truncate max-w-[150px] mt-1" title={p.motivo}>{p.motivo}</div>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${p.estatus === 'Activo' ? 'bg-green-50 text-green-700 border-green-200' :
                                                p.estatus === 'Usado' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    p.estatus === 'Completado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-red-50 text-red-600 border-red-200'
                                                }`}>
                                                {p.estatus === 'Usado' ? 'En Curso' : p.estatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right flex items-center justify-end space-x-2">
                                            {(p.estatus === 'Usado' || p.estatus === 'Activo') && (
                                                <button
                                                    onClick={() => extenderPermiso(p.id, p.vigencia_hasta)}
                                                    className="text-zinc-400 hover:text-indigo-600"
                                                    title="Extender Tiempo"
                                                >
                                                    <TimerReset className="w-5 h-5" />
                                                </button>
                                            )}
                                            {p.estatus === 'Activo' && (
                                                <button
                                                    onClick={() => cancelarPermiso(p.id)}
                                                    className="text-zinc-400 hover:text-red-600"
                                                    title="Cancelar Código"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}
