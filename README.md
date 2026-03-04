# Chrono - Sistema de Control de Asistencia con Geolocalización

Sistema de gestión de asistencia basado en geolocalización (geofencing) con control de acceso por roles (Administrador / Empleado). Los empleados fichan entrada y salida desde su móvil, validando que se encuentren dentro del radio permitido de su centro de trabajo.

---

## Características

### General
- Autenticación segura con sesiones (bcrypt + Passport.js)
- Roles diferenciados: **Administrador** y **Empleado**
- PWA instalable en móviles (funciona como app nativa)
- Soporte offline parcial mediante Service Worker
- Diseño responsive (móvil, tablet, escritorio)

### Panel del Empleado
- **Fichaje con geolocalización**: GPS de alta precisión para registrar entrada/salida
- **Validación por geofencing**: Solo permite fichar dentro del radio configurado del centro de trabajo
- **Indicador visual de distancia**: Muestra en tiempo real la distancia al centro de trabajo y si está dentro del radio
- **Alerta de precisión GPS**: Avisa cuando la señal GPS es baja (>50m)
- **Historial de asistencia**: Consulta de registros propios con filtros por fecha
- **Mensajería interna**: Comunicación con administradores
- **Configuración personal**: Tema, fichaje automático, apariencia

### Panel del Administrador
- **Dashboard**: Estadísticas en tiempo real (empleados presentes, puntualidad, gráficos semanales)
- **Gestión de usuarios**: Crear, editar y administrar empleados (tipo, departamento, contacto de emergencia)
- **Gestión de ubicaciones**: Configurar centros de trabajo con coordenadas GPS y radio permitido (100-2000m)
- **Registros de asistencia**: Vista completa de todos los fichajes con coordenadas almacenadas
- **Gestión de departamentos**: Organización por departamentos
- **Gestión de festivos**: Configuración de días no laborables
- **Mensajería**: Comunicación con empleados
- **Horarios**: Gestión de horarios de empleados
- **Configuración del sistema**: Ajustes generales

### PWA (Progressive Web App)
- Instalable en Android e iOS desde el navegador
- Abre directamente en la pantalla de fichaje (`/check-in`)
- Funciona en modo standalone (sin barra del navegador)
- Caché de assets para carga rápida
- Respuesta offline amigable para llamadas API sin conexión

### Geolocalización
- GPS de alta precisión (`enableHighAccuracy: true`)
- Solicitud automática de ubicación al abrir la página
- Cálculo de distancia Haversine (cliente y servidor)
- Validación de radio en el servidor (anti-manipulación)
- Almacenamiento de coordenadas del fichaje para auditoría
- Mensajes específicos de error GPS (permiso denegado, señal no disponible, timeout)

---

## Requisitos del Servidor

- Ubuntu Server 22.04 o 24.04 LTS
- 1 GB de RAM mínimo (2 GB recomendado)
- 10 GB de disco libre
- Acceso root (sudo)
- Conexión a Internet (para descargar dependencias)

---

## Instalación

### Paso 1: Preparar el servidor

En un servidor Ubuntu recién instalado, primero actualiza el sistema e instala las herramientas necesarias:

```bash
# Actualizar la lista de paquetes y el sistema
sudo apt update && sudo apt upgrade -y

# Instalar herramientas básicas necesarias para descargar desde GitHub
sudo apt install -y curl git wget ca-certificates gnupg
```

> Esto solo es necesario hacerlo una vez. El instalador también instala estas herramientas, pero si el servidor no tiene `curl` ni `git` preinstalados, necesitas instalarlos para poder descargar el script desde GitHub.

### Paso 2: Descargar y ejecutar el instalador

**Opción A** - Descargar y ejecutar en un solo comando:

```bash
wget -qO- https://raw.githubusercontent.com/USUARIO/REPO/main/install.sh | sudo bash
```

**Opcion B** - Clonar el repositorio y ejecutar localmente:

```bash
git clone https://github.com/USUARIO/REPO.git /tmp/chrono
sudo bash /tmp/chrono/install.sh
```

**Opcion C** - Si ya tienes el archivo `install.sh` en el servidor:

```bash
sudo bash install.sh
```

> **Nota:** Antes de usar el script, edita la variable `GITHUB_REPO` en la línea 23 del archivo `install.sh` con la URL real de tu repositorio de GitHub.

#### Lo que hace el instalador:

