'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import {
    Users,
    FileText,
    Settings,
    LayoutDashboard,
    Calendar,
    Files,
    LogOut,
    CheckSquare,
    Activity,
    ClipboardList,
    FolderLock,
    Info,
    Library,
    Clock,
    KeyRound
} from 'lucide-react'
import { cn } from '@/utils/cn'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Empleados', href: '/empleados', icon: Users },
    { name: 'Solicitudes', href: '/solicitudes', icon: FileText },
    // { name: 'Autorizaciones', href: '/autorizaciones', icon: CheckSquare }, // Oculto - Flujo simplificado
    { name: 'Calendario', href: '/calendario', icon: Calendar },
    { name: 'Pre-Nómina', href: '/reportes/prenomina', icon: ClipboardList },
    { name: 'Documentos', href: '/documentos', icon: Files },
    { name: 'Asistencia', href: '/asistencia/dashboard', icon: Clock },
    { name: 'Catálogos', href: '/catalogos', icon: Library },
    { name: 'Checador (Kiosko)', href: '/checador', icon: Activity },
    { name: 'Configuración', href: '/configuracion', icon: Settings },
    { name: 'Acerca de', href: '/acerca-de', icon: Info },
]

export function Sidebar() {
    const pathname = usePathname()
    const [userProfile, setUserProfile] = useState<{ rol: string, deptName: string } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchProfile()
    }, [])

    async function fetchProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('perfiles')
                    .select('rol, cat_departamentos(departamento)')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    const dataAny = data as any
                    const deptName = dataAny.cat_departamentos?.departamento || (Array.isArray(dataAny.cat_departamentos) ? dataAny.cat_departamentos[0]?.departamento : '')
                    setUserProfile({ rol: data.rol, deptName })
                } else {
                    setUserProfile({ rol: 'Administrativo', deptName: '' })
                }
            } else {
                setUserProfile({ rol: 'Administrativo', deptName: '' })
            }
        } catch (e) {
            console.error(e)
            setUserProfile({ rol: 'Administrativo', deptName: '' })
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/'
    }

    const filteredNavigation = navigation.filter(item => {
        if (loading || !userProfile) return false

        const role = (userProfile.rol || '').toLowerCase()
        const isAdmin = role === 'administrativo' || role === 'admin' || role === 'administrador'

        if (isAdmin) return true

        // Robust check: case insensitive, handles 'Recursos Humanos', 'RH', 'Capital Humano', etc.
        const deptName = (userProfile.deptName || '').toLowerCase()
        const isHR = (role === 'jefe' && (
            deptName.includes('recursos') ||
            deptName.includes('humanos') ||
            deptName === 'rh'
        )) || role === 'jefe de recursos humanos'

        if (role === 'jefe' || isHR) {
            // HR managers get extended access
            if (isHR) {
                return ['Empleados', 'Solicitudes', 'Acerca de', 'Asistencia'].includes(item.name)
            }
            // Regular managers only see limited items
            return ['Acerca de'].includes(item.name)
        }

        // Default deny for unknown roles, or handling if they should see something basic
        return ['Acerca de'].includes(item.name)
    })

    return (
        <div className="flex h-screen w-64 flex-col bg-black text-zinc-300 border-r border-zinc-800">
            <div className="flex h-20 items-center justify-center border-b border-zinc-800 bg-zinc-950">
                <div className="flex items-center space-x-2">
                    <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                        <FolderLock className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black tracking-tighter text-white uppercase italic leading-tight">El</h1>
                        <h1 className="text-lg font-black tracking-widest text-amber-500 uppercase leading-none -mt-1">Expediente</h1>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-1 px-4">
                    <p className="px-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Menu Principal</p>
                    {filteredNavigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'group flex items-center rounded-sm px-3 py-3 text-sm font-medium transition-all duration-200 border-l-2',
                                    isActive
                                        ? 'border-amber-500 bg-zinc-900 text-white'
                                        : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white hover:border-zinc-700'
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                                        isActive ? 'text-amber-500' : 'text-zinc-500 group-hover:text-amber-500'
                                    )}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="border-t border-zinc-800 p-4 bg-zinc-950">
                <button
                    onClick={handleLogout}
                    className="group flex w-full items-center rounded-sm px-2 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                    <LogOut className="mr-3 h-5 w-5 text-zinc-500 group-hover:text-red-500 transition-colors" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    )
}
