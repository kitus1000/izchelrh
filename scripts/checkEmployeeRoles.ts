import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function check() {
    const { data, error } = await supabase.from('empleados')
        .select(`
        id_empleado, nombre, id_turno,
        empleado_roles(cat_tipos_rol(tipo_rol))
    `)

    console.log('Employees:', JSON.stringify(data, null, 2))
}

check()