1. Detecta si es instalación nueva o actualización
2. Instala dependencias del sistema (curl, git, gnupg)
3. Instala Node.js 20.x
4. Instala y configura PostgreSQL
5. Instala y configura Nginx como proxy reverso
6. Crea un usuario del sistema (`chrono`)
7. Configura la base de datos (usuario, contraseña, permisos)
8. Genera archivo de configuración en `/etc/chrono/env`
9. Clona el repositorio
10. Instala dependencias npm y compila la aplicación
11. Aplica el esquema de base de datos (migraciones)
12. Crea el usuario administrador (solo en instalación nueva)
13. Configura el servicio systemd
14. Configura Nginx
15. Ofrece configuración de Cloudflare Tunnel (HTTPS sin abrir puertos)
16. Verifica que todo funcione

#### Al finalizar la instalación verás:

- URL de acceso: `http://<IP-del-servidor>`
- Credenciales del administrador (usuario y contraseña generados automáticamente)

> **Guarda las credenciales de admin que se muestran al final. Cámbialas después del primer inicio de sesión.**

---

## Actualización

Para actualizar la aplicación a la última versión, simplemente ejecuta el instalador de nuevo:

```bash
cd /var/www/chrono && sudo bash install.sh
```

O desde GitHub:

```bash
wget -qO- https://raw.githubusercontent.com/USUARIO/REPO/main/install.sh | sudo bash
```

El instalador detecta automáticamente que es una actualización y:
- Preserva las credenciales y configuración existentes (`/etc/chrono/env`)
- Preserva el usuario administrador y todos los datos
- Actualiza el código fuente desde Git
- Recompila la aplicación
- Aplica migraciones de base de datos (si hay cambios en el esquema)
- Reinicia el servicio

---

## Configuración

### Archivo de configuración

La configuración se almacena en `/etc/chrono/env` (fuera del repositorio, se preserva en actualizaciones):

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PORT` | Puerto interno de la aplicación | `5000` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL | Generada automáticamente |
| `SESSION_SECRET` | Clave para encriptar sesiones | Generada automáticamente |
| `SECURE_COOKIES` | Cookies seguras (requiere HTTPS) | `false` |
| `REPL_ID` | Identificador de la instancia | Generado automáticamente |

### HTTPS con Cloudflare Tunnel

Si durante la instalación proporcionas un token de Cloudflare Tunnel, se configurará automáticamente:
- Instala `cloudflared`
- Configura el servicio de túnel
- Activa cookies seguras (`SECURE_COOKIES=true`)

Para configurarlo después de la instalación:

```bash
# Instalar cloudflared
ARCH=$(dpkg --print-architecture)
curl -fsSL -o /tmp/cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb"
sudo dpkg -i /tmp/cloudflared.deb

# Configurar el túnel
sudo cloudflared service install <TU-TOKEN>

# Activar cookies seguras
sudo sed -i 's/SECURE_COOKIES=false/SECURE_COOKIES=true/' /etc/chrono/env
sudo systemctl restart chrono
```

---

## Comandos Útiles

```bash
# Ver estado del servicio
systemctl status chrono

# Reiniciar la aplicación
systemctl restart chrono

# Detener la aplicación
systemctl stop chrono

# Ver logs en tiempo real
journalctl -u chrono -f

# Ver últimos 50 registros del log
journalctl -u chrono -n 50

# Ver estado de Nginx
systemctl status nginx

# Ver estado de PostgreSQL
systemctl status postgresql

# Acceder a la base de datos
sudo -u chrono psql -h 127.0.0.1 -d chrono
```

---

## Estructura del Proyecto

```
client/src/
  pages/
    auth-page.tsx              - Página de login
    admin/
      dashboard.tsx            - Dashboard con estadísticas
      users.tsx                - Gestión de usuarios
      locations.tsx            - Gestión de ubicaciones/centros
      departments.tsx          - Gestión de departamentos
      attendance-records.tsx   - Registros de asistencia
      holidays.tsx             - Gestión de festivos
      messages.tsx             - Mensajería (admin)
      settings.tsx             - Configuración del sistema
      user-attendance.tsx      - Asistencia por usuario
      user-schedules.tsx       - Horarios de usuarios
    employee/
      check-in.tsx             - Fichaje GPS (entrada/salida)
      attendance.tsx           - Historial de asistencia
      messages.tsx             - Mensajería (empleado)
      settings.tsx             - Configuración personal
  components/
    layout/
      admin-layout.tsx         - Layout del panel admin
      employee-layout.tsx      - Layout del panel empleado
    ui/                        - Componentes Shadcn UI

