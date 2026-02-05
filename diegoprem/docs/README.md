# DiegoPrem - Sistema de Gestión de Códigos de Streaming

## 📋 Descripción

DiegoPrem es una aplicación web completa para la recolección y visualización de códigos de verificación recibidos en múltiples cuentas de correo electrónico, especialmente de plataformas de streaming como Netflix, HBO Max, Prime Video, Disney+, Star+, entre otras.

## ✨ Características

### Para Usuarios
- 📧 Visualización de códigos de verificación en tiempo real
- 🎨 Interfaz moderna inspirada en plataformas de streaming
- 📱 Diseño responsive (desktop y móvil)
- 📋 Copiado rápido de códigos al portapapeles
- 🔍 Búsqueda por plataforma o correo
- 📊 Estadísticas de mensajes recibidos

### Para Administradores
- ➕ Gestión completa de correos (CRUD)
- 👥 Gestión de usuarios y roles
- 🔄 Verificación manual y automática de correos
- 🗑️ Eliminación de mensajes
- 📈 Panel de control centralizado

### Seguridad
- 🔐 Autenticación JWT
- 🛡️ Sistema de roles (admin/user)
- 🔒 Contraseñas hasheadas con bcrypt
- 🚪 Protección de rutas por rol

## 🏗️ Arquitectura

```
DiegoPrem/
├── backend/              # Node.js + Express
│   ├── config/          # Configuración de BD
│   ├── controllers/     # Lógica de negocio
│   ├── middleware/      # Autenticación
│   ├── models/          # Modelos de datos
│   ├── routes/          # Rutas de la API
│   ├── services/        # Servicio de correo IMAP
│   └── server.js        # Servidor principal
├── frontend/            # HTML + CSS + Vanilla JS
│   ├── css/            # Estilos
│   ├── js/             # Lógica del cliente
│   ├── login.html      # Página de login
│   ├── dashboard.html  # Dashboard de usuario
│   └── admin.html      # Panel de administración
└── database/           # Scripts SQL
    └── schema.sql      # Esquema de la BD
```

## 🚀 Instalación

### Requisitos Previos

- Node.js 16+ y npm
- MySQL 8.0+
- Git (opcional)

### Paso 1: Configurar la Base de Datos

1. Accede a MySQL:
```bash
mysql -u root -p
```

2. Crea la base de datos y las tablas:
```sql
source /ruta/a/database/schema.sql
```

3. Crea los usuarios por defecto ejecutando el script completo, o manualmente:

```sql
-- Usuario admin (contraseña: Admin123!)
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$rZ5vGZQxJ9yH4pqVxH0dxOG5kxVkYqK.8QzF7YKH5kGdVhxMJ5F5e', 'admin');

-- Usuario normal (contraseña: User123!)
INSERT INTO users (username, password_hash, role) VALUES
('user', '$2b$10$rZ5vGZQxJ9yH4pqVxH0dxOG5kxVkYqK.8QzF7YKH5kGdVhxMJ5F5e', 'user');
```

**IMPORTANTE:** Las contraseñas hasheadas del ejemplo anterior son solo de referencia. Debes generarlas correctamente usando bcrypt.

### Paso 2: Configurar el Backend

1. Navega a la carpeta del backend:
```bash
cd backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Copia el archivo de configuración:
```bash
cp .env.example .env
```

4. Edita `.env` con tus credenciales:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=diegoprem
JWT_SECRET=cambia_esta_clave_secreta_por_algo_super_seguro
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:8080
EMAIL_CHECK_INTERVAL=*/5 * * * *
NODE_ENV=development
```

5. Genera contraseñas hasheadas para los usuarios:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin123!', 10).then(h => console.log('Admin:', h)); bcrypt.hash('User123!', 10).then(h => console.log('User:', h));"
```

6. Actualiza la base de datos con las contraseñas generadas.

### Paso 3: Iniciar el Backend

```bash
# Modo desarrollo (con reinicio automático)
npm run dev

# Modo producción
npm start
```

Deberías ver:
```
✅ Conexión exitosa a MySQL
🚀 Servidor ejecutándose en puerto 3000
📅 Programando verificación de correos: */5 * * * *
✅ Sistema listo para recibir peticiones
```

### Paso 4: Configurar el Frontend

1. Navega a la carpeta del frontend:
```bash
cd ../frontend
```

2. Sirve los archivos con un servidor HTTP. Opciones:

**Opción A - Python:**
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

**Opción B - Node.js (http-server):**
```bash
npx http-server -p 8080
```

**Opción C - PHP:**
```bash
php -S localhost:8080
```

3. Abre tu navegador en: `http://localhost:8080/login.html`

## 🔧 Configuración de Correos

### Para usar correos de Gmail

1. Activa la verificación en dos pasos en tu cuenta de Google
2. Genera una "Contraseña de aplicación":
   - Ve a: https://myaccount.google.com/apppasswords
   - Selecciona "Correo" y "Otro dispositivo"
   - Copia la contraseña generada (16 caracteres)

3. En el panel de administración, agrega un nuevo correo con:
   - **Correo**: tu-correo@gmail.com
   - **Contraseña IMAP**: la contraseña de aplicación (sin espacios)
   - **Host IMAP**: imap.gmail.com
   - **Puerto**: 993
   - **Plataforma**: Netflix (o la que corresponda)
   - **Logo**: URL del logo de la plataforma

