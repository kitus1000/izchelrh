const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    let log = '';
    const tablesToClear = [
        { table: 'checadas', column: 'id' },
        { table: 'permisos_autorizados', column: 'id' },
        { table: 'empleado_incidencias', column: 'id_incidencia' },
        { table: 'empleado_adscripciones', column: 'id_empleado' },
        { table: 'empleado_ingreso', column: 'id_empleado' },
        { table: 'empleado_roles', column: 'id_empleado' },
        { table: 'empleado_salarios', column: 'id_empleado' },
        { table: 'empleado_banco', column: 'id_empleado' },
        { table: 'empleado_domicilio', column: 'id_empleado' },
        { table: 'empleado_turnos', column: 'id' },
        { table: 'vacaciones_saldos', column: 'id_empleado' },
        { table: 'solicitud_aprobaciones', column: 'id_solicitud' },
        { table: 'bajas', column: 'id_empleado' },
        { table: 'solicitudes', column: 'id_solicitud' },
        { table: 'asistencias', column: 'id' },
        { table: 'empleados', column: 'id_empleado' }
    ]

    for (const item of tablesToClear) {
        log += `Deleting ${item.table}...\n`;
        const { error } = await supabase.from(item.table).delete().neq(item.column, '00000000-0000-0000-0000-000000000000');
        if (error) {
            log += `ERROR in ${item.table}: ${error.message} - ${error.details}\n`;
        } else {
            log += `SUCCESS in ${item.table}\n`;
        }
    }
    fs.writeFileSync('wipe_error_log.txt', log, 'utf8');
}
run();