server/
  index.ts                     - Punto de entrada del servidor
  routes.ts                    - Rutas API
  auth.ts                      - Autenticación (Passport.js)
  vite.ts                      - Servidor Vite (desarrollo)

db/
  schema.ts                    - Esquema de base de datos (Drizzle ORM)
  index.ts                     - Conexión a base de datos

client/public/
  manifest.webmanifest         - Configuración PWA
  sw.js                        - Service Worker
  icon-192.svg                 - Icono PWA 192x192
  icon-512.svg                 - Icono PWA 512x512
```

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Shadcn UI |
| Routing (cliente) | Wouter |
| Estado/datos | TanStack Query v5 |
| Gráficos | Recharts |
| Backend | Node.js, Express |
| Autenticación | Passport.js, bcrypt, express-session |
| Base de datos | PostgreSQL |
| ORM | Drizzle ORM |
| Proxy reverso | Nginx |
| Proceso | systemd |
| PWA | Service Worker, Web App Manifest |

---

## Esquema de Base de Datos

| Tabla | Descripción |
|---|---|
| `users` | Usuarios del sistema (admin/empleado) con datos de perfil |
| `locations` | Centros de trabajo con coordenadas GPS y radio |
| `attendance` | Registros de fichaje (entrada, salida, coordenadas GPS) |
| `user_settings` | Preferencias individuales de cada usuario |
| `departments` | Departamentos de la organización |
| `messages` | Mensajes internos entre usuarios |

---

## API

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/login` | Iniciar sesión |
| POST | `/api/register` | Registrar usuario |
| POST | `/api/logout` | Cerrar sesión |
| GET | `/api/user` | Obtener usuario actual |

### Usuarios (Admin)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/users` | Listar todos los usuarios |
| GET | `/api/users/recent` | Últimos 5 usuarios creados |
| POST | `/api/users` | Crear usuario |
| PATCH | `/api/users/:id` | Editar usuario |

### Ubicaciones
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/locations` | Listar ubicaciones |
| POST | `/api/locations` | Crear ubicación (admin) |
| PATCH | `/api/locations/:id` | Editar ubicación (admin) |
| DELETE | `/api/locations/:id` | Eliminar ubicación (admin) |

### Asistencia
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/attendance/check-in` | Fichar entrada (con GPS) |
| POST | `/api/attendance/check-out` | Fichar salida |
| GET | `/api/attendance/history` | Historial propio (filtrable) |
| GET | `/api/attendance` | Todos los registros (admin) |
| GET | `/api/attendance/recent` | Registros recientes (admin) |
| GET | `/api/attendance/stats` | Estadísticas (admin) |

### Otros
| Método | Ruta | Descripción |
|---|---|---|
| GET/PATCH | `/api/user/settings` | Configuración del usuario |
| PATCH | `/api/user/profile` | Perfil del usuario |
| GET/POST | `/api/departments` | Departamentos |
| GET/POST | `/api/messages` | Mensajes |
| PATCH | `/api/messages/:id/read` | Marcar mensaje como leído |

---

## Solución de Problemas

### La aplicación no inicia
```bash
# Revisar logs del servicio
journalctl -u chrono -n 50 --no-pager

# Verificar que PostgreSQL esté activo
systemctl status postgresql

# Verificar la configuración
cat /etc/chrono/env
```

### Error de conexión a base de datos
```bash
# Verificar que PostgreSQL acepte conexiones
sudo -u postgres psql -c "SELECT 1;"

# Verificar credenciales
source /etc/chrono/env
psql "$DATABASE_URL" -c "SELECT 1;"
```

### Nginx devuelve 502 Bad Gateway
```bash
# Verificar que la aplicación esté ejecutándose
systemctl status chrono

# Verificar el puerto
curl http://localhost:5000/api/user
```

### GPS no funciona en el móvil
- El GPS requiere HTTPS o localhost para funcionar
- Configura Cloudflare Tunnel para habilitar HTTPS
- Verifica que el navegador tenga permisos de ubicación

### Resetear contraseña del administrador
```bash
# Generar nueva contraseña hasheada
cd /var/www/chrono
NEW_PASS=$(node -e "const b=require('bcrypt');b.hash('NuevaContraseña123',10).then(h=>console.log(h))")

# Actualizar en base de datos
source /etc/chrono/env
psql "$DATABASE_URL" -c "UPDATE users SET password='$NEW_PASS' WHERE username='admin';"

# Reiniciar
systemctl restart chrono
```

---

## Licencia

Desarrollado por **Atreyu Servicios Digitales**
