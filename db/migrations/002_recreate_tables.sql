-- Primero eliminamos todas las tablas existentes en orden inverso a las dependencias
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS user_schedules CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS attendance_status CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- Ahora recreamos las tablas en el orden correcto

-- Tablas independientes primero
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius INTEGER NOT NULL DEFAULT 500
);

CREATE TABLE attendance_status (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL CHECK (code IN ('present', 'absent', 'late')),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de usuarios que depende de departments
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
    employee_type TEXT NOT NULL CHECK (employee_type IN ('profesor', 'pas')) DEFAULT 'pas',
    medusa_user TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    department_id INTEGER REFERENCES departments(id),
    avatar_url TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    biometric_token TEXT,
    pin TEXT
);

-- Tabla de asistencias que depende de users, locations y attendance_status
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    location_id INTEGER REFERENCES locations(id),
    status_id INTEGER NOT NULL REFERENCES attendance_status(id),
    check_in_time TIMESTAMP NOT NULL,
    check_out_time TIMESTAMP,
    is_manual_entry BOOLEAN DEFAULT FALSE,
    incidence_type TEXT CHECK (incidence_type IN ('forgotten_check_in', 'forgotten_check_out', 'other')),
    incidence_description TEXT,
    approved_by_id INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de mensajes que depende de users
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Tabla de configuración de usuario que depende de users
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    theme TEXT NOT NULL CHECK (theme IN ('blue', 'green', 'purple', 'orange')) DEFAULT 'blue',
    appearance TEXT NOT NULL CHECK (appearance IN ('light', 'dark', 'system')) DEFAULT 'light',
    animations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    animation_speed REAL NOT NULL DEFAULT 1,
    sidebar_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
    compact_mode BOOLEAN DEFAULT FALSE,
    single_check_in_per_day BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de horarios de usuario que depende de users
CREATE TABLE user_schedules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    weekday INTEGER NOT NULL, -- 0-6, donde 0 es domingo
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de días festivos
CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('nacional', 'regional', 'local')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Creación de índices
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

-- Insertar estados básicos de asistencia
INSERT INTO attendance_status (name, code, description)
VALUES 
    ('Puntual', 'present', 'Registro de entrada dentro del horario establecido'),
    ('Ausente', 'absent', 'No se registró entrada'),
    ('Retraso', 'late', 'Registro de entrada fuera del horario establecido');
