import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id_empleado, tipo_checada, vigencia_desde, vigencia_hasta, motivo } = body

        // Instanciar un cliente Supabase con el Service Role u otro rol para bypasear RLS si es necesario,
        // o usar createRouteHandlerClient si se tiene configurado auth. 
        // Por ahora usaremos la llave anónima para simplicidad temporal como dice el plan, pero lo ideal es el Service Key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Generar un código aleatorio de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString()

        const { data: permiso, error } = await supabase
            .from('permisos_autorizados')
            .insert([
                {
                    codigo,
                    id_empleado,
                    tipo_checada,
                    vigencia_desde,
                    vigencia_hasta,
                    motivo,
                    estatus: 'Activo',
                    usos_maximos: 1
                }
            ])
            .select()
            .single()

        if (error) {
            console.error('Error insertando permiso:', error)
            return NextResponse.json({ ok: false, error: 'No se pudo generar el permiso' }, { status: 500 })
        }

        return NextResponse.json({ ok: true, codigo, permiso_id: permiso.id })
    } catch (error) {
        return NextResponse.json({ ok: false, error: 'Error del servidor' }, { status: 500 })
    }
}
