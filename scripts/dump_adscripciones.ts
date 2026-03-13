import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function debug() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    console.log('--- ALL ADSCRIPTIONS (Recent 10) ---')
    const { data, error } = await supabase
        .from('empleado_adscripciones')
        .select('*')
        .order('fecha_inicio', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error:', error)
        return
    }

    data.forEach(row => {
        console.log(`Emp: ${row.id_empleado} | Start: ${row.fecha_inicio} | Dept: ${row.id_departamento} | Post: ${row.id_puesto}`)
    })
}
debug()
