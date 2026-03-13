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
