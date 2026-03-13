'use client'

import { useRef, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { ArrowLeft, User, Briefcase, FileText, AlertTriangle, Edit, X, MapPin, CreditCard, Calendar } from 'lucide-react'
import Link from 'next/link'
import { AdscripcionesManager } from '@/components/AdscripcionesManager'
import { IncidenciasManager } from '@/components/IncidenciasManager'
import { VacationBalanceManager } from '@/components/VacationBalanceManager'
import { calculateSDI } from '@/utils/sdiLogic'

export default function EmpleadoDetallePage() {
    const params = useParams()
    const id = params.id as string
    const [empleado, setEmpleado] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('perfil')
    const [isEditing, setIsEditing] = useState(false)

    // Edit Modal State
    const [editTab, setEditTab] = useState('personal')
    const [editForm, setEditForm] = useState<any>({})
    const [turnosDisponibles, setTurnosDisponibles] = useState<any[]>([])
    const [tiposRol, setTiposRol] = useState<any[]>([])
    const [rolActivo, setRolActivo] = useState<any>(null)  // el registro actual de empleado_roles
    const [rolForm, setRolForm] = useState({ id_tipo_rol: '', fecha_inicio: new Date().toISOString().split('T')[0] })
    const [savingRol, setSavingRol] = useState(false)
    const [tipoAsignacion, setTipoAsignacion] = useState<'horario' | 'rol'>('horario')

    // Rehire Modal State
    const [isRehireModalOpen, setIsRehireModalOpen] = useState(false)
    const [rehireDate, setRehireDate] = useState(new Date().toISOString().split('T')[0])

    // Termination Modal State
    const [isTerminationModalOpen, setIsTerminationModalOpen] = useState(false)
    const [terminationForm, setTerminationForm] = useState({
        id_causa_baja: '',
        id_causa_imss: '',
        fecha_baja: new Date().toISOString().split('T')[0],
        comentarios: ''
    })
    const [catalogs, setCatalogs] = useState<{ causasBaja: any[], causasImss: any[], tipoSolicitudBajaId: string | null, tipoSolicitudReingresoId: string | null }>({
        causasBaja: [],
        causasImss: [],
        tipoSolicitudBajaId: null,
        tipoSolicitudReingresoId: null
    })
    const [canManage, setCanManage] = useState(false)

    useEffect(() => {
        checkPermissions()
        fetchEmpleado()
        fetchCatalogs()
    }, [id])

    async function checkPermissions() {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('perfiles')
                .select('rol, cat_departamentos(departamento)')
                .eq('id', user.id)
                .maybeSingle()

            if (profile) {
                const isAdmin = profile.rol === 'Administrativo' || profile.rol === 'Administrador'
                // @ts-ignore
                const deptName = profile.cat_departamentos?.departamento || (Array.isArray(profile.cat_departamentos) ? profile.cat_departamentos[0]?.departamento : '')
                const isHR = profile.rol === 'Jefe' && deptName === 'Recursos Humanos'

                // Allow supervisors to manage their own dept incidences if requested, or just keep Admin/HR
                setCanManage(isAdmin || isHR || profile.rol === 'Supervisor' || profile.rol === 'Coordinador')
            } else {
                // Failsafe in case of 0 rows from perfiles:
                setCanManage(true)
            }
        }
    }

    async function fetchCatalogs() {
        const { data: causasBaja } = await supabase.from('cat_causas_baja').select('*').eq('activo', true)
        const { data: causasImss } = await supabase.from('cat_causas_baja_imss').select('*').eq('activo', true)
        const { data: tipoBaja } = await supabase.from('cat_tipos_solicitud').select('id_tipo_solicitud').eq('tipo_solicitud', 'Baja de Personal').single()
        const { data: tipoReingreso } = await supabase.from('cat_tipos_solicitud').select('id_tipo_solicitud').eq('tipo_solicitud', 'Reingreso').single()

        setCatalogs({
            causasBaja: causasBaja || [],
            causasImss: causasImss || [],
            tipoSolicitudBajaId: tipoBaja?.id_tipo_solicitud || null,
            tipoSolicitudReingresoId: tipoReingreso?.id_tipo_solicitud || null
        })

        // Fetch turnos
        const { data: turnos } = await supabase.from('turnos').select('id, nombre, hora_inicio, hora_fin').eq('activo', true)
        setTurnosDisponibles(turnos || [])

        // Fetch cat_tipos_rol
        const { data: roles } = await supabase.from('cat_tipos_rol').select('id_tipo_rol, tipo_rol, dias_trabajo, dias_descanso').eq('activo', true).order('tipo_rol')
        setTiposRol(roles || [])
    }

    async function fetchEmpleado() {
        if (!id) return

        const { data, error } = await supabase
            .from('empleados')
            .select(`
            *,
            empleado_domicilio(*),
            empleado_ingreso(*),
            empleado_banco(*),
            empleado_salarios(*)
        `)
            .eq('id_empleado', id)
            .single()

        // Fetch rol activo
        const { data: rolesData } = await supabase
            .from('empleado_roles')
            .select('id_empleado_rol, id_tipo_rol, fecha_inicio, cat_tipos_rol(tipo_rol, dias_trabajo, dias_descanso)')
            .eq('id_empleado', id)
            .order('fecha_inicio', { ascending: false })
            .limit(1)
        const rolRec = rolesData?.[0] || null
        setRolActivo(rolRec)
        if (rolRec) {
            setRolForm({ id_tipo_rol: rolRec.id_tipo_rol, fecha_inicio: rolRec.fecha_inicio })
            setTipoAsignacion('rol')
        } else {
            setTipoAsignacion('horario')
        }

        if (!error && data) {
            setEmpleado(data)

            // Normalize as objects
            const domicilio = Array.isArray(data.empleado_domicilio) ? data.empleado_domicilio[0] : data.empleado_domicilio
            const ingreso = Array.isArray(data.empleado_ingreso) ? data.empleado_ingreso[0] : data.empleado_ingreso
            const banco = Array.isArray(data.empleado_banco) ? data.empleado_banco[0] : data.empleado_banco

            // Salarios
            const salarios = (data.empleado_salarios || []).sort((a: any, b: any) =>
                new Date(b.fecha_inicio_vigencia).getTime() - new Date(a.fecha_inicio_vigencia).getTime()
            )
            const latestSalario = salarios[0]

            // Flatten data for edit form
            setEditForm({
                ...data,
                // Domicilio
                id_turno: data.id_turno || '',
                calle: domicilio?.calle || '',
                numero_exterior: domicilio?.numero_exterior || '',
                colonia: domicilio?.colonia || '',
                codigo_postal: domicilio?.codigo_postal || '',
                ciudad: domicilio?.ciudad || '',
                municipio: domicilio?.municipio || '',
                estado: domicilio?.estado || '',
                // Ingreso
                fecha_ingreso: ingreso?.fecha_ingreso || '',
                // Banco
                banco: banco?.banco || '',
                numero_cuenta: banco?.numero_cuenta || '',
                clabe: banco?.clabe || '',
                // Salario
                salario_diario: latestSalario?.salario_diario || '',
                id_empleado_salario: latestSalario?.id_empleado_salario || null,
                salario_original: latestSalario?.salario_diario || ''
            })
        }
        setLoading(false)
    }

    async function handleRehire() {
        if (!rehireDate) {
            alert('Por favor seleccione una fecha de reingreso')
            return
        }

        let reingresoId = catalogs.tipoSolicitudReingresoId

        // Fallback: Fetch if missing (e.g. stale state or connection issue on load)
        if (!reingresoId) {
            const { data } = await supabase.from('cat_tipos_solicitud').select('id_tipo_solicitud').eq('tipo_solicitud', 'Reingreso').single()
            if (data) reingresoId = data.id_tipo_solicitud
        }

        if (!reingresoId) {
            alert('Error: No se encontró el tipo de solicitud "Reingreso" en el sistema. Intente recargar la página.')
            return
        }

        try {
            // Create Rehire Request
            const { error } = await supabase.from('solicitudes').insert({
                id_tipo_solicitud: reingresoId,
                id_empleado_objetivo: id,
                estatus: 'Pendiente',
                folio: `REING-${Date.now()}`,
                payload: {
                    fecha_reingreso: rehireDate,
                    nombre_empleado: `${empleado.nombre} ${empleado.apellido_paterno}`
                }
            })

            if (error) throw error

            setIsRehireModalOpen(false)
            alert('Solicitud de Reingreso iniciada correctamente. Pendiente de aprobación RH.')
        } catch (e: any) {
            alert('Error iniciando reingreso: ' + e.message)
        }
    }

    async function handleTerminate() {
        if (!terminationForm.id_causa_baja || !terminationForm.fecha_baja) {
            alert('Por favor complete los campos obligatorios')
            return
        }

        try {
            if (!catalogs.tipoSolicitudBajaId) {
                alert('Error: No se encontró el tipo de solicitud "Baja" en el sistema.')
                return
            }

            // Create Termination Request (Solicitud)
            const { error } = await supabase.from('solicitudes').insert({
                id_tipo_solicitud: catalogs.tipoSolicitudBajaId,
                id_empleado_objetivo: id,
                estatus: 'Pendiente', // or 'Enviada'
                folio: `BAJA-${Date.now()}`, // Simple folio generation
                payload: {
                    id_causa_baja: terminationForm.id_causa_baja,
                    fecha_baja: terminationForm.fecha_baja,
                    comentarios: terminationForm.comentarios,
                    nombre_empleado: `${empleado.nombre} ${empleado.apellido_paterno}`
                }
            })

            if (error) throw error

            setIsTerminationModalOpen(false)
            alert('Solicitud de Baja iniciada correctamente. Pendiente de aprobación.')
        } catch (e: any) {
            alert('Error iniciando baja: ' + e.message)
        }
    }

    async function handleUpdate() {
        try {
            // 1. Update Main Employee Table
            const { error: empError } = await supabase
                .from('empleados')
                .update({
                    nombre: editForm.nombre,
                    apellido_paterno: editForm.apellido_paterno,
                    apellido_materno: editForm.apellido_materno,
                    telefono: editForm.telefono,
                    correo_electronico: editForm.correo_electronico,
                    sexo: editForm.sexo,
                    fecha_nacimiento: editForm.fecha_nacimiento,
                    estado_civil: editForm.estado_civil,
                    rfc: editForm.rfc,
                    curp: editForm.curp,
                    nss: editForm.nss,
                    id_turno: tipoAsignacion === 'horario' ? (editForm.id_turno || null) : null
                })
                .eq('id_empleado', id)

            if (empError) throw empError

            // 1.5 Rol Upsert/Nullify
            if (tipoAsignacion === 'rol' && rolForm.id_tipo_rol) {
                if (!rolActivo || rolActivo.id_tipo_rol !== rolForm.id_tipo_rol) {
                    const { error: rolError } = await supabase.from('empleado_roles').insert({
                        id_empleado: id,
                        id_tipo_rol: rolForm.id_tipo_rol,
                        fecha_inicio: rolForm.fecha_inicio
                    })
                    if (rolError) throw new Error("Error rol: " + rolError.message)
                }
            }

            // 2. Upsert Domicilio
            const domicilioData = {
                id_empleado: id,
                calle: editForm.calle,
                numero_exterior: editForm.numero_exterior,
                colonia: editForm.colonia,
                codigo_postal: editForm.codigo_postal,
                ciudad: editForm.ciudad,
                municipio: editForm.municipio,
                estado: editForm.estado
            }
            const { error: domError } = await supabase.from('empleado_domicilio').upsert(domicilioData)
            if (domError) console.error("Error domicilio:", domError)

            // 3. Upsert Ingreso (Only if editing allowed, rarely changes unless rehire)
            if (editForm.fecha_ingreso) {
                const { error: ingError } = await supabase.from('empleado_ingreso').upsert({
                    id_empleado: id,
                    fecha_ingreso: editForm.fecha_ingreso
                })
                if (ingError) console.error("Error ingreso:", ingError)
            }

            // 4. Upsert Banco
            if (editForm.banco || editForm.numero_cuenta || editForm.clabe) {
                const bancoData = {
                    id_empleado: id,
                    banco: editForm.banco,
                    numero_cuenta: editForm.numero_cuenta,
                    clabe: editForm.clabe
                }
                const { error: bankError } = await supabase.from('empleado_banco').upsert(bancoData)
                if (bankError) console.error("Error banco:", bankError)
            }

            // 5. Upsert Salario Diario
            if (editForm.salario_diario && parseFloat(editForm.salario_diario) !== parseFloat(editForm.salario_original || 0)) {
                const isCorrection = editForm.id_empleado_salario ? true : false
                const salarioData = isCorrection ? {
                    id_empleado_salario: editForm.id_empleado_salario,
                    id_empleado: id,
                    salario_diario: parseFloat(editForm.salario_diario)
                } : {
                    id_empleado: id,
                    salario_diario: parseFloat(editForm.salario_diario),
                    fecha_inicio_vigencia: editForm.fecha_ingreso || new Date().toISOString().split('T')[0],
                    motivo: 'Salario Inicial / Ajuste'
                }

                const { error: salError } = await supabase.from('empleado_salarios').upsert(salarioData)
                if (salError) console.error("Error salario:", salError)
            }

            // Refresh data
            fetchEmpleado()
            setIsEditing(false)
            alert('Información actualizada correctamente')
        } catch (e: any) {
            alert('Error updating: ' + e.message)
        }
    }

    if (loading) return <div className="p-8 text-center text-zinc-500">Cargando perfil...</div>
    if (!empleado) return <div className="p-8 text-center text-red-500">Empleado no encontrado.</div>

    // Helpers
    const domicilio = Array.isArray(empleado.empleado_domicilio) ? empleado.empleado_domicilio[0] : empleado.empleado_domicilio
    const ingreso = Array.isArray(empleado.empleado_ingreso) ? empleado.empleado_ingreso[0] : empleado.empleado_ingreso
    const banco = Array.isArray(empleado.empleado_banco) ? empleado.empleado_banco[0] : empleado.empleado_banco
    const isBaja = empleado.estado_empleado === 'Baja'

    return (
        <div className="max-w-7xl mx-auto relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <Link href="/empleados" className="p-2 rounded-full hover:bg-zinc-200 transition-colors">
                        <ArrowLeft className="h-6 w-6 text-zinc-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">{empleado.nombre} {empleado.apellido_paterno}</h1>
                        <p className="text-sm text-zinc-500">#{empleado.numero_empleado} • <span className={isBaja ? "text-red-500 font-bold" : "text-green-600"}>{empleado.estado_empleado}</span></p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {canManage && isBaja && (
                        <button
                            onClick={() => setIsRehireModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-md text-sm font-medium text-green-700 hover:bg-green-100 transition-colors shadow-sm"
                        >
                            <User className="w-4 h-4 mr-2" />
                            Recontratar
                        </button>
                    )}

                    {!isBaja && (
                        <>
                            {canManage && (
                                <button
                                    onClick={() => setIsTerminationModalOpen(true)}
                                    className="flex items-center px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                                >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Dar de Baja
                                </button>
                            )}
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center px-4 py-2 bg-white border border-zinc-300 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar Perfil
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Rehire Modal */}
            {isRehireModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden border-2 border-green-100">
                        <div className="p-6 border-b border-green-50 bg-green-50/30 flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900">Recontratar Empleado</h3>
                                <p className="text-xs text-green-600 font-medium">Se reiniciará la antigüedad y vacaciones.</p>
                            </div>
                            <button onClick={() => setIsRehireModalOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-xs font-bold text-zinc-700 mb-2">Nueva Fecha de Ingreso</label>
                            <input
                                type="date"
                                className="w-full text-sm border-zinc-300 rounded-md text-black bg-white"
                                value={rehireDate}
                                onChange={e => setRehireDate(e.target.value)}
                            />
                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setIsRehireModalOpen(false)} className="mr-3 text-sm text-zinc-500 hover:text-zinc-800">Cancelar</button>
                                <button
                                    onClick={handleRehire}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                                >
                                    Confirmar Reingreso
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="border-b border-zinc-200 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {['perfil', 'historial', 'incidencias', 'vacaciones'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors
                                ${activeTab === tab
                                    ? 'border-black text-black'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}
                            `}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content: Perfil */}
            {activeTab === 'perfil' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                    <div className="space-y-6">
                        {/* Información Personal */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                            <h3 className="font-bold text-zinc-900 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2" />
                                Información Personal
                            </h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">RFC</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{empleado.rfc || '-'}</dd>
                                </div>
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">CURP</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{empleado.curp || '-'}</dd>
                                </div>
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">NSS</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{empleado.nss || '-'}</dd>
                                </div>
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">Fecha Nacimiento</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{empleado.fecha_nacimiento || '-'}</dd>
                                </div>
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">Sexo</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{empleado.sexo || '-'}</dd>
                                </div>
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">Estado Civil</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{empleado.estado_civil || '-'}</dd>
                                </div>
                                <div className="col-span-2">
                                    <dt className="text-xs font-medium text-zinc-500">Correo Electrónico</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{empleado.correo_electronico || '-'}</dd>
                                </div>
                                <div className="col-span-2">
                                    <dt className="text-xs font-medium text-zinc-500">Teléfono</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{empleado.telefono || '-'}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Domicilio */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                            <h3 className="font-bold text-zinc-900 mb-4 flex items-center">
                                <MapPin className="w-5 h-5 mr-2" />
                                Domicilio
                            </h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <div className="col-span-2">
                                    <dt className="text-xs font-medium text-zinc-500">Calle y Número</dt>
                                    <dd className="text-sm font-medium text-zinc-900">
                                        {domicilio?.calle} {domicilio?.numero_exterior}
                                    </dd>
                                </div>
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">Colonia</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{domicilio?.colonia || '-'}</dd>
                                </div>
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">C.P.</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{domicilio?.codigo_postal || '-'}</dd>
                                </div>
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">Ciudad/Municipio</dt>
                                    <dd className="text-sm font-medium text-zinc-900">
                                        {domicilio?.ciudad} {domicilio?.municipio ? `, ${domicilio.municipio}` : ''}
                                    </dd>
                                </div>
                                <div className="col-span-1">
                                    <dt className="text-xs font-medium text-zinc-500">Estado</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{domicilio?.estado || '-'}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Datos Bancarios */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                            <h3 className="font-bold text-zinc-900 mb-4 flex items-center">
                                <CreditCard className="w-5 h-5 mr-2" />
                                Datos Bancarios
                            </h3>
                            <dl className="space-y-4">
                                <div>
                                    <dt className="text-xs font-medium text-zinc-500">Banco</dt>
                                    <dd className="text-sm font-medium text-zinc-900">{banco?.banco || 'No registrado'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-zinc-500">Número de Cuenta</dt>
                                    <dd className="text-sm font-medium text-zinc-900 font-mono bg-zinc-50 p-1 rounded inline-block">
                                        {banco?.numero_cuenta || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-zinc-500">CLABE</dt>
                                    <dd className="text-sm font-medium text-zinc-900 font-mono bg-zinc-50 p-1 rounded inline-block">
                                        {banco?.clabe || '-'}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* Datos de Ingreso */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                            <h3 className="font-bold text-zinc-900 mb-4 flex items-center">
                                <Briefcase className="w-5 h-5 mr-2" />
                                Información Laboral
                            </h3>
                            <dl className="space-y-4">
                                <div>
                                    <dt className="text-xs font-medium text-zinc-500">Fecha de Ingreso Vigente</dt>
                                    <dd className="text-sm font-bold text-zinc-900">
                                        {ingreso?.fecha_ingreso || 'No registrada'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'historial' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <AdscripcionesManager idEmpleado={id} isReadOnly={isBaja} />
                </div>
            )}

            {activeTab === 'incidencias' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <IncidenciasManager idEmpleado={id} isReadOnly={isBaja || !canManage} />
                </div>
            )}

            {activeTab === 'vacaciones' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <VacationBalanceManager idEmpleado={id} fechaIngreso={ingreso?.fecha_ingreso} isReadOnly={!canManage} />
                </div>
            )}


            {/* Edit Modal */}
            {
                isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center p-6 border-b border-zinc-200 shrink-0">
                                <div>
                                    <h3 className="text-xl font-bold text-zinc-900">Editar Información</h3>
                                    <p className="text-sm text-zinc-500">Actualice los datos del empleado</p>
                                </div>
                                <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-zinc-900">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Tabs */}
                            <div className="bg-zinc-50 border-b border-zinc-200 px-6 shrink-0">
                                <nav className="-mb-px flex space-x-6">
                                    {['personal', 'domicilio', 'bancario', 'laboral', 'turnos'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setEditTab(t)}
                                            className={`capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${editTab === t
                                                ? 'border-black text-black'
                                                : 'border-transparent text-zinc-500 hover:text-zinc-700'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                {editTab === 'personal' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Nombre</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Apellido Paterno</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.apellido_paterno} onChange={e => setEditForm({ ...editForm, apellido_paterno: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Apellido Materno</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.apellido_materno} onChange={e => setEditForm({ ...editForm, apellido_materno: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Sexo</label>
                                            <select className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.sexo} onChange={e => setEditForm({ ...editForm, sexo: e.target.value })}>
                                                <option value="Masculino">Masculino</option>
                                                <option value="Femenino">Femenino</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Fecha Nacimiento</label>
                                            <input type="date" className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.fecha_nacimiento} onChange={e => setEditForm({ ...editForm, fecha_nacimiento: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Estado Civil</label>
                                            <select className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.estado_civil} onChange={e => setEditForm({ ...editForm, estado_civil: e.target.value })}>
                                                <option value="">Seleccionar...</option>
                                                <option value="Soltero">Soltero/a</option>
                                                <option value="Casado">Casado/a</option>
                                                <option value="Divorciado">Divorciado/a</option>
                                                <option value="Viudo">Viudo/a</option>
                                                <option value="Union Libre">Unión Libre</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 border-t pt-4 mt-2">
                                            <h4 className="text-xs font-bold text-zinc-900 mb-4">Contacto</h4>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Teléfono</label>
                                                    <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.telefono} onChange={e => setEditForm({ ...editForm, telefono: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Correo Electrónico</label>
                                                    <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.correo_electronico} onChange={e => setEditForm({ ...editForm, correo_electronico: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {editTab === 'domicilio' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Calle</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.calle} onChange={e => setEditForm({ ...editForm, calle: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">No. Exterior</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.numero_exterior} onChange={e => setEditForm({ ...editForm, numero_exterior: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Código Postal</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.codigo_postal} onChange={e => setEditForm({ ...editForm, codigo_postal: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Colonia</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.colonia} onChange={e => setEditForm({ ...editForm, colonia: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Ciudad</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.ciudad} onChange={e => setEditForm({ ...editForm, ciudad: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Municipio</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.municipio} onChange={e => setEditForm({ ...editForm, municipio: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Estado</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.estado} onChange={e => setEditForm({ ...editForm, estado: e.target.value })} />
                                        </div>
                                    </div>
                                )}

                                {editTab === 'laboral' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">RFC</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md uppercase text-black bg-white" value={editForm.rfc} onChange={e => setEditForm({ ...editForm, rfc: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">CURP</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md uppercase text-black bg-white" value={editForm.curp} onChange={e => setEditForm({ ...editForm, curp: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">NSS</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.nss} onChange={e => setEditForm({ ...editForm, nss: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Fecha Ingreso</label>
                                            <input type="date" className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.fecha_ingreso} onChange={e => setEditForm({ ...editForm, fecha_ingreso: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Sueldo Diario Base Vigente</label>
                                            <input type="number" step="0.01" className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.salario_diario} onChange={e => setEditForm({ ...editForm, salario_diario: e.target.value })} />
                                            <p className="text-xs text-gray-500 mt-1">
                                                {editForm.salario_diario && editForm.fecha_ingreso && (
                                                    <span className="text-green-600 font-bold bg-green-50 p-1 rounded inline-block">
                                                        SDI Calculado: ${calculateSDI(parseFloat(editForm.salario_diario), editForm.fecha_ingreso)}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {editTab === 'bancario' && (
                                    <div className="grid grid-cols-1 gap-6 animate-in fade-in">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Banco</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.banco} onChange={e => setEditForm({ ...editForm, banco: e.target.value })} placeholder="Ej. BBVA" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">Número de Cuenta</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.numero_cuenta} onChange={e => setEditForm({ ...editForm, numero_cuenta: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">CLABE Interbancaria</label>
                                            <input className="w-full text-sm border-zinc-300 rounded-md text-black bg-white" value={editForm.clabe} onChange={e => setEditForm({ ...editForm, clabe: e.target.value })} />
                                        </div>
                                    </div>
                                )}

                                {editTab === 'turnos' && (
                                    <div className="space-y-6 animate-in fade-in">
                                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 mb-4">
                                            <h4 className="text-sm font-bold text-zinc-900 mb-3">Tipo de Asignación Laboral</h4>
                                            <div className="flex space-x-6">
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="tipo_asignacion"
                                                        value="horario"
                                                        checked={tipoAsignacion === 'horario'}
                                                        onChange={() => setTipoAsignacion('horario')}
                                                        className="text-amber-600 focus:ring-amber-500"
                                                    />
                                                    <span className="text-sm font-medium text-zinc-700">Horario Fijo (6x1 u 8Hrs)</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="tipo_asignacion"
                                                        value="rol"
                                                        checked={tipoAsignacion === 'rol'}
                                                        onChange={() => setTipoAsignacion('rol')}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium text-zinc-700">Rol de Guardia (Ciclo Mina)</span>
                                                </label>
                                            </div>
                                        </div>

                                        {tipoAsignacion === 'horario' && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                                                <h4 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" /> Turno del Checador
                                                </h4>
                                                <p className="text-xs text-amber-600 mb-4">Define el horario para calcular puntualidad en el checador (entrada/salida).</p>
                                                <label className="block text-xs font-medium text-zinc-600 mb-1">Turno Asignado</label>
                                                <select
                                                    className="w-full text-sm border border-zinc-300 rounded-lg text-black bg-white p-2"
                                                    value={editForm.id_turno || ''}
                                                    onChange={e => setEditForm({ ...editForm, id_turno: e.target.value })}
                                                >
                                                    <option value="">Sin turno fijo (Horario Libre)</option>
                                                    {turnosDisponibles.map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.nombre} ({t.hora_inicio?.slice(0, 5) || 'N/A'} – {t.hora_fin?.slice(0, 5) || 'Libre'})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={handleUpdate}
                                                    className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors"
                                                >
                                                    Guardar Turno
                                                </button>
                                            </div>
                                        )}

                                        {tipoAsignacion === 'rol' && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                                                <h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                                                    <Briefcase className="w-4 h-4" /> Rol de Trabajo (Ciclo)
                                                </h4>
                                                <p className="text-xs text-blue-600 mb-4">Define el ciclo de días trabajo/descanso (ej. 5x2). Se usa en el Calendario y la Prenómina para calcular faltas y asistencias.</p>

                                                {rolActivo && (() => {
                                                    const tr = Array.isArray(rolActivo.cat_tipos_rol) ? rolActivo.cat_tipos_rol[0] : rolActivo.cat_tipos_rol
                                                    return (
                                                        <div className="mb-4 p-3 bg-white border border-blue-200 rounded-lg flex items-center justify-between">
                                                            <div>
                                                                <span className="text-xs text-zinc-500">Rol actual: </span>
                                                                <span className="font-bold text-blue-700 text-sm">{tr?.tipo_rol || 'Sin datos'}</span>
                                                                <span className="text-zinc-400 text-xs ml-2">desde {rolActivo.fecha_inicio}</span>
                                                            </div>
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">Activo</span>
                                                        </div>
                                                    )
                                                })()}

                                                {!rolActivo && (
                                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                                                        ⚠️ Sin rol asignado — las faltas y descansos no se calcularán en el Calendario.
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-zinc-600 mb-1">{rolActivo ? 'Nuevo Rol de Trabajo' : 'Asignar Rol'}</label>
                                                        <select
                                                            className="w-full text-sm border border-zinc-300 rounded-lg text-black bg-white p-2"
                                                            value={rolForm.id_tipo_rol}
                                                            onChange={e => setRolForm({ ...rolForm, id_tipo_rol: e.target.value })}
                                                        >
                                                            <option value="">Seleccionar Rol...</option>
                                                            {tiposRol.map(r => (
                                                                <option key={r.id_tipo_rol} value={r.id_tipo_rol}>
                                                                    {r.tipo_rol} — {r.dias_trabajo} días trabajo, {r.dias_descanso} descanso
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha Inicio</label>
                                                        <input
                                                            type="date"
                                                            className="w-full text-sm border border-zinc-300 rounded-lg text-black bg-white p-2"
                                                            value={rolForm.fecha_inicio}
                                                            onChange={e => setRolForm({ ...rolForm, fecha_inicio: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleUpdate}
                                                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    Guardar Cambios
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end p-6 border-t border-zinc-200 bg-zinc-50 shrink-0">

                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 mr-2">Cancelar</button>
                                <button onClick={handleUpdate} className="px-6 py-2 text-sm bg-black text-white font-bold rounded-md hover:bg-zinc-800 shadow-md">Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Termination Modal */}
            {
                isTerminationModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border-2 border-red-100">
                            <div className="p-6 border-b border-red-50 bg-red-50/30 flex justify-between items-start">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-red-100 rounded-full">
                                        <AlertTriangle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-zinc-900">Iniciar Baja</h3>
                                        <p className="text-xs text-red-600 font-medium">Acción Irreversible: Requiere Aprobación</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsTerminationModalOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-700 mb-1">Motivo de la Baja</label>
                                    <select
                                        className="w-full text-sm border-zinc-300 rounded-md text-black bg-white"
                                        value={terminationForm.id_causa_baja}
                                        onChange={e => setTerminationForm({ ...terminationForm, id_causa_baja: e.target.value })}
                                    >
                                        <option value="">Seleccione un motivo...</option>
                                        {catalogs.causasBaja.map((c: any) => (
                                            <option key={c.id_causa_baja} value={c.id_causa_baja}>{c.causa}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Show IMSS Cause if selected reason matches typical cases or just always show as optional? 
                                User Requirement: "causas dle imss solo para dar de baja ante el imss"
                                Let's show it always as "Causa Oficial IMSS" 
                            */}


                                <div>
                                    <label className="block text-xs font-bold text-zinc-700 mb-1">Fecha Efectiva de Baja</label>
                                    <input
                                        type="date"
                                        className="w-full text-sm border-zinc-300 rounded-md text-black bg-white"
                                        value={terminationForm.fecha_baja}
                                        onChange={e => setTerminationForm({ ...terminationForm, fecha_baja: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-zinc-700 mb-1">Comentarios / Justificación</label>
                                    <textarea
                                        className="w-full text-sm border-zinc-300 rounded-md text-black bg-white h-24"
                                        placeholder="Detalles adicionales sobre la baja..."
                                        value={terminationForm.comentarios}
                                        onChange={e => setTerminationForm({ ...terminationForm, comentarios: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end space-x-3">
                                <button
                                    onClick={() => setIsTerminationModalOpen(false)}
                                    className="px-4 py-2 border border-zinc-300 rounded-md text-sm text-zinc-600 hover:bg-zinc-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleTerminate}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-bold hover:bg-red-700 shadow-sm"
                                >
                                    Enviar Solicitud de Baja
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    )
}
