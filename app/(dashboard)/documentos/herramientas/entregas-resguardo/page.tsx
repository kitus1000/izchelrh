'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { prepareElementForPdf, restoreElementAfterPdf } from '@/utils/pdf/sanitizeColors'
import { Search, Download, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const TIPOS_EQUIPO = [
    'Laptop / Computadora',
    'Teléfono Celular',
    'Vehículo / Automóvil',
    'Herramientas Especializadas',
    'Uniforme / EPP',
    'Radio / Comunicación',
    'Llaves / Tarjetas de Acceso',
    'Otro'
]

const ESTADOS_FISICOS = [
    'Nuevo',
    'Excelente (Usado)',
    'Bueno (Con desgaste normal)',
    'Regular (Con daños visibles menores)'
]

export default function EntregasResguardoPage() {
    const [step, setStep] = useState(1) // 1: Select Employee, 2: Details, 3: Preview
    const [employees, setEmployees] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showEmployeeList, setShowEmployeeList] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
    const [companyConfig, setCompanyConfig] = useState<any>(null)

    // Form Data
    const [fechaEntrega, setFechaEntrega] = useState('')
    const [tipoEquipo, setTipoEquipo] = useState(TIPOS_EQUIPO[0])
    const [marca, setMarca] = useState('')
    const [modelo, setModelo] = useState('')
    const [numeroSerie, setNumeroSerie] = useState('')
    const [estadoFisico, setEstadoFisico] = useState(ESTADOS_FISICOS[0])
    const [accesorios, setAccesorios] = useState('')
    const [valorAproximado, setValorAproximado] = useState('')
    const [observaciones, setObservaciones] = useState('')
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

        // Set default date
        const now = new Date()
        setFechaEntrega(now.toISOString().split('T')[0])
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
                    doc.save(`Responsiva_Resguardo_${selectedEmployee?.nombre?.replace(/\s+/g, '_') || 'Empleado'}.pdf`)
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
        setMarca('')
        setModelo('')
        setNumeroSerie('')
        setAccesorios('')
        setValorAproximado('')
        setObservaciones('')
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
            <div className="flex items-center gap-4">
                <Link href="/documentos/herramientas" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h2 className="text-2xl font-bold text-slate-800">Formatos de Entrega y Resguardo</h2>
            </div>

            {/* Stepper */}
            <div className="flex items-center text-sm font-medium text-zinc-500 mb-8 px-10">
                <span className={`${step >= 1 ? 'text-blue-600' : ''}`}>1. Empleado</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 2 ? 'text-blue-600' : ''}`}>2. Formulario del Equipo</span>
                <span className="mx-2">→</span>
                <span className={`${step >= 3 ? 'text-blue-600' : ''}`}>3. Vista Previa y PDF</span>
            </div>

            {step === 1 && (
                <div className="bg-white p-6 rounded-lg shadow border border-zinc-200 max-w-xl mx-auto min-h-[400px]">
                    <h3 className="font-semibold text-zinc-900 mb-4">Buscar a quien se entrega el resguardo</h3>
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            autoComplete="off"
                            className="block w-full pl-10 rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border text-zinc-900 bg-white"
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
                                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 border-b border-zinc-50 last:border-0"
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
                        <AlertTriangle className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold text-zinc-900">Detalles del Equipo o Material en Resguardo</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de Entrega</label>
                                <input type="date" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de Equipo/Material</label>
                                <select className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-zinc-700" value={tipoEquipo} onChange={e => setTipoEquipo(e.target.value)}>
                                    {TIPOS_EQUIPO.map(tipo => (
                                        <option key={tipo} value={tipo}>{tipo}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Marca</label>
                                <input type="text" placeholder="Ej. Dell, Toyota, Truper" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" value={marca} onChange={e => setMarca(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Modelo o Especificación</label>
                                <input type="text" placeholder="Ej. Latitude 5420, Corolla 2023" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" value={modelo} onChange={e => setModelo(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Número de Serie / Placas (Opcional)</label>
                                <input type="text" placeholder="Número identificador único" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Estado Físico</label>
                                <select className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-zinc-700" value={estadoFisico} onChange={e => setEstadoFisico(e.target.value)}>
                                    {ESTADOS_FISICOS.map(estado => (
                                        <option key={estado} value={estado}>{estado}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Accesorios o Componentes Incluidos (Opcional)</label>
                            <textarea rows={2} className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border resize-y" placeholder="Ej. Cargador original, funda protectora, ratón inalámbrico..." value={accesorios} onChange={e => setAccesorios(e.target.value)} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Valor Aproximado Comercial (MXN) (Opcional)</label>
                                <input type="text" placeholder="Ej. $15,000.00" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" value={valorAproximado} onChange={e => setValorAproximado(e.target.value)} />
                                <p className="text-xs text-zinc-500 mt-1">Sugerido para sustentar requerimientos de pagos por daños o pérdida.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre quien entrega (Jefe/Sistemas/RH)</label>
                                <input type="text" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" placeholder="Nombre de quien autoriza entrega" value={representante} onChange={e => setRepresentante(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Observaciones Adicionales (Opcional)</label>
                            <textarea rows={2} className="w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border resize-y" placeholder="Notas sobre el trato, raspones pre-existentes, o condiciones especiales de devolución." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                        </div>

                        <div className="flex justify-between pt-6 border-t border-zinc-100">
                            <button onClick={() => setStep(1)} className="text-zinc-600 hover:text-zinc-900 text-sm font-medium">← Volver</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!marca || !modelo || !representante}
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
                            <div className="text-right text-xs text-zinc-600 mb-4">
                                <strong>Lugar y Fecha:</strong> A {getFechaLarga(fechaEntrega)}
                            </div>

                            <div className="text-center font-bold text-lg mb-8 uppercase tracking-wide border-b-2 border-zinc-900 pb-4">
                                CARTA RESPONSIVA DE ASIGNACIÓN Y RESGUARDO DE EQUIPO
                            </div>

                            <div className="text-justify space-y-4">
                                <p>
                                    A quien corresponda:
                                </p>
                                <p>
                                    Sirva la presente para hacer constar que con esta fecha, la empresa <strong>{empresa}</strong>, hace entrega al C. <strong>{selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno} {selectedEmployee?.apellido_materno}</strong>, quien se desempeña como <strong>{selectedEmployee?.puesto || 'Empleado'}</strong> adscrito al departamento de <strong>{depto || 'General'}</strong>, del equipo y/o material que se describe a continuación, para su uso exclusivo en el cumplimiento de las labores inherentes a su puesto:
                                </p>

                                <div className="my-6 px-10">
                                    <table className="w-full text-sm border-collapse border border-zinc-400">
                                        <tbody>
                                            <tr>
                                                <td className="border border-zinc-400 p-2 font-bold bg-zinc-100 w-1/3">Tipo de Equipo</td>
                                                <td className="border border-zinc-400 p-2">{tipoEquipo}</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-zinc-400 p-2 font-bold bg-zinc-100">Marca / Fabricante</td>
                                                <td className="border border-zinc-400 p-2">{marca}</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-zinc-400 p-2 font-bold bg-zinc-100">Modelo</td>
                                                <td className="border border-zinc-400 p-2">{modelo}</td>
                                            </tr>
                                            {numeroSerie && (
                                                <tr>
                                                    <td className="border border-zinc-400 p-2 font-bold bg-zinc-100">Número de Serie / ID</td>
                                                    <td className="border border-zinc-400 p-2">{numeroSerie}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td className="border border-zinc-400 p-2 font-bold bg-zinc-100">Estado Físico Actual</td>
                                                <td className="border border-zinc-400 p-2">{estadoFisico}</td>
                                            </tr>
                                            {valorAproximado && (
                                                <tr>
                                                    <td className="border border-zinc-400 p-2 font-bold bg-zinc-100">Valor Comercial Aprox.</td>
                                                    <td className="border border-zinc-400 p-2">{valorAproximado} (MXN)</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {accesorios && (
                                    <p>
                                        <strong>Accesorios Incluidos:</strong> {accesorios}
                                    </p>
                                )}

                                {observaciones && (
                                    <p>
                                        <strong>Observaciones del estado del equipo:</strong> {observaciones}
                                    </p>
                                )}

                                <div className="text-center font-bold uppercase mt-8 mb-2">D E C L A R A C I O N E S &nbsp; D E L &nbsp; T R A B A J A D O R</div>

                                <ul className="list-disc pl-6 space-y-2 text-sm">
                                    <li>Reconozco haber recibido a mi entera satisfacción el equipo descrito en las condiciones físicas mencionadas.</li>
                                    <li>Asumo la responsabilidad total del cuidado, protección y buen uso del mismo, comprometiéndome a emplearlo exclusiva y estrictamente para asuntos relacionados con las actividades de mi puesto de trabajo.</li>
                                    <li>Queda bajo mi responsabilidad cualquier daño estructural, estético o funcional que sufra el equipo por negligencia, dolo, descuido o mal uso, autorizando a la empresa a realizar el descuento salarial correspondiente por los gastos de reparación o reposición.</li>
                                    <li>Me comprometo a reportar de forma inmediata a mis superiores o al departamento correspondiente en caso de robo, pérdida, extravío o falla técnica del equipo. En caso de robo o pérdida, deberé presentar y entregar el acta ministerial correspondiente.</li>
                                    <li>Entiendo que el equipo es y seguirá siendo propiedad de la empresa, y me comprometo a devolverlo en el momento en que se dé por terminada la relación laboral, me transfieran de área o cuando la empresa así me lo requiera, en las mismas condiciones en que lo recibí, contemplando únicamente el desgaste natural por el paso del tiempo.</li>
                                </ul>

                                <p className="mt-8">
                                    Firmando de conformidad ambas partes, enteradas del alcance y fuerza legal del presente documento.
                                </p>

                                {/* Signatures */}
                                <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-16 text-center text-sm">
                                    <div>
                                        <div className="border-t border-black pt-2 max-w-[250px] mx-auto">
                                            <strong>Entregado por:</strong><br />
                                            {representante}<br />
                                            <span className="text-xs text-zinc-500">Por representación de {empresa}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="border-t border-black pt-2 max-w-[250px] mx-auto">
                                            <strong>Recibe de conformidad y acepta resguardo:</strong><br />
                                            {selectedEmployee?.nombre} {selectedEmployee?.apellido_paterno} {selectedEmployee?.apellido_materno}<br />
                                            <span className="text-xs text-zinc-500">Trabajador</span>
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
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
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
