import { differenceInYears } from 'date-fns'

/**
 * Calculates the SDI (Sueldo Diario Integrado) based on the LFT (Ley Federal del Trabajo 2024).
 * Factor = 1 + (Aguinaldo / 365) + ((VacationDays * PrimaVacacional) / 365)
 */
export function calculateSDI(sueldoDiario: number, fechaIngreso: string | Date): number {
    if (!sueldoDiario || sueldoDiario <= 0) return 0
    if (!fechaIngreso) return sueldoDiario // fallback if no date

    const start = typeof fechaIngreso === 'string' ? new Date(fechaIngreso) : fechaIngreso
    const now = new Date()

    // We calculate years of service. If exactly 0 (new hire), they still get the factor for the 1st year
    let yearsOfService = differenceInYears(now, start)
    if (yearsOfService < 1) yearsOfService = 1

    // 2024 LFT Vacation table
    let vacationDays = 12
    if (yearsOfService === 1) vacationDays = 12
    else if (yearsOfService === 2) vacationDays = 14
    else if (yearsOfService === 3) vacationDays = 16
    else if (yearsOfService === 4) vacationDays = 18
    else if (yearsOfService === 5) vacationDays = 20
    else if (yearsOfService >= 6 && yearsOfService <= 10) vacationDays = 22
    else if (yearsOfService >= 11 && yearsOfService <= 15) vacationDays = 24
    else if (yearsOfService >= 16 && yearsOfService <= 20) vacationDays = 26
    else if (yearsOfService >= 21 && yearsOfService <= 25) vacationDays = 28
    else if (yearsOfService >= 26) vacationDays = 30
    else vacationDays = 12

    const aguinaldoDays = 15
    const primaVacacional = 0.25 // 25%

    const factor = 1 + (aguinaldoDays / 365) + ((vacationDays * primaVacacional) / 365)

    return Number((sueldoDiario * factor).toFixed(2))
}
