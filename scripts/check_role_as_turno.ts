
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const roleId = 'c2605809-906d-49d7-83eb-62ac07559c5d' // Jesus Raul's Role ID
    const { data: turno } = await supabase.from('turnos').select('*').eq('id', roleId).single()
    console.log('Turno with Role ID:', turno)

    const { data: allTurnos } = await supabase.from('turnos').select('*')
    console.log('All Turnos counts:', allTurnos?.length)
    allTurnos?.forEach(t => console.log(`Shift: ${t.nombre} | ID: ${t.id} | ${t.hora_inicio}-${t.hora_fin}`))
}

main()
