'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Renderizamos un layout válido para evitar que Next DevTools Segment Explorer falle
export default function ContratosPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/documentos/contratos/constructor')
    }, [router])

    return (
        <div className="h-full flex items-center justify-center p-8 text-zinc-500">
            <p className="animate-pulse">Cargando Constructor de Contratos...</p>
        </div>
    )
}
