'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { prepareElementForPdf, restoreElementAfterPdf } from '@/utils/pdf/sanitizeColors'
import { Search, Download, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function RenunciasVoluntariasPage() {
    const [step, setStep] = useState(1) // 1: Select Employee, 2: Details, 3: Preview
    const [employees, setEmployees] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showEmployeeList, setShowEmployeeList] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
    const [companyConfig, setCompanyConfig] = useState<any>(null)

    // Form Data
    const [fechaRenuncia, setFechaRenuncia] = useState('')
    const [fechaUltimoDia, setFechaUltimoDia] = useState('')
    const [motivo, setMotivo] = useState('Por convenir así a mis intereses personales y profesionales.')
    const [incluyeFiniquito, setIncluyeFiniquito] = useState(true)

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
        setFechaRenuncia(isoDate)
        setFechaUltimoDia(isoDate)
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
                    doc.save(`Renuncia_${selectedEmployee?.nombre?.replace(/\s+/g, '_') || 'Empleado'}.pdf`)
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
        setMotivo('Por convenir así a mis intereses personales y profesionales.')
        setIncluyeFiniquito(true)
    }

    const getFechaLarga = (fechaISO: string) => {
        if (!fechaISO) return ''
        const date = new Date(fechaISO + 'T12:00:00')
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const empresa = companyConfig?.nombre_empresa || 'MI EMPRESA S.A. DE C.V.'

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/documentos/herramientas" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h2 className="text-2xl font-bold text-slate-800">Renuncias Voluntarias</h2>
            </div>

            {/* Stepper */}
            <div className="flex items-center text-sm font-medium text-zinc-500 mb-8 px-10">
                <span className={`${step >= 1 ? 'text-indigo-600' : ''}`}>1. Empleado</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 2 ? 'text-indigo-600' : ''}`}>2. Datos de Renuncia</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 3 ? 'text-indigo-600' : ''}`}>3. Vista Previa</span>
            </div>

            {step === 1 && (
                <div className="bg-white p-6 rounded-lg shadow border border-zinc-200 max-w-xl mx-auto min-h-[400px]">
                    <h3 className="font-semibold text-zinc-900 mb-4">Buscar empleado renunciante</h3>
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            autoComplete="off"
                            className="block w-full pl-10 rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border text-zinc-900 bg-white"
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
                                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 border-b border-zinc-50 last:border-0"
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
                        <AlertTriangle className="h-5 w-5 text-indigo-500" />
                        <h3 className="font-semibold text-zinc-900">Formulario de Carta de Renuncia</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de Emisión de la Carta</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" value={fechaRenuncia} onChange={e => setFechaRenuncia(e.target.value)} />
                                <p className="text-xs text-zinc-500 mt-1">Fecha en la que firma u otorga el documento.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha del Último Día de Labores</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" value={fechaUltimoDia} onChange={e => setFechaUltimoDia(e.target.value)} />
                                <p className="text-xs text-zinc-500 mt-1">Cuándo surtirá efectos la renuncia.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Motivo Expreso (Opcional)</label>
                            <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" value={motivo} onChange={e => setMotivo(e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-2 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={incluyeFiniquito}
                                    onChange={e => setIncluyeFiniquito(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-zinc-800">Incluir Cláusula de Finiquito y Exoneración</span>
                            </label>
                            <p className="text-xs text-zinc-500 ml-7">Agrega un párrafo legal donde el trabajador reconoce que no deja adeudos, eximiendo a la empresa de responsabilidad futura, asumiendo su renuncia bajo los artículos de la LFT.</p>
                        </div>

                        <div className="flex justify-between pt-6 border-t border-zinc-100">
                            <button onClick={() => setStep(1)} className="text-zinc-600 hover:text-zinc-900 text-sm font-medium">← Volver</button>
                            <button
                                onClick={() => setStep(3)}
                                className="bg-black text-white px-6 py-2 rounded-md hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                Generar Carta →
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
                                lineHeight: '22px'
                            }}
                        >
                            <div className="text-right text-xs text-zinc-600 mb-12 mt-4 flex justify-end gap-1">
                                <span className="font-bold">Lugar y Fecha:</span> <span>A {getFechaLarga(fechaRenuncia)}</span>
                            </div>

                            <div className="text-justify space-y-6">
                                <p>
                                    <span className="font-bold">{empresa}</span><br />
                                    A QUIEN CORRESPONDA:<br />
                                    <span className="font-bold tracking-widest mt-2 block">P R E S E N T E</span>
                                </p>

                                <p className="mt-8">
                                    Por medio del presente escrito formalizo y presento ante ustedes mi <span className="font-bold">RENUNCIA VOLUNTARIA E IRREVOCABLE</span> al puesto que venía desempeñando en esta empresa como <span className="font-bold">{selectedEmployee?.puesto || 'Empleado'}</span>, surtiendo efectos a partir del día <span className="font-bold">{getFechaLarga(fechaUltimoDia)}</span>.
                                </p>

                                <p>
                                    La decisión de terminar la relación laboral que me unía a la empresa obedece a razones estrictamente personales; <span className="italic">{motivo}</span>
                                </p>

                                {incluyeFiniquito && (
                                    <>
                                        <p>
                                            Así mismo, manifiesto expresamente que durante el tiempo que presté mis servicios a esta empresa <span className="font-bold">siempre me fueron pagados oportunamente y en su totalidad los salarios y prestaciones a los que tuve derecho</span>, aguinaldo, vacaciones, prima vacacional, prima dominical, y utilidades, no existiendo a la fecha adeudo alguno a mi favor por ningún concepto.
                                        </p>
                                        <p>
                                            Declaro expresamente que jamás sufrí accidente de trabajo ni enfermedad profesional laguna; por tal motivo, por este conducto otorgo a la empresa el recibo más amplio y eficaz que en derecho proceda, no reservándome acción ni derecho alguno en contra de <span className="font-bold">{empresa}</span>, sus representantes ni autoridades, dejando a los mismos exonerados ante cualquier Junta de Conciliación y Arbitraje o Tribunal Laboral, liberándolos de toda responsabilidad futura en virtud de la terminación voluntaria de la relación laboral prevista en la fracción I del Artículo 53 de la Ley Federal del Trabajo.
                                        </p>
                                    </>
                                )}

                                <p className="mt-6">
                                    Agradezco cumplidamente la confianza y la oportunidad brindada durante el tiempo que estuve a sus apreciables órdenes.
                                </p>

                                {/* Signatures */}
                                <div className="mt-24 text-center text-sm flex justify-center">
                                    <div className="flex flex-col items-center">
                                        <div className="border-t border-black pt-2 w-full min-w-[300px]">
                                            <span className="font-bold block tracking-widest uppercase">Atentamente</span>
                                            <span className="block mt-12">{selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno} {selectedEmployee?.apellido_materno}</span><br />
                                            <span className="text-xs font-normal">Renunciante</span>
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
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50"
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
