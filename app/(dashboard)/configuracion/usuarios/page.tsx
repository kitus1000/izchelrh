'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { UserPlus, Shield, Building, Trash2, Edit2, Check, X } from 'lucide-react'

export default function UsuariosConfigPage() {
    const [profiles, setProfiles] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [editForm, setEditForm] = useState({
        nombre_completo: '',
        rol: 'Jefe',
        id_departamento: ''
    })
    const [newForm, setNewForm] = useState({
        id: '',
        nombre_completo: '',
        rol: 'Jefe',
        id_departamento: ''
    })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        const { data: profilesData, error: profilesError } = await supabase
            .from('perfiles')
            .select('*, cat_departamentos(departamento)')
            .order('nombre_completo')

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
            alert('Error cargando usuarios: ' + profilesError.message)
        }

        const { data: deptsData, error: deptsError } = await supabase
            .from('cat_departamentos')
            .select('*')
            .eq('activo', true)
            .order('departamento')

        if (deptsError) {
            console.error('Error fetching depts:', deptsError)
        }

        setProfiles(profilesData || [])
        setDepartments(deptsData || [])
        setLoading(false)
    }

    const startEdit = (p: any) => {
        setEditingId(p.id)
        setEditForm({
            nombre_completo: p.nombre_completo || '',
            rol: p.rol || 'Jefe',
            id_departamento: p.id_departamento || ''
        })
    }

    const saveEdit = async () => {
        if (!editingId) return

        const { error } = await supabase
            .from('perfiles')
            .update({
                nombre_completo: editForm.nombre_completo,
                rol: editForm.rol,
                id_departamento: editForm.id_departamento || null,
                actualizado_el: new Date().toISOString()
            })
            .eq('id', editingId)

        if (error) {
            alert('Error al guardar: ' + error.message)
        } else {
            setEditingId(null)
            fetchData()
        }
    }

    const handleAddUser = async () => {
        if (!newForm.id || !newForm.nombre_completo) {
            alert('El ID de Supabase y el nombre son obligatorios.')
            return
        }

        const { error } = await supabase
            .from('perfiles')
            .insert({
                id: newForm.id,
                nombre_completo: newForm.nombre_completo,
                rol: newForm.rol,
                id_departamento: newForm.id_departamento || null
            })

        if (error) {
            alert('Error al crear perfil: ' + error.message)
        } else {
            setIsAdding(false)
            setNewForm({ id: '', nombre_completo: '', rol: 'Jefe', id_departamento: '' })
            fetchData()
        }
    }

    const deleteUser = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este acceso? Esto no elimina la cuenta de Supabase, solo el perfil y permisos.')) return

        const { error } = await supabase
            .from('perfiles')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Error al eliminar: ' + error.message)
        } else {
            fetchData()
        }
    }

    // Role badge Style
    const getRoleBadge = (rol: string) => {
        if (rol === 'Administrativo') return 'bg-amber-100 text-amber-800 border-amber-200'
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex border-b border-zinc-200 pb-6 items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 uppercase tracking-wide">Gestión de Usuarios</h2>
                    <p className="text-sm text-zinc-500">Administre los niveles de acceso y departamentos asignados a cada jefe.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-zinc-800 transition-colors shadow-lg"
                >
                    <UserPlus className="w-5 h-5" />
                    <span>Agregar Nuevo Acceso</span>
                </button>
            </div>

            {/* Modal para Agregar Usuario */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-300 border border-zinc-200">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-amber-500 rounded-lg">
                                <UserPlus className="w-6 h-6 text-black" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900">Configurar Nuevo Acceso</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">ID de Usuario (UID de Supabase)</label>
                                <input
                                    type="text"
                                    placeholder="00000000-0000-0000-0000-000000000000"
                                    className="w-full border-zinc-300 rounded-xl p-3 text-sm focus:ring-amber-500 focus:border-amber-500"
                                    value={newForm.id}
                                    onChange={e => setNewForm({ ...newForm, id: e.target.value })}
                                />
                                <p className="text-[10px] text-zinc-400 mt-1">Obtenga el UID desde la consola de Supabase Auth.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    placeholder="Nombre del usuario"
                                    className="w-full border-zinc-300 rounded-xl p-3 text-sm focus:ring-amber-500 focus:border-amber-500"
                                    value={newForm.nombre_completo}
                                    onChange={e => setNewForm({ ...newForm, nombre_completo: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center space-x-2 cursor-pointer p-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-zinc-300 text-black focus:ring-black"
                                            checked={newForm.rol === 'Jefe'}
                                            onChange={e => {
                                                const isJefe = e.target.checked
                                                setNewForm({
                                                    ...newForm,
                                                    rol: isJefe ? 'Jefe' : 'Administrativo',
                                                    id_departamento: isJefe ? newForm.id_departamento : ''
                                                })
                                            }}
                                        />
                                        <span className="text-sm font-medium text-zinc-900">¿Es Jefe de Departamento?</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Departamento</label>
                                    <select
                                        className={`w-full border-zinc-300 rounded-xl p-3 text-sm transition-opacity ${newForm.rol !== 'Jefe' ? 'opacity-50' : ''}`}
                                        value={newForm.id_departamento}
                                        onChange={e => setNewForm({ ...newForm, id_departamento: e.target.value })}
                                        disabled={newForm.rol !== 'Jefe'}
                                    >
                                        <option value="">Ninguno</option>
                                        {departments.map(d => (
                                            <option key={d.id_departamento} value={d.id_departamento}>{d.departamento}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-8">
                            <button
                                onClick={handleAddUser}
                                className="flex-1 bg-black text-white font-bold py-3 rounded-xl hover:bg-zinc-800 transition-colors shadow-lg"
                            >
                                ACTIVAR ACCESO
                            </button>
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-6 bg-zinc-100 text-zinc-600 font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Usuario / Email</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Departamento Asignado</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-10 text-center text-zinc-400">Cargando usuarios...</td></tr>
                        ) : profiles.map((p) => {
                            const isEditing = editingId === p.id
                            return (
                                <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center mr-3 text-xs font-bold text-zinc-500">
                                                {p.nombre_completo?.charAt(0) || '?'}
                                            </div>
                                            <div className="text-sm">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.nombre_completo}
                                                        onChange={e => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                                                        className="border-zinc-300 rounded-md text-sm p-1"
                                                    />
                                                ) : (
                                                    <div className="font-bold text-zinc-900">{p.nombre_completo || 'Sin nombre'}</div>
                                                )}
                                                <div className="text-xs text-zinc-400">ID: {p.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {isEditing ? (
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.rol === 'Jefe'}
                                                    onChange={e => {
                                                        const isJefe = e.target.checked
                                                        setEditForm({
                                                            ...editForm,
                                                            rol: isJefe ? 'Jefe' : 'Administrativo',
                                                            id_departamento: isJefe ? editForm.id_departamento : ''
                                                        })
                                                    }}
                                                    className="rounded border-zinc-300 text-black focus:ring-black"
                                                />
                                                <span className="text-xs font-medium">Es Jefe</span>
                                            </label>
                                        ) : (
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getRoleBadge(p.rol)}`}>
                                                {p.rol}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {isEditing ? (
                                            <select
                                                value={editForm.id_departamento}
                                                onChange={e => setEditForm({ ...editForm, id_departamento: e.target.value })}
                                                className="border-zinc-300 rounded-md text-sm p-1 w-full"
                                                disabled={editForm.rol !== 'Jefe'}
                                            >
                                                <option value="">Ninguno / Transversal</option>
                                                {departments.map(d => (
                                                    <option key={d.id_departamento} value={d.id_departamento}>{d.departamento}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center text-sm text-zinc-600">
                                                <Building className="w-3 h-3 mr-2 text-zinc-300" />
                                                {p.cat_departamentos?.departamento || 'No asignado'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        {isEditing ? (
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={saveEdit} className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600"><Check className="w-4 h-4" /></button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-200 text-zinc-600 rounded-md hover:bg-zinc-300"><X className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={() => startEdit(p)} className="p-1.5 bg-zinc-100 text-zinc-600 rounded-md hover:bg-zinc-200 hover:text-blue-600 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteUser(p.id)} className="p-1.5 bg-zinc-100 text-zinc-600 rounded-md hover:bg-zinc-200 hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
                <div className="flex space-x-3">
                    <Shield className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                        <h3 className="font-bold text-amber-900">Nota de Seguridad</h3>
                        <p className="text-sm text-amber-700 mt-1">
                            El nivel <strong>Administrativo</strong> tiene acceso a todo el sistema.
                            El nivel <strong>Jefe</strong> solo puede ver el Dashboard y autorizar solicitudes correspondientes a su departamento asignado.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
