
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    // Consultar estructura de empleado_roles (un solo registro para ver columnas)
    const { data: cols } = await supabase.from('empleado_roles').select('*').limit(1)

    return NextResponse.json({ cols })
}
