-- ==========================================
-- 03: MÓDULOS DE NEGOCIO (CHECADOR, VACACIONES, ETC)
-- ==========================================
-- Este archivo contiene las tablas transaccionales de los módulos.
-- Requiere que 01_SCHEMA_CATALOGOS.sql y 02_SCHEMA_CORE_EMPLEADOS.sql se hayan ejecutado.

CREATE TABLE IF NOT EXISTS dispositivos_checadores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  device_key      TEXT UNIQUE NOT NULL,
  tipo            TEXT DEFAULT 'tablet',
  ubicacion       TEXT,
  activo          BOOLEAN DEFAULT TRUE,
  company_id      UUID,
  ultimo_ping     TIMESTAMPTZ,
  creado_el       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permisos_autorizados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo            TEXT NOT NULL UNIQUE,
  id_empleado       UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  tipo_checada      TEXT NOT NULL,
  vigencia_desde    TIMESTAMPTZ NOT NULL,
  vigencia_hasta    TIMESTAMPTZ NOT NULL,
  usos_maximos      INT DEFAULT 1,
  usos_realizados   INT DEFAULT 0,
  estatus           TEXT DEFAULT 'Activo',
  motivo            TEXT,
  company_id        UUID,
  creado_por        UUID REFERENCES perfiles(id),
  usado_en          TIMESTAMPTZ,
  usado_en_device   UUID REFERENCES dispositivos_checadores(id),
  cancelado_por     UUID REFERENCES perfiles(id),
  cancelado_el      TIMESTAMPTZ,
  creado_el         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checadas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empleado           UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  tipo_checada          TEXT NOT NULL REFERENCES cat_tipos_checada(tipo),
  timestamp_checada     TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_local           DATE NOT NULL,
  estatus_puntualidad   TEXT,
  retardo_minutos       INT DEFAULT 0,
  id_permiso            UUID REFERENCES permisos_autorizados(id),
  id_dispositivo        UUID REFERENCES dispositivos_checadores(id),
  id_turno              UUID REFERENCES turnos(id),
  metodo_identificacion TEXT DEFAULT 'QR',
  company_id            UUID,
  sincronizado          BOOLEAN DEFAULT TRUE,
  origen                TEXT DEFAULT 'web',
  notas                 TEXT,
  es_manual             BOOLEAN DEFAULT FALSE,
  autorizado_por        UUID REFERENCES perfiles(id),
  creado_el             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tipo_solicitud UUID REFERENCES cat_tipos_solicitud(id_tipo_solicitud),
    id_empleado_objetivo UUID REFERENCES empleados(id_empleado),
    folio TEXT UNIQUE,
    estatus TEXT DEFAULT 'Borrador',
    payload JSONB,
    creado_por UUID,
    creado_el TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solicitud_aprobaciones (
    id_solicitud UUID REFERENCES solicitudes(id_solicitud),
    orden INT NOT NULL,
    aprobador_user_id UUID NOT NULL,
    estatus TEXT DEFAULT 'Pendiente',
    comentario TEXT,
    decidido_el TIMESTAMPTZ,
    PRIMARY KEY (id_solicitud, orden)
);

CREATE TABLE IF NOT EXISTS reglas_aprobacion (
    id_regla UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tipo_solicitud UUID REFERENCES cat_tipos_solicitud(id_tipo_solicitud),
    orden INT NOT NULL,
    aprobador_user_id UUID,
    filtro JSONB,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS empleado_incidencias (
    id_incidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empleado UUID REFERENCES empleados(id_empleado) NOT NULL,
    id_tipo_incidencia UUID REFERENCES cat_tipos_incidencia(id_tipo_incidencia) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    comentarios TEXT,
    evidencia_url TEXT,
    estado TEXT DEFAULT 'Capturada',
    creado_por UUID,
    creado_el TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vacaciones_saldos (
    id_empleado UUID REFERENCES empleados(id_empleado),
    id_periodo UUID REFERENCES cat_periodos_vacacionales(id_periodo),
    dias_asignados INT DEFAULT 0,
    dias_tomados INT DEFAULT 0,
    PRIMARY KEY (id_empleado, id_periodo)
);

CREATE TABLE IF NOT EXISTS bajas (
    id_empleado UUID REFERENCES empleados(id_empleado),
    fecha_baja DATE NOT NULL,
    tipo_baja TEXT,
    motivo_baja TEXT,
    id_solicitud UUID REFERENCES solicitudes(id_solicitud),
    id_causa_baja UUID REFERENCES cat_causas_baja(id_causa_baja),
    id_causa_imss UUID REFERENCES cat_causas_baja_imss(id_causa_imss),
    creado_el TIMESTAMPTZ DEFAULT now()
);

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

-- Índices Funcionales
CREATE INDEX IF NOT EXISTS idx_permisos_codigo ON permisos_autorizados(codigo);
CREATE INDEX IF NOT EXISTS idx_permisos_emp ON permisos_autorizados(id_empleado);
CREATE INDEX IF NOT EXISTS idx_checadas_emp_fecha ON checadas(id_empleado, fecha_local);
CREATE INDEX IF NOT EXISTS idx_checadas_fecha ON checadas(fecha_local);
