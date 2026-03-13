'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { prepareElementForPdf, restoreElementAfterPdf } from '@/utils/pdf/sanitizeColors'
import { Search, Download, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const ARTICULOS_LFT = [
    { id: 'art47_II', texto: 'Art. 47 Fracción II - Incurrir el trabajador, durante sus labores, en faltas de probidad u honradez, en actos de violencia, amagos, injurias o malos tratamientos en contra del patrón, sus familiares o del personal directivo o administrativo de la empresa o establecimiento.' },
    { id: 'art47_XI', texto: 'Art. 47 Fracción XI - Desobedecer el trabajador al patrón o a sus representantes, sin causa justificada, siempre que se trate del trabajo contratado.' },
    { id: 'art47_X', texto: 'Art. 47 Fracción X - Tener el trabajador más de tres faltas de asistencia en un período de treinta días, sin permiso del patrón o sin causa justificada.' },
    { id: 'art47_XV', texto: 'Art. 47 Fracción XV - Las análogas a las establecidas en las fracciones anteriores, de igual manera graves y de consecuencias semejantes en lo que al trabajo se refiere.' },
    { id: 'ninguno', texto: 'Otro / Sin especificar (Redactado en los sucesos)' }
]

export default function ActaAdministrativaPage() {
    const [step, setStep] = useState(1) // 1: Select Employee, 2: Details, 3: Preview
    const [employees, setEmployees] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showEmployeeList, setShowEmployeeList] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
    const [companyConfig, setCompanyConfig] = useState<any>(null)

    // Form Data
    const [fechaHechos, setFechaHechos] = useState('')
    const [horaHechos, setHoraHechos] = useState('')
    const [lugarHechos, setLugarHechos] = useState('')
    const [sucesos, setSucesos] = useState('')
    const [declaracion, setDeclaracion] = useState('')
    const [fundamento, setFundamento] = useState(ARTICULOS_LFT[0].texto)
    const [testigo1, setTestigo1] = useState('')
    const [testigo2, setTestigo2] = useState('')
    const [representante, setRepresentante] = useState('')

    const [generating, setGenerating] = useState(false)
    const previewRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)

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

        // Set default date/time
        const now = new Date()
        setFechaHechos(now.toISOString().split('T')[0])
        setHoraHechos(now.toTimeString().slice(0, 5))
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
                    doc.save(`Acta_Administrativa_${selectedEmployee?.nombre?.replace(/\s+/g, '_') || 'Empleado'}.pdf`)
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
        setSucesos('')
        setDeclaracion('')
        setTestigo1('')
        setTestigo2('')
        setRepresentante('')
    }

    const getFechaLarga = (fechaISO: string) => {
        if (!fechaISO) return ''
        const date = new Date(fechaISO + 'T12:00:00') // avoid timezone shift
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const depto = selectedEmployee?.empleado_adscripciones?.[0]?.cat_departamentos?.departamento || ''
    const empresa = companyConfig?.nombre_empresa || 'MI EMPRESA S.A. DE C.V.'

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Generar Acta Administrativa</h2>

            {/* Stepper */}
            <div className="flex items-center text-sm font-medium text-zinc-500 mb-8">
                <span className={`${step >= 1 ? 'text-amber-600' : ''}`}>1. Empleado</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 2 ? 'text-amber-600' : ''}`}>2. Formulario de Hechos</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 3 ? 'text-amber-600' : ''}`}>3. Vista Previa y PDF</span>
            </div>

            {step === 1 && (
                <div className="bg-white p-6 rounded-lg shadow border border-zinc-200 max-w-xl mx-auto min-h-[400px]">
                    <h3 className="font-semibold text-zinc-900 mb-4">Buscar Empleado Implicado</h3>
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
                        <h3 className="font-semibold text-zinc-900">Detalles del Acta Administrativa</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de los Hechos</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" value={fechaHechos} onChange={e => setFechaHechos(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Hora Aproximada</label>
                                <input type="time" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" value={horaHechos} onChange={e => setHoraHechos(e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Lugar de los Hechos</label>
                                <input type="text" placeholder="Ej. Área de producción, Almacén, etc." className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" value={lugarHechos} onChange={e => setLugarHechos(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Descripción de los Sucesos (Hechos)</label>
                            <textarea rows={5} className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border resize-y" placeholder="Describe detalladamente lo ocurrido..." value={sucesos} onChange={e => setSucesos(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Fundamento Legal (LFT)</label>
                            <select className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border text-zinc-700" value={fundamento} onChange={e => setFundamento(e.target.value)}>
                                {ARTICULOS_LFT.map(art => (
                                    <option key={art.id} value={art.texto}>{art.texto}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Declaración del Empleado (Opcional)</label>
                            <textarea rows={3} className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border resize-y" placeholder="Si el empleado rinde declaración, escríbela aquí. Si se niega, déjalo en blanco." value={declaracion} onChange={e => setDeclaracion(e.target.value)} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
                            <div className="md:col-span-2">
                                <h4 className="text-sm font-semibold text-zinc-800 mb-2">Firmantes y Testigos</h4>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Representante de la Empresa / Jefe</label>
                                <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" placeholder="Nombre de quien levanta el acta" value={representante} onChange={e => setRepresentante(e.target.value)} />
                            </div>
                            <div className="hidden md:block"></div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Testigo 1</label>
                                <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" placeholder="Nombre completo" value={testigo1} onChange={e => setTestigo1(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Testigo 2</label>
                                <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border" placeholder="Nombre completo" value={testigo2} onChange={e => setTestigo2(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex justify-between pt-6 border-t border-zinc-100">
                            <button onClick={() => setStep(1)} className="text-zinc-600 hover:text-zinc-900 text-sm font-medium">← Volver</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!sucesos || !lugarHechos || !representante || !testigo1}
                                className="bg-black text-white px-6 py-2 rounded-md hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                Generar Vista Previa →
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
                                fontSize: '14px',
                                lineHeight: '1.5'
                            }}
                        >
                            <div className="text-center font-bold text-lg mb-8 uppercase tracking-wide border-b-2 border-zinc-900 pb-4">
                                Acta Administrativa Laboral
                            </div>

                            <div className="text-justify space-y-4">
                                <p>
                                    En la ciudad/localidad a los <strong>{new Date().getDate()}</strong> días del mes de <strong>{new Date().toLocaleDateString('es-MX', { month: 'long' })}</strong> del año <strong>{new Date().getFullYear()}</strong>, siendo las <strong>{new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} horas</strong>, se reúnen en las instalaciones de <strong>{empresa}</strong> ubicadas en el área de <strong>{lugarHechos}</strong>, las siguientes personas:
                                </p>

                                <p>
                                    El/La C. <strong>{representante}</strong>, en su carácter de representante de la empresa; el/la C. <strong>{selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno} {selectedEmployee?.apellido_materno}</strong>, quien desempeña el puesto de <strong>{selectedEmployee?.puesto || 'Empleado'}</strong> adscrito al departamento de <strong>{depto || 'General'}</strong>; y los CC. <strong>{testigo1}</strong> y <strong>{testigo2 || '___________________'}</strong>, quienes actúan como testigos de asistencia, con el propósito de levantar la presente ACTA ADMINISTRATIVA, de conformidad con los siguientes:
                                </p>

                                <div className="text-center font-bold uppercase mt-6 mb-2">H E C H O S</div>

                                <p className="whitespace-pre-wrap">
                                    Que el día <strong>{getFechaLarga(fechaHechos)}</strong>, siendo aproximadamente las <strong>{horaHechos} horas</strong>, ocurrieron los siguientes sucesos:
                                </p>
                                <p className="whitespace-pre-wrap pl-4 border-l-2 border-zinc-300 italic my-4 text-zinc-800">
                                    {sucesos}
                                </p>

                                {declaracion && (
                                    <>
                                        <div className="text-center font-bold uppercase mt-6 mb-2">D E C L A R A C I Ó N</div>
                                        <p>En uso de la palabra, el trabajador manifiesta lo siguiente:</p>
                                        <p className="whitespace-pre-wrap pl-4 border-l-2 border-zinc-300 italic my-4 text-zinc-800">
                                            "{declaracion}"
                                        </p>
                                    </>
                                )}
                                {!declaracion && (
                                    <p className="mt-4">
                                        Habiendo sido notificado de los hechos que se le imputan, el trabajador se reserva su derecho a rendir declaración (o se niega a formularla).
                                    </p>
                                )}

                                <div className="text-center font-bold uppercase mt-6 mb-2">F U N D A M E N T O &nbsp; L E G A L</div>

                                {fundamento !== 'Otro / Sin especificar (Redactado en los sucesos)' && (
                                    <p>
                                        Los hechos descritos con anterioridad constituyen una violación al Contrato Colectivo / Individual de Trabajo y Reglamento Interior de Trabajo, encuadrando dichos actos en lo establecido por la Ley Federal del Trabajo en su:
                                    </p>
                                )}
                                <p className="font-semibold text-center mt-2 px-8">
                                    {fundamento}
                                </p>

                                <p className="mt-6">
                                    Por lo anterior, se levanta la presente acta administrativa para dejar constancia de los hechos y para los efectos legales y administrativos a que haya lugar, sirviendo este documento como antecedente en el expediente laboral del trabajador.
                                </p>

                                <p className="mt-4">
                                    No habiendo más hechos que asentar, se da por concluida la presente acta administrativa, previa lectura de la misma, firmando al margen y al calce los que en ella intervinieron.
                                </p>

                                {/* Signatures */}
                                <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-16 text-center text-sm">
                                    <div>
                                        <div className="border-t border-black pt-2 max-w-[200px] mx-auto">
                                            <strong>Por la Empresa</strong><br />
                                            {representante}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="border-t border-black pt-2 max-w-[200px] mx-auto">
                                            <strong>El Trabajador</strong><br />
                                            {selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="border-t border-black pt-2 max-w-[200px] mx-auto">
                                            <strong>Testigo 1</strong><br />
                                            {testigo1}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="border-t border-black pt-2 max-w-[200px] mx-auto">
                                            <strong>Testigo 2</strong><br />
                                            {testigo2 || '___________________'}
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
                            className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors shadow-lg disabled:opacity-50"
                        >
                            {generating ? 'Generando...' : <><Download className="h-5 w-5" /> Descargar PDF</>}
                        </button>
                        <button onClick={() => setStep(2)} className="w-full py-2 text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg text-sm font-medium bg-white">
                            Modificar Datos
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
