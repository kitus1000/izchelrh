'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useRef } from 'react'
import { Search, User, X, Loader2 } from 'lucide-react'
import { useContractStore } from '@/store/contractStore'

export default function EmpleadoSelector() {
    const { selectedEmpleado, setSelectedEmpleado } = useContractStore()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const supabase = createClient()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const searchEmpleados = async (val: string) => {
        if (val.length < 2) {
            setResults([])
            return
        }
        setLoading(true)
        console.log('Buscando empleado:', val)

        // Simplified robust search: search in name OR last name
        // Supabase .or() with ilike requires a specific format: "col1.ilike.%val%,col2.ilike.%val%"
        const filter = `nombre.ilike.%${val}%,apellido_paterno.ilike.%${val}%,curp.ilike.%${val}%`

        try {
            const { data, error } = await supabase
                .from('empleados')
                .select(`
                    id_empleado, 
                    nombre, 
                    apellido_paterno, 
                    apellido_materno, 
                    curp, 
                    rfc,
                    empleado_domicilio(calle, numero_exterior, colonia, municipio, estado),
                    empleado_salarios(salario_diario)
                `)
                .or(filter)
                .limit(10)

            if (error) {
                console.error('Error en búsqueda:', error)
            } else {
                console.log('Resultados encontrados:', data?.length)
                setResults(data || [])
            }
        } catch (err) {
            console.error('Excepción en búsqueda:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query) searchEmpleados(query)
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (emp: any) => {
        setSelectedEmpleado(emp)
        setQuery('')
        setResults([])
        setIsOpen(false)
    }

    if (selectedEmpleado) {
        return (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 text-xs font-bold animate-in fade-in zoom-in duration-200">
                <User className="w-3.5 h-3.5" />
                <span className="truncate max-w-[150px]">
                    {selectedEmpleado.nombre} {selectedEmpleado.apellido_paterno}
                </span>
                <button
                    onClick={() => setSelectedEmpleado(null)}
                    className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        )
    }

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Buscador de Empleado..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="h-8 pl-8 pr-3 text-xs border border-zinc-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
                />
                {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-zinc-400" />}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full mt-1 left-0 w-64 bg-white border border-zinc-200 shadow-xl rounded-lg z-50 overflow-hidden">
                    {results.map((emp) => (
                        <button
                            key={emp.id_empleado}
                            onClick={() => handleSelect(emp)}
                            className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors border-b border-zinc-50 last:border-0"
                        >
                            <div className="text-xs font-bold text-zinc-900">{emp.nombre} {emp.apellido_paterno}</div>
                            <div className="text-[10px] text-zinc-500 uppercase">{emp.curp || 'Sin CURP'}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
