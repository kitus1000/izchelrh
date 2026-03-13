'use client'

import { useContractStore, BlockType, ContractBlock } from '@/store/contractStore'

export default function BlockConfigurator() {
    const activeBlockId = useContractStore(state => state.activeBlockId)
    const blocks = useContractStore(state => state.blocks)
    const updateBlockData = useContractStore(state => state.updateBlockData)
    const updateBlockDetails = useContractStore(state => state.updateBlockDetails)

    const block = blocks.find(b => b.id === activeBlockId)

    if (!block) {
        return (
            <div className="h-full bg-zinc-50 border-l border-zinc-200 p-6 flex items-center justify-center text-zinc-500 text-center text-sm">
                Selecciona un bloque en el centro para configurar sus detalles y redacción.
            </div>
        )
    }

    const { type, data, optionalTitle, isClause } = block

    return (
        <div className="h-full bg-white border-l border-zinc-200 flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50 sticky top-0 z-10">
                <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Propiedades de Cláusula
                </h3>
            </div>

            <div className="p-5 space-y-6">

                {/* General Settings for any clause */}
                {isClause && (
                    <div className="space-y-4 pb-6 border-b border-zinc-100">
                        <div>
                            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">Título / Nombre</label>
                            <input
                                type="text"
                                value={optionalTitle}
                                onChange={e => updateBlockDetails(block.id, { optionalTitle: e.target.value })}
                                className="w-full text-sm border-zinc-300 rounded focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            />
                        </div>
                    </div>
                )}

                {/* Specific Form Fields */}
                <div className="space-y-5">
                    {type === 'encabezado' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Empresa / Patrón</label>
                                <input type="text" placeholder="Ej. ACME S.A. de C.V." value={data.patron} onChange={e => updateBlockData(block.id, { patron: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Tipo de Entidad</label>
                                <select value={data.clasePatron} onChange={e => updateBlockData(block.id, { clasePatron: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                    <option value="moral">Persona Moral</option>
                                    <option value="fisica">Persona Física</option>
                                </select>
                            </div>
                        </>
                    )}

                    {type === 'tipo_contrato' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Modalidad</label>
                                <select value={data.tipo} onChange={e => updateBlockData(block.id, { tipo: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                    <option value="indeterminado">Tiempo Indeterminado</option>
                                    <option value="determinado">Tiempo Determinado</option>
                                    <option value="obra determinada">Obra Determinada</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <input type="checkbox" id="pt" checked={data.periodo_prueba} onChange={e => updateBlockData(block.id, { periodo_prueba: e.target.checked })} className="text-blue-600 rounded focus:ring-blue-500" />
                                <label htmlFor="pt" className="text-sm text-zinc-800">Incluir Periodo de Prueba Legal (Arts. 39-A LFT)</label>
                            </div>
                            {data.periodo_prueba && (
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1 mt-2">Días de Prueba permitidos</label>
                                    <input type="number" value={data.dias_prueba} onChange={e => updateBlockData(block.id, { dias_prueba: Number(e.target.value) })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                            )}
                        </>
                    )}

                    {type === 'puesto_funciones' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Nombre del Puesto</label>
                                <input type="text" value={data.puesto} onChange={e => updateBlockData(block.id, { puesto: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Departamento</label>
                                <input type="text" value={data.departamento} onChange={e => updateBlockData(block.id, { departamento: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Funciones Principales y Generales</label>
                                <textarea rows={4} value={data.funciones} onChange={e => updateBlockData(block.id, { funciones: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none" />
                            </div>
                        </>
                    )}

                    {type === 'jornada_horario' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Días a Laborar</label>
                                <input type="text" placeholder="Ej. Lunes a Sábado" value={data.dias} onChange={e => updateBlockData(block.id, { dias: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Entrada</label>
                                    <input type="time" value={data.entrada} onChange={e => updateBlockData(block.id, { entrada: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Salida</label>
                                    <input type="time" value={data.salida} onChange={e => updateBlockData(block.id, { salida: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                            </div>
                            <div className="mt-2">
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Minutos de descanso/comida diarios</label>
                                <input type="number" value={data.comidaMinutos} onChange={e => updateBlockData(block.id, { comidaMinutos: Number(e.target.value) })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </>
                    )}

                    {type === 'salario' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Monto Neto/Bruto Numérico</label>
                                <input type="number" step="0.01" value={data.monto} onChange={e => updateBlockData(block.id, { monto: Number(e.target.value) })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                <p className="text-[10px] text-zinc-500 mt-1">El monto en letras se inyectará automáticamente en la vista previa del contrato.</p>
                            </div>
                            <div className="mt-2">
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Periodicidad de Pago</label>
                                <select value={data.periodicidad} onChange={e => updateBlockData(block.id, { periodicidad: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                    <option value="diario">Diario</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="catorcenal">Catorcenal</option>
                                    <option value="quincenal">Quincenal</option>
                                    <option value="mensual">Mensual</option>
                                </select>
                            </div>
                            <div className="mt-2">
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Medio de Pago</label>
                                <input type="text" placeholder="Transferencia electrónica" value={data.medio_pago} onChange={e => updateBlockData(block.id, { medio_pago: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </>
                    )}

                    {type === 'vacaciones' && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Días de vacación (1er año)</label>
                                    <input type="number" value={data.dias_iniciales} onChange={e => updateBlockData(block.id, { dias_iniciales: Number(e.target.value) })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">% Prima Vacacional</label>
                                    <input type="number" value={data.prima_porcentaje} onChange={e => updateBlockData(block.id, { prima_porcentaje: Number(e.target.value) })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                            </div>
                            <div className="mt-2">
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Días de Aguinaldo</label>
                                <input type="number" value={data.dias_aguinaldo || 15} onChange={e => updateBlockData(block.id, { dias_aguinaldo: Number(e.target.value) })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </>
                    )}

                    {type === 'descanso_semanal' && (
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">Día asignado de descanso de ley</label>
                            <input type="text" placeholder="Ej. Domingo" value={data.dias} onChange={e => updateBlockData(block.id, { dias: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                    )}

                    {type === 'clausula_libre' && (
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">Redacción Personalizada Larga</label>
                            <textarea rows={10} placeholder="Escribe tu cláusula especial aquí..." value={data.texto} onChange={e => updateBlockData(block.id, { texto: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y" />
                        </div>
                    )}

                    {type === 'firmas' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">Sufijo o Texto Legal de Cierre</label>
                                <textarea rows={4} value={data.texto_cierre} onChange={e => updateBlockData(block.id, { texto_cierre: e.target.value })} className="w-full text-sm border-zinc-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none" />
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <input type="checkbox" id="testigos" checked={data.conTestigos} onChange={e => updateBlockData(block.id, { conTestigos: e.target.checked })} className="text-blue-600 rounded focus:ring-blue-500" />
                                <label htmlFor="testigos" className="text-sm text-zinc-800">Agregar líneas de testigos</label>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    )
}
