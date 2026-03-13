-- ==========================================
-- 04: SEGURIDAD, POLÍTICAS Y SEMILLAS
-- ==========================================
-- Este archivo habilita RLS, crea políticas y pobla las tablas básicas.
-- DEBE EJECUTARSE AL FINAL (Después de 01, 02 y 03).

-- ==========================================
-- Habilitar RLS en todas las tablas
-- ==========================================
ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_tipos_checada ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispositivos_checadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_autorizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE checadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_festivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Políticas RLS Base
-- ==========================================
CREATE POLICY "Public Read Config" ON configuracion_empresa FOR SELECT USING (true);
CREATE POLICY "Authenticated All Config" ON configuracion_empresa FOR ALL USING (true);

CREATE POLICY "Permitir select a todos checadas" ON checadas FOR SELECT USING (true);
CREATE POLICY "Permitir insert a todos checadas" ON checadas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update a todos checadas" ON checadas FOR UPDATE USING (true);
-- Alternativa por si se usaba 'anon'
CREATE POLICY "Permitir inserción a anon" ON checadas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir gestión total a autenticados" ON checadas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura a anon" ON checadas FOR SELECT TO anon USING (true);


CREATE POLICY "Permitir select turnos" ON turnos FOR SELECT USING (true);
CREATE POLICY "Permitir insert turnos" ON turnos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update turnos" ON turnos FOR UPDATE USING (true);
CREATE POLICY "Permitir delete turnos" ON turnos FOR DELETE USING (true);

CREATE POLICY "Permitir select cat_tipos_checada" ON cat_tipos_checada FOR SELECT USING (true);
CREATE POLICY "Permitir select dispositivos" ON dispositivos_checadores FOR SELECT USING (true);

CREATE POLICY "Permitir select permisos" ON permisos_autorizados FOR SELECT USING (true);
CREATE POLICY "Permitir update permisos" ON permisos_autorizados FOR UPDATE USING (true);
CREATE POLICY "Permitir insert permisos" ON permisos_autorizados FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir delete permisos" ON permisos_autorizados FOR DELETE USING (true);

CREATE POLICY "Permitir select público" ON cat_festivos FOR SELECT USING (true);
CREATE POLICY "Permitir insert total" ON cat_festivos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update total" ON cat_festivos FOR UPDATE USING (true);
CREATE POLICY "Permitir delete total" ON cat_festivos FOR DELETE USING (true);

CREATE POLICY "Users can view their own profile" ON perfiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can all" ON perfiles FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'Administrativo')
);

CREATE POLICY "Enable all access for authenticated users" ON document_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated All Solicitudes" ON solicitudes FOR ALL USING (true);
CREATE POLICY "Authenticated All Empleados" ON empleados FOR ALL USING (true);

