import { differenceInCalendarDays, parseISO, format, isBefore, startOfDay } from 'date-fns'

export type Incident = {
    id_incidencia: string
    fecha_inicio: string
    fecha_fin: string
    cat_tipos_incidencia: {
        tipo_incidencia: string
        color?: string
    }
}

export type Role = {
    fecha_inicio: string
    cat_tipos_rol: {
        dias_trabajo: number
        dias_descanso: number
        tipo_rol: string
    }
}

export type Checada = {
    id_empleado: string
    fecha_local: string           // 'YYYY-MM-DD'
    tipo_checada: string          // 'ENTRADA' | 'SALIDA' | etc.
    estatus_puntualidad: string   // 'PUNTUAL' | 'RETARDO' | 'SIN_TURNO'
}

export type DailyStatus = {
    status: 'Laborando' | 'Descanso' | 'Incidencia' | 'Sin Rol' | 'Asistencia' | 'Retardo' | 'Falta' | 'Previo a inicio de rol' | 'Suspensión' | 'Incapacidad' | 'Vacaciones' | 'Permiso Con Goce' | 'Permiso Sin Goce'
    label: string
    color: string
    details?: string
}

// Map incident types to colors
const INCIDENT_COLORS: Record<string, string> = {
    'Vacaciones': 'bg-blue-500',
    'Incapacidad': 'bg-red-400',
    'Falta': 'bg-red-700',
    'Permiso Especial': 'bg-purple-500',
    'Permiso Con Goce': 'bg-purple-500',
    'Permiso Sin Goce': 'bg-purple-800',
    'Suspensión': 'bg-orange-600',
    'Descanso': 'bg-zinc-300',
    'Laborando': 'bg-green-500',
    'Sin Rol': 'bg-white',
    'Retardo': 'bg-amber-500',
    'Asistencia': 'bg-green-600',
}

export function getIncidentColor(type: string | undefined): string {
    if (!type) return 'bg-zinc-100'
    const lower = type.toLowerCase().trim()

    if (lower.includes('vacaciones')) return INCIDENT_COLORS['Vacaciones']
    if (lower.includes('incapacidad')) return INCIDENT_COLORS['Incapacidad']
    if (lower.includes('falta')) return INCIDENT_COLORS['Falta']
    if (lower.includes('permiso')) return INCIDENT_COLORS['Permiso Especial']
    if (lower.includes('suspensi')) return INCIDENT_COLORS['Suspensión']
    if (lower.includes('descanso')) return INCIDENT_COLORS['Descanso']
    if (lower.includes('asisten')) return INCIDENT_COLORS['Asistencia']

    return INCIDENT_COLORS[type] || 'bg-amber-400'
}

