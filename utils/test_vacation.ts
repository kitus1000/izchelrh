import { getPeriodStatus } from './vacationLogic'
import * as fs from 'fs'

const hireDateJan2024 = new Date('2024-01-15')
const hireDateApr2024 = new Date('2024-04-01') // Expira en Abril 2026 (Dentro de 30 días)
const hireDateJan2026 = new Date('2026-01-15')

let output = '--- Testing Vacation Logic (Today is 2026-03-09) ---\n'

function test(label: string, hireDate: Date, year: number) {
    const status = getPeriodStatus(hireDate, year)
    output += `${label} (Hired: ${hireDate.toISOString().split('T')[0]}) | Period: ${year}-${year + 1} | Status: ${status}\n`
}

// Caso 1: Contratado Ene 2024
test('Caso 1', hireDateJan2024, 2023) // Antes -> Expirado
test('Caso 1', hireDateJan2024, 2024) // Expira Ene 2026 -> Expirado
test('Caso 1', hireDateJan2024, 2025) // Expira Ene 2027 -> Disponible

// Caso 2: Contratado Abr 2024 (POR VENCER)
// Periodo 2024-2025: Ganado Abr 01, 2025. Expira Abr 01, 2026.
// Hoy es Mar 09, 2026. Faltan ~23 días. Debe ser "Por Vencer".
test('Caso 2', hireDateApr2024, 2024)

// Caso 3: Contratado Ene 2026
test('Caso 3', hireDateJan2026, 2025) // Antes -> Expirado
test('Caso 3', hireDateJan2026, 2026) // Ganado Ene 2028 -> Generándose

fs.writeFileSync('utils/test_results.txt', output)
console.log('Results written to utils/test_results.txt')
