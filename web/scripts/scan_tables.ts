import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // We can try to list tables by querying information_schema if we have permissions,
    // but usually anon key doesn't allow that.
    // Instead, let's try some common names.
    const tables = ['cat_puestos', 'puestos', 'cat_puesto', 'puesto', 'departamento_puestos']
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (error) {
            console.log(`Table ${table} error: ${error.message}`)
        } else {
            console.log(`Table ${table} exists! Columns: ${Object.keys(data[0] || {}).join(', ')}`)
        }
    }
}
check()
