-- ==========================================
-- ESQUEMA COMPLETO Y UNIFICADO - RH SYSTEM
-- Incluye: Core, Checador, Permisos, Retornos, Festivos
-- Reorganizado para integridad referencial (100% Completo)
-- ==========================================


-- ARCHIVO: SCRIPTS_NUEVA_EMPRESA.sql
-- ==========================================
-- EL EXPEDIENTE - SCRIPTS DE INSTALACIÓN (NUEVO CLIENTE)
-- ==========================================

-- 1. CATÁLOGOS BASE
CREATE TABLE IF NOT EXISTS cat_unidades_trabajo (
    id_unidad UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidad_trabajo TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_departamentos (
    id_departamento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departamento TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_puestos (
    id_puesto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puesto TEXT NOT NULL,
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    activo BOOLEAN DEFAULT TRUE,
    es_jefe BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS cat_tipos_rol (
    id_tipo_rol UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_rol TEXT NOT NULL,
    dias_trabajo INT NOT NULL,
    dias_descanso INT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_tipos_incidencia (
    id_tipo_incidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_incidencia TEXT NOT NULL,
    bloquea_asistencia BOOLEAN DEFAULT FALSE,
    requiere_evidencia BOOLEAN DEFAULT FALSE,
    cuenta_como_descanso BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_tipos_solicitud (
    id_tipo_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_solicitud TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_causas_baja (
    id_causa_baja UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    causa TEXT NOT NULL,
    requiere_evidencia BOOLEAN DEFAULT FALSE,
    rol_iniciador TEXT DEFAULT 'Jefe',
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_periodos_vacacionales (
    id_periodo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- 2. EMPLEADOS Y EXPEDIENTE
CREATE TABLE IF NOT EXISTS empleados (
    id_empleado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_empleado INT UNIQUE NOT NULL,
    estado_empleado TEXT DEFAULT 'Activo',
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT,
    sexo TEXT,
    fecha_nacimiento DATE,
    curp TEXT UNIQUE,
    rfc TEXT UNIQUE,
    nss TEXT UNIQUE,
    telefono TEXT,
    correo_electronico TEXT,
    estado_civil TEXT,
    tipo_residencia TEXT,
    hijos_numero INT DEFAULT 0,
    foto_url TEXT,
    qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    id_turno UUID,
    fecha_creacion TIMESTAMPTZ DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS empleado_ingreso (
    id_empleado UUID REFERENCES empleados(id_empleado) PRIMARY KEY,
    fecha_ingreso DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS empleado_adscripciones (
    id_empleado UUID REFERENCES empleados(id_empleado),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    categoria TEXT,
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    id_puesto UUID REFERENCES cat_puestos(id_puesto),
    id_unidad UUID REFERENCES cat_unidades_trabajo(id_unidad),
    id_ceco UUID REFERENCES cat_cecos(id_ceco),
    razon_social TEXT,
    jefe_directo_nombre TEXT,
    es_jefe BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id_empleado, fecha_inicio)
);

-- 3. MOVIMIENTOS E INCIDENCIAS
CREATE TABLE IF NOT EXISTS empleado_incidencias (
    id_incidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empleado UUID REFERENCES empleados(id_empleado) NOT NULL,
    id_tipo_incidencia UUID REFERENCES cat_tipos_incidencia(id_tipo_incidencia) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    comentarios TEXT,
    estado TEXT DEFAULT 'Aprobada',
    creado_el TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vacaciones_saldos (
    id_empleado UUID REFERENCES empleados(id_empleado),
    id_periodo UUID REFERENCES cat_periodos_vacacionales(id_periodo),
    dias_asignados INT DEFAULT 0,
    dias_tomados INT DEFAULT 0,
    PRIMARY KEY (id_empleado, id_periodo)
);

CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tipo_solicitud UUID REFERENCES cat_tipos_solicitud(id_tipo_solicitud),
    id_empleado_objetivo UUID REFERENCES empleados(id_empleado),
    folio TEXT UNIQUE,
    estatus TEXT DEFAULT 'Pendiente',
    payload JSONB,
    creado_el TIMESTAMPTZ DEFAULT now()
);

-- 4. CONFIGURACIÓN Y DOCUMENTOS
CREATE TABLE IF NOT EXISTS configuracion_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_empresa TEXT,
    rfc TEXT,
    direccion TEXT,
    registro_patronal TEXT,
    logo_base64 TEXT,
    actualizado_el TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content JSONB,
    blocks JSONB,
    header_content JSONB,
    footer_content JSONB,
    margins JSONB DEFAULT '{"top": 2.5, "right": 2.5, "bottom": 2.5, "left": 2.5}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS perfiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    nombre_completo TEXT,
    rol TEXT DEFAULT 'Jefe' CHECK (rol IN ('Administrativo', 'Jefe')),
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    actualizado_el TIMESTAMPTZ DEFAULT now()
);

-- 5. SEGURIDAD (RLS)
ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON configuracion_empresa FOR SELECT USING (true);
CREATE POLICY "Authenticated All" ON configuracion_empresa FOR ALL USING (true);

ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated All" ON solicitudes FOR ALL USING (true);

ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated All" ON empleados FOR ALL USING (true);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON perfiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can all" ON perfiles FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'Administrativo')
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, rol)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'Jefe');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. SEMILLAS (DATA INICIAL)
INSERT INTO cat_tipos_incidencia (tipo_incidencia, bloquea_asistencia, cuenta_como_descanso) VALUES
('Falta Injustificada', TRUE, FALSE),
('Incapacidad', TRUE, FALSE),
('Vacaciones', TRUE, TRUE),
('Permiso con Goce', TRUE, FALSE),
('Retardo', FALSE, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO cat_tipos_solicitud (tipo_solicitud) VALUES
('Vacaciones'),
('Baja de Personal'),
('Permiso Especial'),
('Reingreso de Personal')
ON CONFLICT DO NOTHING;

INSERT INTO cat_causas_baja (causa) VALUES
('Renuncia Voluntaria'),
('Terminación de Contrato'),
('Abandono de Empleo'),
('Despido')
ON CONFLICT DO NOTHING;


-- ARCHIVO: CREATE_TABLE_PERFILES.sql
-- Create Perfiles table
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT,
    rol TEXT DEFAULT 'Jefe', -- 'Administrativo', 'Jefe'
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    creado_el TIMESTAMPTZ DEFAULT now(),
    actualizado_el TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS just in case (optional, but good practice)
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow full access for now (adjust as needed for security)
CREATE POLICY "Public profiles access" ON perfiles FOR ALL USING (true);


-- ARCHIVO: SQL_CHECADOR_FASE_2.sql
-- =========================================================================
-- SCRIPT DE BASE DE DATOS - MÓDULO CHECADOR (Fase 2)
-- Ejecutar en el Editor SQL de Supabase
-- Proyecto: El Expediente (rh-system)
-- =========================================================================

-- 1. EXTENDER TABLA EXISTENTE 'empleados'
-- (Agregamos el token QR y un id_turno para su turno por defecto)
ALTER TABLE empleados 
ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
ADD COLUMN IF NOT EXISTS id_turno UUID; -- Relación foránea después de crear 'turnos'


-- 2. TABLA: turnos
CREATE TABLE IF NOT EXISTS turnos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,              -- Ej: "Turno Matutino"
  hora_inicio     TIME NOT NULL,              -- Ej: 08:00:00
  hora_fin        TIME,                       -- Ej: 17:00:00
  tolerancia_min  INT DEFAULT 10,             -- Minutos de gracia (10 min)
  ventana_desde   TIME,                       -- Hora mínima para checar ENTRADA
  ventana_hasta   TIME,                       -- Hora máxima para checar ENTRADA        
  bloquear_fuera_ventana BOOLEAN DEFAULT FALSE,
  aplica_dias     TEXT[] DEFAULT '{"Lunes","Martes","Miércoles","Jueves","Viernes"}',
  activo          BOOLEAN DEFAULT TRUE,
  company_id      UUID,                       -- Preparando Multi-Tenant
  creado_el       TIMESTAMPTZ DEFAULT now()
);

-- Ahora sí agregamos la llave foránea a empleados
ALTER TABLE empleados 
  DROP CONSTRAINT IF EXISTS fk_empleado_turno,
  ADD CONSTRAINT fk_empleado_turno FOREIGN KEY (id_turno) REFERENCES turnos(id) ON DELETE SET NULL;


-- 3. TABLA: empleado_turnos (Histórico / Excepciones si las hay)
CREATE TABLE IF NOT EXISTS empleado_turnos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empleado     UUID REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  id_turno        UUID REFERENCES turnos(id) ON DELETE CASCADE,
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE,              -- NULL = vigente actual
  creado_por      UUID REFERENCES perfiles(id),
  creado_el       TIMESTAMPTZ DEFAULT now()
);


-- 4. TABLA: cat_tipos_checada (Los 6 tipos definidos)
CREATE TABLE IF NOT EXISTS cat_tipos_checada (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                  TEXT NOT NULL UNIQUE,   -- Llave interna (ENTRADA, SALIDA...)
  label                 TEXT NOT NULL,           -- Frontend label
  requiere_codigo       BOOLEAN DEFAULT FALSE,
  color                 TEXT,                    
  icono                 TEXT,                   
  ordinal               INT DEFAULT 0,           -- Orden visual
  activo                BOOLEAN DEFAULT TRUE
);

-- INSERTAR TIPOS DEFAULT SI NO EXISTEN
INSERT INTO cat_tipos_checada (tipo, label, requiere_codigo, color, ordinal) 
VALUES
  ('ENTRADA', 'ENTRADA', false, 'bg-green-600', 1),
  ('SALIDA', 'SALIDA', false, 'bg-red-600', 2),
  ('COMIDA_SALIDA', 'COMIDA – SALIDA', false, 'bg-amber-500', 3),
  ('COMIDA_REGRESO', 'COMIDA – REGRESO', false, 'bg-amber-600', 4),
  ('PERMISO_PERSONAL', 'PERMISO PERSONAL', true, 'bg-blue-600', 5),
  ('SALIDA_OPERACIONES', 'SALIDA OPERACIONES', true, 'bg-indigo-600', 6)
ON CONFLICT (tipo) DO UPDATE 
SET requiere_codigo = EXCLUDED.requiere_codigo, label = EXCLUDED.label;


-- 5. TABLA: dispositivos_checadores
CREATE TABLE IF NOT EXISTS dispositivos_checadores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,         -- Ej: "Tablet Recepción"
  device_key      TEXT UNIQUE NOT NULL,  -- Token para validar desde el kiosko
  tipo            TEXT DEFAULT 'tablet', -- tablet | web | android
  ubicacion       TEXT,                  
  activo          BOOLEAN DEFAULT TRUE,
  company_id      UUID,
  ultimo_ping     TIMESTAMPTZ,
  creado_el       TIMESTAMPTZ DEFAULT now()
);

-- Insertar un dispositivo genérico para la web local (Temporal MVP)
INSERT INTO dispositivos_checadores (nombre, device_key, tipo, ubicacion)
VALUES ('Checador Web MVP', 'MVP_LOCAL_DEV_KEY_2026', 'web', 'En desarrollo')
ON CONFLICT (device_key) DO NOTHING;


-- 6. TABLA: permisos_autorizados
CREATE TABLE IF NOT EXISTS permisos_autorizados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo            TEXT NOT NULL UNIQUE,        -- 6 dígitos string ('123456')
  id_empleado       UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  tipo_checada      TEXT NOT NULL,               -- EJ: PERMISO_PERSONAL
  vigencia_desde    TIMESTAMPTZ NOT NULL,
  vigencia_hasta    TIMESTAMPTZ NOT NULL,
  usos_maximos      INT DEFAULT 1,
  usos_realizados   INT DEFAULT 0,
  estatus           TEXT DEFAULT 'Activo',       -- Activo | Usado | Vencido | Cancelado
  motivo            TEXT,
  company_id        UUID,
  creado_por        UUID REFERENCES perfiles(id),
  usado_en          TIMESTAMPTZ,
  usado_en_device   UUID REFERENCES dispositivos_checadores(id),
  cancelado_por     UUID REFERENCES perfiles(id),
  cancelado_el      TIMESTAMPTZ,
  creado_el         TIMESTAMPTZ DEFAULT now()
);

-- Índices Permisos
CREATE INDEX IF NOT EXISTS idx_permisos_codigo ON permisos_autorizados(codigo);
CREATE INDEX IF NOT EXISTS idx_permisos_emp ON permisos_autorizados(id_empleado);


-- 7. TABLA: checadas
CREATE TABLE IF NOT EXISTS checadas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empleado           UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  tipo_checada          TEXT NOT NULL REFERENCES cat_tipos_checada(tipo),
  timestamp_checada     TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_local           DATE NOT NULL,          -- Permite queries ráidos_por_día
  estatus_puntualidad   TEXT,                   -- PUNTUAL | RETARDO | FUERA_VENTANA | SIN_TURNO
  retardo_minutos       INT DEFAULT 0,
  id_permiso            UUID REFERENCES permisos_autorizados(id),
  id_dispositivo        UUID REFERENCES dispositivos_checadores(id),
  id_turno              UUID REFERENCES turnos(id),
  metodo_identificacion TEXT DEFAULT 'QR',      -- QR | NUMERO_EMPLEADO
  company_id            UUID,
  sincronizado          BOOLEAN DEFAULT TRUE,   -- Uso offline android
  origen                TEXT DEFAULT 'web',     -- web | android
  notas                 TEXT,
  creado_el             TIMESTAMPTZ DEFAULT now()
);

-- Índices Checadas
CREATE INDEX IF NOT EXISTS idx_checadas_emp_fecha ON checadas(id_empleado, fecha_local);
CREATE INDEX IF NOT EXISTS idx_checadas_fecha ON checadas(fecha_local);


-- 8. TABLA: auditoria_logs
CREATE TABLE IF NOT EXISTS auditoria_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID REFERENCES perfiles(id),
  accion          TEXT NOT NULL,      
  entidad         TEXT NOT NULL,      
  entidad_id      TEXT,               
  datos_antes     JSONB,
  datos_despues   JSONB,
  company_id      UUID,
  ip_address      TEXT,
  creado_el       TIMESTAMPTZ DEFAULT now()
);


