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
