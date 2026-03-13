'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { Save, FolderOpen, Loader2, Trash2, X } from 'lucide-react'
import { useContractStore } from '@/store/contractStore'

export default function TemplateManager() {
    const { blocks, setBlocks } = useContractStore()
    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [showList, setShowList] = useState(false)

    const supabase = createClient()

    const fetchTemplates = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('document_templates')
            .select('*')
            .eq('type', 'contrato-bloques')
            .order('created_at', { ascending: false })

        if (data) setTemplates(data)
        setLoading(false)
    }

    const handleSave = async () => {
        if (!templateName || blocks.length === 0) return
        setSaving(true)
        const { error } = await supabase
            .from('document_templates')
            .insert({
                name: templateName,
                type: 'contrato-bloques',
                content: blocks // Use 'content' instead of 'blocks'
            })

        if (!error) {
            setTemplateName('')
            await fetchTemplates()
            alert('Plantilla guardada con éxito')
        }
        setSaving(false)
    }

    const handleLoad = (template: any) => {
        if (confirm(`¿Cargar plantilla "${template.name}"? Esto reemplazará el contrato actual.`)) {
            setBlocks(template.content) // Use 'content' instead of 'blocks'
            setShowList(false)
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation()
        if (confirm(`¿Eliminar plantilla "${name}" permanentemente?`)) {
            const { error } = await supabase.from('document_templates').delete().eq('id', id)
            if (!error) {
                setTemplates(templates.filter(t => t.id !== id))
            } else {
                alert('No se pudo eliminar la plantilla')
            }
        }
    }

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-zinc-200 rounded-md shadow-sm overflow-hidden h-8">
                <input
                    type="text"
                    placeholder="Nombre de plantilla..."
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-40 px-2 text-xs h-full border-none focus:ring-0"
                />
                <button
                    onClick={handleSave}
                    disabled={saving || !templateName}
                    className="flex items-center gap-1 px-3 h-full bg-zinc-900 text-white text-[10px] font-bold uppercase hover:bg-black transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Guardar
                </button>
            </div>

            <div className="relative">
                <button
                    onClick={() => {
                        setShowList(!showList)
                        if (!showList) fetchTemplates()
                    }}
                    className="flex items-center gap-1 px-3 h-8 bg-white border border-zinc-200 rounded-md text-zinc-700 text-[10px] font-bold uppercase hover:bg-zinc-50 transition-colors shadow-sm"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
                    Cargar
                </button>

                {showList && (
                    <div className="absolute top-full mt-1 right-0 w-64 bg-white border border-zinc-200 shadow-xl rounded-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mis Plantillas</span>
                            <button onClick={() => setShowList(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-3 h-3" /></button>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {templates.length === 0 ? (
                                <div className="p-8 text-center text-[10px] text-zinc-400 font-medium italic">No tienes plantillas guardadas</div>
                            ) : (
                                templates.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleLoad(t)}
                                        className="group w-full text-left px-4 py-3 hover:bg-indigo-50 transition-all border-b border-zinc-50 last:border-0 cursor-pointer flex justify-between items-center"
                                    >
                                        <div>
                                            <div className="text-xs font-bold text-zinc-900 truncate max-w-[140px] group-hover:text-indigo-600 transition-colors">{t.name}</div>
                                            <div className="text-[9px] text-zinc-400 mt-0.5">{new Date(t.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, t.id, t.name)}
                                            className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
