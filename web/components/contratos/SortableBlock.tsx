'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ContractBlock, useContractStore } from '@/store/contractStore'
import { GripVertical, Trash2 } from 'lucide-react'
import { replaceVariables } from '@/utils/replaceVariables'
import { numeroALetras } from '@/utils/numberToSpanish'

interface SortableBlockProps {
    block: ContractBlock;
    index: number;
    isActive: boolean;
    isExporting?: boolean;
}

export default function SortableBlock({ block, isActive, isExporting }: SortableBlockProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
    const { setActiveBlock, removeBlock, selectedEmpleado } = useContractStore()
    const blocks = useContractStore(state => state.blocks)

    // Calculate Ordinal dynamically
    let clauseCounter = 1;
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === block.id) break;
        if (blocks[i].isClause) clauseCounter++;
    }
    // Removed getOrdinalJuridico and numeroALetras as they are no longer used directly here
    const ordinalLabel = block.isClause ? `CLÁUSULA ${clauseCounter}` : '';

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const renderBlockContent = () => {
        const bd = block.data;
        switch (block.type) {
            case 'encabezado':
                return (
                    <div className="text-justify whitespace-pre-wrap">
                        <strong className="block text-center mb-4 uppercase text-lg">
                            CONTRATO INDIVIDUAL DE TRABAJO
                        </strong>

                        <div className="grid grid-cols-2 gap-x-4 text-sm mb-8">
                            <div>
                                <div className="text-zinc-400 text-[10px] uppercase">Patrón</div>
                                <div className="font-bold">{replaceVariables(bd.patron, selectedEmpleado)}</div>
                                <div className="text-zinc-500">{replaceVariables(bd.clasePatron === 'moral' ? 'Representada por quien resulte legalmente facultado' : '', selectedEmpleado)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-zinc-400 text-[10px] uppercase">Trabajador</div>
                                <div className="font-bold">{replaceVariables(bd.trabajador || '{{EMP_NOMBRE}}', selectedEmpleado)}</div>
                            </div>
                        </div>

                        <div className="mt-8 text-zinc-800">
                            <p>
                                CONTRATO INDIVIDUAL DE TRABAJO QUE CELEBRAN POR UNA PARTE <span className="font-bold">{replaceVariables(bd.patron, selectedEmpleado)}</span> A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ COMO "EL PATRÓN" O "LA EMPRESA", Y POR LA OTRA EL/LA C. <span className="font-bold underline decoration-dotted">{replaceVariables(bd.trabajador || '{{EMP_NOMBRE}}', selectedEmpleado)}</span>, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ COMO "EL TRABAJADOR", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:
                            </p>
                        </div>
                    </div>
                );
            case 'tipo_contrato':
                return (
                    <p className="text-justify">
                        <span className="font-bold">{ordinalLabel}. {block.optionalTitle}.-</span> El presente contrato se celebra por Tiempo {bd.tipo.charAt(0).toUpperCase() + bd.tipo.slice(1)}
                        {bd.periodo_prueba ? `, sujetándose EL TRABAJADOR a un periodo de prueba por ${bd.dias_prueba} días contados a partir de su ingreso, durante el cual LA EMPRESA evaluará sus actitudes y conocimientos profesionales. De no acreditar contar con las habilidades correspondientes, el presente contrato se dará por terminado sin responsabilidad para EL PATRÓN en términos de la Ley Federal del Trabajo.` : '.'}
                    </p>
                );
            case 'puesto_funciones':
                return (
                    <p className="text-justify">
                        <span className="font-bold">{ordinalLabel}. {block.optionalTitle}.-</span> EL TRABAJADOR se obliga a prestar sus servicios personales al PATRÓN con la categoría de <span className="font-bold">{replaceVariables(bd.puesto || '{{EMP_PUESTO}}', selectedEmpleado)}</span>, en el departamento de <span className="font-bold">{replaceVariables(bd.departamento || '____________________', selectedEmpleado)}</span>, realizando las funciones de {replaceVariables(bd.funciones || '____________________', selectedEmpleado)}.
                    </p>
                )
            case 'jornada_horario':
                return (
                    <p className="text-justify">
                        <span className="font-bold">{ordinalLabel}. {block.optionalTitle}.-</span> La jornada de trabajo será de tipo {bd.tipo}, obligándose EL TRABAJADOR a laborar los días <span className="font-bold">{bd.dias}</span> en un horario comprendido de las <span className="font-bold">{bd.entrada}</span> a las <span className="font-bold">{bd.salida}</span> horas. Dentro de esta jornada, el trabajador disfrutará de {bd.comidaMinutos} minutos diarios para reposo o consumo de alimentos, tiempo en el que podrá salir de las instalaciones, por lo que no se computará como tiempo efectivo de trabajo.
                    </p>
                );
            case 'salario':
                const montoStr = Number(bd.monto).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
                const montoLetras = numeroALetras(Number(bd.monto))
                return (
                    <p className="text-justify">
                        <span className="font-bold">{ordinalLabel}. {block.optionalTitle}.-</span> Como retribución neta por sus servicios, EL TRABAJADOR percibirá un salario {bd.periodicidad} por la cantidad de <span className="font-bold">{montoStr} ({montoLetras} PESOS 00/100 M.N.)</span>, cantidad que incluye la proporción correspondiente a los séptimos días y días de descanso obligatorio. El pago se efectuará mediante {bd.medio_pago} los días estipulados por la nómina corporativa.
                    </p>
                );
            case 'vacaciones':
                return (
                    <p className="text-justify">
                        <span className="font-bold">{ordinalLabel}. {block.optionalTitle}.-</span> EL TRABAJADOR disfrutará de un periodo anual de vacaciones pagadas equivalente a {bd.dias_iniciales} días por el primer año de servicios cumplidos, que aumentará conforme a lo estipulado por el artículo 76 de la Ley Federal del Trabajo. Así mismo recibirá una prima vacacional del {bd.prima_porcentaje}% sobre los salarios que le correspondan durante dicho periodo, y un aguinaldo legal respectivo equivalente a {bd.dias_aguinaldo || 15} días de salario por año completo de servicios.
                    </p>
                );
            case 'descanso_semanal':
                return (
                    <p className="text-justify">
                        <span className="font-bold">{ordinalLabel}. {block.optionalTitle}.-</span> Por cada seis días de trabajo, EL TRABAJADOR disfrutará de por lo menos un día de descanso con goce de salario íntegro, conviniéndose como día de descanso semanal los días <span className="font-bold">{bd.dias}</span>.
                    </p>
                );
            case 'clausula_libre':
                return (
                    <div className="text-justify">
                        <span className="font-bold">{ordinalLabel}. {block.optionalTitle}.-</span> {bd.texto ? <span className="whitespace-pre-wrap">{replaceVariables(bd.texto, selectedEmpleado)}</span> : <span style={{ color: '#a1a1aa', fontStyle: 'italic' }}>Haz clic para editar el texto de la cláusula libre en el panel derecho.</span>}
                    </div>
                )
            case 'firmas':
                return (
                    <div className="mt-12">
                        <p className="text-center italic mb-16" style={{ color: '#27272a' }}>{replaceVariables(bd.texto_cierre, selectedEmpleado)}</p>
                        <div className="grid grid-cols-2 gap-y-16 gap-x-8 text-center text-sm font-bold">
                            <div>
                                <div className="border-t border-black pt-2 max-w-[250px] mx-auto uppercase">
                                    {replaceVariables('EL PATRÓN / Representante Legal', selectedEmpleado)}
                                </div>
                            </div>
                            <div>
                                <div className="border-t border-black pt-2 max-w-[250px] mx-auto uppercase">
                                    {replaceVariables(bd.trabajador || '{{EMP_NOMBRE}}', selectedEmpleado)}
                                </div>
                            </div>
                            {bd.conTestigos && (
                                <>
                                    <div>
                                        <div className="border-t border-black pt-2 max-w-[250px] mx-auto uppercase">TESTIGO 1</div>
                                    </div>
                                    <div>
                                        <div className="border-t border-black pt-2 max-w-[250px] mx-auto uppercase">TESTIGO 2</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )
            default:
                return <div>Bloque Inválido</div>
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={(e) => {
                if (isExporting) return;
                e.stopPropagation();
                setActiveBlock(block.id);
            }}
            className={
                isExporting
                    ? "relative py-6 px-4"
                    : `relative group rounded-lg p-1 -mx-2 hover:bg-zinc-50 transition-colors cursor-pointer border-2 border-transparent ${isActive ? '!border-blue-400 !bg-blue-50/20' : ''}`
            }
        >
            <div className="flex gap-3 relative">
                <div
                    {...attributes}
                    {...listeners}
                    data-export-ignore="true"
                    className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab hover:bg-zinc-200 p-1 rounded active:cursor-grabbing h-max shrink-0"
                >
                    <GripVertical className="w-4 h-4 text-zinc-400" />
                </div>

                <div
                    className="flex-1 pb-2"
                    style={{
                        color: '#18181b',
                        lineHeight: isExporting ? '1.8' : '1.5',
                        fontSize: isExporting ? '12pt' : '13.5px',
                        textAlign: 'justify'
                    }}
                >
                    {renderBlockContent()}
                </div>

                <div className="opacity-0 group-hover:opacity-100 absolute right-0 top-0 pt-1 pr-1" data-export-ignore="true">
                    <button
                        onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                        className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-zinc-400 transition-colors"
                        title="Eliminar bloque"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
