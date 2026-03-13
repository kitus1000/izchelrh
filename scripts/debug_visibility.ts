import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function debug() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    console.log('--- SYSTEM CHECK ---')
    // Get one employee ID that has adscriptions
    const { data: sample } = await supabase.from('empleado_adscripciones').select('id_empleado').limit(1)
    if (!sample || sample.length === 0) {
        console.log('No adscriptions found in table.')
        return
    }
    const empId = sample[0].id_empleado
    console.log(`Checking history for Employee: ${empId}`)

    const { data, error } = await supabase
        .from('empleado_adscripciones')
        .select(`
            id_empleado,
            fecha_inicio,
            fecha_fin,
            id_puesto,
            id_departamento,
            cat_puestos(puesto)
        `)
        .eq('id_empleado', empId)
        .order('fecha_inicio', { ascending: false })

    if (error) {
        console.error('Fetch Error:', error)
    } else {
        console.log(`Found ${data.length} records.`)
        data.forEach((r, i) => {
            console.log(`[${i}] Start: ${r.fecha_inicio} | End: ${r.fecha_fin} | PuestoID: ${r.id_puesto} | PuestoName: ${r.cat_puestos?.puesto || 'NULL'}`)
        })
    }
}
debug()
