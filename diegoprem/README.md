```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                      🎬 DIEGO PREM 🎬                        ║
║                                                              ║
║        Sistema de Gestión de Códigos de Streaming           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

## 🌟 Características Principales

✅ **Recolección automática** de códigos de verificación vía IMAP  
✅ **Interfaz moderna** inspirada en Netflix, HBO Max, Prime Video  
✅ **Panel de administración** completo con gestión de correos y usuarios  
✅ **Sistema de roles** (Admin / Usuario)  
✅ **Autenticación segura** con JWT  
✅ **Diseño responsive** para desktop y móvil  
✅ **Copiado rápido** de códigos al portapapeles  
✅ **Verificación automática** programable con cron  

## 📦 ¿Qué incluye?

- **Backend completo** en Node.js + Express
- **Frontend moderno** en HTML5 + CSS3 + JavaScript
- **Base de datos** MySQL con esquemas optimizados
- **API RESTful** bien documentada
- **Sistema de autenticación** JWT
- **Servicio IMAP** para leer correos
- **Documentación completa** paso a paso

## 🚀 Inicio Rápido

```bash
# 1. Crear base de datos
mysql -u root -p < database/schema.sql

# 2. Configurar backend
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm start

# 3. Servir frontend (en otra terminal)
cd ../frontend
python -m http.server 8080

# 4. Abrir navegador
# http://localhost:8081/login.html
```

**Credenciales por defecto:**
- Admin: `admin` / `Admin123!`
- Usuario: `user` / `User123!`

## 📁 Estructura del Proyecto

```
diegoprem/
├── backend/                    # Servidor Node.js
│   ├── config/                # Configuración de BD
│   │   └── database.js        # Conexión MySQL
│   ├── controllers/           # Lógica de negocio
│   │   ├── authController.js  # Login/autenticación
│   │   ├── messageController.js # Gestión de mensajes
│   │   └── adminController.js # Panel admin
│   ├── middleware/            # Middlewares
│   │   └── auth.js           # Verificación JWT
│   ├── models/               # Modelos de datos
│   │   ├── User.js          # Modelo de usuario
│   │   ├── Email.js         # Modelo de correo
│   │   └── Message.js       # Modelo de mensaje
│   ├── routes/              # Rutas de la API
│   │   ├── auth.js         # Rutas de autenticación
│   │   ├── messages.js     # Rutas de mensajes
│   │   └── admin.js        # Rutas de admin
│   ├── services/            # Servicios
│   │   └── emailService.js # Lectura IMAP
│   ├── .env.example        # Plantilla de configuración
│   ├── package.json        # Dependencias
│   └── server.js          # Servidor principal
│
├── frontend/                  # Cliente web
│   ├── css/                  # Estilos
│   │   ├── styles.css       # Estilos globales
│   │   ├── login.css        # Estilos de login
│   │   ├── dashboard.css    # Estilos de dashboard
│   │   └── admin.css        # Estilos de admin
│   ├── js/                   # JavaScript
│   │   ├── config.js        # Configuración y utils
│   │   ├── login.js         # Lógica de login
│   │   ├── dashboard.js     # Lógica de dashboard
│   │   └── admin.js         # Lógica de admin
│   ├── login.html           # Página de login
│   ├── dashboard.html       # Dashboard de usuario
│   └── admin.html          # Panel de administración
│
├── database/                 # Base de datos
│   └── schema.sql          # Esquema completo
│
├── docs/                    # Documentación
│   └── README.md          # Documentación completa
│
├── INICIO_RAPIDO.md       # Guía de inicio rápido
└── README.md             # Este archivo
```

## 🎨 Capturas de Pantalla

### Login
Interfaz moderna con animaciones de gradientes y diseño inspirado en streaming.

### Dashboard de Usuario
- Tarjetas por plataforma con logos
- Códigos destacados visualmente
- Botón de copiado rápido
- Búsqueda en tiempo real

### Panel de Administración
- Gestión completa de correos
- CRUD de usuarios
- Verificación manual y automática
- Eliminación de mensajes

## 🔧 Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **MySQL2** - Cliente de MySQL
- **JWT** - Autenticación
- **bcrypt** - Hash de contraseñas
- **IMAP** - Lectura de correos
- **node-cron** - Tareas programadas

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos modernos con variables CSS
- **JavaScript (Vanilla)** - Sin frameworks
- **Fetch API** - Peticiones HTTP

### Base de Datos
- **MySQL 8.0+** - Base de datos relacional

## 📖 Documentación

- **Documentación completa:** [`docs/README.md`](docs/README.md)
- **Inicio rápido:** [`INICIO_RAPIDO.md`](INICIO_RAPIDO.md)

## 🔐 Seguridad

- ✅ Autenticación JWT con expiración configurable
- ✅ Contraseñas hasheadas con bcrypt (10 rounds)
- ✅ Sistema de roles (admin/user)
- ✅ Protección de rutas por autenticación
- ✅ Validación de datos en backend
- ✅ CORS configurable
- ✅ Manejo seguro de errores

## 🌐 API Endpoints

### Autenticación
```
POST   /api/auth/login              # Iniciar sesión
GET    /api/auth/verify             # Verificar token
POST   /api/auth/change-password    # Cambiar contraseña
```

### Mensajes (Requiere autenticación)
```
GET    /api/messages                           # Listar todos
GET    /api/messages/:id                       # Ver mensaje
GET    /api/messages/platform/:platform        # Por plataforma
GET    /api/messages/stats/summary             # Estadísticas
```

### Administración (Requiere rol admin)
```
# Correos
GET    /api/admin/emails              # Listar
POST   /api/admin/emails              # Crear
PUT    /api/admin/emails/:id          # Actualizar
DELETE /api/admin/emails/:id          # Eliminar
POST   /api/admin/emails/:id/check    # Verificar uno
POST   /api/admin/emails/check-all    # Verificar todos

# Usuarios
GET    /api/admin/users               # Listar
POST   /api/admin/users               # Crear
PUT    /api/admin/users/:id           # Actualizar
DELETE /api/admin/users/:id           # Eliminar

# Mensajes
DELETE /api/admin/messages/:id        # Eliminar mensaje
DELETE /api/admin/messages/email/:emailId  # Eliminar por correo
```

## 🎯 Casos de Uso

1. **Gestión centralizada** de múltiples cuentas de streaming
2. **Automatización** de la lectura de códigos de verificación
3. **Compartir códigos** con un equipo de forma segura
4. **Monitoreo** de accesos a plataformas
5. **Auditoría** de mensajes recibidos

## 📝 Notas Importantes

⚠️ **Para Gmail:** Debes usar contraseñas de aplicación, no tu contraseña normal
⚠️ **Seguridad:** Cambia las contraseñas por defecto inmediatamente
⚠️ **Producción:** Usa HTTPS y configura firewalls apropiadamente
⚠️ **Backups:** Haz respaldos regulares de la base de datos

## 🐛 Solución de Problemas

Ver [`INICIO_RAPIDO.md`](INICIO_RAPIDO.md#solución-rápida-de-problemas) para soluciones rápidas.

## 📄 Licencia

MIT License - Libre para usar en proyectos personales y comerciales.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o soporte, abre un issue en el repositorio.

---

**Desarrollado con ❤️ para simplificar la gestión de códigos de streaming**

```
┌─────────────────────────────────────────────┐
│  ⭐ Si te gusta el proyecto, dale una       │
│     estrella en GitHub                      │
└─────────────────────────────────────────────┘
```