export function calculateDailyStatus(
    targetDate: Date,
    role: Role | null,
    incidents: Incident[],
    checadas?: Checada[],
    descansosGlobales: string[] = [],
    festivos: string[] = []
): DailyStatus {
    const targetStr = format(targetDate, 'yyyy-MM-dd')

    // ── 0. DESCANSO GLOBAL O FESTIVO (MÁXIMA PRIORIDAD) ──────────────────
    const esFestivo = festivos.includes(targetStr)
    const esDescansoGlobal = descansosGlobales.includes(targetStr)

    if (esFestivo || esDescansoGlobal) {
        // Requerir ENTRADA o SALIDA para considerarlo laborado en festivo/descanso
        const tieneEntrada = checadas?.some(c => c.fecha_local === targetStr && (c.tipo_checada === 'ENTRADA' || c.tipo_checada === 'COMIDA_REGRESO' || c.tipo_checada === 'REGRESO_PERMISO_PERSONAL' || c.tipo_checada === 'REGRESO_OPERACIONES'))
        const tieneSalida = checadas?.some(c => c.fecha_local === targetStr && (c.tipo_checada === 'SALIDA' || c.tipo_checada === 'COMIDA_SALIDA' || c.tipo_checada === 'PERMISO_PERSONAL' || c.tipo_checada === 'SALIDA_OPERACIONES'))

        if (tieneEntrada || tieneSalida) {
            return {
                status: 'Asistencia',
                label: esFestivo ? 'F+' : 'D+',
                color: 'bg-emerald-700 text-white',
                details: esFestivo ? 'Día Festivo Laborado' : 'Descanso Global Laborado'
            }
        }

        return {
            status: esFestivo ? 'Incidencia' : 'Descanso', // El reporte lo tratará como festivo si dice 'Festivo' en details
            label: esFestivo ? 'FES' : 'D*',
            color: esFestivo ? 'bg-indigo-700 text-white' : 'bg-zinc-800 text-white',
            details: esFestivo ? 'Día Festivo (Oficial)' : 'Descanso Global Forzoso'
        }
    }

    const today = startOfDay(new Date())
    const isPast = isBefore(startOfDay(targetDate), today)
    const isToday = format(targetDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

    // ── 1. Incidencias aprobadas (mayor prioridad) ───────────────────────
    const incident = Array.isArray(incidents) ? incidents.find(inc => {
        const startStr = inc.fecha_inicio.includes('T') ? inc.fecha_inicio.split('T')[0] : inc.fecha_inicio
        const endStr = inc.fecha_fin.includes('T') ? inc.fecha_fin.split('T')[0] : inc.fecha_fin
        return targetStr >= startStr && targetStr <= endStr
    }) : null

    if (incident) {
        const tipoIncRaw = (incident as any).tipo_incidencia || incident.cat_tipos_incidencia?.tipo_incidencia || 'Incidencia'
        const lowerTipo = tipoIncRaw.toLowerCase().trim()
        let lbl = tipoIncRaw.substring(0, 3).toUpperCase()

        if (lowerTipo.includes('falt')) lbl = 'F'
        else if (lowerTipo.includes('permiso sin goce')) lbl = 'PSG'
        else if (lowerTipo.includes('permiso con goce')) lbl = 'PCG'
        else if (lowerTipo.includes('vacac')) lbl = 'VAC'
        else if (lowerTipo.includes('incapa')) lbl = 'INC'
        else if (lowerTipo.includes('suspens')) lbl = 'SUS'
        else if (lowerTipo.includes('permis')) lbl = 'PER'
        else if (lowerTipo.includes('asisten')) lbl = 'A'
        else if (lowerTipo.includes('descanso')) lbl = 'D'

        return {
            status: (
                lowerTipo.includes('asisten') ? 'Asistencia' :
                    lowerTipo.includes('permiso sin goce') ? 'Permiso Sin Goce' :
                        lowerTipo.includes('falt') ? 'Falta' :
                            lowerTipo.includes('descanso') ? 'Descanso' :
                                lowerTipo.includes('suspensi') ? 'Suspensión' :
                                    lowerTipo.includes('incapaci') ? 'Incapacidad' :
                                        lowerTipo.includes('vacac') ? 'Vacaciones' :
                                            lowerTipo.includes('permiso con goce') ? 'Permiso Con Goce' :
                                                'Incidencia'
            ) as any,
            label: lbl,
            color: getIncidentColor(tipoIncRaw),
            details: tipoIncRaw + ` (${incident.fecha_inicio.split('T')[0]} – ${incident.fecha_fin.split('T')[0]})`
        }
    }

    // ── 1.5. FALTAS REGISTRADAS (Manuales o por Kiosko) ──────────────────
    const falteChecada = checadas?.find(
        c => c.fecha_local === targetStr && c.estatus_puntualidad === 'FALTA'
    )
    if (falteChecada) {
        return {
            status: 'Falta',
            label: 'F',
            color: 'bg-red-600 text-white',
            details: 'Falta registrada en sistema'
        }
    }

    // ── 2. Manejo de Rol ─────────────────────────────────────────────────
    if (!role) {
        const checadaEntrada = checadas?.find(c => c.fecha_local === targetStr && c.tipo_checada === 'ENTRADA')
        if (checadaEntrada) {
            const isRetardo = checadaEntrada.estatus_puntualidad === 'RETARDO'
            return {
                status: isRetardo ? 'Retardo' : 'Asistencia',
                label: isRetardo ? 'R' : 'A',
                color: isRetardo ? 'bg-amber-500 text-white' : 'bg-green-500 text-white',
                details: `${isRetardo ? 'Retardo' : 'Asistencia'} sin rol asignado`
            }
        }
        return { status: 'Sin Rol', label: '–', color: 'bg-zinc-50 text-zinc-300', details: 'Sin rol asignado' }
    }

    const roleStart = parseISO(role.fecha_inicio)
    const daysElapsed = differenceInCalendarDays(targetDate, roleStart)

    if (daysElapsed < 0) {
        // CORRECCIÓN: Si es antes del rol, NO es descanso. Es un día fuera de contrato/periodo.
        const checadaExtra = checadas?.find(c => c.fecha_local === targetStr && c.tipo_checada === 'ENTRADA')
        if (checadaExtra) {
            return { status: 'Asistencia', label: 'A', color: 'bg-green-400 text-white', details: 'Asistencia antes de inicio formal de rol' }
        }
        return { status: 'Sin Rol', label: '–', color: 'bg-zinc-50 text-zinc-300', details: 'Previo a inicio de rol' }
    }

    if (!role.cat_tipos_rol) {
        return { status: 'Sin Rol', label: '–', color: 'bg-zinc-50 text-zinc-300', details: 'Configuración de rol incompleta' }
    }

    const { dias_trabajo, dias_descanso, tipo_rol } = role.cat_tipos_rol
    const cycleLength = (dias_trabajo || 0) + (dias_descanso || 0)

    if (cycleLength <= 0) {
        return { status: 'Sin Rol', label: '–', color: 'bg-white', details: 'Ciclo de rol inválido' }
    }

    const dayInCycle = daysElapsed % cycleLength
    const isWorkDay = dayInCycle < (dias_trabajo || 0)

    // ── 3. Día de Descanso (Segun Rol) ──────────────────────────────────
    if (!isWorkDay) {
        const tieneEntrada = checadas?.some(c => c.fecha_local === targetStr && (c.tipo_checada === 'ENTRADA' || c.tipo_checada === 'COMIDA_REGRESO' || c.tipo_checada === 'REGRESO_PERMISO_PERSONAL' || c.tipo_checada === 'REGRESO_OPERACIONES'))
        const tieneSalida = checadas?.some(c => c.fecha_local === targetStr && (c.tipo_checada === 'SALIDA' || c.tipo_checada === 'COMIDA_SALIDA' || c.tipo_checada === 'PERMISO_PERSONAL' || c.tipo_checada === 'SALIDA_OPERACIONES'))

        if (tieneEntrada && tieneSalida) {
            return { status: 'Asistencia', label: 'A+', color: 'bg-emerald-600 text-white', details: 'Día de descanso laborado' }
        }
        return {
            status: 'Descanso',
            label: 'D',
            color: 'bg-zinc-300 text-zinc-600',
            details: `Día de Descanso (${tipo_rol})`
        }
    }

    // ── 4. Día de Trabajo → consultar checadas ───────────────────────────
    const checadaEntrada = checadas?.find(c => c.fecha_local === targetStr && c.tipo_checada === 'ENTRADA')

    if (checadaEntrada) {
        if (checadaEntrada.estatus_puntualidad === 'RETARDO') {
            return { status: 'Retardo', label: 'R', color: 'bg-amber-500 text-white', details: 'Retardo registrado' }
        }
        return { status: 'Asistencia', label: 'A', color: 'bg-green-500 text-white', details: 'Asistencia puntual' }
    }

    // ── 5. Sin checada: Estado de ausencia ───────────────────────────────
    if (isPast) {
        return { status: 'Falta', label: 'F', color: 'bg-red-600 text-white', details: 'Inasistencia (sin registro)' }
    }

    if (isToday) {
        return { status: 'Laborando', label: '·', color: 'bg-green-200 text-green-800', details: 'Día laboral en curso' }
    }

    // Día futuro planeado
    return { status: 'Laborando', label: 'A', color: 'bg-green-100 text-green-700', details: 'Día laboral programado' }
}
