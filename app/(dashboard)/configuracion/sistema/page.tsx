'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Save, Clock, ArrowLeft, Globe } from 'lucide-react'
import Link from 'next/link'

export default function SistemaConfigPage() {
    const [config, setConfig] = useState<any>({
        id: null,
        timezone: 'America/Mexico_City'
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const TIMEZONES = [
        { value: 'America/Mexico_City', label: 'Centro (CDMX, Monterrey, etc.)' },
        { value: 'America/Cancun', label: 'Sureste (Cancún, Quintana Roo)' },
        { value: 'America/Tijuana', label: 'Pacífico (Tijuana, BC)' },
        { value: 'America/Hermosillo', label: 'Noroeste (Sonora - Sin Horario Verano)' },
        { value: 'America/Mazatlan', label: 'Montaña (Mazatlán, Chihuahua)' },
        { value: 'America/Chihuahua', label: 'Chihuahua' },
        { value: 'America/New_York', label: 'Eastern Time (New York)' },
        { value: 'UTC', label: 'UTC (Tiempo Universal)' }
    ]

    useEffect(() => {
        fetchConfig()
    }, [])

    async function fetchConfig() {
        setLoading(true)
        const { data, error } = await supabase
            .from('configuracion_empresa')
            .select('id, timezone')
            .limit(1)
            .single()

        if (data) {
            setConfig(data)
        }
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        try {
            // Guardar local para compatibilidad rápida
            const localConfig = JSON.parse(localStorage.getItem('rh_config_empresa') || '{}')
            localConfig.timezone = config.timezone
            localStorage.setItem('rh_config_empresa', JSON.stringify(localConfig))

            // Guardar en Supabase
            const { error } = await supabase
                .from('configuracion_empresa')
                .upsert([{ id: config.id, timezone: config.timezone }], { onConflict: 'id' })

            if (error) throw error
            alert('Ajustes de sistema guardados correctamente.')
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-10 text-center animate-pulse">Cargando ajustes de sistema...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                <div className="flex items-center gap-4">
                    <Link href="/configuracion" className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 uppercase tracking-wide">Configuración de Sistema</h2>
                        <p className="text-sm text-zinc-500">Ajustes técnicos, zona horaria y parámetros globales.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8">
                <div className="max-w-xl space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-zinc-900">
                            <Clock className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold uppercase tracking-widest text-sm">Huso Horario Oficial</h3>
                        </div>
                        <p className="text-sm text-zinc-500">
                            Define la zona horaria del lugar de operaciones. Esto determinará cómo se registran las asistencias y se calculan los retardos en el Kiosko.
                        </p>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Globe className="h-5 w-5 text-zinc-400" />
                            </div>
                            <select
                                value={config.timezone}
                                onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                                className="block w-full pl-10 pr-3 py-4 border border-zinc-300 rounded-xl leading-5 bg-zinc-50 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-md transition-all appearance-none"
                            >
                                {TIMEZONES.map(tz => (
                                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-100">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center justify-center w-full md:w-auto px-10 py-4 bg-zinc-900 text-white rounded-xl shadow-lg hover:bg-black disabled:opacity-50 transition-all active:scale-95 font-bold"
                        >
                            {saving ? 'Guardando...' : <><Save className="mr-2 h-5 w-5 text-amber-500" /> Guardar Ajustes</>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-amber-800 uppercase tracking-tight">Nota sobre Sincronización</h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Al cambiar el huso horario, los registros futuros se sincronizarán con la nueva hora. Los registros pasados mantienen su estampa de tiempo original por motivos de auditoría.
                    </p>
                </div>
            </div>
        </div>
    )
}
