import Link from 'next/link'
import { FileWarning, Package, Umbrella, UserX, TrendingUp, Megaphone, LogOut, ArrowLeft } from 'lucide-react'

export default function HerramientasRRHHPage() {
    const tools = [
        {
            id: 'acta-administrativa',
            title: 'Acta Administrativa',
            description: 'Generador guiado de actas administrativas con sustento legal explícito.',
            icon: FileWarning,
            href: '/documentos/acta-administrativa',
            active: true,
            color: 'text-red-600',
            bg: 'bg-red-50'
        },
        {
            id: 'entregas-resguardo',
            title: 'Entregas de Resguardo',
            description: 'Formatos para asignación de equipos, herramientas o vehículos.',
            icon: Package,
            href: '/documentos/herramientas/entregas-resguardo',
            active: true,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            id: 'vacaciones',
            title: 'Solicitud de Vacaciones',
            description: 'Generación de formato oficial de aprobación de periodo vacacional.',
            icon: Umbrella,
            href: '/documentos/herramientas/vacaciones',
            active: true,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
        {
            id: 'rescisión',
            title: 'Avisos de Rescisión',
            description: 'Documento formal de término de relación laboral justificada.',
            icon: UserX,
            href: '/documentos/herramientas/rescision',
            active: true,
            color: 'text-rose-600',
            bg: 'bg-rose-50'
        },
        {
            id: 'modificaciones',
            title: 'Modificaciones Laborales',
            description: 'Adéndums para promociones, cambios de puesto o salariales.',
            icon: TrendingUp,
            href: '/documentos/herramientas/modificaciones',
            active: true,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            id: 'citatorios',
            title: 'Citatorios y Amonestaciones',
            description: 'Llamadas de atención formales o citatorios preventivos rápidos.',
            icon: Megaphone,
            href: '/documentos/herramientas/citatorios',
            active: true,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        },
        {
            id: 'renuncias',
            title: 'Renuncias Voluntarias',
            description: 'Formato pre-cargado de carta de renuncia con liberación de responsabilidades.',
            icon: LogOut,
            href: '/documentos/herramientas/renuncias',
            active: true,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        }
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/documentos" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <FileWarning className="h-6 w-6 text-amber-700" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Herramientas de RRHH</h2>
                        <p className="text-zinc-500 text-sm">Flujos guiados para generar documentación laboral crítica</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {tools.map((tool) => (
                    tool.active ? (
                        <Link
                            key={tool.id}
                            href={tool.href}
                            className="group flex flex-col justify-between bg-white p-6 rounded-xl shadow-sm border border-zinc-200 hover:shadow-md hover:border-amber-500 transition-all"
                        >
                            <div>
                                <div className={`w-12 h-12 rounded-lg ${tool.bg} flex items-center justify-center mb-4`}>
                                    <tool.icon className={`h-6 w-6 ${tool.color}`} />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 mb-2 group-hover:text-amber-600 transition-colors">{tool.title}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">{tool.description}</p>
                            </div>
                            <div className="mt-6 flex items-center text-sm font-semibold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                Iniciar flujo →
                            </div>
                        </Link>
                    ) : (
                        <div
                            key={tool.id}
                            className="flex flex-col justify-between bg-zinc-50/50 p-6 rounded-xl border border-zinc-200/50 relative overflow-hidden"
                        >
                            <div className="absolute top-4 right-4 px-2 py-1 bg-zinc-200 text-zinc-600 text-[10px] font-bold uppercase rounded-md tracking-wider">
                                Próximamente
                            </div>
                            <div className="opacity-50 grayscale">
                                <div className={`w-12 h-12 rounded-lg ${tool.bg} flex items-center justify-center mb-4`}>
                                    <tool.icon className={`h-6 w-6 ${tool.color}`} />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 mb-2">{tool.title}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">{tool.description}</p>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    )
}
