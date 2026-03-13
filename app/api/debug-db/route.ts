import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Check cat_puestos structure
        const { data: puestos, error: puestosErr } = await supabase
            .from('cat_puestos')
            .select('*')
            .limit(1)

        // 2. Check table definition via RPC if possible, or just raw query
        // Since we can't run raw SQL easily via client without an RPC, 
        // we'll try to insert a dummy record and see the error or columns.

        return NextResponse.json({
            status: 'ok',
            puestosColumns: puestos && puestos.length > 0 ? Object.keys(puestos[0]) : [],
            puestosError: puestosErr,
            firstPuesto: puestos && puestos[0] ? puestos[0] : null,
            env: {
                url: supabaseUrl ? 'set' : 'not set',
                key: supabaseKey ? 'set' : 'not set'
            }
        })
    } catch (e: any) {
        return NextResponse.json({ status: 'ex', error: e.message })
    }
}
