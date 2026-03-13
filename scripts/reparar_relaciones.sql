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