-- ==========================================
-- Funciones y Triggers (Usuarios)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, rol)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'Jefe');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- Funciones y Triggers (Vacaciones LFT)
-- ==========================================
CREATE OR REPLACE FUNCTION initialize_vacation_balance(target_employee_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_fecha_ingreso DATE;
    v_years_service INT;
    v_dias_corresponden INT;
    v_periodo_id UUID;
BEGIN
    SELECT fecha_ingreso INTO v_fecha_ingreso FROM empleado_ingreso WHERE id_empleado = target_employee_id;
    IF v_fecha_ingreso IS NULL THEN RETURN; END IF;

    v_years_service := EXTRACT(YEAR FROM age(current_date, v_fecha_ingreso))::INT;
    IF v_years_service < 1 THEN v_years_service := 1; END IF;

    IF v_years_service = 1 THEN v_dias_corresponden := 12;
    ELSIF v_years_service = 2 THEN v_dias_corresponden := 14;
    ELSIF v_years_service = 3 THEN v_dias_corresponden := 16;
    ELSIF v_years_service = 4 THEN v_dias_corresponden := 18;
    ELSIF v_years_service = 5 THEN v_dias_corresponden := 20;
    ELSE 
        v_dias_corresponden := 20 + (2 * floor((v_years_service - 1) / 5));
    END IF;

    SELECT id_periodo INTO v_periodo_id FROM cat_periodos_vacacionales LIMIT 1;

    IF v_periodo_id IS NULL THEN
        INSERT INTO cat_periodos_vacacionales (periodo, fecha_inicio, fecha_fin)
        VALUES ('2024-2025', '2024-01-01', '2025-12-31')
        RETURNING id_periodo INTO v_periodo_id;
    END IF;

    INSERT INTO vacaciones_saldos (id_empleado, id_periodo, dias_asignados, dias_tomados)
    VALUES (target_employee_id, v_periodo_id, v_dias_corresponden, 0)
    ON CONFLICT (id_empleado, id_periodo) 
    DO UPDATE SET dias_asignados = EXCLUDED.dias_asignados;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_init_balance()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_vacation_balance(NEW.id_empleado);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_init_balance ON empleado_ingreso;
CREATE TRIGGER trg_init_balance
AFTER INSERT ON empleado_ingreso
FOR EACH ROW
EXECUTE FUNCTION trigger_init_balance();


-- ==========================================
-- Semillas (Datos Base)
-- ==========================================

INSERT INTO cat_tipos_incidencia (tipo_incidencia, bloquea_asistencia, requiere_evidencia, cuenta_como_descanso) VALUES
('Falta Injustificada', TRUE, FALSE, FALSE),
('Incapacidad Enfermedad General', TRUE, TRUE, FALSE),
('Incapacidad Riesgo Trabajo', TRUE, TRUE, FALSE),
('Incapacidad Maternidad', TRUE, TRUE, FALSE),
('Permiso con Goce', TRUE, FALSE, FALSE),
('Permiso sin Goce', TRUE, FALSE, FALSE),
('Vacaciones', TRUE, FALSE, TRUE),
('Retardo', FALSE, FALSE, FALSE),
('Defunción Familiar', TRUE, TRUE, FALSE),
('Paternidad', TRUE, TRUE, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO cat_tipos_solicitud (tipo_solicitud) VALUES
('Vacaciones'), ('Permiso Personal'), ('Home Office'), ('Justificación de Falta'), ('Baja de Personal'), ('Baja'), ('Permiso Especial'), ('Reingreso')
ON CONFLICT DO NOTHING;

INSERT INTO cat_tipos_rol (tipo_rol, dias_trabajo, dias_descanso, descripcion) VALUES
('20x10', 20, 10, '20 días de trabajo por 10 de descanso'),
('14x7', 14, 7, '14 días de trabajo por 7 de descanso'),
('5x2', 5, 2, 'Semana inglesa (5 días trabajo, 2 descanso)')
ON CONFLICT DO NOTHING;

INSERT INTO cat_causas_baja (causa, requiere_evidencia, rol_iniciador) VALUES 
('Renuncia Voluntaria', FALSE, 'Empleado'),
('Término de contrato', FALSE, 'Sistema'),
('Separación voluntaria (renuncia)', FALSE, 'Empleado'),
('Abandono de empleo', TRUE, 'Jefe'),
('Defunción', FALSE, 'RH'),
('Clausura', FALSE, 'Directiva'),
('Otra', TRUE, 'Jefe'),
('Ausentismo', TRUE, 'Jefe'),
('Rescisión de contrato', TRUE, 'Jefe')
ON CONFLICT DO NOTHING;

INSERT INTO cat_causas_baja_imss (clave, descripcion) VALUES
('1', 'Término de contrato'), ('2', 'Separación voluntaria'), ('3', 'Abandono de empleo'), ('4', 'Defunción'), ('5', 'Clausura'), ('6', 'Otras'), ('7', 'Ausentismo'), ('8', 'Rescisión de contrato'), ('9', 'Jubilación'), ('10', 'Pensión');

INSERT INTO cat_tipos_checada (tipo, label, requiere_codigo, color, ordinal, tolerancia_retorno_min) 
VALUES
  ('ENTRADA', 'ENTRADA', false, 'bg-green-600', 1, 5),
  ('SALIDA', 'SALIDA', false, 'bg-red-600', 2, 5),
  ('COMIDA_SALIDA', 'COMIDA – SALIDA', false, 'bg-amber-500', 3, 5),
  ('COMIDA_REGRESO', 'COMIDA – REGRESO', false, 'bg-amber-600', 4, 5),
  ('PERMISO_PERSONAL', 'PERMISO PERSONAL', true, 'bg-blue-600', 5, 5),
  ('SALIDA_OPERACIONES', 'SALIDA OPERACIONES', true, 'bg-indigo-600', 6, 5),
  ('REGRESO_PERMISO_PERSONAL', 'PERMISO REGRESO', false, 'bg-blue-500', 7, 5),
  ('REGRESO_OPERACIONES', 'OP. REGRESO', false, 'bg-indigo-500', 8, 5)
ON CONFLICT (tipo) DO UPDATE 
SET requiere_codigo = EXCLUDED.requiere_codigo, label = EXCLUDED.label, tolerancia_retorno_min = EXCLUDED.tolerancia_retorno_min;

INSERT INTO configuracion_empresa (nombre_empresa, timezone)
SELECT 'Mi Empresa', 'America/Mexico_City'
WHERE NOT EXISTS (SELECT 1 FROM configuracion_empresa);

INSERT INTO dispositivos_checadores (nombre, device_key, tipo, ubicacion)
VALUES ('Checador Web MVP', 'MVP_LOCAL_DEV_KEY_2026', 'web', 'En desarrollo')
ON CONFLICT (device_key) DO NOTHING;

DELETE FROM cat_festivos WHERE fecha >= '2026-01-01' AND fecha <= '2026-12-31';
INSERT INTO cat_festivos (fecha, nombre, descripcion) VALUES 
('2026-01-01', 'Año Nuevo', 'Feriado oficial de inicio de año.'),
('2026-02-02', 'Aniversario de la Constitución', 'Se observa el primer lunes de febrero.'),
('2026-03-16', 'Natalicio de Benito Juárez', 'Se observa el tercer lunes de marzo.'),
('2026-05-01', 'Día del Trabajo', 'Feriado oficial internacional.'),
('2026-09-16', 'Día de la Independencia', 'Feriado oficial nacional.'),
('2026-11-16', 'Aniversario de la Revolución', 'Se observa el tercer lunes de noviembre.'),
('2026-12-25', 'Navidad', 'Feriado oficial de fin de año.')
ON CONFLICT (fecha) DO UPDATE 
SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

NOTIFY pgrst, 'reload schema';
