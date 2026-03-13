'use client'

import { useContractStore, BlockType } from '@/store/contractStore'
import { Plus, GripVertical, FileText, Pickaxe, Calendar, CircleDollarSign, Fingerprint, BriefcaseBusiness, Users } from 'lucide-react'

const CATEGORIES = [
    {
        title: 'Básicos y Obligatorios',
        blocks: [
            { type: 'encabezado', label: 'Encabezado y Generales', icon: Users },
            { type: 'tipo_contrato', label: 'Tipo de Contrato', icon: BriefcaseBusiness },
            { type: 'firmas', label: 'Bloque de Firmas', icon: Fingerprint },
        ]
    },
    {
        title: 'Condiciones de Trabajo',
        blocks: [
            { type: 'puesto_funciones', label: 'Puesto y Funciones', icon: Pickaxe },
            { type: 'jornada_horario', label: 'Jornada y Horario', icon: Calendar },
            { type: 'salario', label: 'Salario y Medio de Pago', icon: CircleDollarSign },
            { type: 'descanso_semanal', label: 'Descanso Semanal', icon: FileText },
            { type: 'vacaciones', label: 'Vacaciones y Aguinaldo', icon: FileText },
        ]
    },
    {
        title: 'Personalizados',
        blocks: [
            { type: 'clausula_libre', label: 'Cláusula Libre / Otra', icon: Plus },
        ]
    }
]

export default function BlockLibrary() {
    const addBlock = useContractStore(state => state.addBlock)

    const handleAdd = (type: BlockType) => {
        addBlock(type, Math.random().toString(36).substring(2, 10))
    }

    return (
        <div className="h-full bg-zinc-50 border-r border-zinc-200 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-zinc-200 bg-white sticky top-0 z-10 shadow-sm">
                <h3 className="font-bold text-zinc-900">Biblioteca de Cláusulas</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Selecciona los bloques que conformarán tu contrato. El sistema los numerará automáticamente.</p>
            </div>

            <div className="p-4 space-y-6">
                {CATEGORIES.map(category => (
                    <div key={category.title}>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 ml-1">{category.title}</h4>
                        <div className="space-y-2">
                            {category.blocks.map(block => {
                                const Icon = block.icon
                                return (
                                    <button
                                        key={block.type}
                                        onClick={() => handleAdd(block.type as BlockType)}
                                        className="w-full flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-lg hover:border-black hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-zinc-100 group-hover:bg-zinc-900 group-hover:text-white rounded-md transition-colors text-zinc-600">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-zinc-700 group-hover:text-black">{block.label}</span>
                                        </div>
                                        <Plus className="w-4 h-4 text-zinc-300 group-hover:text-black" />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
