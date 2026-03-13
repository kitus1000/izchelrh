import * as XLSX from 'xlsx'

/**
 * Generates and downloads an Excel template for various entities
 */
export function downloadTemplate(type: 'empleados' | 'departamentos' | 'puestos') {
    let headers: string[] = []
    let filename = ''

    switch (type) {
        case 'empleados':
            headers = [
                'numero_empleado', 'nombre', 'apellido_paterno', 'apellido_materno',
                'curp', 'rfc', 'nss', 'correo_electronico', 'telefono',
                'fecha_nacimiento', 'sexo', 'estado_civil',
                'fecha_ingreso', 'departamento', 'puesto', 'unidad_trabajo'
            ]
            filename = 'plantilla_empleados.xlsx'
            break
        case 'departamentos':
            headers = ['departamento']
            filename = 'plantilla_departamentos.xlsx'
            break
        case 'puestos':
            headers = ['puesto', 'departamento']
            filename = 'plantilla_puestos.xlsx'
            break
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla')

    XLSX.writeFile(workbook, filename)
}

/**
 * Normalizes Excel dates (handles both strings and serial numbers)
 */
function formatExcelDate(val: any): string | null {
    if (!val) return null
    if (val instanceof Date) return val.toISOString().split('T')[0]
    if (typeof val === 'number') {
        // Excel serial date conversion
        const date = new Date((val - 25569) * 86400 * 1000)
        return date.toISOString().split('T')[0]
    }
    const str = val.toString().trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split(' ')[0]
    return str
}

/**
 * Parses an Excel file and returns an array of objects
 */
export async function parseExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array', cellDates: true })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const json: any[] = XLSX.utils.sheet_to_json(worksheet)

                // Post-process dates for common columns
                const cleaned = json.map(row => {
                    const newRow = { ...row }
                    if (row.fecha_nacimiento) newRow.fecha_nacimiento = formatExcelDate(row.fecha_nacimiento)
                    if (row.fecha_ingreso) newRow.fecha_ingreso = formatExcelDate(row.fecha_ingreso)
                    return newRow
                })

                resolve(cleaned)
            } catch (err) {
                reject(err)
            }
        }
        reader.onerror = (err) => reject(err)
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Parses a multi-sheet Excel file and returns a map of sheet names to data
 */
export async function parseMultiSheetExcel(file: File): Promise<Record<string, any[]>> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const result: Record<string, any[]> = {}
                workbook.SheetNames.forEach(name => {
                    result[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name])
                })
                resolve(result)
            } catch (err) {
                reject(err)
            }
        }
        reader.onerror = (err) => reject(err)
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Generic export function
 */
export function exportToExcel(data: any[], filename: string) {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos')
    XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Multi-sheet export function
 */
export function exportMultiSheetExcel(sheets: { name: string, data: any[] }[], filename: string) {
    const workbook = XLSX.utils.book_new()

    sheets.forEach(sheet => {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data)
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
    })

    XLSX.writeFile(workbook, `${filename}.xlsx`)
}