### Otros proveedores de correo

- **Outlook/Hotmail**: 
  - Host: `outlook.office365.com`
  - Puerto: `993`

- **Yahoo**: 
  - Host: `imap.mail.yahoo.com`
  - Puerto: `993`

- **Custom/Empresarial**: 
  - Consulta la configuración IMAP de tu proveedor

## 👤 Uso del Sistema

### Login

1. Accede a `http://localhost:8080/login.html`
2. Credenciales por defecto:
   - Admin: `admin` / `Admin123!`
   - Usuario: `user` / `User123!`

### Dashboard de Usuario

- Visualiza todas las plataformas configuradas
- Ve el último código recibido de cada una
- Copia códigos con un clic
- Busca por plataforma o correo
- Actualiza manualmente con el botón de refresh

### Panel de Administración

Accede desde `http://localhost:8080/admin.html` (solo con cuenta admin)

**Gestión de Correos:**
- Agregar nuevas cuentas de correo
- Editar configuraciones
- Activar/desactivar correos
- Verificar manualmente un correo
- Verificar todos los correos a la vez
- Eliminar correos

**Gestión de Usuarios:**
- Crear nuevos usuarios
- Asignar roles (admin/user)
- Activar/desactivar usuarios
- Cambiar contraseñas
- Eliminar usuarios

**Gestión de Mensajes:**
- Ver todos los mensajes recibidos
- Eliminar mensajes individuales
- Filtrar por plataforma

## 🔄 Verificación Automática

El sistema verifica automáticamente todos los correos cada 5 minutos (configurable en `.env`):

```env
# Formato cron: minuto hora día mes día-semana
EMAIL_CHECK_INTERVAL=*/5 * * * *

# Ejemplos:
# Cada 10 minutos: */10 * * * *
# Cada hora: 0 * * * *
# Cada día a las 8:00: 0 8 * * *
```

## 📡 API Endpoints

### Autenticación
```
POST   /api/auth/login          # Login
GET    /api/auth/verify         # Verificar token
POST   /api/auth/change-password # Cambiar contraseña
```

### Mensajes (Usuario)
```
GET    /api/messages            # Obtener últimos mensajes
GET    /api/messages/:id        # Obtener mensaje específico
GET    /api/messages/platform/:platform # Buscar por plataforma
GET    /api/messages/stats/summary # Estadísticas
```

### Administración (Admin)
```
# Correos
GET    /api/admin/emails        # Listar correos
POST   /api/admin/emails        # Crear correo
PUT    /api/admin/emails/:id    # Actualizar correo
DELETE /api/admin/emails/:id    # Eliminar correo
POST   /api/admin/emails/:id/check # Verificar correo
POST   /api/admin/emails/check-all # Verificar todos

# Usuarios
GET    /api/admin/users         # Listar usuarios
POST   /api/admin/users         # Crear usuario
PUT    /api/admin/users/:id     # Actualizar usuario
DELETE /api/admin/users/:id     # Eliminar usuario

# Mensajes
DELETE /api/admin/messages/:id  # Eliminar mensaje
DELETE /api/admin/messages/email/:emailId # Eliminar mensajes de un correo
```

## 🎨 Personalización

### Cambiar colores

Edita las variables CSS en `frontend/css/styles.css`:

```css
:root {
  --primary-red: #E50914;      /* Color principal */
  --secondary-purple: #7B2CBF; /* Color secundario */
  --bg-primary: #0D0D0D;       /* Fondo principal */
  /* ... */
}
```

### Agregar nuevas plataformas

Solo necesitas agregar el correo en el panel de administración con el logo correspondiente. El sistema detectará automáticamente los códigos.

## 🐛 Solución de Problemas

### El backend no se conecta a MySQL
- Verifica que MySQL esté corriendo: `mysql -u root -p`
- Revisa las credenciales en `.env`
- Comprueba que la base de datos existe: `SHOW DATABASES;`

### No se reciben códigos
- Verifica que las credenciales IMAP sean correctas
- Para Gmail, asegúrate de usar contraseña de aplicación
- Revisa los logs del servidor para errores
- Prueba la verificación manual desde el admin

### Error de CORS
- Verifica que `CORS_ORIGIN` en `.env` coincida con la URL del frontend
- Si usas otro puerto, actualiza la configuración

### Token inválido/expirado
- Cierra sesión y vuelve a iniciar
- Verifica que `JWT_SECRET` no haya cambiado
- Los tokens expiran según `JWT_EXPIRES_IN` (default: 24h)

## 📝 Notas de Seguridad

1. **Nunca subas archivos `.env` a repositorios públicos**
2. **Cambia las contraseñas por defecto inmediatamente**
3. **Usa contraseñas fuertes para JWT_SECRET**
4. **En producción, usa HTTPS**
5. **Configura firewalls para el puerto 3000**
6. **Haz backups regulares de la base de datos**

## 🔮 Próximas Mejoras

- [ ] Notificaciones push cuando llega un código
- [ ] Histórico completo de mensajes
- [ ] Exportación de códigos a CSV
- [ ] Soporte para múltiples idiomas
- [ ] Dashboard con gráficos estadísticos
- [ ] Integración con webhooks
- [ ] App móvil nativa

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👨‍💻 Soporte

Para reportar problemas o sugerencias, por favor abre un issue en el repositorio del proyecto.

---

**¡Disfruta usando DiegoPrem!** 🎬🍿
