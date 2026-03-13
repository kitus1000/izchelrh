
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const tables = [
        'cat_festivos',
        'festivos',
        'configuracion_empresa',
        'config_descansos_globales',
        'empleado_incidencias',
        'cat_tipos_incidencia'
    ]

    for (const table of tables) {
        console.log(`Checking ${table}...`)
        const { data, error } = await supabase.from(table).select('*').limit(5)
        if (error) {
            console.log(`Error in ${table}: ${error.message}`)
        } else {
            console.log(`Data in ${table}:`, data)
        }
    }
}

main()
