-- Crear la tabla de estados de asistencia
CREATE TABLE attendance_status (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL CHECK (code IN ('present', 'absent', 'late')),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insertar los estados básicos
INSERT INTO attendance_status (name, code, description)
VALUES 
    ('Puntual', 'present', 'Registro de entrada dentro del horario establecido'),
    ('Ausente', 'absent', 'No se registró entrada'),
    ('Retraso', 'late', 'Registro de entrada fuera del horario establecido');

-- Añadir la columna status_id a attendance
ALTER TABLE attendance ADD COLUMN status_id INTEGER;

-- Migrar los estados existentes
UPDATE attendance 
SET status_id = (
    SELECT id FROM attendance_status 
    WHERE attendance_status.code = attendance.status
);

-- Hacer status_id NOT NULL y agregar la restricción de clave foránea
ALTER TABLE attendance 
    ALTER COLUMN status_id SET NOT NULL,
    ADD CONSTRAINT fk_attendance_status 
    FOREIGN KEY (status_id) 
    REFERENCES attendance_status(id);

-- Eliminar la columna status antigua
ALTER TABLE attendance DROP COLUMN status;

-- Hacer location_id opcional
ALTER TABLE attendance ALTER COLUMN location_id DROP NOT NULL;

-- Eliminar la columna department redundante
ALTER TABLE users DROP COLUMN department;

-- Agregar índices
CREATE INDEX user_department_id_idx ON users(department_id);
CREATE INDEX user_username_idx ON users(username);
CREATE INDEX user_email_idx ON users(email);
CREATE INDEX attendance_user_id_idx ON attendance(user_id);
CREATE INDEX attendance_location_id_idx ON attendance(location_id);
CREATE INDEX attendance_status_id_idx ON attendance(status_id);
CREATE INDEX attendance_check_in_time_idx ON attendance(check_in_time);
CREATE INDEX attendance_user_location_idx ON attendance(user_id, location_id);
CREATE INDEX message_from_user_id_idx ON messages(from_user_id);
CREATE INDEX message_to_user_id_idx ON messages(to_user_id);
CREATE INDEX message_sent_at_idx ON messages(sent_at);
CREATE INDEX user_settings_user_id_idx ON user_settings(user_id);

-- Agregar columna single_check_in_per_day a user_settings
ALTER TABLE user_settings 
ADD COLUMN single_check_in_per_day BOOLEAN NOT NULL DEFAULT false;
