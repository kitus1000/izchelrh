import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    console.log('--- cat_departamentos ---')
    const { data: deptData } = await supabase.from('cat_departamentos').select('*').limit(1)
    if (deptData && deptData.length > 0) {
        Object.keys(deptData[0]).forEach(col => console.log(col))
    } else {
        console.log('No data in cat_departamentos')
    }

    console.log('--- cat_puestos ---')
    const { data: puestoData } = await supabase.from('cat_puestos').select('*').limit(1)
    if (puestoData && puestoData.length > 0) {
        Object.keys(puestoData[0]).forEach(col => console.log(col))
    } else {
        console.log('No data in cat_puestos')
    }
}
check()
