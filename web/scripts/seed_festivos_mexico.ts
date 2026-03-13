
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const festivos = [
    { fecha: '2026-01-01', nombre: 'Año Nuevo', desc: 'Feriado oficial de inicio de año.' },
    { fecha: '2026-02-02', nombre: 'Aniversario de la Constitución (Observado)', desc: 'Primer lunes de febrero.' },
    { fecha: '2026-03-16', nombre: 'Natalicio de Benito Juárez (Observado)', desc: 'Tercer lunes de marzo.' },
    { fecha: '2026-05-01', nombre: 'Día del Trabajo', desc: 'Feriado oficial.' },
    { fecha: '2026-09-16', nombre: 'Día de la Independencia', desc: 'Feriado oficial.' },
    { fecha: '2026-11-16', nombre: 'Aniversario de la Revolución (Observado)', desc: 'Tercer lunes de noviembre.' },
    { fecha: '2026-12-25', nombre: 'Navidad', desc: 'Feriado oficial.' }
]

async function main() {
    console.log('Seeding festivos 2026...')
    for (const f of festivos) {
        // Intentar insertar. Si falla por falta de tabla, el usuario deberá correr el SQL.
        const { error } = await supabase.from('cat_festivos').upsert({
            fecha: f.fecha,
            nombre: f.nombre,
            descripcion: f.desc,
            activo: true
        }, { onConflict: 'fecha' })

        if (error) {
            console.error(`Error for ${f.nombre}:`, error.message)
        } else {
            console.log(`Successfully seeded: ${f.nombre}`)
        }
    }
    console.log('Done.')
}

main()
