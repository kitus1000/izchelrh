import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    console.log('--- empleado_adscripciones ---')
    const { data: adsData } = await supabase.from('empleado_adscripciones').select('*').limit(1)
    if (adsData) {
        Object.keys(adsData[0] || {}).forEach(col => console.log(col))
    }

    console.log('--- empleado_salarios ---')
    const { data: salData, error: salError } = await supabase.from('empleado_salarios').select('*').limit(1)
    if (salError) {
        console.log('Error or table non-existent:', salError.message)
    } else {
        Object.keys(salData[0] || {}).forEach(col => console.log(col))
    }
}
check()
