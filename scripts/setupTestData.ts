
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupTestData() {
    console.log('--- Setting up test data for March 02-08 2026 ---')

    // 1. Get some employees
    const { data: employees } = await supabase.from('empleados').select('id_empleado, numero_empleado, nombre').limit(5)
    if (!employees || employees.length === 0) {
        console.log('No employees found to test.')
        return
    }

    // Get incident types
    const { data: incidentTypes } = await supabase.from('cat_tipos_incidencia').select('id_tipo_incidencia')

    // Ensure we have roles and shifts
    const { data: roles } = await supabase.from('cat_tipos_rol').select('id_tipo_rol').eq('activo', true)
    const { data: shifts } = await supabase.from('turnos').select('id').eq('activo', true)

    const startDate = '2026-03-02'
    const endDate = '2026-03-08'

    // Clear previous test data for this specific week to avoid duplication
    await supabase.from('checadas').delete().gte('fecha_local', startDate).lte('fecha_local', endDate)
    await supabase.from('empleado_incidencias').delete().gte('fecha_inicio', startDate).lte('fecha_fin', endDate)

    for (let i = 0; i < employees.length; i++) {
        const emp = employees[i]
        console.log(`Configuring employee [${i}]: ${emp.nombre}`)

        // Ensure salary
        await supabase.from('empleado_salarios').upsert({
            id_empleado: emp.id_empleado,
            salario_diario: 500 + (i * 100),
            fecha_inicio_vigencia: '2020-01-01'
        })

        // Ensure hire date
        await supabase.from('empleado_ingreso').upsert({
            id_empleado: emp.id_empleado,
            fecha_ingreso: '2020-01-01'
        })

        // Assign Turno or Rol (Mutual exclusivity)
        if (i % 2 === 0 && shifts && shifts[0]) {
            // Assign Shift
            await supabase.from('empleados').update({ id_turno: shifts[0].id }).eq('id_empleado', emp.id_empleado)
            await supabase.from('empleado_roles').delete().eq('id_empleado', emp.id_empleado)
        } else if (roles && roles[0]) {
            // Assign Rol
            await supabase.from('empleados').update({ id_turno: null }).eq('id_empleado', emp.id_empleado)
            await supabase.from('empleado_roles').upsert({
                id_empleado: emp.id_empleado,
                id_tipo_rol: roles[0].id_tipo_rol,
                fecha_inicio: '2020-01-01'
            })
        }

        if (i === 0) {
            // Emp 0: Perfect attendance
            for (let day = 2; day <= 8; day++) {
                await supabase.from('checadas').insert({
                    id_empleado: emp.id_empleado,
                    fecha_local: `2026-03-0${day}`,
                    hora_entrada: '08:00:00',
                    hora_salida: '16:00:00',
                    tipo_checada: 'ENTRADA_SALIDA',
                    estatus_puntualidad: 'PUNTUAL'
                })
            }
        } else if (i === 1) {
            // Emp 1: 3 days vacation, rest assistance
            await supabase.from('empleado_incidencias').insert({
                id_empleado: emp.id_empleado,
                id_tipo_incidencia: 'VACACIONES',
                fecha_inicio: '2026-03-02',
                fecha_fin: '2026-03-04',
                estatus: 'APROBADO'
            })
            for (let day = 5; day <= 8; day++) {
                await supabase.from('checadas').insert({
                    id_empleado: emp.id_empleado,
                    fecha_local: `2026-03-0${day}`,
                    hora_entrada: '08:00:00',
                    hora_salida: '16:00:00',
                    tipo_checada: 'ENTRADA_SALIDA',
                    estatus_puntualidad: 'PUNTUAL'
                })
            }
        } else if (i === 2) {
            // Emp 2: Suspension (1 day) + Faltas (2 days)
            await supabase.from('empleado_incidencias').insert({
                id_empleado: emp.id_empleado,
                id_tipo_incidencia: 'SUSPENSION',
                fecha_inicio: '2026-03-02',
                fecha_fin: '2026-03-02',
                estatus: 'APROBADO'
            })
            // Days 3, 4: Nothing (Falta)
            for (let day = 5; day <= 8; day++) {
                await supabase.from('checadas').insert({
                    id_empleado: emp.id_empleado,
                    fecha_local: `2026-03-0${day}`,
                    hora_entrada: '08:00:00',
                    hora_salida: '16:00:00',
                    tipo_checada: 'ENTRADA_SALIDA',
                    estatus_puntualidad: 'PUNTUAL'
                })
            }
        } else if (i === 3) {
            // Emp 3: Omision de salida + Retardo
            await supabase.from('checadas').insert({
                id_empleado: emp.id_empleado,
                fecha_local: '2026-03-02',
                hora_entrada: '08:15:00',
                tipo_checada: 'ENTRADA',
                estatus_puntualidad: 'RETARDO'
            })
            for (let day = 3; day <= 8; day++) {
                await supabase.from('checadas').insert({
                    id_empleado: emp.id_empleado,
                    fecha_local: `2026-03-0${day}`,
                    hora_entrada: '08:00:00',
                    hora_salida: '16:00:00',
                    tipo_checada: 'ENTRADA_SALIDA',
                    estatus_puntualidad: 'PUNTUAL'
                })
            }
        } else {
            // Emp 4: Permiso con goce (1 day)
            await supabase.from('empleado_incidencias').insert({
                id_empleado: emp.id_empleado,
                id_tipo_incidencia: 'PERMISO_GOCE',
                fecha_inicio: '2026-03-02',
                fecha_fin: '2026-03-02',
                estatus: 'APROBADO'
            })
            for (let day = 3; day <= 8; day++) {
                await supabase.from('checadas').insert({
                    id_empleado: emp.id_empleado,
                    fecha_local: `2026-03-0${day}`,
                    hora_entrada: '08:00:00',
                    hora_salida: '16:00:00',
                    tipo_checada: 'ENTRADA_SALIDA',
                    estatus_puntualidad: 'PUNTUAL'
                })
            }
        }
    }
    console.log('--- Test data generation complete ---')
}

setupTestData().catch(console.error)
