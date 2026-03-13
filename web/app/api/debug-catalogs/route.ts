
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    // Consultar todos los turnos
    const { data: turnos } = await supabase.from('turnos').select('*')
    // Consultar tipos de rol
    const { data: tiposRol } = await supabase.from('cat_tipos_rol').select('*')

    return NextResponse.json({ turnos, tiposRol })
}
