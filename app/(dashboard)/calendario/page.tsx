'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/utils/supabase/client'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths, startOfDay, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import { calculateDailyStatus, Checada } from '@/utils/rosterLogic'
import * as XLSX from 'xlsx'
import { Download, ChevronLeft, ChevronRight, Loader2, Filter, Sparkles, HelpCircle } from 'lucide-react'

const LEGEND = [
    { label: 'Asistencia', color: 'bg-green-500', text: 'A' },
    { label: 'Retardo', color: 'bg-amber-500', text: 'R' },
    { label: 'Falta', color: 'bg-red-600', text: 'F' },
    { label: 'Descanso', color: 'bg-zinc-300', text: 'D' },
    { label: 'Vacaciones', color: 'bg-blue-500', text: 'VAC' },
    { label: 'Incapacidad', color: 'bg-red-400', text: 'INC' },
    { label: 'Suspensión', color: 'bg-orange-600', text: 'SUS' },
    { label: 'P. Con Goce', color: 'bg-purple-500', text: 'PCG' },
    { label: 'P. Sin Goce', color: 'bg-purple-800', text: 'PSG' },
    { label: 'Descanso Global', color: 'bg-zinc-800 text-white', text: 'D*' },
    { label: 'Programado', color: 'bg-green-200 text-green-700', text: 'A·' },
]

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [employees, setEmployees] = useState<any[]>([])
    const [rolesMap, setRolesMap] = useState<Record<string, any>>({})          // key: id_empleado
    const [incidenciasMap, setIncidenciasMap] = useState<Record<string, any[]>>({})  // key: id_empleado
    const [checadasMap, setChecadasMap] = useState<Record<string, Checada[]>>({})    // key: id_empleado
    const [loading, setLoading] = useState(true)
    const [departments, setDepartments] = useState<any[]>([])
    const [selectedDept, setSelectedDept] = useState<string>('')
    const [descansosGlobales, setDescansosGlobales] = useState<string[]>([])
    const [restDateInput, setRestDateInput] = useState(format(new Date(), 'yyyy-MM-dd'))

    useEffect(() => {
        fetchAll()
    }, [currentDate])

    async function fetchAll() {
        setLoading(true)
        console.log("Calendar: fetchAll started")
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        const startStr = format(monthStart, 'yyyy-MM-dd')
        const endStr = format(monthEnd, 'yyyy-MM-dd')

        try {
            // ── 1. Empleados activos ────────────────────────────────────────
            const { data: emps, error: empsErr } = await supabase
                .from('empleados')
                .select('id_empleado, nombre, apellido_paterno, apellido_materno, numero_empleado, id_turno')
                .eq('estado_empleado', 'Activo')
                .order('apellido_paterno')

            if (empsErr) throw empsErr
            if (!emps) { setLoading(false); return }

            // ── 2. Departamentos y Turnos ────────────────────────────────────
            const { data: depts, error: deptsErr } = await supabase
                .from('cat_departamentos')
                .select('id_departamento, departamento')
                .eq('activo', true)
                .order('departamento')
            if (!deptsErr) setDepartments(depts || [])

            const { data: turns, error: turnsErr } = await supabase
                .from('turnos')
                .select('*')
                .eq('activo', true)

            if (turnsErr) console.warn("Error loading turnos:", turnsErr)
            const turnosDic: Record<string, any> = {}
            turns?.forEach(t => { turnosDic[t.id] = t })

            const empIds = emps.map(e => e.id_empleado)

            // ── 3. Roles activos ─────────────────────────────────────────────
            console.log("Fetching roles for", empIds.length, "employees")
            const { data: rolesRaw, error: rolesErr } = await supabase
                .from('empleado_roles')
                .select(`
                    id_empleado,
                    fecha_inicio,
                    cat_tipos_rol(id_tipo_rol, tipo_rol, dias_trabajo, dias_descanso)
                `)
                .in('id_empleado', empIds)
                .order('fecha_inicio', { ascending: false })

            if (rolesErr) console.error("Critical error in empleado_roles query:", rolesErr)

            const rMap: Record<string, any> = {}
            for (const r of (rolesRaw || [])) {
                if (!rMap[r.id_empleado]) {
                    const tipoRol = Array.isArray(r.cat_tipos_rol) ? r.cat_tipos_rol[0] : r.cat_tipos_rol
                    rMap[r.id_empleado] = {
                        fecha_inicio: r.fecha_inicio,
                        cat_tipos_rol: tipoRol
                    }
                }
            }

            // ── 3.5 Pseudo-roles para empleados con Turno fijo ─────────────
            emps?.forEach(emp => {
                if (!rMap[emp.id_empleado] && emp.id_turno && turnosDic[emp.id_turno]) {
                    const tInfo = turnosDic[emp.id_turno]
                    rMap[emp.id_empleado] = {
                        cat_tipos_rol: {
                            id_tipo_rol: tInfo.id,
                            tipo_rol: tInfo.nombre,
                            dias_trabajo: 6,
                            dias_descanso: 1
                        }
                    }
                }
            })

            setRolesMap(rMap)

            // ── 4. Incidencias aprobadas ───────────────────────────────────
            const { data: incsRaw, error: incsErr } = await supabase
                .from('empleado_incidencias')
                .select(`
                    id_incidencia, id_empleado, fecha_inicio, fecha_fin,
                    cat_tipos_incidencia(tipo_incidencia)
                `)
                .in('id_empleado', empIds)
                .eq('estado', 'Aprobada')

            if (incsErr) console.error("Error fetching incidences:", incsErr)

            const iMap: Record<string, any[]> = {}
            for (const inc of (incsRaw || [])) {
                if (!iMap[inc.id_empleado]) iMap[inc.id_empleado] = []
                const tipoInc = Array.isArray(inc.cat_tipos_incidencia) ? inc.cat_tipos_incidencia[0] : inc.cat_tipos_incidencia
                iMap[inc.id_empleado].push({
                    ...inc,
                    tipo_incidencia: tipoInc?.tipo_incidencia || 'Incidencia'
                })
            }
            setIncidenciasMap(iMap)

            // ── 5. Checadas del mes ─────────────────────────────────────────
            const { data: checadasRaw, error: checErr } = await supabase
                .from('checadas')
                .select('id_empleado, fecha_local, tipo_checada, estatus_puntualidad')
                .in('id_empleado', empIds)
                .gte('fecha_local', startStr)
                .lte('fecha_local', endStr)

            if (checErr) console.error("Error loading checadas:", checErr)

            const cMap: Record<string, Checada[]> = {}
            for (const c of (checadasRaw || [])) {
                if (!cMap[c.id_empleado]) cMap[c.id_empleado] = []
                cMap[c.id_empleado].push(c as Checada)
            }
            setChecadasMap(cMap)

            // ── 5.5. Descansos Globales ──────────────────────────────────
            const { data: descRaw, error: descErr } = await supabase
                .from('config_descansos_globales')
                .select('fecha')
                .gte('fecha', startStr)
                .lte('fecha', endStr)

            if (descErr) {
                console.warn("Table config_descansos_globales might not exist yet:", descErr)
                setDescansosGlobales([])
            } else {
                setDescansosGlobales(descRaw?.map(d => d.fecha) || [])
            }

            // ── 6. Adscripciones ────────────────────────────────────────────
            const { data: adscRaw, error: adscErr } = await supabase
                .from('empleado_adscripciones')
                .select('id_empleado, id_departamento, cat_departamentos(departamento)')
                .in('id_empleado', empIds)
                .order('fecha_inicio', { ascending: false })

            if (adscErr) console.error("Error loading adscripciones:", adscErr)

            const adscMap: Record<string, any> = {}
            for (const a of (adscRaw || [])) {
                if (!adscMap[a.id_empleado]) {
                    const dpto = Array.isArray(a.cat_departamentos) ? a.cat_departamentos[0] : a.cat_departamentos
                    adscMap[a.id_empleado] = { id_departamento: a.id_departamento, departamento: dpto?.departamento }
                }
            }

            // Combinar empleados con su depto
            const processed = emps.map(emp => ({
                ...emp,
                departmentId: adscMap[emp.id_empleado]?.id_departamento,
                departmentName: adscMap[emp.id_empleado]?.departamento || 'Sin Depto'
            }))

            setEmployees(processed)
        } catch (error) {
            console.error("Fatal error in Calendar fetchAll:", error)
        } finally {
            setLoading(false)
        }
    }

    async function toggleDescansoGlobal(dateStr: string) {
        if (!confirm(`¿Marcar/Desmarcar ${dateStr} como Descanso Forzoso para TODOS?`)) return

        const isMarked = descansosGlobales.includes(dateStr)

        try {
            if (isMarked) {
                const { error } = await supabase.from('config_descansos_globales').delete().eq('fecha', dateStr)
                if (error) throw error
                setDescansosGlobales(current => current.filter(d => d !== dateStr))
            } else {
                const { error } = await supabase.from('config_descansos_globales').insert([{ fecha: dateStr, motivo: 'Descanso Global' }])
                if (error) throw error
                setDescansosGlobales(current => [...current, dateStr])
            }
        } catch (e: any) {
            console.error("Error toggling global rest day:", e)
            if (e.code === 'PGRST116' || e.message?.includes('not found')) {
                alert('La tabla de configuración no existe o no tiene permisos. Contacte a soporte.')
            } else {
                alert('Error: ' + e.message)
            }
        }
    }

    const daysInMonth = useMemo(() =>
        eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }),
        [currentDate]
    )

    const filteredEmployees = useMemo(() => {
        if (!selectedDept) return employees
        return employees.filter(emp => emp.departmentId === selectedDept)
    }, [selectedDept, employees])

    const exportToExcel = () => {
        const data = filteredEmployees.map(emp => {
            const empChecadas = checadasMap[emp.id_empleado] || []
            const role = rolesMap[emp.id_empleado] || null
            const incidents = incidenciasMap[emp.id_empleado] || []
            const row: any = {
                'No.': emp.numero_empleado,
                'Nombre': `${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim(),
                'Depto': emp.departmentName || 'N/A',
                'Rol': role?.cat_tipos_rol?.tipo_rol || 'Sin Rol'
            }
            daysInMonth.forEach(day => {
                const status = calculateDailyStatus(day, role, incidents, empChecadas, descansosGlobales)
                row[format(day, 'dd/MM')] = status.label
            })
            return row
        })

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Asistencia')
        XLSX.writeFile(wb, `Asistencia_${format(currentDate, 'MMMM_yyyy', { locale: es })}.xlsx`)
    }

    return (
        <div className="max-w-[1700px] mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Calendario de Asistencia</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-zinc-500 text-sm">Asistencias reales del checador + incidencias aprobadas</p>
                        <div className="group relative">
                            <HelpCircle className="w-3.5 h-3.5 text-zinc-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-zinc-900 text-white text-[10px] rounded-xl shadow-2xl z-50 leading-relaxed border border-zinc-700 animate-in fade-in zoom-in-95 duration-200">
                                <p className="font-bold text-amber-500 mb-1 uppercase tracking-wider">¿Cómo marcar descansos globales?</p>
                                <p>Haz clic en el número del día en la cabecera de la tabla para marcar un descanso forzoso para todo el personal.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Gestión de Descansos Globales */}
                    <div className="flex bg-zinc-950 text-white p-1.5 px-3 rounded-xl items-center gap-3 shadow-lg border border-zinc-800 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Descanso Global</span>
                        </div>
                        <input
                            type="date"
                            className="bg-zinc-800 border-none rounded-lg text-xs px-2 py-1.5 focus:ring-1 focus:ring-amber-500 outline-none text-white w-32"
                            value={restDateInput}
                            onChange={(e) => setRestDateInput(e.target.value)}
                        />
                        <button
                            onClick={() => toggleDescansoGlobal(restDateInput)}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                        >
                            Aplicar
                        </button>
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                        <select
                            className="pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none min-w-[180px]"
                            value={selectedDept}
                            onChange={e => setSelectedDept(e.target.value)}
                        >
                            <option value="">Todos los departamentos</option>
                            {departments.map(d => (
                                <option key={d.id_departamento} value={d.id_departamento}>{d.departamento}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-zinc-200">
                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-zinc-100 rounded">
                            <ChevronLeft className="w-5 h-5 text-zinc-600" />
                        </button>
                        <span className="font-semibold text-zinc-800 min-w-[140px] text-center capitalize text-sm">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-zinc-100 rounded">
                            <ChevronRight className="w-5 h-5 text-zinc-600" />
                        </button>
                    </div>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-semibold shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Excel
                    </button>
                </div>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-3">
                {LEGEND.map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-600">
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold ${l.color} ${l.color.includes('text-') ? '' : 'text-white'}`}>
                            {l.text.length <= 2 ? l.text[0] : ''}
                        </div>
                        {l.label}
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
            ) : (
                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                                <th className="p-3 text-left text-xs font-bold text-zinc-500 uppercase sticky left-0 bg-zinc-50 z-10 min-w-[220px] border-r border-zinc-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                                    Empleado
                                </th>
                                {daysInMonth.map(day => {
                                    const isWeekend = [0, 6].includes(day.getDay())
                                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                                    const isGlobalRest = descansosGlobales.includes(format(day, 'yyyy-MM-dd'))
                                    return (
                                        <th key={day.toString()} className={`p-1 text-center min-w-[36px] border-r border-zinc-100 last:border-r-0 ${isWeekend ? 'bg-zinc-50/80' : ''} ${isToday ? 'bg-amber-50' : ''}`}>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-zinc-400 font-medium uppercase leading-none">{format(day, 'EEEEE', { locale: es })}</span>
                                                <button
                                                    onClick={() => toggleDescansoGlobal(format(day, 'yyyy-MM-dd'))}
                                                    title="Alternar Descanso Global"
                                                    className={`text-xs font-bold mt-1 w-7 h-7 rounded-full flex items-center justify-center transition-all border-2 ${isToday ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                                        isGlobalRest ? 'bg-zinc-800 text-white border-zinc-600 shadow-md ring-2 ring-amber-500/20' :
                                                            isWeekend ? 'text-amber-500 hover:bg-zinc-100 border-transparent' : 'text-zinc-700 hover:bg-zinc-100 border-transparent hover:border-zinc-200'
                                                        }`}
                                                >
                                                    {format(day, 'd')}
                                                </button>
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={daysInMonth.length + 1} className="p-8 text-center text-zinc-400">
                                        No se encontraron empleados.
                                    </td>
                                </tr>
                            ) : filteredEmployees.map(emp => {
                                const empChecadas = checadasMap[emp.id_empleado] || []
                                const role = rolesMap[emp.id_empleado] || null
                                const incidents = incidenciasMap[emp.id_empleado] || []
                                return (
                                    <tr key={emp.id_empleado} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="p-2 sticky left-0 bg-white z-10 border-r border-zinc-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                                            <div className="flex flex-col leading-tight">
                                                <span className="text-xs font-bold text-zinc-800">{emp.apellido_paterno} {emp.apellido_materno}</span>
                                                <span className="text-xs text-zinc-500">{emp.nombre}</span>
                                                <span className="text-[9px] text-zinc-400 mt-0.5 truncate max-w-[200px]">
                                                    {emp.departmentName && <span className="text-amber-600 font-semibold mr-1">[{emp.departmentName}]</span>}
                                                    {role ? role.cat_tipos_rol?.tipo_rol : 'Sin Rol'}
                                                </span>
                                            </div>
                                        </td>
                                        {daysInMonth.map(day => {
                                            const status = calculateDailyStatus(day, role, incidents, empChecadas, descansosGlobales)
                                            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                                            return (
                                                <td key={day.toString()} className={`p-0 border-r border-zinc-100 last:border-r-0 relative group h-[52px] ${isToday ? 'ring-1 ring-inset ring-amber-300' : ''}`}>
                                                    <div className={`w-full h-full flex items-center justify-center text-[11px] font-black ${status.color}`}>
                                                        {status.label}
                                                    </div>
                                                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-zinc-900 text-white text-xs p-2.5 rounded-lg z-30 pointer-events-none shadow-2xl transition-opacity whitespace-normal text-center">
                                                        <div className="font-bold mb-1">{format(day, 'dd MMM yyyy', { locale: es })}</div>
                                                        <div className="text-zinc-300 mb-1">{emp.nombre} {emp.apellido_paterno}</div>
                                                        <div className="font-semibold text-amber-300">{status.details || status.status}</div>
                                                        {empChecadas.length === 0 && <div className="text-zinc-500 text-[10px] mt-1">Sin checadas este mes</div>}
                                                    </div>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
