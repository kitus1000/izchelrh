-- ==========================================
-- 01: CATÁLOGOS BASE
-- ==========================================
-- Este archivo contiene todas las tablas que no dependen de otras 
-- (o solo dependen de catálogos anteriores). 
-- DEBE EJECUTARSE PRIMERO.

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

CREATE TABLE IF NOT EXISTS cat_periodos_vacacionales (
    id_periodo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo TEXT NOT NULL, -- "2025-2026"
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_tipos_checada (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                  TEXT NOT NULL UNIQUE,
  label                 TEXT NOT NULL,
  requiere_codigo       BOOLEAN DEFAULT FALSE,
  color                 TEXT,
  icono                 TEXT,
  ordinal               INT DEFAULT 0,
  activo                BOOLEAN DEFAULT TRUE,
  tolerancia_retorno_min INT DEFAULT 5
);

CREATE TABLE IF NOT EXISTS cat_festivos (
    id_festivo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_el TIMESTAMPTZ DEFAULT now()
);
