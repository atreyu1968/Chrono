#!/bin/bash
set -e

###############################################################################
#  CHRONO - Autoinstalador Desatendido para Ubuntu Server
#  Sistema de Control de Asistencia con Geolocalización
#
#  Uso: wget -qO- https://raw.githubusercontent.com/USUARIO/REPO/main/install.sh | sudo bash
#  O:   curl -fsSL https://raw.githubusercontent.com/USUARIO/REPO/main/install.sh | sudo bash
#  O:   sudo bash install.sh
###############################################################################

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN - Modificar estos valores según tu entorno
# ═══════════════════════════════════════════════════════════════════════════════
APP_NAME="chrono"
APP_DIR="/var/www/$APP_NAME"
CONFIG_DIR="/etc/$APP_NAME"
APP_PORT="5000"
APP_USER="chrono"
DB_NAME="chrono"
DB_USER="chrono"
GITHUB_REPO="https://github.com/USUARIO/REPO.git"
GITHUB_BRANCH="main"
NODE_MAJOR=20

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCIONES DE UTILIDAD
# ═══════════════════════════════════════════════════════════════════════════════
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header()  { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"; }
print_status()  { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[  OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

check_error() {
    if [ $? -ne 0 ]; then
        print_error "$1"
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFICACIONES INICIALES
# ═══════════════════════════════════════════════════════════════════════════════
print_header "CHRONO - Instalador Automático"

if [ "$EUID" -ne 0 ]; then
    print_error "Este script debe ejecutarse como root (sudo bash install.sh)"
    exit 1
fi

if ! grep -qi 'ubuntu\|debian' /etc/os-release 2>/dev/null; then
    print_warning "Este script está diseñado para Ubuntu/Debian. Continuando de todos modos..."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# DETECCIÓN: ¿Instalación nueva o actualización?
# ═══════════════════════════════════════════════════════════════════════════════
IS_UPDATE=false
if [ -f "$CONFIG_DIR/env" ]; then
    IS_UPDATE=true
    print_warning "Instalación existente detectada. Se preservarán credenciales."
    source "$CONFIG_DIR/env"
    print_success "Credenciales cargadas desde $CONFIG_DIR/env"
else
    print_status "Instalación nueva detectada."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 1: Actualizar sistema e instalar dependencias base
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 1: Preparando el sistema"

print_status "Actualizando lista de paquetes..."
apt-get update -qq
check_error "Error al actualizar paquetes"

print_status "Instalando herramientas base (curl, git, gnupg, ca-certificates)..."
apt-get install -y -qq curl git gnupg ca-certificates lsb-release openssl > /dev/null 2>&1
check_error "Error al instalar herramientas base"
print_success "Herramientas base instaladas"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 2: Instalar Node.js
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 2: Instalando Node.js ${NODE_MAJOR}.x"

if command -v node &> /dev/null; then
    CURRENT_NODE=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$CURRENT_NODE" -ge "$NODE_MAJOR" ] 2>/dev/null; then
        print_success "Node.js $(node -v) ya está instalado"
    else
        print_warning "Node.js v$CURRENT_NODE detectado, se necesita v${NODE_MAJOR}+. Actualizando..."
        INSTALL_NODE=true
    fi
else
    INSTALL_NODE=true
fi

if [ "${INSTALL_NODE:-false}" = true ] || ! command -v node &> /dev/null; then
    print_status "Descargando e instalando Node.js ${NODE_MAJOR}.x..."
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg 2>/dev/null
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
    apt-get update -qq
    apt-get install -y -qq nodejs > /dev/null 2>&1
    check_error "Error al instalar Node.js"

    chmod 755 /usr/bin/node 2>/dev/null || true
    chmod 755 /usr/bin/npm 2>/dev/null || true
    print_success "Node.js $(node -v) instalado"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 3: Instalar PostgreSQL
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 3: Instalando PostgreSQL"

if command -v psql &> /dev/null; then
    print_success "PostgreSQL ya está instalado"
else
    print_status "Instalando PostgreSQL..."
    apt-get install -y -qq postgresql postgresql-contrib > /dev/null 2>&1
    check_error "Error al instalar PostgreSQL"
    print_success "PostgreSQL instalado"
fi

print_status "Asegurando que PostgreSQL está activo..."
systemctl enable postgresql > /dev/null 2>&1
systemctl start postgresql
check_error "Error al iniciar PostgreSQL"
print_success "PostgreSQL activo"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 4: Instalar Nginx
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 4: Instalando Nginx"

if command -v nginx &> /dev/null; then
    print_success "Nginx ya está instalado"
else
    print_status "Instalando Nginx..."
    apt-get install -y -qq nginx > /dev/null 2>&1
    check_error "Error al instalar Nginx"
    print_success "Nginx instalado"
fi

apt-mark manual nginx > /dev/null 2>&1
print_success "Nginx marcado como paquete manual (no se eliminará con autoremove)"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 5: Crear usuario del sistema
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 5: Configurando usuario del sistema"

if id "$APP_USER" &>/dev/null; then
    print_success "Usuario '$APP_USER' ya existe"
else
    print_status "Creando usuario '$APP_USER'..."
    useradd --system --create-home --shell /bin/bash "$APP_USER"
    check_error "Error al crear usuario"
    print_success "Usuario '$APP_USER' creado"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 6: Configurar base de datos (solo instalación nueva)
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 6: Configurando base de datos"

if [ "$IS_UPDATE" = false ]; then
    DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    SESSION_SECRET=$(openssl rand -base64 32)

    print_status "Creando usuario PostgreSQL '$DB_USER'..."
    sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" > /dev/null 2>&1
    check_error "Error al crear usuario PostgreSQL"

    print_status "Creando base de datos '$DB_NAME'..."
    sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" > /dev/null 2>&1
    check_error "Error al crear base de datos"

    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" > /dev/null 2>&1
    sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" > /dev/null 2>&1

    print_status "Configurando autenticación md5 para PostgreSQL..."
    PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | xargs)
    if [ -f "$PG_HBA" ]; then
        if ! grep -q "host.*$DB_NAME.*$DB_USER.*md5" "$PG_HBA"; then
            sed -i "/^# IPv4 local connections:/a host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" "$PG_HBA"
            sed -i "/^# IPv6 local connections:/a host    $DB_NAME    $DB_USER    ::1/128         md5" "$PG_HBA"
            systemctl reload postgresql
        fi
    fi

    print_success "Base de datos configurada"
else
    print_success "Base de datos existente preservada"
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 7: Configuración persistente
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 7: Configuración del entorno"

mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"

if [ "$IS_UPDATE" = false ]; then
    cat > "$CONFIG_DIR/env" << ENVEOF
NODE_ENV=production
PORT=$APP_PORT
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$SESSION_SECRET
SECURE_COOKIES=false
REPL_ID=$SESSION_SECRET
ENVEOF
    chmod 600 "$CONFIG_DIR/env"
    print_success "Archivo de configuración creado en $CONFIG_DIR/env"
else
    if ! grep -q "^REPL_ID=" "$CONFIG_DIR/env"; then
        echo "REPL_ID=$SESSION_SECRET" >> "$CONFIG_DIR/env"
    fi
    if ! grep -q "^SECURE_COOKIES=" "$CONFIG_DIR/env"; then
        echo "SECURE_COOKIES=false" >> "$CONFIG_DIR/env"
    fi
    print_success "Configuración existente preservada"
fi

chown -R "$APP_USER:$APP_USER" "$CONFIG_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 8: Descargar/actualizar código
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 8: Descargando código fuente"

git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

if [ -d "$APP_DIR/.git" ]; then
    print_status "Repositorio existente, actualizando..."
    cd "$APP_DIR"
    sudo -u "$APP_USER" git fetch --all
    sudo -u "$APP_USER" git reset --hard "origin/$GITHUB_BRANCH"
    print_success "Código actualizado"
else
    print_status "Clonando repositorio..."
    mkdir -p "$(dirname $APP_DIR)"
    git clone --depth 1 -b "$GITHUB_BRANCH" "$GITHUB_REPO" "$APP_DIR"
    check_error "Error al clonar repositorio"
    print_success "Repositorio clonado"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 9: Instalar dependencias y compilar
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 9: Instalando dependencias y compilando"

cd "$APP_DIR"

print_status "Instalando dependencias npm (incluyendo dev para compilación)..."
sudo -u "$APP_USER" npm install 2>&1 | tail -1
check_error "Error al instalar dependencias"
print_success "Dependencias instaladas"

print_status "Compilando aplicación..."
sudo -u "$APP_USER" npm run build 2>&1 | tail -3
check_error "Error al compilar"
print_success "Aplicación compilada"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 10: Ejecutar migraciones de base de datos
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 10: Migraciones de base de datos"

print_status "Aplicando esquema de base de datos..."
cd "$APP_DIR"
sudo -u "$APP_USER" bash -c "source $CONFIG_DIR/env && export DATABASE_URL && npx drizzle-kit push --force" 2>&1 | tail -5
print_success "Esquema de base de datos actualizado"

print_status "Eliminando dependencias de desarrollo..."
sudo -u "$APP_USER" npm prune --omit=dev 2>&1 | tail -1
print_success "Dependencias de desarrollo eliminadas"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 11: Crear usuario administrador (solo instalación nueva)
# ═══════════════════════════════════════════════════════════════════════════════
if [ "$IS_UPDATE" = false ]; then
    print_header "PASO 11: Creando usuario administrador"

    ADMIN_PASS=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)

    print_status "Creando usuario admin..."
    HASHED_PASS=$(cd "$APP_DIR" && sudo -u "$APP_USER" node -e "
        const bcrypt = require('bcrypt');
        bcrypt.hash('$ADMIN_PASS', 10).then(h => process.stdout.write(h));
    " 2>/dev/null)

    if [ -z "$HASHED_PASS" ]; then
        HASHED_PASS=$(cd "$APP_DIR" && sudo -u "$APP_USER" node -e "
            import('bcrypt').then(b => b.default.hash('$ADMIN_PASS', 10).then(h => process.stdout.write(h)));
        " 2>/dev/null)
    fi

    if [ -n "$HASHED_PASS" ]; then
        source "$CONFIG_DIR/env"
        PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -c "
            INSERT INTO users (username, password, role, full_name, email)
            VALUES ('admin', '$HASHED_PASS', 'admin', 'Administrador', 'admin@chrono.local')
            ON CONFLICT (username) DO NOTHING;
        " > /dev/null 2>&1
        print_success "Usuario admin creado"
    else
        print_warning "No se pudo crear el usuario admin automáticamente. Créelo manualmente."
    fi
else
    print_status "Actualización: usuario admin preservado"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 12: Configurar servicio systemd
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 12: Configurando servicio systemd"

cat > "/etc/systemd/system/$APP_NAME.service" << SERVICEEOF
[Unit]
Description=Chrono - Sistema de Control de Asistencia
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$CONFIG_DIR/env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable "$APP_NAME" > /dev/null 2>&1
systemctl restart "$APP_NAME"
check_error "Error al iniciar servicio"
print_success "Servicio $APP_NAME configurado y activo"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 13: Configurar Nginx
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 13: Configurando Nginx"

cat > "/etc/nginx/sites-available/$APP_NAME" << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:APP_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

sed -i "s/APP_PORT_PLACEHOLDER/$APP_PORT/g" "/etc/nginx/sites-available/$APP_NAME"

ln -sf "/etc/nginx/sites-available/$APP_NAME" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t > /dev/null 2>&1
check_error "Error en configuración de Nginx"
systemctl enable nginx > /dev/null 2>&1
systemctl restart nginx
print_success "Nginx configurado como proxy reverso"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 14: Cloudflare Tunnel (opcional)
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 14: Cloudflare Tunnel (opcional)"

if [ -t 0 ]; then
    echo -e "${YELLOW}Si deseas exponer la aplicación a Internet con HTTPS sin abrir puertos,${NC}"
    echo -e "${YELLOW}puedes configurar un Cloudflare Tunnel. Necesitas un token de Cloudflare.${NC}"
    echo ""
    read -p "Token de Cloudflare Tunnel (Enter para omitir): " CF_TOKEN

    if [ -n "$CF_TOKEN" ]; then
        print_status "Instalando Cloudflare Tunnel..."

        ARCH=$(dpkg --print-architecture)
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb"
        curl -fsSL -o /tmp/cloudflared.deb "$CF_URL"
        dpkg -i /tmp/cloudflared.deb > /dev/null 2>&1
        rm -f /tmp/cloudflared.deb

        cloudflared service install "$CF_TOKEN" 2>/dev/null || true
        systemctl enable cloudflared > /dev/null 2>&1
        systemctl start cloudflared

        sed -i 's/SECURE_COOKIES=false/SECURE_COOKIES=true/' "$CONFIG_DIR/env"
        systemctl restart "$APP_NAME"

        print_success "Cloudflare Tunnel configurado (HTTPS habilitado)"
    else
        print_status "Cloudflare Tunnel omitido"
    fi
else
    print_status "Modo no interactivo: Cloudflare Tunnel omitido"
    print_status "Para configurarlo después: cloudflared service install <TOKEN>"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 15: Verificación final
# ═══════════════════════════════════════════════════════════════════════════════
print_header "PASO 15: Verificación final"

sleep 3

if systemctl is-active --quiet "$APP_NAME"; then
    print_success "Servicio $APP_NAME: ACTIVO"
else
    print_error "Servicio $APP_NAME: INACTIVO"
    print_status "Revisando logs..."
    journalctl -u "$APP_NAME" --no-pager -n 20
fi

if systemctl is-active --quiet nginx; then
    print_success "Servicio nginx: ACTIVO"
else
    print_error "Servicio nginx: INACTIVO"
fi

if systemctl is-active --quiet postgresql; then
    print_success "Servicio postgresql: ACTIVO"
else
    print_error "Servicio postgresql: INACTIVO"
fi

if curl -sf http://localhost:$APP_PORT/api/health > /dev/null 2>&1; then
    print_success "API respondiendo correctamente"
else
    print_warning "La API aún no responde (puede tardar unos segundos en iniciar)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# RESUMEN FINAL
# ═══════════════════════════════════════════════════════════════════════════════
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  INSTALACIÓN COMPLETADA EXITOSAMENTE${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}URL de acceso:${NC}        http://$SERVER_IP"
echo -e "  ${BOLD}Puerto interno:${NC}       $APP_PORT"
echo ""

if [ "$IS_UPDATE" = false ]; then
    echo -e "  ${BOLD}Credenciales de admin:${NC}"
    echo -e "    Usuario:            ${GREEN}admin${NC}"
    echo -e "    Contraseña:         ${GREEN}$ADMIN_PASS${NC}"
    echo ""
    echo -e "  ${YELLOW}¡IMPORTANTE! Guarda estas credenciales. Cámbialas después del primer inicio de sesión.${NC}"
    echo ""
fi

echo -e "  ${BOLD}Configuración:${NC}        $CONFIG_DIR/env"
echo -e "  ${BOLD}Directorio app:${NC}       $APP_DIR"
echo -e "  ${BOLD}Logs:${NC}                 journalctl -u $APP_NAME -f"
echo ""
echo -e "  ${BOLD}Comandos útiles:${NC}"
echo -e "    Estado:             systemctl status $APP_NAME"
echo -e "    Reiniciar:          systemctl restart $APP_NAME"
echo -e "    Detener:            systemctl stop $APP_NAME"
echo -e "    Logs en vivo:       journalctl -u $APP_NAME -f"
echo -e "    Actualizar:         cd $APP_DIR && sudo bash install.sh"
echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
