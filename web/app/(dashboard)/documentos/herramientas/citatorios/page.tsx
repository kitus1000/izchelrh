'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { prepareElementForPdf, restoreElementAfterPdf } from '@/utils/pdf/sanitizeColors'
import { Search, Download, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const TIPOS_DOCUMENTO = [
    { id: 'amonestacion', label: 'Amonestación Escrita (Llamada de Atención)', title: 'AMONESTACIÓN ESCRITA' },
    { id: 'citatorio', label: 'Citatorio de Investigación (Administrativa)', title: 'CITATORIO DE INVESTIGACIÓN ADMINISTRATIVA' }
]

const MOTIVOS_RAPIDOS = [
    { id: 'retardo', label: 'Retardo(s) injustificado(s)' },
    { id: 'falta', label: 'Falta injustificada' },
    { id: 'equipo', label: 'Uso inadecuado de herramientas/equipo' },
    { id: 'seguridad', label: 'Incumplimiento de normas de seguridad' },
    { id: 'rendimiento', label: 'Bajo rendimiento / negligencia en tareas' },
    { id: 'conducta', label: 'Conducta inapropiada con compañeros' },
    { id: 'otro', label: 'Otro (Especificar en Hechos)' }
]

export default function CitatoriosAmonestacionesPage() {
    const [step, setStep] = useState(1) // 1: Select Employee, 2: Details, 3: Preview
    const [employees, setEmployees] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showEmployeeList, setShowEmployeeList] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
    const [companyConfig, setCompanyConfig] = useState<any>(null)

    // Form Data
    const [fechaEmision, setFechaEmision] = useState('')
    const [tipoDoc, setTipoDoc] = useState(TIPOS_DOCUMENTO[0])
    const [motivoRapido, setMotivoRapido] = useState(MOTIVOS_RAPIDOS[0].label)
    const [hechos, setHechos] = useState('')
    const [representante, setRepresentante] = useState('')

    // For Citatorio specifically
    const [fechaCita, setFechaCita] = useState('')
    const [horaCita, setHoraCita] = useState('')
    const [lugarCita, setLugarCita] = useState('Oficina de Recursos Humanos')

    const [generating, setGenerating] = useState(false)
    const previewRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)

    // Using a more compact margin for these lighter documents
    const margins = { top: 2.5, right: 3, bottom: 2.5, left: 3 }

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).html2canvas = html2canvas
        }
        loadData()
    }, [])

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
        updateScale()
        window.addEventListener('resize', updateScale)
        return () => window.removeEventListener('resize', updateScale)
    }, [step])

    async function loadData() {
        const { data: e } = await supabase.from('empleados')
            .select(`
                *,
                empleado_adscripciones (
                    cat_departamentos (departamento)
                )
            `)
            .order('nombre', { ascending: true })
        setEmployees(e || [])

        const { data: config } = await supabase.from('configuracion_empresa').select('*').limit(1).single()
        if (config) {
            setCompanyConfig(config)
        } else {
            const saved = localStorage.getItem('rh_config_empresa')
            if (saved) setCompanyConfig(JSON.parse(saved))
        }

        const now = new Date()
        const isoDate = now.toISOString().split('T')[0]
        setFechaEmision(isoDate)
    }

    const filteredEmpleados = employees.filter(e => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase().trim()
        if (!isNaN(Number(term)) && term !== '') {
            return e.numero_empleado?.toString().includes(term)
        }
        const fullName = `${e.nombre} ${e.apellido_paterno} ${e.apellido_materno || ''}`.toLowerCase()
        return fullName.includes(term)
    }).slice(0, 10)

    const downloadPdf = async () => {
        if (!previewRef.current || generating) return
        setGenerating(true)

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

            await doc.html(element, {
                callback: function (doc) {
                    doc.save(`${tipoDoc.id.charAt(0).toUpperCase() + tipoDoc.id.slice(1)}_${selectedEmployee?.nombre?.replace(/\s+/g, '_') || 'Empleado'}.pdf`)
                    element.style.backgroundColor = origBg
                    element.style.paddingTop = origPt
                    element.style.paddingBottom = origPb
                    restoreElementAfterPdf(element)
                    setGenerating(false)
                },
                x: 0,
                y: 0,
                width: 21.59,
                windowWidth: 816,
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
        setSearchTerm('')
        setHechos('')
        setMotivoRapido(MOTIVOS_RAPIDOS[0].label)
        setRepresentante('')
        setFechaCita('')
        setHoraCita('')
        setLugarCita('Oficina de Recursos Humanos')
    }

    const getFechaLarga = (fechaISO: string) => {
        if (!fechaISO) return ''
        const date = new Date(fechaISO + 'T12:00:00')
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const getFechaCitaFormateada = () => {
        if (!fechaCita) return ''
        const formDate = getFechaLarga(fechaCita)
        const horaStr = horaCita ? ` a las ${horaCita} horas` : ''
        return `${formDate}${horaStr}`
    }

    const depto = selectedEmployee?.empleado_adscripciones?.[0]?.cat_departamentos?.departamento || ''
    const empresa = companyConfig?.nombre_empresa || 'MI EMPRESA S.A. DE C.V.'

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/documentos/herramientas" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h2 className="text-2xl font-bold text-slate-800">Citatorios y Amonestaciones</h2>
            </div>

            {/* Stepper */}
            <div className="flex items-center text-sm font-medium text-zinc-500 mb-8 px-10">
                <span className={`${step >= 1 ? 'text-amber-600' : ''}`}>1. Empleado</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 2 ? 'text-amber-600' : ''}`}>2. Formulario Disciplinario</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 3 ? 'text-amber-600' : ''}`}>3. Vista Previa</span>
            </div>

            {step === 1 && (
                <div className="bg-white p-6 rounded-lg shadow border border-zinc-200 max-w-xl mx-auto min-h-[400px]">
                    <h3 className="font-semibold text-zinc-900 mb-4">Buscar empleado receptor</h3>
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
                                                setSearchTerm(`${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`)
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
                    {selectedEmployee && (
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setStep(2)}
                                className="bg-black text-white px-6 py-2 rounded-md hover:bg-zinc-800 transition-colors text-sm font-medium"
                            >
                                Continuar →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {step === 2 && (
                <div className="bg-white p-6 rounded-lg shadow border border-zinc-200 max-w-3xl mx-auto">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <h3 className="font-semibold text-zinc-900">Detalles Disciplinarios</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de Documento</label>
                                <select
                                    className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border text-zinc-700"
                                    value={tipoDoc.id}
                                    onChange={e => {
                                        const found = TIPOS_DOCUMENTO.find(t => t.id === e.target.value) || TIPOS_DOCUMENTO[0];
                                        setTipoDoc(found);
                                    }}
                                >
                                    {TIPOS_DOCUMENTO.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de Emisión</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} />
                            </div>
                        </div>

                        {tipoDoc.id === 'citatorio' && (
                            <div className="bg-amber-50/50 p-4 border border-amber-200 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de la Cita</label>
                                    <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" value={fechaCita} onChange={e => setFechaCita(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Hora</label>
                                    <input type="time" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" value={horaCita} onChange={e => setHoraCita(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Lugar</label>
                                    <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" placeholder="Ej. Sala de Juntas" value={lugarCita} onChange={e => setLugarCita(e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Motivo (Categoría)</label>
                                <select
                                    className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border text-zinc-700"
                                    value={motivoRapido}
                                    onChange={e => setMotivoRapido(e.target.value)}
                                >
                                    {MOTIVOS_RAPIDOS.map(t => (
                                        <option key={t.id} value={t.label}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre Jefe Directo / RH</label>
                                <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" placeholder="Quien firma el documento" value={representante} onChange={e => setRepresentante(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Descripción de los Hechos</label>
                            <textarea rows={4} className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border resize-y" placeholder="Describe brevemente qué ocurrió, las fechas, las reglas ignoradas o el impacto del comportamiento..." value={hechos} onChange={e => setHechos(e.target.value)} />
                        </div>

                        <div className="flex justify-between pt-6 border-t border-zinc-100">
                            <button onClick={() => setStep(1)} className="text-zinc-600 hover:text-zinc-900 text-sm font-medium">← Volver</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!hechos || !representante || (tipoDoc.id === 'citatorio' && (!fechaCita || !horaCita))}
                                className="bg-black text-white px-6 py-2 rounded-md hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                Previsualizar →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="flex gap-6 min-h-[calc(100vh-200px)] flex-col md:flex-row">
                    {/* Document Preview */}
                    <div ref={containerRef} className="flex-1 bg-zinc-200/50 p-4 md:p-8 flex justify-center overflow-auto items-start min-h-[800px] border border-zinc-200 rounded-lg shadow-inner">
                        <div ref={previewRef}
                            className="bg-white shadow-lg text-black mx-auto flex flex-col relative transition-all"
                            style={{
                                width: '21.59cm',
                                minHeight: '27.94cm',
                                padding: `${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm`,
                                transform: `scale(${scale})`,
                                transformOrigin: 'top center',
                                marginBottom: scale < 1 ? `-${27.94 * (1 - scale)}cm` : '0',
                                fontFamily: 'Arial, Helvetica, sans-serif',
                                fontSize: '13px',
                                lineHeight: '22px'
                            }}
                        >
                            <div className="text-right text-xs text-zinc-600 mb-8 mt-4 flex justify-end gap-1">
                                <span className="font-bold">Lugar y Fecha:</span> <span>A {getFechaLarga(fechaEmision)}</span>
                            </div>

                            <div className="text-center font-bold text-lg mb-8 tracking-wide underline underline-offset-4">
                                {tipoDoc.title}
                            </div>

                            <div className="text-justify space-y-4">
                                <p>
                                    <span className="font-bold">C. {selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno} {selectedEmployee?.apellido_materno}</span><br />
                                    No. de Empleado: {selectedEmployee?.numero_empleado || 'S/N'}<br />
                                    Puesto: {selectedEmployee?.puesto || 'Empleado'}<br />
                                    Departamento: {depto || 'General'}<br />
                                    <span className="font-bold tracking-widest mt-2 block">P R E S E N T E</span>
                                </p>

                                {tipoDoc.id === 'amonestacion' ? (
                                    <>
                                        <p className="mt-6">
                                            Por medio de la presente, la dirección general de <span className="font-bold">{empresa}</span> y el departamento de Recursos Humanos se dirigen a usted para notificarle formalmente una <span className="font-bold">AMONESTACIÓN ESCRITA</span> derivada de un incumplimiento a sus obligaciones laborales estipuladas tanto en su contrato individual de trabajo como en el Reglamento Interior de Trabajo.
                                        </p>
                                        <p>
                                            Lo anterior obedece a los siguientes hechos o motivos registrados: <span className="font-medium underline">{motivoRapido}</span>.
                                        </p>
                                        <div className="px-4 border-l-2 border-zinc-800 my-4 py-2 italic font-medium whitespace-pre-wrap">
                                            {hechos}
                                        </div>
                                        <p>
                                            Es importante enfatizar que este documento tiene como fin primordial exhortarle a rectificar su desempeño/conducta en sus funciones a partir de la recepción de este escrito. Le recordamos amablemente que la reincidencia en faltas o el constante quebranto de la disciplina laboral de la empresa puede derivar en la conformación de Actas Administrativas severas e inclusive configurar causales de despido justificado descritas en el Artículo 47 de la Ley Federal del Trabajo.
                                        </p>
                                        <p>
                                            La empresa confía plenamente en su disposición para encauzar estas áreas de oportunidad y retomar el cumplimiento riguroso de sus labores de manera satisfactoria.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="mt-6">
                                            Por medio de la presente, la representación patronal de <span className="font-bold">{empresa}</span> en el marco de sus facultades de planeación, dirección, y disciplina laboral, se dirige a usted de forma atenta para hacer de su conocimiento el presente <span className="font-bold">CITATORIO DE INVESTIGACIÓN ADMINISTRATIVA</span>.
                                        </p>
                                        <p>
                                            Dicho citatorio obedece a que se requiere esclarecer y recabar formalmente sus declaraciones en torno a posibles irregularidades, omisiones o hechos reportados consistentes en: <span className="font-medium underline">{motivoRapido}</span>.
                                        </p>
                                        <div className="px-4 border-l-2 border-zinc-800 my-4 py-2 italic font-medium whitespace-pre-wrap">
                                            {hechos}
                                        </div>
                                        <p>
                                            Para llevar a cabo tal diligencia, se le requiere imperativamente presentarse de manera puntual el día <span className="font-bold">{getFechaCitaFormateada()}</span> en las instalaciones de <span className="font-bold underline">{lugarCita}</span>.
                                        </p>
                                        <p>
                                            Le reiteramos que como titular de este procedimiento de investigación, la presente reunión es de carácter confidencial e internamente auditada. Por tanto, hacemos de su conocimiento que **la inasistencia injustificada a esta cita administrativa** se considerará una falta al cumplimiento de sus responsabilidades e insubordinación, ateniéndose a las resoluciones jurídicas o disciplinarias que las actas correspondientes determinen por sus ausencias u omisiones en dichos hechos.
                                        </p>
                                    </>
                                )}

                                <p className="mt-10">
                                    Se solicita su <span className="font-bold">FIRMA DE ENTERADO</span> como acuse de recibo de esta notificación.
                                </p>

                                {/* Signatures */}
                                <div className="mt-20 grid grid-cols-2 gap-x-8 gap-y-16 text-center text-sm">
                                    <div className="flex flex-col items-center">
                                        <div className="border-t border-black pt-2 w-full max-w-[250px]">
                                            <span className="font-bold block">Por la Empresa / RH</span>
                                            <span>{representante}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="border-t border-black pt-2 w-full max-w-[250px]">
                                            <span className="font-bold block">Firma de Recibido del Empleado</span>
                                            <span>{selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno} {selectedEmployee?.apellido_materno}</span><br />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="w-full md:w-64 space-y-4 shrink-0">
                        <button
                            onClick={downloadPdf}
                            disabled={generating}
                            className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-lg disabled:opacity-50"
                        >
                            {generating ? 'Generando...' : <><Download className="h-5 w-5" /> Descargar PDF</>}
                        </button>
                        <button onClick={() => setStep(2)} className="w-full py-2 text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg text-sm font-medium bg-white">
                            Modificar Descripción
                        </button>
                        <button onClick={reset} className="w-full py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
                            Descartar y Empezar de Nuevo
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
