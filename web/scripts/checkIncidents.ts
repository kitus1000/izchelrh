import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function check() {
    const { data, error } = await supabase.from('cat_tipos_incidencia').select('*')
    if (error) {
        console.error(error)
        return
    }
    data.forEach(t => console.log(`${t.id_tipo_incidencia}: ${t.tipo_incidencia}`))
}

check()
