
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data: roleCols } = await supabase.from('cat_tipos_rol').select('*').limit(1)
    console.log('cat_tipos_rol columns:', Object.keys(roleCols?.[0] || {}))

    const { data: empRoleCols } = await supabase.from('empleado_roles').select('*').limit(1)
    console.log('empleado_roles columns:', Object.keys(empRoleCols?.[0] || {}))
}

main()
