import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: turnos, error } = await supabase
            .from('turnos')
            .select('*')
            .order('creado_el', { ascending: false })

        if (error) throw error

        return NextResponse.json(turnos)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // As the table 'turnos' has RLS and we need to insert, we assume RLS 'Permitir insert a todos turnos' exists,
        // or we use a service key. If RLS fails we will need the user to run another SQL policy.
        const { data, error } = await supabase
            .from('turnos')
            .insert([body])
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ ok: true, turno: data })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { error } = await supabase.from('turnos').delete().eq('id', id)
        if (error) throw error

        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
}
