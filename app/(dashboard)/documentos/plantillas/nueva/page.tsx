'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import { FontSize } from '@/utils/tiptap/FontSize'
import {
    Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Save, ArrowLeft, ZoomIn, ZoomOut, LayoutTemplate
} from 'lucide-react'
import Link from 'next/link'

const VARIABLES = [
    { label: 'Nombre', value: '{nombre}' },
    { label: 'Apellido Paterno', value: '{apellido_paterno}' },
    { label: 'Apellido Materno', value: '{apellido_materno}' },
    { label: 'Puesto', value: '{puesto}' },
    { label: 'Salario', value: '{salario}' },
    { label: 'Fecha Inicio', value: '{fecha_inicio}' },
    { label: 'CURP', value: '{curp}' },
    { label: 'RFC', value: '{rfc}' },
    { label: 'NSS', value: '{nss}' },
    { label: 'Dirección', value: '{direccion}' },
    { label: 'Empresa', value: '{empresa}' },
    { label: 'Departamento', value: '{departamento}' },
    { label: 'Fecha Actual', value: '{fecha_actual}' },
    { label: 'Fecha Baja', value: '{fecha_baja}' },
]

// Single view mode now, no need for separate settings tab
type Section = 'header' | 'body' | 'footer'

const MIN_ZOOM = 50
const MAX_ZOOM = 200

