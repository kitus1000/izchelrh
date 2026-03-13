
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase.from('checadas').select('*').limit(1)
    if (error) {
        console.error(error)
        return
    }
    if (data && data.length > 0) {
        console.log('Columns in checadas:', Object.keys(data[0]))
    } else {
        console.log('No data in checadas to infer columns.')
    }
}

main()
