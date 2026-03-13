export const replaceVariables = (text: string, selectedEmpleado: any | null) => {
    if (!text) return ''
    if (!selectedEmpleado) return text

    let result = text

    // Full Name
    const fullName = `${selectedEmpleado.nombre || ''} ${selectedEmpleado.apellido_paterno || ''} ${selectedEmpleado.apellido_materno || ''}`.trim()
    result = result.replace(/\{\{EMP_NOMBRE\}\}/g, fullName || '____________________')

    // Basic Identifiers
    result = result.replace(/\{\{EMP_CURP\}\}/g, selectedEmpleado.curp || '____________________')
    result = result.replace(/\{\{EMP_RFC\}\}/g, selectedEmpleado.rfc || '____________________')

    // Address (Handle nested structure from EmpleadoSelector)
    if (selectedEmpleado.empleado_domicilio) {
        const dom = selectedEmpleado.empleado_domicilio
        const address = [dom.calle, dom.numero_exterior, dom.colonia, dom.municipio, dom.estado]
            .filter(Boolean)
            .join(', ')
        result = result.replace(/\{\{EMP_DOMICILIO\}\}/g, address || '____________________')
    } else {
        result = result.replace(/\{\{EMP_DOMICILIO\}\}/g, '____________________')
    }

    // Job / Position
    if (selectedEmpleado.empleado_adscripciones?.[0]) {
        const ads = selectedEmpleado.empleado_adscripciones[0]
        const position = ads.cat_puestos?.puesto || '____________________'
        result = result.replace(/\{\{EMP_PUESTO\}\}/g, position)
    } else {
        result = result.replace(/\{\{EMP_PUESTO\}\}/g, '____________________')
    }

    // Salary (Numeric and optionally formatting)
    if (selectedEmpleado.empleado_salarios?.[0]) {
        const sal = selectedEmpleado.empleado_salarios[0]
        const salary = typeof sal.salario_diario === 'number'
            ? `$${sal.salario_diario.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            : `$${sal.salario_diario || '0.00'}`
        result = result.replace(/\{\{EMP_SALARIO\}\}/g, salary)
    } else {
        result = result.replace(/\{\{EMP_SALARIO\}\}/g, '$0.00')
    }

    return result
}
