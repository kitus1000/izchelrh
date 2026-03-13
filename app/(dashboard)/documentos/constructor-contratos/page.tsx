'use client'

import dynamic from 'next/dynamic'

// Load client-only DND component without SSR to prevent hydration issues
const ConstructorClient = dynamic(
    () => import('@/components/contratos/ConstructorClient'),
    { ssr: false }
)

export default function ConstructorPage() {
    return <ConstructorClient />
}
