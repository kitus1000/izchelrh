
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const empNum = '20317'
    const { data: emp } = await supabase.from('empleados').select('*').eq('numero_empleado', empNum).single()
    if (!emp) return console.log('Emp not found')

    const { data: roles } = await supabase.from('empleado_roles').select('*').eq('id_empleado', emp.id_empleado)
    console.log('Roles for emp:', roles)
}

main()
