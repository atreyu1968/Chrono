-- Primero eliminamos las tablas que ya no necesitamos
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS user_schedules CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS attendance_status CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Modificamos la tabla de usuarios para mantener solo los campos esenciales
ALTER TABLE users
DROP COLUMN IF EXISTS employee_type,
DROP COLUMN IF EXISTS medusa_user,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS department_id,
DROP COLUMN IF EXISTS avatar_url,
DROP COLUMN IF EXISTS emergency_contact,
DROP COLUMN IF EXISTS emergency_phone,
DROP COLUMN IF EXISTS biometric_token,
DROP COLUMN IF EXISTS pin;

-- Simplificamos la tabla de attendance
ALTER TABLE attendance
DROP COLUMN IF EXISTS status_id,
DROP COLUMN IF EXISTS incidence_type,
DROP COLUMN IF EXISTS incidence_description,
DROP COLUMN IF EXISTS approved_by_id,
DROP COLUMN IF EXISTS approved_at,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;

-- Actualizamos los índices
DROP INDEX IF EXISTS user_department_id_idx;
DROP INDEX IF EXISTS attendance_status_id_idx;

-- Creamos nuevos índices optimizados
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_location ON attendance(location_id);
