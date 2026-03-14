'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Clock, User, Calendar, Save, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useSearchParams, useRouter } from 'next/navigation'

function ManualCheckInContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const editId = searchParams.get('edit')

    const [empleados, setEmpleados] = useState<any[]>([])
    const [tiposChecada, setTiposChecada] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    const [form, setForm] = useState({
        id_empleado: '',
        tipo_checada: 'ENTRADA',
        fecha: format(new Date(), 'yyyy-MM-dd'),
        hora: format(new Date(), 'HH:mm'),
        notas: ''
    })

    useEffect(() => {
        init()
    }, [editId])

    async function init() {
        setLoading(true)
        const [empRes, tiposRes] = await Promise.all([
            supabase.from('empleados').select('id_empleado, nombre, apellido_paterno, apellido_materno').eq('estado_empleado', 'Activo').order('nombre'),
            supabase.from('cat_tipos_checada').select('tipo, label').eq('activo', true).order('ordinal')
        ])
        setEmpleados(empRes.data || [])
        setTiposChecada(tiposRes.data || [])

        if (editId) {
            const { data, error } = await supabase.from('checadas').select('*').eq('id', editId).single()
            if (data && !error) {
                const dt = new Date(data.timestamp_checada)
                setForm({
                    id_empleado: data.id_empleado,
                    tipo_checada: data.tipo_checada,
                    fecha: data.fecha_local,
                    hora: format(dt, 'HH:mm'),
                    notas: data.notas || ''
                })
            }
        }
        setLoading(false)
    }

    async function handleSave() {
        if (!form.id_empleado || !form.fecha || !form.hora) {
            setStatus({ type: 'error', message: 'Por favor completa los campos obligatorios.' })
            return
        }

        setSaving(true)
        setStatus(null)

        try {
            // Crear objeto Date con la fecha y hora seleccionada (en hora local del navegador)
            const dateObj = new Date(`${form.fecha}T${form.hora}:00`);
            const timestamp = dateObj.toISOString();

            // 1. Obtener el número de empleado (el API requiere id_empleado_token que es numero_empleado)
            const { data: empData, error: empErr } = await supabase
                .from('empleados')
                .select('numero_empleado')
                .eq('id_empleado', form.id_empleado)
                .single()

            if (empErr || !empData) throw new Error('No se pudo obtener la información del empleado.')

            // 2. Llamar al API para registro (Unificado)
            const response = await fetch('/api/checadas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_empleado_token: empData.numero_empleado,
                    tipo_checada: form.tipo_checada,
                    timestamp_manual: timestamp,
                    metodo: 'REGISTRO_MANUAL',
                    origen: 'web_manual',
                    es_manual: true
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.mensaje || 'Error al guardar en el servidor.')

            setStatus({
                type: 'success',
                message: editId ? 'Registro actualizado correctamente' : 'Checada manual registrada correctamente.'
            })

            if (editId) {
                setTimeout(() => router.push('/asistencia/dashboard'), 1500)
            } else {
                setForm({ ...form, id_empleado: '', notas: '' })
            }
        } catch (error: any) {
            setStatus({ type: 'error', message: 'Error al guardar: ' + error.message })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
    )

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/asistencia/dashboard" className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">{editId ? 'Editar Registro de Asistencia' : 'Registro de Checada Manual'}</h1>
                    <p className="text-zinc-500 text-sm">{editId ? 'Corrige los datos del registro seleccionado.' : 'Captura asistencias olvidadas por el personal.'}</p>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden">
                <div className="p-8 space-y-6">
                    {/* Empleado */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <User className="w-3 h-3" /> {editId ? 'Empleado' : 'Seleccionar Empleado *'}
                        </label>
                        <select
                            disabled={!!editId}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-black focus:ring-2 focus:ring-black outline-none transition-all disabled:opacity-75"
                            value={form.id_empleado}
                            onChange={e => setForm({ ...form, id_empleado: e.target.value })}
                        >
                            <option value="">-- Seleccionar --</option>
                            {empleados.map(e => (
                                <option key={e.id_empleado} value={e.id_empleado}>
                                    {e.nombre} {e.apellido_paterno} {e.apellido_materno}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tipo */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Tipo de Checada *
                            </label>
                            <select
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-black focus:ring-2 focus:ring-black outline-none transition-all"
                                value={form.tipo_checada}
                                onChange={e => setForm({ ...form, tipo_checada: e.target.value })}
                            >
                                {tiposChecada.map(t => (
                                    <option key={t.tipo} value={t.tipo}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fecha */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Fecha *
                            </label>
                            <input
                                type="date"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-black focus:ring-2 focus:ring-black outline-none transition-all"
                                value={form.fecha}
                                onChange={e => setForm({ ...form, fecha: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Hora */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Hora *
                            </label>
                            <input
                                type="time"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-black focus:ring-2 focus:ring-black outline-none transition-all"
                                value={form.hora}
                                onChange={e => setForm({ ...form, hora: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Observaciones / Motivo</label>
                        <textarea
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-black focus:ring-2 focus:ring-black outline-none transition-all min-h-[100px]"
                            placeholder="Ej. Olvidó checar al salir, falla en internet, etc..."
                            value={form.notas}
                            onChange={e => setForm({ ...form, notas: e.target.value })}
                        />
                    </div>

                    {status && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <p className="text-sm font-medium">{status.message}</p>
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-zinc-900 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-zinc-200"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {editId ? 'Actualizar Registro' : 'Guardar Registro Manual'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function ManualCheckInPage() {
    return (
        <Suspense fallback={
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        }>
            <ManualCheckInContent />
        </Suspense>
    )
}
