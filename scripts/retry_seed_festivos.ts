
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('Attempting to create cat_festivos and seed...')

    // We try to run the SQL via RPC if it exists, but typically we don't have that.
    // Instead, we can try to use the REST API to check if it exists or create it if we had a tool.
    // Since we don't have a direct SQL tool, we have to assume the table SHOULD exist.

    // Let's try to insert anyway, maybe the cache error was temporary.
    const festivos = [
        { fecha: '2026-01-01', nombre: 'Año Nuevo' },
        { fecha: '2026-02-02', nombre: 'Día de la Constitución (Festivo Movido)' },
        { fecha: '2026-03-16', nombre: 'Natalicio de Benito Juárez (Festivo Movido)' },
        { fecha: '2026-05-01', nombre: 'Día del Trabajo' },
        { fecha: '2026-09-16', nombre: 'Día de la Independencia' },
        { fecha: '2026-11-16', nombre: 'Día de la Revolución (Festivo Movido)' },
        { fecha: '2026-12-25', nombre: 'Navidad' }
    ]

    for (const f of festivos) {
        // We try both 'id' and 'id_festivo' if needed, but 'fecha' is the constraint.
        const { error } = await supabase.from('cat_festivos').upsert({
            fecha: f.fecha,
            nombre: f.nombre,
            activo: true
        }, { onConflict: 'fecha' })

        if (error) {
            console.error(`Error for ${f.nombre}:`, error.message)
        } else {
            console.log(`OK: ${f.nombre}`)
        }
    }
}

main()
