
// Verification script for Overtime Calculation logic
import { format } from 'date-fns'

function simulatedCalc(dayStr: string, turno: any, empChecadas: any[]) {
    const entTypes = ['ENTRADA', 'COMIDA_REGRESO', 'REGRESO_PERMISO_PERSONAL', 'REGRESO_OPERACIONES']
    const salTypes = ['SALIDA', 'COMIDA_SALIDA', 'PERMISO_PERSONAL', 'SALIDA_OPERACIONES']

    const dayChecadas = empChecadas.filter(c => c.fecha_local === dayStr)
    const ent = dayChecadas.find(c => entTypes.includes(c.tipo_checada))

    let dailyExtraHrs = 0
    let assumedOut = false

    if (ent && turno && turno.hora_fin) {
        const [hNom, mNom] = turno.hora_fin.split(':').map(Number)
        const totalMinutosTurno = (hNom * 60) + mNom

        const [hIni, mIni] = (turno.hora_inicio || '00:00').split(':').map(Number)
        const totalMinutosInicio = (hIni * 60) + mIni
        const esNocturno = totalMinutosTurno < totalMinutosInicio

        const entTimeNum = new Date(ent.timestamp_checada).getTime()
        let sal = empChecadas.find(c =>
            salTypes.includes(c.tipo_checada) &&
            new Date(c.timestamp_checada).getTime() > entTimeNum
        )

        const thresholdMs = 18 * 60 * 60 * 1000
        if (sal && (new Date(sal.timestamp_checada).getTime() - entTimeNum) > thresholdMs) {
            sal = null
        }

        if (sal) {
            const salReal = new Date(sal.timestamp_checada)
            const salH = salReal.getHours()
            const salM = salReal.getMinutes()
            let totalMinutosSalida = (salH * 60) + salM

            const salDayStr = format(salReal, 'yyyy-MM-dd')
            if (salDayStr !== dayStr) {
                totalMinutosSalida += 1440
            }

            let targetMin = totalMinutosTurno
            if (esNocturno) targetMin += 1440

            const extraMin = Math.max(0, totalMinutosSalida - targetMin)
            if (extraMin >= 15) {
                dailyExtraHrs = extraMin / 60
            }
        } else {
            assumedOut = true
        }
    }

    return { dailyExtraHrs, assumedOut }
}

// TEST CASES
const turnoDiurno = { hora_inicio: '08:00', hora_fin: '16:00' }
const turnoNocturno = { hora_inicio: '22:00', hora_fin: '06:00' }

console.log('--- TEST 1: Diurno, salida tarde (17:00) ---')
const res1 = simulatedCalc('2026-03-09', turnoDiurno, [
    { fecha_local: '2026-03-09', tipo_checada: 'ENTRADA', timestamp_checada: '2026-03-09T08:00:00' },
    { fecha_local: '2026-03-09', tipo_checada: 'SALIDA', timestamp_checada: '2026-03-09T17:00:00' }
])
console.log('Result 1:', res1)

console.log('--- TEST 2: Nocturno, salida puntual (06:00) ---')
const res2 = simulatedCalc('2026-03-09', turnoNocturno, [
    { fecha_local: '2026-03-09', tipo_checada: 'ENTRADA', timestamp_checada: '2026-03-09T22:00:00' },
    { fecha_local: '2026-03-10', tipo_checada: 'SALIDA', timestamp_checada: '2026-03-10T06:00:00' }
])
console.log('Result 2:', res2)

console.log('--- TEST 3: Nocturno, salida tarde (07:30) ---')
const res3 = simulatedCalc('2026-03-09', turnoNocturno, [
    { fecha_local: '2026-03-09', tipo_checada: 'ENTRADA', timestamp_checada: '2026-03-09T22:00:00' },
    { fecha_local: '2026-03-10', tipo_checada: 'SALIDA', timestamp_checada: '2026-03-10T07:30:00' }
])
console.log('Result 3:', res3)

console.log('--- TEST 4: Diurno, salida MUY tarde (01:00 am next day) ---')
const res4 = simulatedCalc('2026-03-09', turnoDiurno, [
    { fecha_local: '2026-03-09', tipo_checada: 'ENTRADA', timestamp_checada: '2026-03-09T08:00:00' },
    { fecha_local: '2026-03-10', tipo_checada: 'SALIDA', timestamp_checada: '2026-03-10T01:00:00' }
])
console.log('Result 4:', res4)

console.log('--- TEST 5: Kiosko Salida Operaciones (18:00) ---')
const res5 = simulatedCalc('2026-03-09', turnoDiurno, [
    { fecha_local: '2026-03-09', tipo_checada: 'ENTRADA', timestamp_checada: '2026-03-09T08:00:00' },
    { fecha_local: '2026-03-09', tipo_checada: 'SALIDA_OPERACIONES', timestamp_checada: '2026-03-09T18:00:00' }
])
console.log('Result 5:', res5)
