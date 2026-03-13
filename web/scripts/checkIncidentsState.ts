import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function check() {
    const { data, error } = await supabase.from('empleado_incidencias')
        .select('id_incidencia, estado')
        .limit(10)
        .order('creado_el', { ascending: false })

    console.log('Recent incidents:', data)
}

check()