export default function NuevaPlantillaPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [type, setType] = useState('contrato')
    const [saving, setSaving] = useState(false)
    const [activeSection, setActiveSection] = useState<Section>('body')
    const [showHeader, setShowHeader] = useState(false)
    const [showFooter, setShowFooter] = useState(false)

    // Page Settings
    const [margins, setMargins] = useState({ top: 2.5, right: 3, bottom: 2.5, left: 3 })
    const [zoom, setZoom] = useState(100)
    const scale = zoom / 100 // Derived scale

    const editorConfig = (placeholder: string) => ({
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
            Placeholder.configure({ placeholder }),
        ],
        content: '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'focus:outline-none w-full min-h-full h-full text-zinc-900 prose prose-sm max-w-none flex-1',
            },
        },
    })

    const bodyEditor = useEditor(editorConfig('Escribe el contenido principal...'))
    const headerEditor = useEditor(editorConfig('Encabezado (opcional)...'))
    const footerEditor = useEditor(editorConfig('Pie de página (opcional)...'))

    // Helper to get active editor for Toolbar commands
    const getActiveEditor = () => {
        if (activeSection === 'header') return headerEditor
        if (activeSection === 'footer') return footerEditor
        return bodyEditor
    }
    const activeEditor = getActiveEditor()

    const insertVariable = (variable: string) => {
        activeEditor?.chain().focus().insertContent(` ${variable} `).run()
    }

    const setFontFamily = (font: string) => {
        activeEditor?.chain().focus().setFontFamily(font).run()
    }

    const handleSave = async () => {
        if (!name) {
            alert('Por favor, ingresa un nombre para la plantilla.')
            return
        }
        setSaving(true)
        try {
            const payload = {
                name,
                type,
                content: bodyEditor?.getJSON(),
                header_content: showHeader ? headerEditor?.getJSON() : null,
                footer_content: showFooter ? footerEditor?.getJSON() : null,
                body_html: bodyEditor?.getHTML() || '',
                header_html: showHeader ? headerEditor?.getHTML() || '' : '',
                footer_html: showFooter ? footerEditor?.getHTML() || '' : '',
                blocks: [], // Legacy blocks removed
                page_settings: { margins }
            }
            const { error } = await supabase.from('document_templates').insert(payload)
            if (error) throw error
            alert('Plantilla guardada correctamente.')
            router.push('/documentos/plantillas')
        } catch (e: any) {
            console.error(e)
            alert('Error al guardar: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    if (!bodyEditor || !headerEditor || !footerEditor) return null

    return (
        <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-zinc-200">
                <div className="flex items-center gap-4">
                    <Link href="/documentos/plantillas" className="text-zinc-400 hover:text-zinc-600">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <input
                            type="text"
                            className="text-lg font-bold text-zinc-900 border-none focus:ring-0 p-0 placeholder-zinc-300 w-64"
                            placeholder="Nombre de la Plantilla"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <div className="text-xs text-zinc-500 flex gap-2 items-center">
                            Tipo:
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="text-xs py-0 pl-1 pr-6 border-none text-zinc-600 font-medium bg-transparent focus:ring-0 cursor-pointer"
                            >
                                <option value="contrato">Contrato</option>
                                <option value="carta">Carta</option>
                                <option value="constancia">Constancia</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><LayoutTemplate className="w-3 h-3" /> Márgenes (cm)</span>
                        <div className="flex gap-2 text-xs">
                            <label className="flex items-center gap-1 text-zinc-500">Sup: <input type="number" step="0.5" value={margins.top} onChange={e => setMargins({ ...margins, top: parseFloat(e.target.value) || 0 })} className="w-12 h-6 border-zinc-200 rounded px-1" /></label>
                            <label className="flex items-center gap-1 text-zinc-500">Inf: <input type="number" step="0.5" value={margins.bottom} onChange={e => setMargins({ ...margins, bottom: parseFloat(e.target.value) || 0 })} className="w-12 h-6 border-zinc-200 rounded px-1" /></label>
                            <label className="flex items-center gap-1 text-zinc-500">Izq: <input type="number" step="0.5" value={margins.left} onChange={e => setMargins({ ...margins, left: parseFloat(e.target.value) || 0 })} className="w-12 h-6 border-zinc-200 rounded px-1" /></label>
                            <label className="flex items-center gap-1 text-zinc-500">Der: <input type="number" step="0.5" value={margins.right} onChange={e => setMargins({ ...margins, right: parseFloat(e.target.value) || 0 })} className="w-12 h-6 border-zinc-200 rounded px-1" /></label>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-100 rounded-md px-2 py-1">
                        <ZoomOut className="h-4 w-4 text-zinc-500 cursor-pointer" onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 10))} />
                        <span className="text-xs font-mono w-8 text-center">{zoom}%</span>
                        <ZoomIn className="h-4 w-4 text-zinc-500 cursor-pointer" onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 10))} />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                        <Save className="-ml-1 mr-2 h-4 w-4" />
                        Guardar
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex flex-1 gap-4 overflow-hidden">

                {/* Center: Editor Canvas */}
                <div className="flex-1 bg-zinc-100 rounded-lg border border-zinc-200 overflow-hidden flex flex-col relative">

                    {/* Toolbar */}
                    <div className="bg-white border-b border-zinc-200 p-2 flex items-center gap-2 overflow-x-auto shadow-sm z-10 justify-center">
                        <span className="text-xs text-zinc-400 uppercase font-black mr-2 tracking-widest text-[0.6rem]">{activeSection}</span>
                        <div className="w-px h-6 bg-zinc-300 mx-2" />
                        <ToolbarButton onClick={() => activeEditor?.chain().focus().toggleBold().run()} active={activeEditor?.isActive('bold')} icon={Bold} />
                        <ToolbarButton onClick={() => activeEditor?.chain().focus().toggleItalic().run()} active={activeEditor?.isActive('italic')} icon={Italic} />
                        <ToolbarButton onClick={() => activeEditor?.chain().focus().toggleUnderline().run()} active={activeEditor?.isActive('underline')} icon={UnderlineIcon} />
                        <div className="w-px h-6 bg-zinc-300 mx-2" />
                        <ToolbarButton onClick={() => activeEditor?.chain().focus().setTextAlign('left').run()} active={activeEditor?.isActive({ textAlign: 'left' })} icon={AlignLeft} />
                        <ToolbarButton onClick={() => activeEditor?.chain().focus().setTextAlign('center').run()} active={activeEditor?.isActive({ textAlign: 'center' })} icon={AlignCenter} />
                        <ToolbarButton onClick={() => activeEditor?.chain().focus().setTextAlign('right').run()} active={activeEditor?.isActive({ textAlign: 'right' })} icon={AlignRight} />
                        <ToolbarButton onClick={() => activeEditor?.chain().focus().setTextAlign('justify').run()} active={activeEditor?.isActive({ textAlign: 'justify' })} icon={AlignJustify} />
                        <div className="w-px h-6 bg-zinc-300 mx-2" />
                        <select
                            className="text-xs border-zinc-300 rounded py-1 pl-2 pr-6 h-8 w-32 bg-white text-zinc-900"
                            onChange={(e) => setFontFamily(e.target.value)}
                            value={activeEditor?.getAttributes('textStyle').fontFamily || ''}
                        >
                            <option value="" className="text-zinc-500">Fuente (Default)</option>
                            <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
                            <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
                            <option value="Courier New" style={{ fontFamily: 'Courier New' }}>Courier New</option>
                            <option value="Georgia" style={{ fontFamily: 'Georgia' }}>Georgia</option>
                            <option value="Verdana" style={{ fontFamily: 'Verdana' }}>Verdana</option>
                        </select>

                        {/* Font Size Dropdown */}
                        <select
                            className="text-xs border-zinc-300 rounded py-1 pl-2 pr-6 h-8 w-20 bg-white text-zinc-900 cursor-pointer"
                            onChange={(e) => {
                                const size = e.target.value
                                if (size) {
                                    activeEditor?.chain().focus().setFontSize(size).run()
                                } else {
                                    activeEditor?.chain().focus().unsetFontSize().run()
                                }
                            }}
                            value={activeEditor?.getAttributes('textStyle').fontSize || ''}
                        >
                            <option value="" className="text-zinc-500">Tam.</option>
                            <option value="10px">10px</option>
                            <option value="11px">11px</option>
                            <option value="12px">12px</option>
                            <option value="14px">14px</option>
                            <option value="16px">16px</option>
                            <option value="18px">18px</option>
                            <option value="20px">20px</option>
                            <option value="24px">24px</option>
                            <option value="30px">30px</option>
                        </select>

                        <div className="w-px h-5 bg-zinc-300 mx-1 md:mx-2" />
                        <select
                            className="text-[10px] md:text-xs border-zinc-300 rounded py-1 pl-2 pr-6 h-8 bg-amber-50 text-amber-900 cursor-pointer font-bold outline-none ring-1 ring-amber-200"
                            onChange={(e) => {
                                if (e.target.value) {
                                    insertVariable(e.target.value)
                                    e.target.value = "" // reset
                                }
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>+ Variable</option>
                            {VARIABLES.map(v => <option key={v.value} value={v.value}>{v.label} {v.value}</option>)}
                        </select>
                        <div className="w-px h-6 bg-zinc-300 mx-2" />
                        <button
                            onClick={() => {
                                setShowHeader(!showHeader)
                                if (showHeader && activeSection === 'header') setActiveSection('body')
                            }}
                            className={`text-[10px] md:text-xs font-bold px-3 py-1.5 rounded transition-colors ${showHeader ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                        >
                            + Encabezado
                        </button>
                        <button
                            onClick={() => {
                                setShowFooter(!showFooter)
                                if (showFooter && activeSection === 'footer') setActiveSection('body')
                            }}
                            className={`text-[10px] md:text-xs font-bold px-3 py-1.5 rounded transition-colors ${showFooter ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                        >
                            + Pie de pág
                        </button>
                    </div>

                    {/* Canvas Wrapper with Zoom */}
                    <div className="flex-1 overflow-auto bg-zinc-200/50 p-4 md:p-8 flex justify-center cursor-default" onClick={() => {
                        // Clicking canvas background doesn't focus
                    }}>
                        <div
                            style={{
                                transform: `scale(${scale})`,
                                transformOrigin: 'top center',
                                transition: 'transform 0.2s ease-in-out'
                            }}
                        >
                            {/* Real Page - No Scale Transform here, just physical dimensions */}
                            <div
                                className="bg-white shadow-xl flex flex-col relative transition-all"
                                style={{
                                    width: '21.59cm',      // Letter Width
                                    minHeight: '27.94cm',  // Letter Height
                                }}
                            >
                                {/* Margin Guides (Visual only) */}
                                <div
                                    className="absolute pointer-events-none inset-0 z-0"
                                    style={{
                                        paddingTop: `${margins.top}cm`,
                                        paddingRight: `${margins.right}cm`,
                                        paddingBottom: `${margins.bottom}cm`,
                                        paddingLeft: `${margins.left}cm`,
                                    }}
                                >
                                    <div className="w-full h-full border border-dashed border-zinc-300 opacity-50" />
                                </div>

                                {/* Content Area (Respects Margins) */}
                                <div
                                    className="relative flex flex-col flex-1 w-full z-10"
                                    style={{
                                        paddingTop: `${margins.top}cm`,
                                        paddingRight: `${margins.right}cm`,
                                        paddingBottom: `${margins.bottom}cm`,
                                        paddingLeft: `${margins.left}cm`,
                                    }}
                                >
                                    {/* Header Section */}
                                    {showHeader && (
                                        <div
                                            onClick={() => { setActiveSection('header'); headerEditor?.commands.focus() }}
                                            className={`mb-4 pb-2 transition-all ${activeSection === 'header' ? 'ring-2 ring-amber-400 bg-amber-50/20' : 'hover:bg-zinc-50'}`}
                                        >
                                            <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] bg-amber-100 text-amber-700 font-bold uppercase rounded-bl opacity-50">Header</div>
                                            <EditorContent editor={headerEditor} />
                                        </div>
                                    )}

                                    {/* Body Section */}
                                    <div
                                        onClick={() => { setActiveSection('body'); bodyEditor?.commands.focus() }}
                                        className={`flex-1 flex flex-col outline-none transition-all relative ${activeSection === 'body' ? 'ring-2 ring-amber-400 bg-amber-50/10' : 'hover:bg-transparent'}`}
                                    >
                                        <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] bg-amber-100 text-amber-700 font-bold uppercase rounded-bl opacity-50 z-20">Body</div>
                                        <EditorContent editor={bodyEditor} className="flex-1 w-full h-full flex flex-col [&>div]:flex-1 [&>div]:min-h-full" />
                                    </div>

                                    {/* Footer Section */}
                                    {showFooter && (
                                        <div
                                            onClick={() => { setActiveSection('footer'); footerEditor?.commands.focus() }}
                                            className={`mt-4 pt-4 transition-all relative ${activeSection === 'footer' ? 'ring-2 ring-amber-400 bg-amber-50/20' : 'hover:bg-zinc-50'}`}
                                        >
                                            <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] bg-amber-100 text-amber-700 font-bold uppercase rounded-bl opacity-50">Footer</div>
                                            <EditorContent editor={footerEditor} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-4 right-4 bg-black/75 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm pointer-events-none">
                        Editando: {activeSection === 'header' ? 'Encabezado' : activeSection === 'footer' ? 'Pie de página' : 'Contenido Principal'}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ToolbarButton({ onClick, active, icon: Icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`p-1.5 rounded hover:bg-zinc-100 transition-colors ${active ? 'bg-zinc-200 text-black shadow-inner' : 'text-zinc-600'}`}
        >
            <Icon className="h-4 w-4" />
        </button>
    )
}
