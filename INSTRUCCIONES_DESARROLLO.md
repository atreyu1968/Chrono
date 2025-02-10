### 2. Configuración de Base de Datos
1. Crear base de datos PostgreSQL
2. Configurar variables de entorno
3. Definir esquemas en Drizzle
4. Ejecutar migraciones iniciales

### 3. Implementación de Autenticación
1. Configurar Passport.js con estrategia local
2. Implementar encriptación de contraseñas con bcrypt
3. Crear rutas de autenticación
4. Implementar middleware de protección de rutas

### 4. Desarrollo Frontend
1. Configurar Vite + React
2. Implementar sistema de rutas
3. Configurar TanStack Query
4. Crear contexto de autenticación

### 5. Desarrollo de UI
1. Configurar Tailwind CSS
2. Implementar componentes shadcn/ui
3. Crear layouts base
4. Desarrollar páginas principales

### 6. Funcionalidades Core
1. Sistema de check-in/check-out
2. Panel de administración
3. Reportes y estadísticas
4. Gestión de empleados

## Diseño y Experiencia de Usuario

### Tema y Estilo Visual
- **Paleta de Colores:**
  - Principal: Azul profesional (#0066CC)
  - Secundario: Verde éxito (#22C55E)
  - Acento: Naranja alertas (#F97316)
  - Fondos: Blanco (#FFFFFF) / Gris oscuro (#1F2937)
  - Texto: Negro (#000000) / Blanco (#FFFFFF)

- **Tipografía:**
  - Principal: Inter (sans-serif)
  - Títulos: 24px/32px
  - Texto normal: 16px/24px
  - Texto pequeño: 14px/20px

### Diseño Responsive
- **Breakpoints:**
  - Móvil: < 640px
  - Tablet: 640px - 1024px
  - Escritorio: > 1024px

### Versión de Escritorio

#### Layout Administrador
- **Sidebar** (240px ancho):
  - Logo en la parte superior
  - Menú de navegación principal
  - Estado de sesión en la parte inferior
  - Botón de colapso

- **Header** (altura 64px):
  - Título de la sección actual
  - Barra de búsqueda
  - Notificaciones
  - Perfil de usuario

- **Área de Contenido:**
  - Grid responsive de tarjetas de estadísticas
  - Tablas de datos con paginación
  - Gráficos y visualizaciones
  - Formularios en modales/drawers

#### Layout Empleado
- **Header Simple** (altura 56px):
  - Logo a la izquierda
  - Navegación central
  - Perfil a la derecha

- **Contenido Centrado:**
  - Tarjeta de registro grande
  - Historial de asistencia
  - Estado actual

### Versión Móvil

#### Características Específicas Móvil
- Diseño minimalista enfocado en la tarea principal
- Navegación inferior con iconos
- Gestos táctiles para acciones comunes
- Optimización para uso con una mano

#### Layout Móvil Empleado
- **Header Compacto** (48px):
  - Logo pequeño
  - Título de sección
  - Menú hamburguesa

- **Contenido Principal:**
  - Botón grande de check-in/check-out
  - Estado actual visible
  - Acceso rápido al historial

#### Layout Móvil Administrador
- **Navegación Inferior:**
  - Dashboard
  - Empleados
  - Reportes
  - Configuración

- **Lista de Empleados:**
  - Vista de tarjetas compactas
  - Pull-to-refresh
  - Búsqueda rápida

### Componentes UI Principales

#### Formularios
- Campos grandes y espaciados
- Validación en tiempo real
- Mensajes de error claros
- Autocompletado inteligente

#### Tablas y Listas
- Ordenamiento y filtrado
- Paginación infinita en móvil
- Acciones contextuales
- Estados de carga skeleton

#### Tarjetas y Widgets
- Sombras sutiles
- Bordes redondeados (8px)
- Estados hover/active
- Animaciones suaves


## Personalización del Tema

### Variables de Tema
```json
{
  "theme": {
    "primary": "#0066CC",
    "variant": "professional",
    "appearance": "system",
    "radius": 8
  }
}
```

### Colores Personalizables
- `--sidebar-background`: Fondo de la barra lateral
- `--sidebar-foreground`: Texto de la barra lateral
- `--sidebar-border`: Bordes en la barra lateral
- `--sidebar-accent`: Color de acento para elementos activos
- `--header-height`: Altura del encabezado (64px desktop, 48px mobile)
- `--animation-speed`: Velocidad de las transiciones (0.2s por defecto)

### Integración con Modo Oscuro
El sistema debe detectar y responder a:
- Preferencias del sistema (prefers-color-scheme)
- Selección manual del usuario
- Cambios en tiempo real

### Responsive Design
- Usar CSS Grid para layouts adaptativos
- Implementar breakpoints estándar
- Asegurar funcionalidad touch en dispositivos móviles
- Mantener consistencia visual entre plataformas

### Consideraciones de Accesibilidad
- Contraste de colores WCAG 2.1
- Soporte para lectores de pantalla
- Navegación por teclado
- Tamaños de texto ajustables

## Consideraciones de Seguridad
1. Usar bcrypt para hashing de contraseñas
2. Implementar validación de sesiones
3. Proteger rutas según rol
4. Sanitizar inputs
5. Implementar rate limiting
6. Usar CSRF tokens

## Variables de Entorno Necesarias
```env
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=development|production
PORT=5000
```

## Comandos de Desarrollo
```bash
# Desarrollo
npm run dev

# Build
npm run build

# Migraciones de Base de Datos
npm run db:push