-- =========================================================================
-- CONFIGURACIÓN DE POLÍTICAS DE SEGURIDAD RLS BÁSICAS
-- (Para habilitar lectura de empleados desde el Checador)
-- =========================================================================

-- Aseguramos que las tablas tengan RLS habilitado (Si tienes RLS cerrado)
ALTER TABLE checadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_tipos_checada ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispositivos_checadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_autorizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_turnos ENABLE ROW LEVEL SECURITY;

-- Excepción RLS explícitas temporal para el MVP (Permite Insert/Select a todos)
-- IMPORTANTE: Para producción la política debe usar JWT o validación por token
CREATE POLICY "Permitir select a todos checadas" ON checadas FOR SELECT USING (true);
CREATE POLICY "Permitir insert a todos checadas" ON checadas FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir select turnos" ON turnos FOR SELECT USING (true);
CREATE POLICY "Permitir select cat_tipos_checada" ON cat_tipos_checada FOR SELECT USING (true);
CREATE POLICY "Permitir select dispositivos" ON dispositivos_checadores FOR SELECT USING (true);

CREATE POLICY "Permitir select permisos" ON permisos_autorizados FOR SELECT USING (true);
CREATE POLICY "Permitir update permisos" ON permisos_autorizados FOR UPDATE USING (true);

