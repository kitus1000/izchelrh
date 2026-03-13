
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const empId = '20317' // Numero de empleado from screenshot

    // 1. Get Employee record
    const { data: emp } = await supabase.from('empleados').select('*').eq('numero_empleado', empId).single()
    if (!emp) {
        console.log('Employee not found')
        return
    }
    console.log('Employee:', emp.nombre, emp.apellido_paterno, 'ID:', emp.id_empleado, 'TurnoID:', emp.id_turno)

    // 2. Get Roles
    const { data: roles } = await supabase.from('empleado_roles').select('*, cat_tipos_rol(*)').eq('id_empleado', emp.id_empleado).order('fecha_inicio', { ascending: false })
    console.log('Roles:', JSON.stringify(roles, null, 2))

    // 3. Get Shift info
    const { data: shift } = await supabase.from('turnos').select('*').eq('id', emp.id_turno)
    console.log('Shift assigned to emp:', shift)

    // 4. Get Checadas for the period in the screenshot
    const { data: checadas } = await supabase.from('checadas')
        .select('*')
        .eq('id_empleado', emp.id_empleado)
        .gte('fecha_local', '2026-03-02')
        .lte('fecha_local', '2026-03-09')
        .order('timestamp_checada', { ascending: true })
    console.log('Checadas count:', checadas?.length)
    checadas?.forEach(c => console.log(`${c.fecha_local} | ${c.tipo_checada} | ${new Date(c.timestamp_checada).toLocaleTimeString()}`))
}

main()
