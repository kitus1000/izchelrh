'use client'

import { useContractStore } from '@/store/contractStore'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableBlock from '@/components/contratos/SortableBlock'
import { RefObject } from 'react'

interface Props {
    canvasRef?: RefObject<HTMLDivElement | null>
    isExporting?: boolean
}

const PAGE_H_PX = 1056  // ~Letter size at 96dpi
const PAGE_W_PX = 816

export default function ContractCanvas({ canvasRef, isExporting }: Props) {
    const blocks = useContractStore(state => state.blocks)
    const activeBlockId = useContractStore(state => state.activeBlockId)
    const setActiveBlock = useContractStore(state => state.setActiveBlock)
    const reorderBlocks = useContractStore(state => state.reorderBlocks)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    )

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = blocks.findIndex(b => b.id === active.id)
            const newIndex = blocks.findIndex(b => b.id === over.id)
            reorderBlocks(oldIndex, newIndex)
        }
    }

    return (
        <div className="h-full bg-[#e8eaed] p-6 md:p-10 overflow-y-auto flex flex-col items-center gap-0">
            {/* The contract "sheets" — self-growing, paginated visually */}
            <div
                ref={canvasRef}
                id="contract-canvas-print"
                className="flex flex-col mx-auto"
                style={{
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: '#ffffff',
                    width: isExporting ? '794px' : '100%',
                    maxWidth: '816px'
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) setActiveBlock(null)
                }}
            >
                {/* First page wrapper — simulates top of letter */}
                <div
                    className={`bg-white w-full ${isExporting ? '' : 'shadow-xl shadow-zinc-300/60 ring-1 ring-zinc-200'}`}
                    style={{ minHeight: `${PAGE_H_PX}px`, padding: '64px 64px 48px 64px', position: 'relative' }}
                >
                    {/* Page break guides — subtle dashed lines at each page boundary */}
                    {[1, 2, 3, 4].map(n => (
                        <div
                            key={n}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${n * PAGE_H_PX}px`,
                                borderTop: '2px dashed #d1d5db',
                                zIndex: 10,
                                pointerEvents: 'none'
                            }}
                            data-export-ignore="true"
                        >
                            <span style={{
                                position: 'absolute',
                                right: 8,
                                top: -11,
                                fontSize: 10,
                                color: '#9ca3af',
                                background: '#fff',
                                padding: '0 4px',
                                userSelect: 'none'
                            }}>
                                Página {n + 1}
                            </span>
                        </div>
                    ))}

                    {blocks.length === 0 ? (
                        <div className="h-[800px] w-full flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 rounded-2xl p-10">
                            <span className="text-xl font-medium mb-2">Este contrato está vacío</span>
                            <span className="text-sm">Agrega bloques desde la biblioteca de la izquierda para comenzar a construir.</span>
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-4">
                                    {blocks.map((block, index) => (
                                        <SortableBlock
                                            key={block.id}
                                            block={block}
                                            index={index}
                                            isActive={activeBlockId === block.id}
                                            isExporting={isExporting}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* Footer hint */}
            {blocks.length > 0 && (
                <div className="mt-4 mb-6 text-xs text-zinc-400 text-center">
                    ↕ El contrato se expande automáticamente al agregar más cláusulas
                </div>
            )}
        </div>
    )
}