-- =========================================================================
-- LISTO. TODO CREADO SIN AFECTAR TUS TABLAS EXISTENTES.
-- =========================================================================


-- ARCHIVO: scripts\fix_checadas_structure.sql
-- 1. Asegurar que las columnas para puntualidad y origen existan en checadas
ALTER TABLE checadas ADD COLUMN IF NOT EXISTS fecha_local DATE;
ALTER TABLE checadas ADD COLUMN IF NOT EXISTS estatus_puntualidad TEXT DEFAULT 'PUNTUAL';
ALTER TABLE checadas ADD COLUMN IF NOT EXISTS retardo_minutos INTEGER DEFAULT 0;
ALTER TABLE checadas ADD COLUMN IF NOT EXISTS id_permiso UUID;
ALTER TABLE checadas ADD COLUMN IF NOT EXISTS es_manual BOOLEAN DEFAULT FALSE;
ALTER TABLE checadas ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'android';
ALTER TABLE checadas ADD COLUMN IF NOT EXISTS notas TEXT;

-- 2. Habilitar RLS si no está habilitado
ALTER TABLE checadas ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad para checadas
-- Permitir que el rol anon (Kiosko/API) pueda insertar registros
DROP POLICY IF EXISTS "Permitir inserción a anon" ON checadas;
CREATE POLICY "Permitir inserción a anon" ON checadas FOR INSERT TO anon WITH CHECK (true);

-- Permitir que usuarios autenticados vean y gestionen todo
DROP POLICY IF EXISTS "Permitir gestión total a autenticados" ON checadas;
CREATE POLICY "Permitir gestión total a autenticados" ON checadas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permitir lectura pública (opcional, si el Kiosko necesita ver historial inmediato)
DROP POLICY IF EXISTS "Permitir lectura a anon" ON checadas;
CREATE POLICY "Permitir lectura a anon" ON checadas FOR SELECT TO anon USING (true);


