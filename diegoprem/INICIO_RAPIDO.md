# 🚀 Inicio Rápido - DiegoPrem

## Instalación en 5 Minutos

### 1. Preparar Base de Datos (2 min)

```bash
# Crear base de datos
mysql -u root -p -e "CREATE DATABASE diegoprem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Importar esquema
mysql -u root -p diegoprem < database/schema.sql
```

### 2. Configurar Backend (1 min)

```bash
cd backend
npm install
cp .env.example .env

# Editar .env con tu contraseña de MySQL
nano .env  # o usa tu editor favorito
```

### 3. Iniciar Backend (30 seg)

```bash
npm start
```

### 4. Iniciar Frontend (30 seg)

```bash
# En otra terminal
cd ../frontend
python3 -m http.server 8080
```

### 5. ¡Listo! (1 min)

1. Abre: http://localhost:8080/login.html
2. Login: `admin` / `Admin123!`
3. Ve al panel de administración
4. Agrega tu primer correo de streaming

## Configuración Rápida de Gmail

1. **Generar contraseña de aplicación:**
   - https://myaccount.google.com/apppasswords
   - Selecciona "Correo" → "Otro dispositivo"
   - Copia la contraseña (16 caracteres)

2. **En el panel admin, agregar correo:**
   - Correo: tu-correo@gmail.com
   - Contraseña: [pegar contraseña de app]
   - Host: imap.gmail.com
   - Puerto: 993
   - Plataforma: Netflix (o la que sea)
   - Logo: https://cdn.worldvectorlogo.com/logos/netflix-3.svg

3. **Verificar:** Click en "Verificar ahora" ✅

## URLs Importantes

- 🔐 Login: http://localhost:8080/login.html
- 📊 Dashboard: http://localhost:8080/dashboard.html
- ⚙️ Admin: http://localhost:8080/admin.html
- 🔌 API: http://localhost:3000/api

## Credenciales por Defecto

- **Admin:** admin / Admin123!
- **Usuario:** user / User123!

⚠️ **Cámbialas inmediatamente en producción**

## Logos de Plataformas

```
Netflix:    https://cdn.worldvectorlogo.com/logos/netflix-3.svg
HBO Max:    https://cdn.worldvectorlogo.com/logos/hbo-max-1.svg
Prime:      https://cdn.worldvectorlogo.com/logos/amazon-prime-video.svg
Disney+:    https://cdn.worldvectorlogo.com/logos/disney-plus.svg
Star+:      https://cdn.worldvectorlogo.com/logos/star-logo.svg
Spotify:    https://cdn.worldvectorlogo.com/logos/spotify-2.svg
Apple TV+:  https://cdn.worldvectorlogo.com/logos/apple-tv.svg
```

## Solución Rápida de Problemas

❌ **Backend no arranca:**
```bash
# Verificar MySQL
mysql -u root -p -e "SHOW DATABASES;"

# Verificar puerto 3000 libre
lsof -ti:3000
```

❌ **No detecta códigos:**
- Usa contraseña de aplicación, NO la contraseña normal
- Verifica que haya mensajes en la bandeja de entrada
- Revisa los logs del backend

❌ **Error de login:**
- Verifica que el backend esté corriendo (puerto 3000)
- Comprueba CORS_ORIGIN en .env

## ¿Necesitas Ayuda?

📖 Documentación completa: `docs/README.md`
