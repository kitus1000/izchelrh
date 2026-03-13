'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { CheckCircle2, XCircle, Clock, Camera, KeyRound, AlertCircle, LogIn, LogOut, Coffee } from 'lucide-react'

// --- Tipos Principales ---
type EstadoChecador =
    | 'IDLE' // Mismo que TIPO_NO_SELECCIONADO
    | 'TIPO_SELECCIONADO'
    | 'LEYENDO_QR'
    | 'CAPTURANDO_ID'
    | 'REQUIERE_CODIGO'
    | 'VALIDANDO_CODIGO'
    | 'PROCESANDO'
    | 'EXITO'
    | 'ERROR'

type TipoChecada = 'ENTRADA' | 'SALIDA' | 'COMIDA_SALIDA' | 'COMIDA_REGRESO' | 'PERMISO_PERSONAL' | 'REGRESO_PERMISO_PERSONAL' | 'SALIDA_OPERACIONES' | 'REGRESO_OPERACIONES'

interface ChecadaDef {
    id: TipoChecada
    label: string
    color: string
    icon: React.ReactNode
    requiereCodigo: boolean
}

const TIPOS_CHECADA: ChecadaDef[] = [
    { id: 'ENTRADA', label: 'ENTRADA', color: 'bg-green-600 hover:bg-green-500', icon: <LogIn className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'SALIDA', label: 'SALIDA', color: 'bg-red-600 hover:bg-red-500', icon: <LogOut className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'COMIDA_SALIDA', label: 'COMIDA – SALIDA', color: 'bg-amber-500 hover:bg-amber-400', icon: <Coffee className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'COMIDA_REGRESO', label: 'COMIDA – REGRESO', color: 'bg-amber-600 hover:bg-amber-500', icon: <LogIn className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'PERMISO_PERSONAL', label: 'PERMISO SALIDA', color: 'bg-blue-600 hover:bg-blue-500', icon: <LogOut className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: true },
    { id: 'REGRESO_PERMISO_PERSONAL', label: 'PERMISO REGRESO', color: 'bg-blue-500 hover:bg-blue-400', icon: <LogIn className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'SALIDA_OPERACIONES', label: 'OP. SALIDA', color: 'bg-indigo-600 hover:bg-indigo-500', icon: <LogOut className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: true },
    { id: 'REGRESO_OPERACIONES', label: 'OP. REGRESO', color: 'bg-indigo-500 hover:bg-indigo-400', icon: <LogIn className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
]


export default function ChecadorKiosko() {
    // --- State ---
    const [estado, setEstado] = useState<EstadoChecador>('IDLE')
    const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoChecada | null>(null)
    const [idManual, setIdManual] = useState('')
    const [codigoAutorizacion, setCodigoAutorizacion] = useState('')
    const [errorMsg, setErrorMsg] = useState('')
    const [empleadoValidado, setEmpleadoValidado] = useState<any>(null)

    // System Time
    const [hora, setHora] = useState<Date | null>(null)
    const [isOnline, setIsOnline] = useState(true)

    // Resultados Mock (Solo para UI)
    const [mockResult, setMockResult] = useState<{
        nombre: string
        estatus: 'PUNTUAL' | 'RETARDO' | 'FUERA_VENTANA' | 'FALTA'
        horario?: string
    } | null>(null)

    // --- Efectos de Sistema ---
    useEffect(() => {
        setHora(new Date())
        const timer = setInterval(() => setHora(new Date()), 1000)

        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        setIsOnline(navigator.onLine)

        return () => {
            clearInterval(timer)
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Reseteo por inactividad (60 segundos sin tocar)
    useEffect(() => {
        let timeoutId: NodeJS.Timeout
        if (estado !== 'IDLE' && estado !== 'EXITO' && estado !== 'ERROR') {
            timeoutId = setTimeout(() => {
                resetFlujo()
            }, 60000)
        }
        return () => clearTimeout(timeoutId)
    }, [estado, tipoSeleccionado, idManual, codigoAutorizacion])


    // --- Handlers de Flujo ---

    const resetFlujo = () => {
        setEstado('IDLE')
        setTipoSeleccionado(null)
        setIdManual('')
        setCodigoAutorizacion('')
        setErrorMsg('')
        setMockResult(null)
        setEmpleadoValidado(null)
    }

    const handleSeleccionarTipo = (tipoId: TipoChecada) => {
        setTipoSeleccionado(tipoId)
        setEstado('TIPO_SELECCIONADO')
        // Si ya había código o id, reseteamos esos campos por si cambia el flujo
        setIdManual('')
        setCodigoAutorizacion('')
        setErrorMsg('')
    }

    const procesarExito = async (emp: any, codigoExtra = '') => {
        setEstado('PROCESANDO')

        try {
            const response = await fetch('/api/checadas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_empleado_token: idManual,
                    tipo_checada: tipoSeleccionado,
                    codigo_autorizacion: codigoExtra || null,
                    metodo: 'ID_MANUAL',
                    timestamp_local: new Date().toISOString()
                })
            })

            const result = await response.json()

            if (!response.ok) {
                setErrorMsg(result.mensaje || 'Error desconocido al registrar checada.')
                // Si es una falta, guardamos el horario para mostrarlo en el error
                if (result.empleado) {
                    setMockResult({
                        nombre: result.empleado.nombre,
                        estatus: 'FALTA',
                        horario: result.empleado.horario
                    })
                }
                setEstado('ERROR')
                setTimeout(resetFlujo, 6000)
                return
            }

            setMockResult({
                nombre: result.empleado.nombre,
                estatus: result.estatus_puntualidad,
                horario: result.empleado.horario
            })
            setEstado('EXITO')
            setTimeout(resetFlujo, 5000)

        } catch (error) {
            setErrorMsg('Error de conectividad. Consulta a soporte tech.')
            setEstado('ERROR')
            setTimeout(resetFlujo, 4000)
        }
    }

    const handleChecar = async () => {
        if (!tipoSeleccionado) return
        if (!idManual) return

        setEstado('PROCESANDO')

        try {
            // Validar existencia de empleado en BD real
            const { data: emp, error } = await supabase
                .from('empleados')
                .select('id_empleado, nombre, apellido_paterno, apellido_materno, estado_empleado')
                .eq('numero_empleado', idManual)
                .single()

            if (error || !emp) {
                setErrorMsg('ID inválido. No se encontró al empleado en la base de datos.')
                setEstado('ERROR')
                setTimeout(resetFlujo, 4000)
                return
            }

            if (emp.estado_empleado !== 'Activo') {
                setErrorMsg('Este empleado se encuentra dado de BAJA del sistema.')
                setEstado('ERROR')
                setTimeout(resetFlujo, 4000)
                return
            }

            // Empleado existe y es activo
            setEmpleadoValidado(emp)
            const configTipo = TIPOS_CHECADA.find(t => t.id === tipoSeleccionado)

            if (configTipo?.requiereCodigo) {
                setEstado('REQUIERE_CODIGO')
            } else {
                procesarExito(emp)
            }

        } catch (e: any) {
            setErrorMsg('Error de conexión al validar ID.')
            setEstado('ERROR')
            setTimeout(resetFlujo, 4000)
        }
    }

    const handleValidarCodigo = async () => {
        if (codigoAutorizacion.length !== 6) {
            setErrorMsg('El código debe tener exactamente 6 dígitos.')
            return
        }

        setErrorMsg('')
        procesarExito(empleadoValidado, codigoAutorizacion)
    }

    // --- Renders ---
    const renderHeader = () => (
        <header className="flex items-center justify-between p-6 bg-zinc-900 border-b border-zinc-800">
            <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                    <Clock className="w-7 h-7 text-black" />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-widest text-white">EL EXPEDIENTE</h1>
                    <p className="text-sm text-zinc-400 font-medium">TERMINAL DE ASISTENCIA</p>
                </div>
            </div>

            <div className="flex flex-col items-end">
                <div className="text-4xl font-black tracking-tight font-mono text-white">
                    {hora ? hora.toLocaleTimeString('es-MX', { hour12: false }) : '00:00:00'}
                </div>
                <div className="flex items-center space-x-3 text-sm font-medium mt-1">
                    <span className="text-zinc-400 uppercase">
                        {hora ? hora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Cargando...'}
                    </span>
                    <div className="flex items-center bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
                        <span className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className={isOnline ? 'text-green-400' : 'text-red-400'}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                </div>
            </div>
        </header>
    )

    const isIdentidadDisabled = estado === 'IDLE' || estado === 'REQUIERE_CODIGO' || estado === 'VALIDANDO_CODIGO' || estado === 'PROCESANDO'

    return (
        <div className="flex flex-col h-screen bg-black overflow-hidden relative selection:bg-transparent">
            {renderHeader()}

            <div className="flex-1 flex p-6 gap-8 h-full">

                {/* Columna Izquierda: Botonera  */}
                <div className="w-1/2 flex flex-col justify-center gap-4">
                    <h2 className="text-2xl font-bold text-zinc-300 uppercase tracking-wide text-center mb-2">
                        1. Selecciona tu Trámite
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                        {TIPOS_CHECADA.map(tipo => {
                            const isSelected = tipoSeleccionado === tipo.id;
                            const baseClasses = "flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all duration-200 border-2 select-none active:scale-95"
                            const colorClasses = isSelected
                                ? `${tipo.color} border-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-[1.02]`
                                : `bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500`

                            return (
                                <button
                                    key={tipo.id}
                                    onClick={() => handleSeleccionarTipo(tipo.id)}
                                    className={`${baseClasses} ${colorClasses}`}
                                    disabled={estado === 'PROCESANDO' || estado === 'VALIDANDO_CODIGO' || estado === 'REQUIERE_CODIGO'}
                                >
                                    {tipo.icon}
                                    <span className={`font-black uppercase tracking-wide leading-tight ${isSelected ? 'text-white text-md' : 'text-zinc-300 text-sm'}`}>
                                        {tipo.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px bg-zinc-800 my-8"></div>

                {/* Columna Derecha: Identificación y Flujos  */}
                <div className="w-1/2 flex flex-col justify-center items-center px-10">

                    {estado === 'IDLE' && (
                        <div className="text-center opacity-40 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                            <AlertCircle className="w-24 h-24 text-zinc-500 mb-6" />
                            <h2 className="text-3xl font-black text-white text-center">ESPERANDO ACCIÓN</h2>
                            <p className="text-xl text-zinc-400 mt-2 text-center">Toca un tipo de checada en la pantalla de la izquierda para comenzar.</p>
                        </div>
                    )}

                    {estado !== 'IDLE' && (
                        <div className="w-full max-w-md animate-in slide-in-from-right-8 duration-300">

                            {/* Info de Selección */}
                            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-8 text-center flex flex-col items-center">
                                <p className="text-zinc-400 font-medium uppercase tracking-widest text-sm mb-1">Paso 2 / Identificación</p>
                                <div className="text-2xl font-black text-white flex items-center justify-center space-x-3">
                                    {TIPOS_CHECADA.find(t => t.id === tipoSeleccionado)?.icon}
                                    <span>{TIPOS_CHECADA.find(t => t.id === tipoSeleccionado)?.label}</span>
                                </div>
                            </div>

                            {/* Modos de ID - Solo visible si no se requiere código (o como paso previo) */}
                            {estado !== 'REQUIERE_CODIGO' && estado !== 'VALIDANDO_CODIGO' && (
                                <div className={`space-y-6 transition-opacity duration-300 ${isIdentidadDisabled ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>

                                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white p-6 rounded-2xl flex flex-col items-center justify-center space-y-3 font-bold border border-blue-400 transition-colors active:scale-95 shadow-lg">
                                        <Camera className="w-12 h-12" />
                                        <span className="text-xl tracking-wide uppercase">Tocar para Escanear QR</span>
                                    </button>

                                    <div className="flex items-center space-x-4 my-8">
                                        <div className="flex-1 h-px bg-zinc-700"></div>
                                        <span className="text-zinc-500 font-bold tracking-widest uppercase">O ingresa manual</span>
                                        <div className="flex-1 h-px bg-zinc-700"></div>
                                    </div>

                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="N° Empleado"
                                            className="w-full bg-zinc-900 border-2 border-zinc-700 text-white text-3xl font-mono text-center p-4 rounded-xl focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all"
                                            value={idManual}
                                            onChange={e => setIdManual(e.target.value.replace(/\D/g, ''))} // Solo núms
                                            disabled={isIdentidadDisabled}
                                        />
                                        <button
                                            onClick={handleChecar}
                                            disabled={!idManual || isIdentidadDisabled}
                                            className="w-full bg-white text-black font-black uppercase tracking-widest text-2xl p-4 rounded-xl hover:bg-zinc-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all border-b-4 border-zinc-400 active:border-b-0 mt-2"
                                        >
                                            Checar Asistencia
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Bloque Autorización */}
                            {(estado === 'REQUIERE_CODIGO' || estado === 'VALIDANDO_CODIGO') && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-300">
                                    <div className="bg-indigo-900/30 border border-indigo-500/50 p-6 rounded-2xl text-center">
                                        <KeyRound className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-indigo-200 mb-2">Requiere Autorización</h3>
                                        <p className="text-indigo-200/70 text-sm">Este trámite requiere un código generado por tu supervisor.</p>

                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="000000"
                                            className="w-full mt-6 bg-black border-2 border-indigo-500 text-white text-5xl font-mono text-center p-4 rounded-xl focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 tracking-[0.5em]"
                                            value={codigoAutorizacion}
                                            onChange={e => setCodigoAutorizacion(e.target.value.replace(/\D/g, ''))}
                                            disabled={estado === 'VALIDANDO_CODIGO'}
                                        />
                                        <p className="text-center text-indigo-400/50 text-sm mt-2 font-mono">Usa "000000" para error</p>

                                        <button
                                            onClick={handleValidarCodigo}
                                            disabled={codigoAutorizacion.length !== 6 || estado === 'VALIDANDO_CODIGO'}
                                            className="w-full mt-6 bg-indigo-600 text-white font-black uppercase tracking-widest text-xl p-4 rounded-xl hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all border-b-4 border-indigo-800 active:border-b-0"
                                        >
                                            {estado === 'VALIDANDO_CODIGO' ? 'Verificando...' : 'Validar Código'}
                                        </button>

                                        <button
                                            onClick={() => setEstado('TIPO_SELECCIONADO')}
                                            disabled={estado === 'VALIDANDO_CODIGO'}
                                            className="w-full mt-4 bg-transparent text-indigo-300 font-bold uppercase text-sm p-4 hover:bg-indigo-900/50 rounded-xl"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Error Inline Helper */}
                            {errorMsg && estado !== 'ERROR' && (
                                <div className="mt-6 p-4 bg-red-900/30 border border-red-500 rounded-xl flex items-center space-x-3 text-red-200 animate-in fade-in duration-300">
                                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                                    <p className="text-sm font-medium">{errorMsg}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* OVERLAYS FULLSCREEN */}

            {/* Spinner Overlay */}
            {(estado === 'PROCESANDO' || estado === 'VALIDANDO_CODIGO') && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <div className="w-20 h-20 border-8 border-zinc-700 border-t-amber-500 rounded-full animate-spin mb-8"></div>
                    <h2 className="text-3xl font-black text-white tracking-widest uppercase animate-pulse">
                        {estado === 'VALIDANDO_CODIGO' ? 'Validando Autorización...' : 'Procesando Registro...'}
                    </h2>
                </div>
            )}

            {/* Overlays de Resultado */}
            {estado === 'EXITO' && mockResult && (
                <div className="absolute inset-0 z-50 bg-green-600 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
                    <CheckCircle2 className="w-48 h-48 text-white mb-8 drop-shadow-2xl" />
                    <h1 className="text-7xl font-black text-white uppercase tracking-tighter mb-4 shadow-black drop-shadow-lg text-center">
                        ¡{TIPOS_CHECADA.find(t => t.id === tipoSeleccionado)?.label || 'REGISTRO'} EXITOSO!
                    </h1>

                    <div className="bg-black/20 p-8 rounded-3xl backdrop-blur-md mb-12 min-w-[600px] text-center border border-white/10 shadow-2xl">
                        <p className="text-green-50 text-2xl font-medium mb-1">EMPLEADO</p>
                        <p className="text-white text-5xl font-black mb-8">{mockResult.nombre}</p>

                        <div className="grid grid-cols-2 gap-8 text-left">
                            <div>
                                <p className="text-green-100 text-xl font-medium mb-1 uppercase">Trámite</p>
                                <p className="text-white text-3xl font-bold">{TIPOS_CHECADA.find(t => t.id === tipoSeleccionado)?.label}</p>
                            </div>
                            <div>
                                <p className="text-green-100 text-xl font-medium mb-1 uppercase">Hora Real</p>
                                <p className="text-white text-3xl font-mono font-bold">{hora?.toLocaleTimeString('es-MX', { hour12: false })}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center space-y-4">
                        <div className={`px-10 py-4 rounded-full border-4 text-4xl font-black tracking-widest uppercase shadow-2xl ${mockResult.estatus === 'PUNTUAL' ? 'bg-green-700 border-green-400 text-green-100' : 'bg-amber-500 border-amber-300 text-black'}`}>
                            {mockResult.estatus === 'PUNTUAL' ? '🟢 PUNTUAL' : '🟡 RETARDO'}
                        </div>
                        {mockResult.horario && (
                            <p className="text-white/80 text-xl font-bold bg-black/40 px-6 py-2 rounded-full border border-white/10 uppercase tracking-widest">
                                Horario Asignado: {mockResult.horario}
                            </p>
                        )}
                    </div>

                    <div className="absolute bottom-0 left-0 h-4 bg-white/30 animate-[shrink_3.5s_linear_forwards] w-full origin-left"></div>
                </div>
            )}

            {estado === 'ERROR' && (
                <div className="absolute inset-0 z-50 bg-red-600 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200 px-10 text-center">
                    <XCircle className="w-48 h-48 text-white mb-8 drop-shadow-2xl" />
                    <h1 className="text-7xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-lg">ERROR DE REGISTRO</h1>
                    <p className="text-3xl text-red-100 font-medium max-w-4xl leading-tight bg-black/20 p-8 rounded-3xl border border-white/10 shadow-2xl">
                        {errorMsg || 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.'}
                    </p>
                    {mockResult?.horario && (
                        <div className="mt-8 bg-black/80 p-6 rounded-2xl border-2 border-white/20 shadow-xl">
                            <p className="text-red-200 text-xl font-bold uppercase mb-2">Tu Horario Asignado es:</p>
                            <p className="text-white text-5xl font-black font-mono tracking-tighter">{mockResult.horario}</p>
                            <p className="text-red-300/70 text-sm mt-4 italic">No puedes ingresar después del límite de tolerancia.</p>
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 h-4 bg-white/30 animate-[shrink_4s_linear_forwards] w-full origin-left"></div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}} />
        </div>
    )
}