-- ARCHIVO: scripts\reparar_relaciones.sql
-- ==========================================
-- REPARAR RELACIONES Y CACHÉ DE ESQUEMA
-- ==========================================
-- Ejecuta este script en el SQL Editor de Supabase si ves errores de "Could not find a relationship"

-- 1. Limpieza de huérfanos (Asegurar integridad antes de poner candados)
DO $$ 
BEGIN
    -- Limpiar puestos que no existen
    UPDATE empleado_adscripciones 
    SET id_puesto = NULL 
    WHERE id_puesto NOT IN (SELECT id_puesto FROM cat_puestos);

    -- Limpiar departamentos que no existen
    UPDATE empleado_adscripciones 
    SET id_departamento = NULL 
    WHERE id_departamento NOT IN (SELECT id_departamento FROM cat_departamentos);

    -- Relación Adscripciones -> Puestos
    ALTER TABLE empleado_adscripciones DROP CONSTRAINT IF EXISTS empleado_adscripciones_id_puesto_fkey;
    ALTER TABLE empleado_adscripciones ADD CONSTRAINT empleado_adscripciones_id_puesto_fkey 
        FOREIGN KEY (id_puesto) REFERENCES cat_puestos(id_puesto) ON DELETE SET NULL;

    -- Relación Adscripciones -> Departamentos
    ALTER TABLE empleado_adscripciones DROP CONSTRAINT IF EXISTS empleado_adscripciones_id_departamento_fkey;
    ALTER TABLE empleado_adscripciones ADD CONSTRAINT empleado_adscripciones_id_departamento_fkey 
        FOREIGN KEY (id_departamento) REFERENCES cat_departamentos(id_departamento) ON DELETE SET NULL;
END $$;

-- 2. Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- 3. Verificación rápida
SELECT 'Relaciones reparadas y caché refrescado' as resultado;


-- ARCHIVO: scripts\setup_holidays.sql
-- =========================================================================
-- SCRIPT DE CONFIGURACIÓN - DÍAS FESTIVOS MÉXICO 2026
-- Ejecutar en el Editor SQL de Supabase
-- =========================================================================

-- 1. Crear tabla si no existe (con estructura compatible con el UI)
CREATE TABLE IF NOT EXISTS cat_festivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_el TIMESTAMPTZ DEFAULT now()
);

-- 2. Limpiar e Insertar Festivos de México 2026 (Oficiales y Movilidad LFT)
-- Nota: Algunos se mueven al lunes previo según Art. 74 LFT
DELETE FROM cat_festivos WHERE fecha >= '2026-01-01' AND fecha <= '2026-12-31';

INSERT INTO cat_festivos (fecha, nombre, descripcion) VALUES 
('2026-01-01', 'Año Nuevo', 'Feriado oficial de inicio de año.'),
('2026-02-02', 'Aniversario de la Constitución (Día 5)', 'Se observa el primer lunes de febrero.'),
('2026-03-16', 'Natalicio de Benito Juárez (Día 21)', 'Se observa el tercer lunes de marzo.'),
('2026-05-01', 'Día del Trabajo', 'Feriado oficial internacional.'),
('2026-09-16', 'Día de la Independencia', 'Feriado oficial nacional.'),
('2026-11-16', 'Aniversario de la Revolución (Día 20)', 'Se observa el tercer lunes de noviembre.'),
('2026-12-25', 'Navidad', 'Feriado oficial de fin de año.')
ON CONFLICT (fecha) DO UPDATE 
SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

-- 3. Habilitar RLS (Habilitamos acceso total para el dashboard)
ALTER TABLE cat_festivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select público" ON cat_festivos FOR SELECT USING (true);
CREATE POLICY "Permitir insert total" ON cat_festivos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update total" ON cat_festivos FOR UPDATE USING (true);
CREATE POLICY "Permitir delete total" ON cat_festivos FOR DELETE USING (true);


-- ARCHIVO: scripts\update_config_timezone.sql
-- 1. Asegurar que la tabla de configuración exista
CREATE TABLE IF NOT EXISTS configuracion_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_empresa TEXT,
    direccion TEXT,
    rfc TEXT,
    registro_patronal TEXT,
    logo_base64 TEXT,
    timezone TEXT DEFAULT 'America/Mexico_City',
    creado_el TIMESTAMPTZ DEFAULT now(),
    actualizado_el TIMESTAMPTZ DEFAULT now()
);

-- 2. Asegurar que la columna 'timezone' exista (si la tabla ya existía de antes)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='configuracion_empresa' AND column_name='timezone') THEN
        ALTER TABLE configuracion_empresa ADD COLUMN timezone TEXT DEFAULT 'America/Mexico_City';
    END IF;
END $$;

-- 3. Insertar fila inicial solo si la tabla está vacía
INSERT INTO configuracion_empresa (nombre_empresa, timezone)
SELECT 'Mi Empresa', 'America/Mexico_City'
WHERE NOT EXISTS (SELECT 1 FROM configuracion_empresa);

-- 4. Habilitar Seguridad de Fila (RLS) y Políticas para Configuracion
ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir gestión total a usuarios autenticados" ON configuracion_empresa;
CREATE POLICY "Permitir gestión total a usuarios autenticados" ON configuracion_empresa FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir lectura a anon" ON configuracion_empresa;
CREATE POLICY "Permitir lectura a anon" ON configuracion_empresa FOR SELECT TO anon USING (true);

-- 5. Habilitar lectura pública para Turnos (necesario para el Kiosko/API)
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura a anon" ON turnos;
CREATE POLICY "Permitir lectura a anon" ON turnos FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Permitir gestión a autenticados" ON turnos;
CREATE POLICY "Permitir gestión a autenticados" ON turnos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Habilitar lectura pública para Catálogos de Checada
ALTER TABLE cat_tipos_checada ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura a anon" ON cat_tipos_checada;
CREATE POLICY "Permitir lectura a anon" ON cat_tipos_checada FOR SELECT TO anon USING (true);


