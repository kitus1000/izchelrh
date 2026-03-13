'use client'

import dynamic from 'next/dynamic'

// Bypass SSR for DND-kit components to prevent Segment Explorer crashes
const ConstructorClient = dynamic(
    () => import('@/components/contratos/ConstructorClient'),
    { ssr: false }
)

export default function ConstructorPage() {
    return <ConstructorClient />
}
