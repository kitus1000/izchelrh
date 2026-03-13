
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    // Samuel 20317
    const { data: emp } = await supabase.from('empleados').select('*').eq('numero_empleado', '20317').single()
    const { data: turno } = await supabase.from('turnos').select('*').eq('id', emp.id_turno).single()
    const { data: roles } = await supabase.from('empleado_roles').select('*, cat_tipos_rol(*)').eq('id_empleado', emp.id_empleado)
    const { data: checadas } = await supabase.from('checadas').select('*').eq('id_empleado', emp.id_empleado).eq('fecha_local', '2026-03-07')

    return NextResponse.json({ emp, turno, roles, checadas })
}
