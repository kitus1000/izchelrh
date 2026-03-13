import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data, error } = await supabase.from('cat_puestos').select('*').limit(1)
    if (error) {
        console.error('Error:', error)
    } else {
        console.log('--- COLUMNS START ---')
        if (data && data.length > 0) {
            Object.keys(data[0]).forEach(col => console.log(col))
        } else {
            console.log('No data found, but table exists.')
            // Try to get schema via an insert error if no data
        }
        console.log('--- COLUMNS END ---')
    }
}
check()
