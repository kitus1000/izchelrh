'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { prepareElementForPdf, restoreElementAfterPdf } from '@/utils/pdf/sanitizeColors'
import { Search, Download, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const TIPOS_MODIFICACION = [
    { id: 'salario', label: 'Modificación Salarial (Aumento/Ajuste)', prefill: 'El Patrón y el Trabajador acuerdan en modificar la Cláusula relativa al salario estipulada en el contrato primigenio, estableciendo que a partir del inicio de vigencia de este adéndum, el trabajador percibirá un Salario Diario de $ [CANTIDAD] ([CANTIDAD EN LETRA] Pesos 00/100 M.N.), pagadero en los mismos términos y condiciones originales.' },
    { id: 'puesto', label: 'Promoción / Cambio de Puesto', prefill: 'Se modifica la Cláusula respectiva a las funciones y categoría del Trabajador, pactando que a partir de esta fecha pasará a desempeñarse bajo el puesto de [NUEVO PUESTO], asumiendo las responsabilidades inherentes al mismo descritas en el descriptivo de puesto oficial de la empresa.' },
    { id: 'horario', label: 'Cambio de Jornada u Horario', prefill: 'Las partes convienen en modificar la Cláusula correspondiente a la Jornada Laboral, estableciendo que el nuevo horario de labores será de las [HORA INICIO] a las [HORA FIN] horas, de [DÍA] a [DÍA], con [TIEMPO] de descanso para reposo o consumo de alimentos.' },
    { id: 'condiciones', label: 'Cambio de Condiciones Varias', prefill: 'Las partes acuerdan modificar las siguientes condiciones de trabajo: [DESCRIBIR CONDICIÓN]. Las demás cláusulas del contrato original mantienen su plena vigencia legal.' }
]

export default function ModificacionesLaboralesPage() {
    const [step, setStep] = useState(1) // 1: Select Employee, 2: Details, 3: Preview
    const [employees, setEmployees] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showEmployeeList, setShowEmployeeList] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
    const [companyConfig, setCompanyConfig] = useState<any>(null)

    // Form Data
    const [fechaAcuerdo, setFechaAcuerdo] = useState('')
    const [fechaVigencia, setFechaVigencia] = useState('')
    const [tipoModificacion, setTipoModificacion] = useState(TIPOS_MODIFICACION[0])
    const [textoClausula, setTextoClausula] = useState(TIPOS_MODIFICACION[0].prefill)
    const [representante, setRepresentante] = useState('')
    const [motivoGeneral, setMotivoGeneral] = useState('')

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

        const now = new Date()
        const isoDate = now.toISOString().split('T')[0]
        setFechaAcuerdo(isoDate)
        setFechaVigencia(isoDate)
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
                    doc.save(`Adendum_${tipoModificacion.id}_${selectedEmployee?.nombre?.replace(/\s+/g, '_') || 'Empleado'}.pdf`)
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
        setTextoClausula(TIPOS_MODIFICACION[0].prefill)
        setMotivoGeneral('')
        setRepresentante('')
    }

    const getFechaLarga = (fechaISO: string) => {
        if (!fechaISO) return ''
        const date = new Date(fechaISO + 'T12:00:00')
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const depto = selectedEmployee?.empleado_adscripciones?.[0]?.cat_departamentos?.departamento || ''
    const empresa = companyConfig?.nombre_empresa || 'MI EMPRESA S.A. DE C.V.'

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/documentos/herramientas" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h2 className="text-2xl font-bold text-slate-800">Modificaciones Laborales (Adéndums)</h2>
            </div>

            {/* Stepper */}
            <div className="flex items-center text-sm font-medium text-zinc-500 mb-8 px-10">
                <span className={`${step >= 1 ? 'text-emerald-600' : ''}`}>1. Empleado</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 2 ? 'text-emerald-600' : ''}`}>2. Formulario de Convenio</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 3 ? 'text-emerald-600' : ''}`}>3. Vista Previa y Firmas</span>
            </div>

            {step === 1 && (
                <div className="bg-white p-6 rounded-lg shadow border border-zinc-200 max-w-xl mx-auto min-h-[400px]">
                    <h3 className="font-semibold text-zinc-900 mb-4">Buscar empleado para modificar contrato</h3>
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            autoComplete="off"
                            className="block w-full pl-10 rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 border text-zinc-900 bg-white"
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
                                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-emerald-50 border-b border-zinc-50 last:border-0"
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
                        <AlertTriangle className="h-5 w-5 text-emerald-500" />
                        <h3 className="font-semibold text-zinc-900">Detalles del Convenio Modificatorio</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de Celebración del Acuerdo</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" value={fechaAcuerdo} onChange={e => setFechaAcuerdo(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de Inicio de Vigencia</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" value={fechaVigencia} onChange={e => setFechaVigencia(e.target.value)} />
                                <p className="text-xs text-zinc-500 mt-1">A partir de cuándo surte efectos el adéndum.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de Modificación</label>
                                <select
                                    className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border text-zinc-700"
                                    value={tipoModificacion.id}
                                    onChange={e => {
                                        const found = TIPOS_MODIFICACION.find(t => t.id === e.target.value) || TIPOS_MODIFICACION[0];
                                        setTipoModificacion(found);
                                        setTextoClausula(found.prefill);
                                    }}
                                >
                                    {TIPOS_MODIFICACION.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Motivo (Breve)</label>
                                <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" placeholder="Ej. Evaluación de Desempeño" value={motivoGeneral} onChange={e => setMotivoGeneral(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Redacción de la Nueva Cláusula / Acuerdo</label>
                            <textarea rows={5} className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border resize-y" value={textoClausula} onChange={e => setTextoClausula(e.target.value)} />
                            <p className="text-xs mt-2 text-zinc-500">Reemplaza los corchetes [ ] con la información real de este caso específico.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre Representante Legal / Apoderado</label>
                            <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" placeholder="Quien firma por parte de la empresa" value={representante} onChange={e => setRepresentante(e.target.value)} />
                        </div>

                        <div className="flex justify-between pt-6 border-t border-zinc-100">
                            <button onClick={() => setStep(1)} className="text-zinc-600 hover:text-zinc-900 text-sm font-medium">← Volver</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!textoClausula || !representante || !fechaVigencia}
                                className="bg-black text-white px-6 py-2 rounded-md hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                Generar Adendum →
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
                                <span className="font-bold">Lugar y Fecha del Acuerdo:</span> <span>A {getFechaLarga(fechaAcuerdo)}</span>
                            </div>

                            <div className="text-center font-bold text-lg mb-6 uppercase tracking-wide">
                                CONVENIO MODIFICATORIO A LAS CONDICIONES LABORALES (ADENDUM)
                            </div>

                            <div className="text-justify space-y-4">
                                <p>
                                    Convenio Adicional Modificatorio al Contrato Individual de Trabajo que celebran por una parte <span className="font-bold">{empresa}</span> representada en este acto por <span className="font-bold">{representante}</span> a quien en lo sucesivo se le denominará &quot;LA EMPRESA&quot;, y por otra parte el/la C. <span className="font-bold">{selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno} {selectedEmployee?.apellido_materno}</span>, a quien en lo sucesivo se le denominará &quot;EL TRABAJADOR&quot;, al tenor de las siguientes Declaraciones y Cláusulas.
                                </p>

                                <div className="text-center font-bold mt-6 mb-2">D E C L A R A C I O N E S</div>

                                <p>
                                    <span className="font-bold">I. DECLARA LA EMPRESA:</span> Que reconoce a EL TRABAJADOR como empleado activo y formal de su nómina, con expediente registrado No. {selectedEmployee?.numero_empleado || 'S/N'} al cual se le han respetado desde su fecha de ingreso todos sus derechos laborales y ha desempeñado funciones formalmente en el departamento de {depto || 'General'}, bajo el puesto general inicial de {selectedEmployee?.puesto || 'Empleado'}.
                                </p>
                                <p>
                                    <span className="font-bold">II. DECLARA EL TRABAJADOR:</span> Que en uso de la palabra y bajo su libre autonomía, manifiesta su pleno y total acuerdo de celebrar el presente Adendum modificatorio al Contrato Individual original {motivoGeneral ? `con motivo de: ${motivoGeneral}.` : `para efecto de actualizar sus condiciones.`}
                                </p>

                                <div className="text-center font-bold mt-6 mb-2">C L Á U S U L A S</div>

                                <p>
                                    <span className="font-bold">PRIMERA (NUEVA REDACCIÓN).-</span> {textoClausula}
                                </p>

                                <p>
                                    <span className="font-bold">SEGUNDA (VIGENCIA).-</span> Ambas partes acuerdan indubitablemente que las modificaciones detalladas en la cláusula anterior surtirán efectos técnicos, legales y ejecutivos a partir del día <span className="font-bold">{getFechaLarga(fechaVigencia)}</span>.
                                </p>

                                <p>
                                    <span className="font-bold">TERCERA (MANTENIMIENTO DEL NEXO).-</span> EL TRABAJADOR y LA EMPRESA convienen de forma manifiesta que este adendum constituye única y exclusivamente una modificación parcial relativa a las estipulaciones detalladas en la cláusula primera arriba listada, dejando expresa constancia que el Contrato Individual de Trabajo principal subyacente sigue surtiendo plenos efectos para todos los lineamientos, responsabilidades patronales, operativas y condiciones que no hayan sido modificadas o abordadas expresamente en este acto jurídico, con estricto apego a derecho y salvaguardando los derechos primigenios inalienables estipulados por la Ley Federal de Trabajo en favor del trabajador.
                                </p>

                                <p>
                                    Leído y comprendiendo el alcance ético y legal de este documento modificatorio, siendo conformes en que no existió en su celebración ningún vicio en el consentimiento, dolo, fraude ni coerción, firman el presente convenio las partes que en el intervienen de plena voluntad el día de su celebración.
                                </p>

                                <div className="mt-14 font-bold text-center tracking-widest">A T E N T A M E N T E</div>

                                {/* Signatures */}
                                <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-16 text-center text-sm">
                                    <div className="flex flex-col items-center">
                                        <div className="border-t border-black pt-2 w-full max-w-[250px]">
                                            <span className="font-bold block">Por la Empresa</span>
                                            <span>{representante}</span><br />
                                            <span className="text-xs font-normal">Representante Patronal</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="border-t border-black pt-2 w-full max-w-[250px]">
                                            <span className="font-bold block">Por el Trabajador</span>
                                            <span>{selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno} {selectedEmployee?.apellido_materno}</span><br />
                                            <span className="text-xs font-normal">Manifiesto mi entera conformidad</span>
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
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-lg disabled:opacity-50"
                        >
                            {generating ? 'Generando...' : <><Download className="h-5 w-5" /> Descargar PDF</>}
                        </button>
                        <button onClick={() => setStep(2)} className="w-full py-2 text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg text-sm font-medium bg-white">
                            Modificar Condiciones
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
