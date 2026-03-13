'use client'

import { X, Calendar as CalendarIcon, Clock, AlertTriangle, Briefcase, FileText, Sparkles, DollarSign } from 'lucide-react'
import { eachDayOfInterval, format, parseISO, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { getIncidentColor, calculateDailyStatus } from '@/utils/rosterLogic'

type ModalProps = {
    isOpen: boolean
    onClose: () => void
    employeeData: any | null
    startDate: string
    endDate: string
    descansosGlobales?: string[]
}

export default function PrenominaEmployeeModal({ isOpen, onClose, employeeData, startDate, endDate, descansosGlobales = [] }: ModalProps) {
    if (!isOpen || !employeeData) return null

    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })

    // Helper: Evaluar un día específico buscando en el desglose ya procesado
    const evaluateDay = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd')

        // Buscar el día en el desglose pre-calculado
        const processedDay = employeeData.dailyBreakdown?.find((d: any) => d.fecha === dayStr)

        const rawChecadas = employeeData.rawChecadas || []
        const checadaIn = rawChecadas.find((c: any) => c.fecha_local === dayStr && (c.tipo_checada === 'ENTRADA' || c.tipo_checada === 'COMIDA_REGRESO'))
        // Tomar la última salida para consistencia visual
        const dayOutputs = rawChecadas.filter((c: any) => c.fecha_local === dayStr && (c.tipo_checada === 'SALIDA' || c.tipo_checada === 'COMIDA_SALIDA'))
        const checadaOut = dayOutputs.length > 0 ? dayOutputs[dayOutputs.length - 1] : null

        return {
            status: processedDay?.estatus || 'Sin Rol',
            color: getIncidentColor(processedDay?.estatus),
            checadaIn,
            checadaOut,
            extraHrs: processedDay?.extraHrs || 0,
            assumedOut: processedDay?.assumedOut || false
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header Modal */}
                <div className="flex items-start justify-between p-6 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full bg-black flex items-center justify-center text-xl font-black text-white shadow-md">
                            {employeeData.numero || '?'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight leading-none mb-1.5">{employeeData.nombre}</h2>
                            <div className="flex items-center flex-wrap gap-2">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">{employeeData.depto}</span>
                                <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${employeeData.rol === 'Sin Rol' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                                    {employeeData.rol}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    <DollarSign className="w-3 h-3" /> SDI: ${employeeData.sdi?.toFixed(2) || '0.00'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white hover:bg-zinc-100 rounded-full transition-colors border border-zinc-200 text-zinc-400 hover:text-zinc-600 shadow-sm">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Modal */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* AI Insights & Alertas */}
                    {employeeData.alerts && employeeData.alerts.length > 0 && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                            <div className="flex gap-4 relative z-10">
                                <div className="bg-indigo-100/70 border border-indigo-200 rounded-full p-2 h-fit">
                                    <Sparkles className="w-5 h-5 text-indigo-700" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-indigo-900 mb-3 tracking-tight flex items-center gap-2">
                                        Asistente IA <span className="bg-indigo-200/50 border border-indigo-200 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Insights</span>
                                    </h4>
                                    <ul className="space-y-2">
                                        {employeeData.alerts.map((al: string, i: number) => {
                                            const isCritical = al.includes('Sin Rol') || al.includes('ALERTA GESTOR') || al.includes('Omisión')
                                            return (
                                                <li key={i} className={`text-sm font-medium flex items-center gap-3 ${isCritical ? 'text-red-700' : 'text-indigo-800'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-indigo-400'}`}></span>
                                                    <span>{al.replace('🚨 ALERTA GESTOR: ', '')}</span>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resumen Periodo */}
                    <div>
                        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-zinc-400" /> Resumen del Periodo
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-zinc-700">{employeeData.programados}</span>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Días Prog.</span>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-emerald-700">{employeeData.asistencias}</span>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Asistencias</span>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-amber-700">{employeeData.retardos}</span>
                                <span className="text-[10px] font-bold text-amber-600 uppercase mt-1">Retardos</span>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-red-700">{employeeData.faltas}</span>
                                <span className="text-[10px] font-bold text-red-600 uppercase mt-1">Faltas</span>
                            </div>
                        </div>
                    </div>

                    {/* Desglose Diario */}
                    <div>
                        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-zinc-400" /> Desglose Diario
                        </h3>
                        <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <table className="min-w-full text-sm">
                                <thead className="bg-zinc-50 border-b border-zinc-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase w-32">Fecha</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase">Estatus</th>
                                        <th className="px-4 py-3 text-center text-[11px] font-bold text-zinc-500 uppercase">Entrada</th>
                                        <th className="px-4 py-3 text-center text-[11px] font-bold text-zinc-500 uppercase">Salida</th>
                                        <th className="px-4 py-3 text-center text-[11px] font-bold text-zinc-500 uppercase whitespace-nowrap">H. Extra</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {days.map(day => {
                                        const { status, color, checadaIn, checadaOut, extraHrs, assumedOut } = evaluateDay(day)
                                        const isExtra = extraHrs > 0
                                        return (
                                            <tr key={day.toISOString()} className="hover:bg-zinc-50/50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="font-bold text-zinc-700 capitalize">{format(day, 'EEEE', { locale: es })}</span>
                                                    <div className="text-xs text-zinc-400 font-medium mt-0.5">{format(day, 'dd MMM yyyy', { locale: es })}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] uppercase tracking-wide ${color}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {checadaIn && checadaIn.timestamp_checada ? (
                                                        <span className="font-mono text-xs font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">
                                                            {(() => {
                                                                const d = new Date(checadaIn.timestamp_checada)
                                                                return isNaN(d.getTime()) ? 'Error Hora' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                                                            })()}
                                                        </span>
                                                    ) : <span className="text-zinc-300">-</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {checadaOut && checadaOut.timestamp_checada ? (
                                                        <span className="font-mono text-xs font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">
                                                            {(() => {
                                                                const d = new Date(checadaOut.timestamp_checada)
                                                                return isNaN(d.getTime()) ? 'Error Hora' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                                                            })()}
                                                        </span>
                                                    ) : assumedOut ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                                {employeeData.rawTurno?.hora_fin?.substring(0, 5) || '-'}
                                                            </span>
                                                            <span className="text-[8px] font-black text-indigo-300 uppercase leading-none mt-1">Asimilada</span>
                                                        </div>
                                                    ) : <span className="text-zinc-300">-</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {extraHrs > 0 ? (
                                                        <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                                                            +{extraHrs.toFixed(1)}h
                                                        </span>
                                                    ) : <span className="text-zinc-300 text-[10px] font-bold">0h</span>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
