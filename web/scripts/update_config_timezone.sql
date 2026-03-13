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


