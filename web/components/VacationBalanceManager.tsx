import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { calculateEntitlement, getServiceYears, getPeriodStatus } from '@/utils/vacationLogic'
import { AlertCircle, RefreshCw, Calendar as CalendarIcon, Edit2, Check, X, Loader2, History } from 'lucide-react'

export function VacationBalanceManager({ idEmpleado, fechaIngreso, isReadOnly = false }: { idEmpleado: string, fechaIngreso: string, isReadOnly?: boolean }) {
    const [balances, setBalances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [computedInfo, setComputedInfo] = useState<any>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({ dias_asignados: 0, dias_tomados: 0 })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (fechaIngreso) {
            const info = getServiceYears(fechaIngreso)
            setComputedInfo(info)
            fetchBalances()
        }
    }, [idEmpleado, fechaIngreso])

    async function fetchBalances() {
        setLoading(true)
        const { data: dbBalances, error } = await supabase
            .from('vacaciones_saldos')
            .select(`
                *,
                cat_periodos_vacacionales(periodo)
            `)
            .eq('id_empleado', idEmpleado)

        if (error) console.error("Error fetching balances:", error)

        const existingMap = new Map(dbBalances?.map((b: any) => {
            const key = b.cat_periodos_vacacionales?.periodo.replace(/\s/g, '')
            return [key, b]
        }) || [])

        const hireDate = new Date(fechaIngreso)
        const startYear = hireDate.getFullYear()
        const currentYear = new Date().getFullYear()
        const computedBalances = []

        // Iterate up to currentYear + 1 to show the upcoming periods
        for (let year = startYear; year <= currentYear + 1; year++) {
            const serviceYear = year - startYear + 1
            const daysEntitled = calculateEntitlement(serviceYear)
            const periodLabel = `${year} - ${year + 1}`
            const existing = existingMap.get(periodLabel.replace(/\s/g, ''))

            const status = getPeriodStatus(hireDate, year)

            // Calculate dates for display
            const earnedDate = new Date(hireDate)
            earnedDate.setFullYear(year + 1)
            const expirationDate = new Date(earnedDate)
            expirationDate.setFullYear(expirationDate.getFullYear() + 1)

            computedBalances.push({
                periodo: periodLabel,
                dias_asignados: existing ? existing.dias_asignados : daysEntitled,
                dias_tomados: existing ? existing.dias_tomados : 0,
                dias_restantes: (existing ? existing.dias_asignados : daysEntitled) - (existing ? existing.dias_tomados : 0),
                estatus: status,
                expirationDate: expirationDate.toLocaleDateString('es-MX'),
                earnedDate: earnedDate.toLocaleDateString('es-MX'),
                hasRecord: !!existing,
                id_periodo_db: existing?.id_periodo,
                id_saldo_db: existing?.id_periodo
            })
        }

        setBalances(computedBalances.reverse())
        setLoading(false)
    }

    async function initializePeriod(balance: any) {
        if (balance.hasRecord) return

        // 1. First, check if the period already exists in cat_periodos_vacacionales
        let { data: periodData, error: fetchError } = await supabase
            .from('cat_periodos_vacacionales')
            .select('id_periodo')
            .eq('periodo', balance.periodo)
            .maybeSingle()

        if (fetchError) {
            alert('Error al buscar periodo: ' + fetchError.message)
            return
        }

        // 2. If it doesn't exist, create it
        if (!periodData) {
            const startYear = parseInt(balance.periodo.split(' - ')[0])
            const { data: newPeriod, error: createError } = await supabase
                .from('cat_periodos_vacacionales')
                .insert([{
                    periodo: balance.periodo,
                    fecha_inicio: `${startYear}-01-01`,
                    fecha_fin: `${startYear + 1}-12-31`
                }])
                .select()
                .single()

            if (createError || !newPeriod) {
                alert('Error al crear periodo: ' + (createError?.message || 'No se pudo crear el periodo'))
                return
            }
            periodData = newPeriod
        }

        if (!periodData) {
            alert('Error crítico: No se pudo obtener el ID del periodo.')
            return
        }

        // 3. Create the balance record in vacaciones_saldos
        const { error: insertError } = await supabase.from('vacaciones_saldos').insert([{
            id_empleado: idEmpleado,
            id_periodo: periodData.id_periodo,
            dias_asignados: balance.dias_asignados,
            dias_tomados: 0
        }])

        if (!insertError) {
            fetchBalances()
        } else {
            alert('Error al guardar saldo: ' + insertError.message)
        }
    }

    async function handleUpdateBalance(idPeriodo: string) {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('vacaciones_saldos')
                .update({
                    dias_asignados: editForm.dias_asignados,
                    dias_tomados: editForm.dias_tomados
                })
                .match({ id_empleado: idEmpleado, id_periodo: idPeriodo })

            if (error) throw error
            setEditingId(null)
            fetchBalances()
        } catch (e: any) {
            alert('Error actualizando: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    const startEditing = (b: any) => {
        setEditingId(b.id_periodo_db)
        setEditForm({ dias_asignados: b.dias_asignados, dias_tomados: b.dias_tomados })
    }

    if (!fechaIngreso) return <div className="p-4 text-zinc-400 italic">Fecha de ingreso no registrada.</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-8 w-8 text-blue-600" />
                    <div>
                        <p className="text-xs text-blue-600 font-bold uppercase">Antigüedad</p>
                        <p className="text-lg font-bold text-blue-900">
                            {computedInfo?.years} Años, {computedInfo?.months} Meses
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-blue-600 font-bold uppercase">Próximo Aniversario</p>
                    <p className="text-lg font-bold text-blue-900">{computedInfo?.nextAnniversary?.toLocaleDateString()}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
                    <h3 className="font-bold text-zinc-700">Saldos de Vacaciones</h3>
                    <button onClick={fetchBalances} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-500 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                    </button>
                </div>
                <div className="overflow-auto max-h-[500px]">
                    <table className="min-w-full divide-y divide-zinc-200">
                        <thead className="bg-zinc-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Periodo</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">Asignados</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tomados</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">Restantes</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vigencia</th>
                                <th className="px-6 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-zinc-200">
                            {balances.map((b) => {
                                const isEditing = editingId === b.id_periodo_db && b.id_periodo_db
                                return (
                                    <tr key={b.periodo} className={b.estatus === 'Expirado' ? 'bg-zinc-50/50 opacity-70' : 'hover:bg-zinc-50 transition-colors'}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-zinc-900">{b.periodo}</div>
                                            <div className="text-[10px] text-zinc-400 font-medium">Genere: {b.earnedDate}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    className="w-16 text-center text-sm border-zinc-300 rounded p-1 bg-white text-black font-bold"
                                                    value={editForm.dias_asignados}
                                                    onChange={e => setEditForm({ ...editForm, dias_asignados: parseInt(e.target.value) || 0 })}
                                                />
                                            ) : (
                                                <span className="text-sm text-zinc-900 font-medium">{b.dias_asignados}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    className="w-16 text-center text-sm border-zinc-300 rounded p-1 bg-white text-black font-bold"
                                                    value={editForm.dias_tomados}
                                                    onChange={e => setEditForm({ ...editForm, dias_tomados: parseInt(e.target.value) || 0 })}
                                                />
                                            ) : (
                                                <span className="text-sm text-zinc-900 font-medium">{b.dias_tomados}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-green-600 text-sm">
                                            {b.dias_asignados - b.dias_tomados}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight shadow-sm flex items-center w-fit gap-1 ${b.estatus === 'Disponible' ? 'bg-emerald-500 text-white' :
                                                    b.estatus === 'Por Vencer' ? 'bg-orange-500 text-white shadow-orange-200 animate-pulse' :
                                                        b.estatus === 'Generándose' ? 'bg-blue-500 text-white' :
                                                            'bg-zinc-200 text-zinc-600'
                                                }`}>
                                                {b.estatus === 'Por Vencer' && <AlertCircle className="w-3 h-3" />}
                                                {b.estatus === 'Generándose' ? 'En formación' : b.estatus}
                                            </span>
                                            {b.estatus === 'Expirado' && <div className="text-[10px] text-zinc-400 font-bold mt-1 uppercase">Expiró el {b.expirationDate}</div>}
                                            {b.estatus === 'Por Vencer' && <div className="text-[10px] text-orange-600 font-bold mt-1 uppercase">Vence pronto: {b.expirationDate}</div>}
                                            {b.estatus === 'Disponible' && <div className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">Vence: {b.expirationDate}</div>}
                                            {b.estatus === 'Generándose' && <div className="text-[10px] text-blue-600 font-bold mt-1 uppercase">Se activa: {b.earnedDate}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {!isReadOnly && (
                                                <div className="flex justify-end space-x-2">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateBalance(b.id_periodo_db)}
                                                                disabled={saving}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                                                title="Guardar cambios"
                                                            >
                                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Cancelar"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : b.hasRecord ? (
                                                        <button
                                                            onClick={() => startEditing(b)}
                                                            className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                            title="Corregir días"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => initializePeriod(b)}
                                                            className="text-[10px] font-bold bg-zinc-900 text-white px-3 py-1 rounded hover:bg-zinc-800 transition-colors uppercase shadow-sm"
                                                        >
                                                            Sincronizar
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-zinc-50 text-[10px] text-zinc-500 border-t border-zinc-200">
                    * Los periodos "En curso" corresponden al año laboral actual.
                    <br />
                    * Utilice el icono de lápiz para corregir errores de captura en saldos ya sincronizados.
                </div>
            </div>
        </div>
    )
}
