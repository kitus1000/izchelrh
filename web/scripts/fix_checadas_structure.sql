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
