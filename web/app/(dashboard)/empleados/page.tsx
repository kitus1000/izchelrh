'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Plus, Search, RefreshCw, Upload, Download, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { downloadTemplate, parseExcelFile, exportToExcel } from '@/utils/excelUtils'
import { useRef } from 'react'

export default function EmpleadosPage() {
    const [empleados, setEmpleados] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('Activo') // 'Todos', 'Activo', 'Baja'
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
    const [canManage, setCanManage] = useState(false)
    const [importing, setImporting] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        checkPermissions()
        fetchEmpleados()
    }, [])

    async function checkPermissions() {
        try {
            // Check if user is Admin or HR Manager
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('perfiles')
                    .select('rol, cat_departamentos(departamento)')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    console.log('--- DEBUG PERMISSIONS ---')
                    console.log('Profile:', profile)
                    const role = profile.rol || ''
                    const isAdmin = role === 'Administrativo' || role === 'Administrador' || role === 'Admin'

                    const deptAny = profile.cat_departamentos as any
                    const deptName = (deptAny?.departamento || (Array.isArray(deptAny) ? deptAny[0]?.departamento : '') || '').toLowerCase()

                    // Robust check: case insensitive
                    const isHR = (role === 'Jefe' && (
                        deptName.includes('recursos') ||
                        deptName.includes('humanos') ||
                        deptName === 'rh'
                    )) || role.toLowerCase().includes('recursos humanos')

                    console.log('Result:', { isAdmin, isHR, role, deptName })
                    setCanManage(isAdmin || isHR)
                }
            }
        } catch (e) {
            console.error('Error in checkPermissions:', e)
            // Fallback: at least let them see if something is wrong
            setCanManage(false)
        }
    }

    async function fetchEmpleados() {
        try {
            const { data, error } = await supabase
                .from('empleados')
                .select(`
                    *,
                    empleado_adscripciones(
                        *,
                        cat_departamentos(departamento),
                        cat_puestos(puesto),
                        cat_unidades_trabajo(unidad_trabajo)
                    ),
                    empleado_ingreso(fecha_ingreso),
                    empleado_roles (
                        fecha_inicio,
                        cat_tipos_rol (tipo_rol, dias_trabajo, dias_descanso)
                    )
                `)
                .order('apellido_paterno', { ascending: true })

            if (error) {
                console.warn('Relationship join failed, falling back to simple fetch:', error)
                // Fallback to simple fetch if relationship cache is broken
                const { data: simpleData, error: simpleError } = await supabase
                    .from('empleados')
                    .select('*')
                    .order('apellido_paterno', { ascending: true })

                if (simpleError) throw simpleError
                setEmpleados(simpleData || [])
                setFetchError('Advertencia: El sistema de relaciones (puestos/depts) tiene un error de caché. Cargando datos básicos.')
            } else {
                setEmpleados(data || [])
                setFetchError(null)
            }
        } catch (error: any) {
            console.error('Error fetching empleados:', error)
            setFetchError(error.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleSync(id: string) {
        // TODO: Implementar lógica real de sincronización (e.g. recalcular vacaciones)
        alert('Sincronización de vacaciones no implementada aún.')
    }

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const filteredEmpleados = empleados.filter(emp => {
        const matchesSearch =
            emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.apellido_paterno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.numero_empleado?.toString().includes(searchTerm)

        const matchesStatus = statusFilter === 'Todos'
            ? true
            : emp.estado_empleado === statusFilter

        return matchesSearch && matchesStatus
    }).sort((a, b) => {
        if (!sortConfig) return 0
        const { key, direction } = sortConfig

        let valA = a[key]
        let valB = b[key]

        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()

        if (valA < valB) return direction === 'asc' ? -1 : 1
        if (valA > valB) return direction === 'asc' ? 1 : -1
        return 0
    })

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setImporting(true)
            const data = await parseExcelFile(file)
            if (data.length === 0) return alert('El archivo está vacío')

            // Fetch maps for linkage
            const [deptsRes, puestosRes, unidadesRes] = await Promise.all([
                supabase.from('cat_departamentos').select('id_departamento, departamento'),
                supabase.from('cat_puestos').select('id_puesto, puesto'),
                supabase.from('cat_unidades_trabajo').select('id_unidad, unidad_trabajo')
            ])

            const deptMap = Object.fromEntries(deptsRes.data?.map(d => [d.departamento.toLowerCase().trim(), d.id_departamento]) || [])
            const puestoMap = Object.fromEntries(puestosRes.data?.map(p => [p.puesto.toLowerCase().trim(), p.id_puesto]) || [])
            const unidadMap = Object.fromEntries(unidadesRes.data?.map(u => [u.unidad_trabajo?.toLowerCase().trim(), u.id_unidad]) || [])
            const defaultUnidadId = unidadesRes.data?.[0]?.id_unidad

            const seen = new Set()
            const successLog: string[] = []
            const errorLog: string[] = []
            let insertedCount = 0

            // Procesar fila por fila en lugar de todas de golpe para recolectar errores específicos
            for (let i = 0; i < data.length; i++) {
                const row = data[i]
                const num = parseInt(row.numero_empleado)
                const nombre = row.nombre?.toString()?.trim()

                if (!nombre || isNaN(num)) {
                    errorLog.push(`Fila ${i + 2}: Nombre y Número de empleado son requeridos.`)
                    continue
                }

                if (seen.has(num)) {
                    errorLog.push(`Fila ${i + 2}: Número duplicado en Excel (${num}). Omitido.`)
                    continue
                }
                seen.add(num)

                // Verify dependencies before insert
                const rawDept = row.departamento?.toString().toLowerCase().trim()
                const rawPuesto = row.puesto?.toString().toLowerCase().trim()
                const rawUnidad = row.unidad_trabajo?.toString().toLowerCase().trim()

                const deptId = rawDept ? deptMap[rawDept] : null
                const puestoId = rawPuesto ? puestoMap[rawPuesto] : null
                const unidadId = rawUnidad ? unidadMap[rawUnidad] : defaultUnidadId

                if (rawDept && !deptId) {
                    errorLog.push(`Empleado #${num} (${nombre}): El departamento "${row.departamento}" no existe en la base de datos.`)
                    continue
                }
                if (rawPuesto && !puestoId) {
                    errorLog.push(`Empleado #${num} (${nombre}): El puesto "${row.puesto}" no existe en la base de datos.`)
                    continue
                }

                // UPSERT Empleado
                const empleadoData = {
                    numero_empleado: num,
                    nombre: nombre,
                    apellido_paterno: row.apellido_paterno?.toString().trim() || '',
                    apellido_materno: row.apellido_materno?.toString().trim() || '',
                    curp: row.curp?.toString().toUpperCase() || '',
                    rfc: row.rfc?.toString().toUpperCase() || '',
                    nss: row.nss?.toString() || '',
                    correo_electronico: row.correo_electronico?.toString().trim() || '',
                    telefono: row.telefono?.toString().trim() || '',
                    fecha_nacimiento: row.fecha_nacimiento || null,
                    sexo: row.sexo?.toString() || '',
                    estado_civil: row.estado_civil?.toString() || '',
                    estado_empleado: 'Activo'
                }

                const { data: insertedEmp, error: empError } = await supabase
                    .from('empleados')
                    .upsert(empleadoData, { onConflict: 'numero_empleado' })
                    .select()
                    .single()

                if (empError || !insertedEmp) {
                    errorLog.push(`Empleado #${num}: Error al guardar (${empError?.message})`)
                    continue
                }

                // Inserciones Secundarias (Opcionales, dependientes de departamento/puesto)
                if (deptId && puestoId && unidadId) {
                    const { error: adsError } = await supabase.from('empleado_adscripciones').insert({
                        id_empleado: insertedEmp.id_empleado,
                        id_departamento: deptId,
                        id_puesto: puestoId,
                        id_unidad: unidadId,
                        fecha_inicio: row.fecha_ingreso || new Date().toISOString().split('T')[0]
                    })
                    if (adsError) {
                        errorLog.push(`Empleado #${num}: Creado, pero error al asignar puesto (${adsError.message})`)
                    }
                }

                if (row.fecha_ingreso) {
                    const { error: ingError } = await supabase.from('empleado_ingreso').insert({
                        id_empleado: insertedEmp.id_empleado,
                        fecha_ingreso: row.fecha_ingreso
                    })
                    if (ingError) {
                         // Ignorar si ya existía el ingreso
                         if (ingError.code !== '23505') {
                            errorLog.push(`Empleado #${num}: Error al guardar fecha de ingreso (${ingError.message})`)
                         }
                    }
                }

                insertedCount++;
            }

            // Resumen Final
            let mensajeFinal = `Importación completada. Se importaron ${insertedCount} empleados.`
            if (errorLog.length > 0) {
                mensajeFinal += `\n\nSin embargo, hubo ${errorLog.length} errores:\n` + errorLog.join('\n')
                alert(mensajeFinal) // Para mostrar multiples lineas, un alert o toast personalizado sería mejor
            } else {
                alert(mensajeFinal)
            }

            fetchEmpleados()
        } catch (err: any) {
            alert('Error grave en la importación: ' + err.message)
        } finally {
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    function handleExport() {
        const cleanData = filteredEmpleados.map(emp => {
            const ads = emp.empleado_adscripciones?.find((a: any) => !a.fecha_fin) || emp.empleado_adscripciones?.[0]
            const ing = emp.empleado_ingreso?.[0]?.fecha_ingreso || ''

            return {
                numero_empleado: emp.numero_empleado,
                nombre: emp.nombre,
                apellido_paterno: emp.apellido_paterno,
                apellido_materno: emp.apellido_materno,
                curp: emp.curp,
                rfc: emp.rfc,
                nss: emp.nss || '',
                correo_electronico: emp.correo_electronico || '',
                telefono: emp.telefono || '',
                fecha_nacimiento: emp.fecha_nacimiento || '',
                sexo: emp.sexo || '',
                estado_civil: emp.estado_civil || '',
                fecha_ingreso: ing,
                departamento: ads?.cat_departamentos?.departamento || '',
                puesto: ads?.cat_puestos?.puesto || '',
                unidad_trabajo: ads?.cat_unidades_trabajo?.unidad_trabajo || ''
            }
        })
        exportToExcel(cleanData, `directorio_empleados_${new Date().toISOString().split('T')[0]}`)
    }

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Directorio de Empleados</h1>
                    <p className="text-sm text-zinc-500">Gestione la información de todo el personal</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => downloadTemplate('empleados')}
                        className="inline-flex items-center px-3 py-2 border border-zinc-200 rounded-md shadow-sm text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50 tracking-tighter uppercase"
                    >
                        <FileSpreadsheet className="-ml-1 mr-2 h-4 w-4 text-emerald-600" />
                        Plantilla
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="inline-flex items-center px-3 py-2 border border-zinc-200 rounded-md shadow-sm text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50 tracking-tighter uppercase"
                    >
                        <Upload className="-ml-1 mr-2 h-4 w-4 text-blue-600" />
                        {importing ? 'Cargando...' : 'Importar'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx, .xls"
                        onChange={handleImport}
                    />
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center px-3 py-2 border border-zinc-200 rounded-md shadow-sm text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50 tracking-tighter uppercase"
                    >
                        <Download className="-ml-1 mr-2 h-4 w-4 text-amber-600" />
                        Exportar
                    </button>
                    <Link
                        href="/empleados/nuevo"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ml-2"
                    >
                        <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Nuevo Empleado
                    </Link>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
                <div className="relative flex-grow w-full md:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        className="focus:ring-black focus:border-black block w-full pl-10 sm:text-sm border-zinc-300 rounded-md"
                        placeholder="Buscar por nombre, número de empleado..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-48">
                    <select
                        className="block w-full pl-3 pr-10 py-2 text-base border-zinc-300 focus:outline-none focus:ring-black focus:border-black sm:text-sm rounded-md"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="Activo">Activos</option>
                        <option value="Baja">Bajas</option>
                        <option value="Todos">Todos</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg bg-white shadow border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 cursor-pointer hover:bg-zinc-100"
                                    onClick={() => handleSort('nombre')}
                                >
                                    Empleado {sortConfig?.key === 'nombre' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                                    Rol Actual
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                                    Contacto
                                </th>
                                <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 cursor-pointer hover:bg-zinc-100"
                                    onClick={() => handleSort('estado_empleado')}
                                >
                                    Estado {sortConfig?.key === 'estado_empleado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 w-48">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white">
                            {fetchError ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-red-600 bg-red-50">
                                        <div className="font-bold">Error al cargar datos:</div>
                                        <div>{fetchError}</div>
                                    </td>
                                </tr>
                            ) : loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500">
                                        Cargando empleados...
                                    </td>
                                </tr>
                            ) : filteredEmpleados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500">
                                        No se encontraron empleados registrados.
                                    </td>
                                </tr>
                            ) : (
                                filteredEmpleados.map((empleado) => {
                                    // Find active role
                                    const roles = empleado.empleado_roles || []
                                    const activeRole = roles.sort((a: any, b: any) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())[0]

                                    return (
                                        <tr key={empleado.id_empleado} className="hover:bg-zinc-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 font-bold border border-zinc-300">
                                                        {empleado.nombre.charAt(0)}{empleado.apellido_paterno.charAt(0)}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-zinc-900">
                                                            {empleado.nombre} {empleado.apellido_paterno} {empleado.apellido_materno}
                                                        </div>
                                                        <div className="text-xs text-zinc-500">
                                                            #{empleado.numero_empleado}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {activeRole ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {activeRole.cat_tipos_rol.tipo_rol} ({activeRole.cat_tipos_rol.dias_trabajo}x{activeRole.cat_tipos_rol.dias_descanso})
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-zinc-400 italic">Sin Asignar</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-zinc-900">{empleado.correo_electronico}</div>
                                                <div className="text-sm text-zinc-500">{empleado.telefono}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${empleado.estado_empleado === 'Activo'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {empleado.estado_empleado}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-4">
                                                    <Link href={`/empleados/${empleado.id_empleado}`} className="text-amber-600 hover:text-amber-900">
                                                        Ver Perfil
                                                    </Link>
                                                    <button
                                                        onClick={() => handleSync(empleado.id_empleado)}
                                                        className="text-zinc-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                                        title="Sincronizar Vacaciones"
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* BUTTON 4: Floating Action Button (Bottom Right) */}
            <Link
                href="/empleados/nuevo"
                className="fixed bottom-8 right-8 h-16 w-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-700 transition-all z-50 animate-bounce"
                title="Nuevo Empleado"
            >
                <Plus className="h-8 w-8" />
            </Link>
        </div >
    )
}
