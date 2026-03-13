'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { generateHTML } from '@tiptap/html'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import { FontSize } from '@/utils/tiptap/FontSize'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { prepareElementForPdf, restoreElementAfterPdf } from '@/utils/pdf/sanitizeColors'
import { Download, Search, FileText, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, LayoutTemplate } from 'lucide-react'
import Link from 'next/link'


export default function GenerarDocumentoPage() {
    const [step, setStep] = useState(1) // 1: Select Template, 2: Select Employee, 3: Preview
    const [templates, setTemplates] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])

    // Search State
    const [searchTerm, setSearchTerm] = useState('')
    const [showEmployeeList, setShowEmployeeList] = useState(false)

    const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)

    // Extracted HTML
    const [headerHtml, setHeaderHtml] = useState('')
    const [footerHtml, setFooterHtml] = useState('')

    // Overridable Margins for PDF Preview
    const [margins, setMargins] = useState({ top: 2.5, right: 3, bottom: 2.5, left: 3 })
    const [companyConfig, setCompanyConfig] = useState<any>(null)

    const [generating, setGenerating] = useState(false)
    const previewRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)

    // Derived filtering logic
    const filteredEmpleados = employees.filter(e => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase().trim()
        if (!isNaN(Number(term)) && term !== '') {
            return e.numero_empleado?.toString().includes(term)
        }
        const fullName = `${e.nombre} ${e.apellido_paterno} ${e.apellido_materno || ''}`.toLowerCase()
        return fullName.includes(term)
    }).slice(0, 10)

    // Tiptap Editor for Body
    const editorConfig = {
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
        ],
        content: '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'focus:outline-none w-full min-h-[300px] h-full text-zinc-900 prose prose-sm max-w-none',
            },
        },
    }
    const bodyEditor = useEditor(editorConfig)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).html2canvas = html2canvas
        }
        loadData()
    }, [])

    // Cleaned up block keydown effect

    useEffect(() => {
        if (selectedEmployee && selectedTemplate && step === 2) {
            generatePreview()
        }
    }, [selectedEmployee])

    useEffect(() => {
        const updateScale = () => {
            if (typeof window !== 'undefined' && containerRef.current && step === 3) {
                const containerWidth = containerRef.current.clientWidth
                const pageWidth = 816 // Apx width in px for 21.59cm
                if (containerWidth < pageWidth + 32) {
                    setScale((containerWidth - 32) / pageWidth)
                } else {
                    setScale(1)
                }
            }
        }

        // Run scaling whenever step changes or window resizes
        updateScale()
        window.addEventListener('resize', updateScale)
        return () => window.removeEventListener('resize', updateScale)
    }, [step])

    async function loadData() {
        const { data: t } = await supabase.from('document_templates').select('*')
        setTemplates(t || [])

        const { data: e, error } = await supabase.from('empleados')
            .select(`
                *,
                empleado_adscripciones (
                    cat_departamentos (departamento)
                )
            `)
            .order('nombre', { ascending: true })

        setEmployees(e || [])

        // Load Company Config
        const { data: config } = await supabase.from('configuracion_empresa').select('*').limit(1).single()
        if (config) {
            setCompanyConfig(config)
        } else {
            const saved = localStorage.getItem('rh_config_empresa')
            if (saved) setCompanyConfig(JSON.parse(saved))
        }
    }

    const generatePreview = () => {
        if (!selectedTemplate || !selectedEmployee) return

        const extensions = [
            StarterKit,
            Underline,
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
        ]

        // 1. Convert JSON to HTML for all sections
        let body = generateHTML(selectedTemplate.content || {}, extensions)
        let header = selectedTemplate.header_content ? generateHTML(selectedTemplate.header_content, extensions) : ''
        let footer = selectedTemplate.footer_content ? generateHTML(selectedTemplate.footer_content, extensions) : ''

        // Data Prep
        const depto = selectedEmployee.empleado_adscripciones?.[0]?.cat_departamentos?.departamento || ''
        const empresa = companyConfig?.nombre_empresa || 'MI EMPRESA S.A. DE C.V.'

        const variables: Record<string, string> = {
            '{nombre}': selectedEmployee.nombre,
            '{apellido_paterno}': selectedEmployee.apellido_paterno,
            '{apellido_materno}': selectedEmployee.apellido_materno || '',
            '{puesto}': selectedEmployee.puesto || '',
            '{salario}': selectedEmployee.salario_diario ? `$${(selectedEmployee.salario_diario * 30).toFixed(2)}` : '',
            '{fecha_inicio}': selectedEmployee.fecha_contratacion || '',
            '{curp}': selectedEmployee.curp || '',
            '{rfc}': selectedEmployee.rfc || '',
            '{nss}': selectedEmployee.nss || '',
            '{direccion}': selectedEmployee.direccion || '',
            '{numero_empleado}': selectedEmployee.numero_empleado || '',
            '{departamento}': depto,
            '{empresa}': empresa,
            '{fecha_actual}': new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
            '{fecha_baja}': selectedEmployee.fecha_baja || '______________________',
        }

        const replaceVars = (str: string) => {
            let result = str
            Object.entries(variables).forEach(([key, value]) => {
                result = result.replaceAll(key, value || '')
            })
            return result
        }

        const finalBodyHtml = replaceVars(body)
        bodyEditor?.commands.setContent(finalBodyHtml)

        setHeaderHtml(replaceVars(header))
        setFooterHtml(replaceVars(footer))

        // Set initial margins from template
        const tplMargins = selectedTemplate.page_settings?.margins
        if (tplMargins) {
            setMargins({
                top: tplMargins.top ?? 2.5,
                right: tplMargins.right ?? 3,
                bottom: tplMargins.bottom ?? 2.5,
                left: tplMargins.left ?? 3
            })
        }

        setStep(3)
    }

    // Legacy blocks dropped

    const downloadPdf = async () => {
        if (!previewRef.current || generating) return
        setGenerating(true)
        console.log("Starting PDF generation...")

        const element = previewRef.current
        prepareElementForPdf(element)

        const origBg = element.style.backgroundColor
        const origPt = element.style.paddingTop
        const origPb = element.style.paddingBottom

        element.style.setProperty('background-color', '#ffffff', 'important')
        element.style.setProperty('padding-top', '0', 'important')
        element.style.setProperty('padding-bottom', '0', 'important')

        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'cm',
                format: 'letter'
            })

            // Calculate width logic:
            // Letter width: 21.59cm
            // Container width is 21.59cm. At 96dpi -> ~816px.

            await doc.html(element, {
                callback: function (doc) {
                    doc.save(`${selectedTemplate.name}_${selectedEmployee.nombre}.pdf`)
                    element.style.backgroundColor = origBg
                    element.style.paddingTop = origPt
                    element.style.paddingBottom = origPb
                    restoreElementAfterPdf(element)
                    setGenerating(false)
                },
                x: 0,
                y: 0,
                width: 21.59,
                windowWidth: 816, // Forces 21.59cm to map to ~816px visual width, ensuring 1:1 scale
                margin: [margins.top, 0, margins.bottom, 0],
                autoPaging: 'text',
                html2canvas: {
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                }
            })
        } catch (e: any) {
            console.error("PDF Gen Error:", e)
            alert("Error al generar PDF: " + e.message)
            element.style.backgroundColor = origBg
            element.style.paddingTop = origPt
            element.style.paddingBottom = origPb
            restoreElementAfterPdf(element)
            setGenerating(false)
        }
    }

    const reset = () => {
        setStep(1)
        setSelectedEmployee(null)
        setSelectedTemplate(null)
        setSearchTerm('')
        bodyEditor?.commands.setContent('')
        setHeaderHtml('')
        setFooterHtml('')
        setMargins({ top: 2.5, right: 3, bottom: 2.5, left: 3 })
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Generar Documento</h2>

            {/* Stepper */}
            <div className="flex items-center text-sm font-medium text-zinc-500 mb-8">
                <span className={`${step >= 1 ? 'text-amber-600' : ''}`}>1. Seleccionar Plantilla</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 2 ? 'text-amber-600' : ''}`}>2. Seleccionar Empleado</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 3 ? 'text-amber-600' : ''}`}>3. Vista Previa y Descarga</span>
            </div>

            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.map((t) => (
                        <div key={t.id}
                            onClick={() => { setSelectedTemplate(t); setStep(2) }}
                            className="cursor-pointer bg-white p-6 rounded-lg shadow border border-zinc-200 hover:border-amber-500 transition-all hover:shadow-md">
                            <FileText className="h-8 w-8 text-zinc-400 mb-2" />
                            <h3 className="font-semibold text-zinc-900">{t.name}</h3>
                            <p className="text-xs text-zinc-500 mt-1 capitalize">{t.type}</p>
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <div className="col-span-3 text-center py-10 text-zinc-500">
                            No hay plantillas disponibles. <Link href="/documentos/plantillas/nueva" className="text-amber-600 underline">Crea una primero</Link>.
                        </div>
                    )}
                </div>
            )}

            {step === 2 && (
                <div className="bg-white p-6 rounded-lg shadow border border-zinc-200 max-w-xl mx-auto min-h-[400px]">
                    <h3 className="font-semibold text-zinc-900 mb-4">Buscar Empleado</h3>

                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            autoComplete="off"
                            className="block w-full pl-10 rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-3 border text-zinc-900 bg-white"
                            placeholder="Buscar por ID o Apellido..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setShowEmployeeList(true)
                            }}
                            onFocus={() => setShowEmployeeList(true)}
                        />
                        {showEmployeeList && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-zinc-200">
                                {filteredEmpleados.length === 0 ? (
                                    <div className="cursor-default select-none relative py-2 px-4 text-zinc-500">
                                        No se encontraron resultados para "{searchTerm}"
                                    </div>
                                ) : (
                                    filteredEmpleados.map((emp: any) => (
                                        <div
                                            key={emp.id_empleado}
                                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-amber-50 border-b border-zinc-50 last:border-0"
                                            onClick={() => {
                                                setSelectedEmployee(emp)
                                                setSearchTerm(`${emp.nombre} ${emp.apellido_paterno}`)
                                                setShowEmployeeList(false)
                                            }}
                                        >
                                            <div className="flex items-center">
                                                <span className="font-medium block truncate text-zinc-900">
                                                    {emp.nombre} {emp.apellido_paterno} {emp.apellido_materno || ''}
                                                </span>
                                                <span className="ml-2 text-zinc-400 text-xs">#{emp.numero_empleado}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="text-xs text-zinc-400 mt-1 text-right">
                        Debug: {employees.length} empleados cargados.
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="flex gap-6 min-h-[calc(100vh-200px)] flex-col md:flex-row">
                    <div className="flex-1 bg-zinc-100 rounded-lg shadow-inner border border-zinc-200 overflow-hidden flex flex-col relative">

                        {/* Editor Toolbar */}
                        <div className="bg-white border-b border-zinc-200 p-2 flex items-center gap-2 overflow-x-auto shadow-sm z-10 justify-center">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-2">Herramientas</span>
                            <ToolbarButton onClick={() => bodyEditor?.chain().focus().toggleBold().run()} active={bodyEditor?.isActive('bold')} icon={Bold} />
                            <ToolbarButton onClick={() => bodyEditor?.chain().focus().toggleItalic().run()} active={bodyEditor?.isActive('italic')} icon={Italic} />
                            <ToolbarButton onClick={() => bodyEditor?.chain().focus().toggleUnderline().run()} active={bodyEditor?.isActive('underline')} icon={UnderlineIcon} />
                            <div className="w-px h-5 bg-zinc-300 mx-2" />
                            <ToolbarButton onClick={() => bodyEditor?.chain().focus().setTextAlign('left').run()} active={bodyEditor?.isActive({ textAlign: 'left' })} icon={AlignLeft} />
                            <ToolbarButton onClick={() => bodyEditor?.chain().focus().setTextAlign('center').run()} active={bodyEditor?.isActive({ textAlign: 'center' })} icon={AlignCenter} />
                            <ToolbarButton onClick={() => bodyEditor?.chain().focus().setTextAlign('right').run()} active={bodyEditor?.isActive({ textAlign: 'right' })} icon={AlignRight} />
                            <ToolbarButton onClick={() => bodyEditor?.chain().focus().setTextAlign('justify').run()} active={bodyEditor?.isActive({ textAlign: 'justify' })} icon={AlignJustify} />

                            <div className="w-px h-5 bg-zinc-300 mx-2" />
                            <select
                                className="text-xs border-zinc-300 rounded py-1 pl-2 pr-6 h-8 w-24 bg-white text-zinc-900"
                                onChange={(e) => {
                                    const font = e.target.value
                                    if (font) {
                                        bodyEditor?.chain().focus().setFontFamily(font).run()
                                    } else {
                                        bodyEditor?.chain().focus().unsetFontFamily().run()
                                    }
                                }}
                                value={bodyEditor?.getAttributes('textStyle').fontFamily || ''}
                            >
                                <option value="">Fuente</option>
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times N.R.</option>
                                <option value="Courier New">Courier N.</option>
                            </select>

                            <select
                                className="text-xs border-zinc-300 rounded py-1 pl-2 pr-6 h-8 w-16 bg-white text-zinc-900 cursor-pointer"
                                onChange={(e) => {
                                    const size = e.target.value
                                    if (size) {
                                        bodyEditor?.chain().focus().setFontSize(size).run()
                                    } else {
                                        bodyEditor?.chain().focus().unsetFontSize().run()
                                    }
                                }}
                                value={bodyEditor?.getAttributes('textStyle').fontSize || ''}
                            >
                                <option value="">Tam.</option>
                                <option value="10px">10px</option>
                                <option value="12px">12px</option>
                                <option value="14px">14px</option>
                                <option value="16px">16px</option>
                                <option value="18px">18px</option>
                                <option value="20px">20px</option>
                                <option value="24px">24px</option>
                            </select>

                            <div className="w-px h-5 bg-zinc-300 mx-2" />

                            <div className="flex flex-col md:flex-row items-center gap-2">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1"><LayoutTemplate className="w-3 h-3" /> Márgenes (cm):</span>
                                <div className="flex items-center gap-1">
                                    <input type="number" step="0.5" value={margins.top} onChange={e => setMargins({ ...margins, top: parseFloat(e.target.value) || 0 })} className="w-12 h-6 border-zinc-200 rounded px-1 text-xs text-zinc-600 focus:ring-amber-500 focus:border-amber-500" title="Margen Superior" />
                                    <input type="number" step="0.5" value={margins.bottom} onChange={e => setMargins({ ...margins, bottom: parseFloat(e.target.value) || 0 })} className="w-12 h-6 border-zinc-200 rounded px-1 text-xs text-zinc-600 focus:ring-amber-500 focus:border-amber-500" title="Margen Inferior" />
                                    <input type="number" step="0.5" value={margins.left} onChange={e => setMargins({ ...margins, left: parseFloat(e.target.value) || 0 })} className="w-12 h-6 border-zinc-200 rounded px-1 text-xs text-zinc-600 focus:ring-amber-500 focus:border-amber-500" title="Margen Izquierdo" />
                                    <input type="number" step="0.5" value={margins.right} onChange={e => setMargins({ ...margins, right: parseFloat(e.target.value) || 0 })} className="w-12 h-6 border-zinc-200 rounded px-1 text-xs text-zinc-600 focus:ring-amber-500 focus:border-amber-500" title="Margen Derecho" />
                                </div>
                            </div>
                        </div>

                        {/* Editor Canvas Container */}
                        <div ref={containerRef} className="flex-1 overflow-auto bg-zinc-200/50 p-4 md:p-8 flex justify-center cursor-default min-h-[600px]">
                            <div ref={previewRef}
                                className="bg-white shadow-lg text-black prose prose-sm max-w-none text-zinc-900 mx-auto flex flex-col relative transition-all"
                                style={{
                                    width: '21.59cm',
                                    minHeight: '27.94cm',
                                    padding: `${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm`,
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'top center',
                                    marginBottom: scale < 1 ? `-${27.94 * (1 - scale)}cm` : '0'
                                }}
                            >
                                {/* Draggable Blocks Layer Removed */}

                                {/* Header Section */}
                                {headerHtml && (
                                    <div className="mb-4 text-sm text-zinc-600 border-b border-zinc-100 pb-2 z-10" dangerouslySetInnerHTML={{ __html: headerHtml }} />
                                )}

                                {/* Editable Body Section */}
                                <div className="flex-1 relative z-10 min-h-[300px] outline-none" onClick={(e) => { e.stopPropagation(); bodyEditor?.commands.focus() }}>
                                    <EditorContent editor={bodyEditor} className="h-full" />
                                </div>

                                {/* Footer Section */}
                                {footerHtml && (
                                    <div className="mt-8 pt-4 border-t border-zinc-100 text-xs text-zinc-500 text-center z-10" dangerouslySetInnerHTML={{ __html: footerHtml }} />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-64 space-y-4 shrink-0">
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-4">
                            <h4 className="font-bold text-amber-900 text-sm mb-2">Editor Interactivo</h4>
                            <p className="text-xs text-amber-800">
                                Puedes hacer ajustes en el texto o añadir bloques flotantes antes de descargar el PDF. ¡Los cambios no afectarán a la plantilla original!
                            </p>
                        </div>
                        <button
                            onClick={downloadPdf}
                            disabled={generating}
                            className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            {generating ? (
                                <>Generando...</>
                            ) : (
                                <>
                                    <Download className="h-5 w-5" />
                                    Descargar PDF
                                </>
                            )}
                        </button>
                        <button onClick={reset} className="w-full py-2 text-zinc-600 hover:text-zinc-900 text-sm font-medium">
                            <span className="mr-2">←</span> Empezar de nuevo
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- Helper Components ---
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
