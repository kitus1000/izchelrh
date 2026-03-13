'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Save, Upload, Building, Trash2 } from 'lucide-react'

export default function EmpresaConfigPage() {
    const [config, setConfig] = useState<any>({
        nombre_empresa: '',
        direccion: '',
        rfc: '',
        registro_patronal: '',
        logo_base64: ''
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchConfig()
    }, [])

    async function fetchConfig() {
        setLoading(true)
        const { data, error } = await supabase
            .from('configuracion_empresa')
            .select('*')
            .limit(1)
            .single()

        if (data) {
            setConfig(data)
        } else {
            // Cargar de local solo como fallback inicial si la DB está vacía
            const saved = localStorage.getItem('rh_config_empresa')
            if (saved) setConfig({ ...config, ...JSON.parse(saved) })
        }
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        try {
            // Guardar local para compatibilidad rápida en algunos componentes
            localStorage.setItem('rh_config_empresa', JSON.stringify(config))

            // Guardar en Supabase para el API y persistencia real
            const { error } = await supabase
                .from('configuracion_empresa')
                .upsert([config], { onConflict: 'id' })

            if (error) throw error
            alert('Configuración guardada correctamente en la nube.')
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setConfig({ ...config, logo_base64: reader.result as string })
            }
            reader.readAsDataURL(file)
        }
    }

    if (loading) return <div className="p-10 text-center animate-pulse">Cargando configuración...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-zinc-900 rounded-full">
                    <Building className="h-8 w-8 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 uppercase tracking-wide">Identidad y Configuración</h2>
                    <p className="text-sm text-zinc-500">Ajusta los datos institucionales y el huso horario oficial.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-zinc-200 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Información Legal</h3>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700">Razón Social</label>
                            <input
                                type="text"
                                value={config.nombre_empresa}
                                onChange={(e) => setConfig({ ...config, nombre_empresa: e.target.value })}
                                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-3 border text-zinc-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700">Dirección Fiscal</label>
                            <textarea
                                rows={3}
                                value={config.direccion}
                                onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-3 border text-zinc-900"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700">RFC</label>
                                <input
                                    type="text"
                                    value={config.rfc}
                                    onChange={(e) => setConfig({ ...config, rfc: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-3 border text-zinc-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700">Reg. Patronal</label>
                                <input
                                    type="text"
                                    value={config.registro_patronal || ''}
                                    onChange={(e) => setConfig({ ...config, registro_patronal: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-3 border text-zinc-900"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Logo Institucional</h3>
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-lg p-6 hover:bg-zinc-50 transition-colors">
                            {config.logo_base64 ? (
                                <div className="relative mb-4">
                                    <img src={config.logo_base64} alt="Logo" className="h-32 object-contain" />
                                    <button
                                        onClick={() => setConfig({ ...config, logo_base64: '' })}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="mx-auto h-12 w-12 text-zinc-300" />
                                    <p className="mt-1 text-sm text-zinc-500">PNG o JPG (Máx 200KB recomendado)</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-100' file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center px-8 py-4 bg-zinc-900 text-white rounded-xl shadow-lg hover:bg-black disabled:opacity-50 transition-all active:scale-95 font-bold"
                    >
                        {saving ? 'Guardando...' : <><Save className="mr-2 h-5 w-5 text-amber-500" /> Guardar Cambios</>}
                    </button>
                </div>
            </div>
        </div>

    )
}
