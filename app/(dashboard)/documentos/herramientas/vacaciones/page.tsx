'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { prepareElementForPdf, restoreElementAfterPdf } from '@/utils/pdf/sanitizeColors'
import { Search, Download, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SolicitudVacacionesPage() {
    const [step, setStep] = useState(1) // 1: Select Employee, 2: Details, 3: Preview
    const [employees, setEmployees] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showEmployeeList, setShowEmployeeList] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
    const [companyConfig, setCompanyConfig] = useState<any>(null)

    // Form Data
    const [fechaSolicitud, setFechaSolicitud] = useState('')
    const [periodoCorrespondiente, setPeriodoCorrespondiente] = useState('')
    const [diasSolicitados, setDiasSolicitados] = useState('')
    const [fechaInicio, setFechaInicio] = useState('')
    const [fechaFin, setFechaFin] = useState('')
    const [fechaReincorporacion, setFechaReincorporacion] = useState('')
    const [diasRestantes, setDiasRestantes] = useState('')
    const [jefeDirecto, setJefeDirecto] = useState('')
    const [observaciones, setObservaciones] = useState('')

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

        // Set default date
        const now = new Date()
        setFechaSolicitud(now.toISOString().split('T')[0])
        setPeriodoCorrespondiente((now.getFullYear() - 1) + '-' + now.getFullYear())
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
                    doc.save(`Vacaciones_${selectedEmployee?.nombre?.replace(/\s+/g, '_') || 'Empleado'}.pdf`)
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
        setDiasSolicitados('')
        setFechaInicio('')
        setFechaFin('')
        setFechaReincorporacion('')
        setDiasRestantes('')
        setJefeDirecto('')
        setObservaciones('')
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
            <div className="flex items-center gap-4">
                <Link href="/documentos/herramientas" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h2 className="text-2xl font-bold text-slate-800">Solicitud de Vacaciones</h2>
            </div>

            {/* Stepper */}
            <div className="flex items-center text-sm font-medium text-zinc-500 mb-8 px-10">
                <span className={`${step >= 1 ? 'text-emerald-600' : ''}`}>1. Empleado</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 2 ? 'text-emerald-600' : ''}`}>2. Formulario de Periodo</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 3 ? 'text-emerald-600' : ''}`}>3. Vista Previa y PDF</span>
            </div>

            {step === 1 && (
                <div className="bg-white p-6 rounded-lg shadow border border-zinc-200 max-w-xl mx-auto min-h-[400px]">
                    <h3 className="font-semibold text-zinc-900 mb-4">Buscar empleado solicitante</h3>
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
                        <h3 className="font-semibold text-zinc-900">Detalles del Periodo Vacacional</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de Solicitud</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" value={fechaSolicitud} onChange={e => setFechaSolicitud(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Periodo Correspondiente</label>
                                <input type="text" placeholder="Ej. 2023-2024" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" value={periodoCorrespondiente} onChange={e => setPeriodoCorrespondiente(e.target.value)} />
                                <p className="text-xs text-zinc-500 mt-1">El o los años de ejercicio que está reclamando.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Días a Disfrutar</label>
                                <input type="number" min="1" placeholder="Ej. 6" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" value={diasSolicitados} onChange={e => setDiasSolicitados(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Días Restantes Pendientes</label>
                                <input type="number" min="0" placeholder="Ej. 2" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" value={diasRestantes} onChange={e => setDiasRestantes(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Días Restantes Pendientes</label>
                                <div className="text-xs mt-2 text-zinc-500">¿Le sobran días después de estos? (Opcional)</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de Inicio</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Último Día de Vacaciones</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha Reincorporación</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" value={fechaReincorporacion} onChange={e => setFechaReincorporacion(e.target.value)} />
                                <p className="text-xs text-zinc-500 mt-1">Día que debe volver a sus labores normales.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre Jefe Directo / Autoriza</label>
                            <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" placeholder="Quien firma la autorización" value={jefeDirecto} onChange={e => setJefeDirecto(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Observaciones (Opcional)</label>
                            <textarea rows={2} className="w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border resize-y" placeholder="Acuerdos especiales o notas sobre el pago de prima vacacional..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                        </div>

                        <div className="flex justify-between pt-6 border-t border-zinc-100">
                            <button onClick={() => setStep(1)} className="text-zinc-600 hover:text-zinc-900 text-sm font-medium">← Volver</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!diasSolicitados || !fechaInicio || !fechaFin || !fechaReincorporacion || !jefeDirecto}
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
                                lineHeight: '22px'
                            }}
                        >
                            <div className="text-right text-xs text-zinc-600 mb-8 mt-4">
                                <strong>Fecha de Solicitud:</strong> {getFechaLarga(fechaSolicitud)}
                            </div>

                            <div className="text-center font-bold text-xl mb-10 uppercase tracking-wide border-b border-zinc-400 pb-4">
                                SOLICITUD Y CONSTANCIA DE VACACIONES
                            </div>

                            <div className="text-justify space-y-6">
                                <p>
                                    A quien corresponda del departamento de Recursos Humanos de <strong>{empresa}</strong>:
                                </p>
                                <p>
                                    Por medio de la presente carta, yo <strong>{selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno} {selectedEmployee?.apellido_materno}</strong>, identificado corporativamente con el número de empleado <strong>{selectedEmployee?.numero_empleado || 'S/N'}</strong>, quien desarrolla sus labores en el departamento de <strong>{depto || 'General'}</strong> ocupando el puesto de <strong>{selectedEmployee?.puesto || 'Empleado'}</strong>, solicito formalmente el disfrute del periodo de descanso vacacional continuo correspondiente a mis años de servicio.
                                </p>

                                <div className="my-8 px-10">
                                    <table className="w-full text-sm border-collapse border border-zinc-400 max-w-lg mx-auto">
                                        <tbody>
                                            {periodoCorrespondiente && (
                                                <tr>
                                                    <td className="border border-zinc-400 p-3 font-bold bg-zinc-100 w-1/2">Periodo Correspondiente</td>
                                                    <td className="border border-zinc-400 p-3 text-center">{periodoCorrespondiente}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td className="border border-zinc-400 p-3 font-bold bg-zinc-100">Días a disfrutar</td>
                                                <td className="border border-zinc-400 p-3 text-center">{diasSolicitados}</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-zinc-400 p-3 font-bold bg-zinc-100">Fecha de Inicio</td>
                                                <td className="border border-zinc-400 p-3 text-center font-medium bg-green-50/50">{getFechaLarga(fechaInicio)}</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-zinc-400 p-3 font-bold bg-zinc-100">Último día de vacaciones</td>
                                                <td className="border border-zinc-400 p-3 text-center">{getFechaLarga(fechaFin)}</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-zinc-400 p-3 font-bold bg-zinc-100">Día de Reincorporación</td>
                                                <td className="border border-zinc-400 p-3 text-center font-bold">{getFechaLarga(fechaReincorporacion)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <p>
                                    Se hace constar que estos <strong>{diasSolicitados}</strong> días de vacaciones conferidos me son otorgados con goce de sueldo íntegro. Así mismo, la prima vacacional proporcional a los días disfrutados según la Ley Federal de Trabajo en su artículo 80 se procesará y pagará conforme a los criterios de la nómina correspondientes.
                                </p>

                                {diasRestantes && diasRestantes !== '0' && (
                                    <p className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/30">
                                        Queda asentado que después de disfrutar el presente periodo otorgado, existe un saldo restante a mi favor de <strong>{diasRestantes}</strong> días correspondientes al mismo ejercicio. Estos días podré gozarlos posteriormente previo acuerdo con la empresa cumpliendo las políticas vigentes de antelación.
                                    </p>
                                )}

                                {observaciones && (
                                    <p>
                                        <strong>Observaciones Adicionales:</strong> {observaciones}
                                    </p>
                                )}

                                <p className="mt-8 text-sm">
                                    Sirva este documento como comprobante a disposición de la autoridad patronal y del trabajador que lo firma para salvaguardar sus derechos, firmando alcance todos y cada uno de los involucrados manifestando su plena autorización y entendimiento.
                                </p>

                                {/* Signatures */}
                                <div className="mt-16 grid grid-cols-3 gap-x-4 gap-y-16 text-center text-sm">
                                    <div>
                                        <div className="border-t border-black pt-2 w-full max-w-[200px] mx-auto">
                                            <strong>FIRMA DEL TRABAJADOR</strong><br />
                                            {selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="border-t border-black pt-2 w-full max-w-[200px] mx-auto">
                                            <strong>AUTORIZACIÓN / JEFE</strong><br />
                                            {jefeDirecto}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="border-t border-black pt-2 w-full max-w-[200px] mx-auto">
                                            <strong>RECURSOS HUMANOS / NÓMINA</strong><br />
                                            (Enterado)
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
                            Modificar Fechas
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