-- ARCHIVO: scripts\update_festivos.sql
-- 1. Tabla de Festivos
CREATE TABLE IF NOT EXISTS cat_festivos (
    id_festivo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_el TIMESTAMPTZ DEFAULT now()
);

-- 2. Modificar Checadas para registros manuales
ALTER TABLE checadas ADD COLUMN IF NOT EXISTS es_manual BOOLEAN DEFAULT FALSE;
ALTER TABLE checadas ADD COLUMN IF NOT EXISTS autorizado_por UUID REFERENCES perfiles(id);

-- 3. Insertar algunos festivos de México 2026 (Ejemplos)
INSERT INTO cat_festivos (fecha, nombre) VALUES 
('2026-01-01', 'Año Nuevo'),
('2026-02-05', 'Día de la Constitución'),
('2026-03-21', 'Natalicio de Benito Juárez'),
('2026-05-01', 'Día del Trabajo'),
('2026-09-16', 'Día de la Independencia'),
('2026-11-20', 'Día de la Revolución'),
('2026-12-25', 'Navidad')
ON CONFLICT (fecha) DO NOTHING;


-- ARCHIVO: SQL_ADD_LIMITE_FALTA.sql
-- Agregar columna limite_falta_min a la tabla turnos
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS limite_falta_min INT NOT NULL DEFAULT 60;


-- ARCHIVO: SQL_FIX_PERMISOS.sql
-- =========================================================================
-- PARCHE SQL: PERMISOS PARA MÓDULO CHECADOR Y CATÁLOGOS (Fases 3 y 4)
-- Ejecutar en el Editor SQL de Supabase
-- =========================================================================

-- 1. Permiso Faltante: Generador de Códigos (Permite Insertar)
CREATE POLICY "Permitir insert permisos" ON permisos_autorizados FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir delete permisos" ON permisos_autorizados FOR DELETE USING (true);

-- 2. Permisos Faltantes: Catálogo de Turnos (Permite CRUD Completo)
CREATE POLICY "Permitir insert turnos" ON turnos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update turnos" ON turnos FOR UPDATE USING (true);
CREATE POLICY "Permitir delete turnos" ON turnos FOR DELETE USING (true);

-- 3. Permisos Faltantes: Tablas Secundarias en caso de requerirse en UI
CREATE POLICY "Permitir update a todos checadas" ON checadas FOR UPDATE USING (true);

-- Asegurarnos de que las tablas estén protegidas pero con estas políticas activadas
ALTER TABLE permisos_autorizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;


-- ARCHIVO: SQL_FIX_RETORNOS.sql
-- =========================================================================
-- SCRIPT DE BASE DE DATOS - FIX DE TIPOS DE CHECADA RETORNOS
-- Ejecutar en el Editor SQL de Supabase
-- Proyecto: El Expediente (rh-system)
-- =========================================================================

-- INSERTAR NUEVOS TIPOS DE REGRESO PARA PERMISOS
INSERT INTO cat_tipos_checada (tipo, label, requiere_codigo, color, ordinal) 
VALUES
  ('REGRESO_PERMISO_PERSONAL', 'PERMISO REGRESO', false, 'bg-blue-500', 7),
  ('REGRESO_OPERACIONES', 'OP. REGRESO', false, 'bg-indigo-500', 8)
ON CONFLICT (tipo) DO UPDATE 
SET requiere_codigo = EXCLUDED.requiere_codigo, label = EXCLUDED.label;


-- ARCHIVO: SQL_FIX_TOLERANCIA_PERMISOS.sql
-- =========================================================================
-- SCRIPT DE MIGRACIÓN - AÑADIR TOLERANCIA A TIPOS DE CHECADA Y ESTATUS COMPLETADO
-- Proyecto: El Expediente (rh-system)
-- =========================================================================

-- 1. Añadimos la columna para configurar tolerancia en retornos (en minutos). Ej: 5 min, 10 min.
ALTER TABLE cat_tipos_checada 
ADD COLUMN IF NOT EXISTS tolerancia_retorno_min INT DEFAULT 5;

-- 2. Aseguramos que los tipos que son de SALIDA (que requieren retorno) tengan al menos una configuración inicial.
UPDATE cat_tipos_checada 
SET tolerancia_retorno_min = 5 
WHERE tipo IN ('PERMISO_PERSONAL', 'SALIDA_OPERACIONES');

-- Nota: El estatus "Completado" no requiere DDL ya que en Supabase la columna 'estatus' de permisos_autorizados
-- probablemente es de tipo TEXT o VARCHAR, por lo que acepta libremente 'Completado'.
-- (Si es un ENUM, habría que hacer un ALTER TYPE, pero por tu estructura asumo que es TEXT).


-- ARCHIVO: supabase\migrations\20260202_add_blocks_column.sql
alter table document_templates
add column if not exists blocks jsonb default '[]'::jsonb;


-- ARCHIVO: supabase\migrations\20260202_add_header_footer.sql
alter table document_templates 
add column if not exists header_content jsonb,
add column if not exists footer_content jsonb;


-- ARCHIVO: supabase\migrations\20260202_add_reingreso_request_type.sql
-- Add Reingreso request type
INSERT INTO cat_tipos_solicitud (tipo_solicitud) 
VALUES ('Reingreso') 
ON CONFLICT DO NOTHING;


-- ARCHIVO: supabase\migrations\20260202_create_templates.sql
-- Create table for document templates
create table if not exists document_templates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  type text not null, -- 'contrato', 'constancia', 'carta', etc.
  content jsonb, -- JSON content from Tiptap or HTML string
  margins jsonb default '{"top": 2.5, "right": 2.5, "bottom": 2.5, "left": 2.5}'::jsonb -- Margins in cm
);

