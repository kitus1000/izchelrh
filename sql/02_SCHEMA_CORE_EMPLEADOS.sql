-- ==========================================
-- 02: CORE Y EMPLEADOS
-- ==========================================
-- Este archivo contiene las entidades principales.
-- Requiere que 01_SCHEMA_CATALOGOS.sql haya sido ejecutado.

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
  limite_falta_min INT NOT NULL DEFAULT 60,
  creado_el       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS configuracion_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_empresa TEXT,
    rfc TEXT,
    direccion TEXT,
    registro_patronal TEXT,
    logo_base64 TEXT,
    timezone TEXT DEFAULT 'America/Mexico_City',
    creado_el TIMESTAMPTZ DEFAULT now(),
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
    qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    id_turno UUID REFERENCES turnos(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT,
    rol TEXT DEFAULT 'Jefe' CHECK (rol IN ('Administrativo', 'Jefe')),
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    creado_el TIMESTAMPTZ DEFAULT now(),
    actualizado_el TIMESTAMPTZ DEFAULT now()
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

CREATE TABLE IF NOT EXISTS empleado_turnos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empleado     UUID REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  id_turno        UUID REFERENCES turnos(id) ON DELETE CASCADE,
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE,              -- NULL = vigente actual
  creado_por      UUID REFERENCES perfiles(id),
  creado_el       TIMESTAMPTZ DEFAULT now()
);

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