-- Enable RLS
alter table document_templates enable row level security;

-- Create policy to allow all access (since it's an internal tool for now, can be refined later)
create policy "Enable all access for authenticated users" on document_templates
  for all using (true) with check (true);


-- ARCHIVO: supabase\migrations\20260202_create_termination_catalogs.sql
-- Create catalog for standardized termination causes (internal/general logic)
CREATE TABLE IF NOT EXISTS cat_causas_baja (
    id_causa_baja UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    causa TEXT NOT NULL,
    requiere_evidencia BOOLEAN DEFAULT FALSE,
    rol_iniciador TEXT DEFAULT 'Jefe', -- 'Jefe', 'RH', 'Empleado', 'Sistema'
    activo BOOLEAN DEFAULT TRUE
);

-- Insert agreed values
INSERT INTO cat_causas_baja (causa, requiere_evidencia, rol_iniciador) VALUES 
('Término de contrato', FALSE, 'Sistema'),
('Separación voluntaria (renuncia)', FALSE, 'Empleado'),
('Abandono de empleo', TRUE, 'Jefe'),
('Defunción', FALSE, 'RH'),
('Clausura', FALSE, 'Directiva'),
('Otra', TRUE, 'Jefe'),
('Ausentismo', TRUE, 'Jefe'),
('Rescisión de contrato', TRUE, 'Jefe');

-- Create catalog for IMSS specific causes (official codes)
CREATE TABLE IF NOT EXISTS cat_causas_baja_imss (
    id_causa_imss UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT NOT NULL, -- e.g. "1", "2"
    descripcion TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- Insert common IMSS causes (Example values, standard Mexican IMSS codes should be used ideally, here using generic placeholders based on common practice or provided list)
-- Note: User didn't provide specific codes, so I will add the descriptions.
INSERT INTO cat_causas_baja_imss (clave, descripcion) VALUES
('1', 'Término de contrato'),
('2', 'Separación voluntaria'),
('3', 'Abandono de empleo'),
('4', 'Defunción'),
('5', 'Clausura'),
('6', 'Otras'),
('7', 'Ausentismo'),
('8', 'Rescisión de contrato'),
('9', 'Jubilación'),
('10', 'Pensión');

-- Add columns to solicitudes payload validation or ensure JSONB is used (already exists).
-- Add columns to bajas table if missing (already exists in schema.sql but making sure).
-- Revisiting bajas table structure from schema.sql:
-- id_solicitud UUID REFERENCES solicitudes(id_solicitud)
-- tipo_baja TEXT -> We might want to link to cat_causas_baja instead
ALTER TABLE bajas ADD COLUMN IF NOT EXISTS id_causa_baja UUID REFERENCES cat_causas_baja(id_causa_baja);
ALTER TABLE bajas ADD COLUMN IF NOT EXISTS id_causa_imss UUID REFERENCES cat_causas_baja_imss(id_causa_imss);


-- ARCHIVO: supabase\migrations\20260202_insert_baja_request_type.sql
-- Insert 'Baja' request type if it doesn't exist
INSERT INTO cat_tipos_solicitud (tipo_solicitud)
SELECT 'Baja'
WHERE NOT EXISTS (
    SELECT 1 FROM cat_tipos_solicitud WHERE tipo_solicitud = 'Baja'
);


-- ARCHIVO: supabase\migrations\init_balances.sql

-- 1. Create a function to auto-initialize balances for an employee
-- This function will calculate tenure and insert a row into vacaciones_saldos
-- It assumes a '2024-2025' period exists (or generic)

CREATE OR REPLACE FUNCTION initialize_vacation_balance(target_employee_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_fecha_ingreso DATE;
    v_years_service INT;
    v_dias_corresponden INT;
    v_periodo_id UUID;
BEGIN
    -- 1. Get Hiring Date
    SELECT fecha_ingreso INTO v_fecha_ingreso 
    FROM empleado_ingreso 
    WHERE id_empleado = target_employee_id;

    IF v_fecha_ingreso IS NULL THEN
        RAISE EXCEPTION 'Employee % has no hiring date', target_employee_id;
    END IF;

    -- 2. Calculate Service Years (Simple diff)
    v_years_service := EXTRACT(YEAR FROM age(current_date, v_fecha_ingreso))::INT;
    
    -- If less than 1 year, use 1 to give them the first year's right immediately (or 0 if you prefer strict)
    IF v_years_service < 1 THEN 
        v_years_service := 1; 
    END IF;

    -- 3. Calculate Days (Using LFT 2023 Rules stored in logic)
    -- This is a simplified SQL version of the logic
    IF v_years_service = 1 THEN v_dias_corresponden := 12;
    ELSIF v_years_service = 2 THEN v_dias_corresponden := 14;
    ELSIF v_years_service = 3 THEN v_dias_corresponden := 16;
    ELSIF v_years_service = 4 THEN v_dias_corresponden := 18;
    ELSIF v_years_service = 5 THEN v_dias_corresponden := 20;
    ELSE 
        -- Formula: 20 + 2 * floor((years - 1) / 5) for years > 5
        v_dias_corresponden := 20 + (2 * floor((v_years_service - 1) / 5));
    END IF;

    -- 4. Get active period (ensure one exists in cat_periodos_vacacionales)
    -- For now, we pick the first available or a specific one '2025'
    SELECT id_periodo INTO v_periodo_id FROM cat_periodos_vacacionales LIMIT 1;

    IF v_periodo_id IS NULL THEN
        -- Create a default period if none exists
        INSERT INTO cat_periodos_vacacionales (periodo, fecha_inicio, fecha_fin)
        VALUES ('2024-2025', '2024-01-01', '2025-12-31')
        RETURNING id_periodo INTO v_periodo_id;
    END IF;

    -- 5. Insert/Update Balance
    INSERT INTO vacaciones_saldos (id_empleado, id_periodo, dias_asignados, dias_tomados)
    VALUES (target_employee_id, v_periodo_id, v_dias_corresponden, 0)
    ON CONFLICT (id_empleado, id_periodo) 
    DO UPDATE SET dias_asignados = EXCLUDED.dias_asignados;

END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto-create balance when an employee is created
CREATE OR REPLACE FUNCTION trigger_init_balance()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_vacation_balance(NEW.id_empleado);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to empleado_ingreso (since we need the date)
DROP TRIGGER IF EXISTS trg_init_balance ON empleado_ingreso;
CREATE TRIGGER trg_init_balance
AFTER INSERT ON empleado_ingreso
FOR EACH ROW
EXECUTE FUNCTION trigger_init_balance();

-- 7. COMMAND TO RUN FOR EXISTING EMPLOYEES
-- Run this block manually to seed existing ones
DO $$
DECLARE
    emp RECORD;
BEGIN
    FOR emp IN SELECT id_empleado FROM empleado_ingreso LOOP
        PERFORM initialize_vacation_balance(emp.id_empleado);
    END LOOP;
END $$;


-- ARCHIVO: supabase\migration_hierarchy.sql
-- Run this in your Supabase SQL Editor to add the Manager flag
ALTER TABLE cat_puestos 
ADD COLUMN es_jefe boolean DEFAULT false;

-- Optional: If you want to link departments specifically to a "Titular"
-- ALTER TABLE cat_departamentos ADD COLUMN id_titular uuid REFERENCES empleados(id_empleado);


-- ARCHIVO: supabase\schema.sql
-- 1.1 Catálogos
CREATE TABLE IF NOT EXISTS cat_unidades_trabajo (
    id_unidad UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidad_trabajo TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_departamentos (
    id_departamento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departamento TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_puestos (
    id_puesto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puesto TEXT NOT NULL,
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    activo BOOLEAN DEFAULT TRUE,
    es_jefe BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS cat_cecos (
    id_ceco UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave_ceco TEXT NOT NULL,
    descripcion_ceco TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_tipos_rol (
    id_tipo_rol UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_rol TEXT NOT NULL, -- "20x10", "14x7"
    dias_trabajo INT NOT NULL,
    dias_descanso INT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_tipos_incidencia (
    id_tipo_incidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_incidencia TEXT NOT NULL, -- "Vacaciones", "Incapacidad", etc.
    bloquea_asistencia BOOLEAN DEFAULT FALSE,
    requiere_evidencia BOOLEAN DEFAULT FALSE,
    cuenta_como_descanso BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_tipos_solicitud (
    id_tipo_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_solicitud TEXT NOT NULL, -- "Vacaciones", "Baja", etc.
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_periodos_vacacionales (
    id_periodo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo TEXT NOT NULL, -- "2025-2026"
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- 1.2 Empleado (Núcleo)
CREATE TABLE IF NOT EXISTS empleados (
    id_empleado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_empleado INT UNIQUE NOT NULL,
    estado_empleado TEXT DEFAULT 'Activo', -- "Activo", "Baja"
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT,
    sexo TEXT,
    fecha_nacimiento DATE,
    curp TEXT UNIQUE,
    rfc TEXT UNIQUE,
    nss TEXT UNIQUE,
    telefono TEXT,
    correo_electronico TEXT,
    estado_civil TEXT,
    tipo_residencia TEXT, -- "Local/Foráneo"
    hijos_numero INT DEFAULT 0,
    foto_url TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS empleado_ingreso (
    id_empleado UUID REFERENCES empleados(id_empleado) PRIMARY KEY,
    fecha_ingreso DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS empleado_domicilio (
    id_empleado UUID REFERENCES empleados(id_empleado) PRIMARY KEY,
    calle TEXT,
    numero_exterior TEXT,
    colonia TEXT,
    codigo_postal TEXT,
    municipio TEXT,
    estado TEXT,
    ciudad TEXT
);

CREATE TABLE IF NOT EXISTS empleado_banco (
    id_empleado UUID REFERENCES empleados(id_empleado) PRIMARY KEY,
    numero_cuenta TEXT,
    clabe TEXT,
    banco TEXT
);

-- 1.3 Historial Laboral
CREATE TABLE IF NOT EXISTS empleado_adscripciones (
    id_empleado UUID REFERENCES empleados(id_empleado),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    categoria TEXT, -- "Administrativo/Operativo"
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    id_puesto UUID REFERENCES cat_puestos(id_puesto),
    id_unidad UUID REFERENCES cat_unidades_trabajo(id_unidad),
    id_ceco UUID REFERENCES cat_cecos(id_ceco),
    razon_social TEXT,
    jefe_directo_nombre TEXT,
    es_jefe BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id_empleado, fecha_inicio)
);

CREATE TABLE IF NOT EXISTS empleado_salarios (
    id_empleado UUID REFERENCES empleados(id_empleado),
    fecha_inicio_vigencia DATE NOT NULL,
    fecha_fin_vigencia DATE,
    salario_diario NUMERIC(10,2) NOT NULL,
    motivo TEXT,
    PRIMARY KEY (id_empleado, fecha_inicio_vigencia)
);

CREATE TABLE IF NOT EXISTS empleado_roles (
    id_empleado UUID REFERENCES empleados(id_empleado),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    id_tipo_rol UUID REFERENCES cat_tipos_rol(id_tipo_rol),
    PRIMARY KEY (id_empleado, fecha_inicio)
);

-- 1.4 Incidencias
CREATE TABLE IF NOT EXISTS empleado_incidencias (
    id_incidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empleado UUID REFERENCES empleados(id_empleado) NOT NULL,
    id_tipo_incidencia UUID REFERENCES cat_tipos_incidencia(id_tipo_incidencia) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    comentarios TEXT,
    evidencia_url TEXT,
    estado TEXT DEFAULT 'Capturada', -- "Capturada", "En revisión", "Aprobada", etc.
    creado_por UUID, -- Link to auth.users if possible, otherwise UUID
    creado_el TIMESTAMPTZ DEFAULT now()
);

-- 1.5 Vacaciones
CREATE TABLE IF NOT EXISTS vacaciones_saldos (
    id_empleado UUID REFERENCES empleados(id_empleado),
    id_periodo UUID REFERENCES cat_periodos_vacacionales(id_periodo),
    dias_asignados INT DEFAULT 0,
    dias_tomados INT DEFAULT 0,
    PRIMARY KEY (id_empleado, id_periodo)
);

-- 1.6 Solicitudes y Aprobaciones
CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tipo_solicitud UUID REFERENCES cat_tipos_solicitud(id_tipo_solicitud),
    id_empleado_objetivo UUID REFERENCES empleados(id_empleado),
    folio TEXT UNIQUE,
    estatus TEXT DEFAULT 'Borrador', -- "Borrador", "Enviada", "Aprobada", etc.
    payload JSONB, -- Stores specific data (fechas, motivo)
    creado_por UUID, -- Link to auth.users
    creado_el TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solicitud_aprobaciones (
    id_solicitud UUID REFERENCES solicitudes(id_solicitud),
    orden INT NOT NULL,
    aprobador_user_id UUID NOT NULL, -- Link to auth.users
    estatus TEXT DEFAULT 'Pendiente', -- "Pendiente", "Aprobado", "Rechazado"
    comentario TEXT,
    decidido_el TIMESTAMPTZ,
    PRIMARY KEY (id_solicitud, orden)
);

CREATE TABLE IF NOT EXISTS reglas_aprobacion (
    id_regla UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tipo_solicitud UUID REFERENCES cat_tipos_solicitud(id_tipo_solicitud),
    orden INT NOT NULL,
    aprobador_user_id UUID,
    filtro JSONB, -- e.g. { "id_unidad": "..." }
    activo BOOLEAN DEFAULT TRUE
);

-- 1.7 Bajas
CREATE TABLE IF NOT EXISTS bajas (
    id_empleado UUID REFERENCES empleados(id_empleado),
    fecha_baja DATE NOT NULL,
    tipo_baja TEXT, -- "Renuncia", "Despido"
    motivo_baja TEXT,
    id_solicitud UUID REFERENCES solicitudes(id_solicitud),
    creado_el TIMESTAMPTZ DEFAULT now()
);

-- 1.8 Auditoría
CREATE TABLE IF NOT EXISTS auditoria (
    id_evento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Link to auth.users
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    id_entidad UUID,
    antes JSONB,
    despues JSONB,
    fecha TIMESTAMPTZ DEFAULT now()
);

-- 1.9 Catálogos de Bajas
CREATE TABLE IF NOT EXISTS cat_causas_baja (
    id_causa_baja UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    causa TEXT NOT NULL,
    requiere_evidencia BOOLEAN DEFAULT FALSE,
    rol_iniciador TEXT DEFAULT 'Jefe',
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_causas_baja_imss (
    id_causa_imss UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- Schema Updates for Bajas
ALTER TABLE bajas ADD COLUMN IF NOT EXISTS id_causa_baja UUID REFERENCES cat_causas_baja(id_causa_baja);
ALTER TABLE bajas ADD COLUMN IF NOT EXISTS id_causa_imss UUID REFERENCES cat_causas_baja_imss(id_causa_imss);

-- Insert Values for Causas Baja
INSERT INTO cat_causas_baja (causa, requiere_evidencia, rol_iniciador) VALUES 
('Término de contrato', FALSE, 'Sistema'),
('Separación voluntaria (renuncia)', FALSE, 'Empleado'),
('Abandono de empleo', TRUE, 'Jefe'),
('Defunción', FALSE, 'RH'),
('Clausura', FALSE, 'Directiva'),
('Otra', TRUE, 'Jefe'),
('Ausentismo', TRUE, 'Jefe'),
('Rescisión de contrato', TRUE, 'Jefe')
ON CONFLICT DO NOTHING;

-- 1.10 Perfiles (Gestión de Accesos)
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT,
    rol TEXT DEFAULT 'Jefe', -- 'Administrativo', 'Jefe'
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    creado_el TIMESTAMPTZ DEFAULT now(),
    actualizado_el TIMESTAMPTZ DEFAULT now()
);



-- ARCHIVO: supabase\seeds.sql
-- Semillas para Catálogo de Tipos de Incidencia
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

-- Semillas para Catálogo de Tipos de Solicitud (IMPORTANTE: Debe haber coincidencia con Incidencias para el auto-link)
INSERT INTO cat_tipos_solicitud (tipo_solicitud) VALUES
('Vacaciones'),
('Permiso Personal'),
('Home Office'),
('Justificación de Falta'),
('Baja de Personal')
ON CONFLICT DO NOTHING;


-- ARCHIVO: supabase\seeds_roles.sql
-- Semillas para Catálogo de Tipos de Rol (Turnos)
INSERT INTO cat_tipos_rol (tipo_rol, dias_trabajo, dias_descanso, descripcion) VALUES
('20x10', 20, 10, '20 días de trabajo por 10 de descanso'),
('14x7', 14, 7, '14 días de trabajo por 7 de descanso'),
('5x2', 5, 2, 'Semana inglesa (5 días trabajo, 2 descanso)')
ON CONFLICT DO NOTHING;


-- ARCHIVO: UPDATE_SCHEMA_ES_JEFE.sql
-- Run this in Supabase SQL Editor
ALTER TABLE empleado_adscripciones ADD COLUMN IF NOT EXISTS es_jefe BOOLEAN DEFAULT FALSE;
