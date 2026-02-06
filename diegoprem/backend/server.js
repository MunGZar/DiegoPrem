/**
 * DiegoPrem - Servidor Principal
 */

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const { testConnection } = require('./config/database');
const EmailService = require('./services/emailService');

// Crear aplicación Express PRIMERO
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARES ====================
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'https://diego-prem-2t3v.vercel.app',
    'https://her-dynamic-handmade-visible.trycloudflare.com'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== RUTAS ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DiegoPrem API v1.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Importar rutas DESPUÉS de crear app
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// ==================== ERRORES ====================
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== CRON ====================
const scheduleEmailChecks = () => {
  const cronPattern = process.env.EMAIL_CHECK_INTERVAL || '*/5 * * * *';
  console.log(`📅 Programando verificación de correos: ${cronPattern}`);

  cron.schedule(cronPattern, async () => {
    console.log('⏰ Ejecutando verificación automática de correos...');
    try {
      const results = await EmailService.checkAllEmails();
      console.log(`✅ Verificación completada: ${results.length} correos procesados`);
    } catch (error) {
      console.error('❌ Error en verificación automática:', error);
    }
  });
};

// ==================== START ====================
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos.');
      process.exit(1);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log('║         DiegoPrem Backend v1.0         ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('');
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('Rutas disponibles:');
      console.log('  GET  /');
      console.log('  POST /api/auth/login');
      console.log('  GET  /api/auth/verify');
      console.log('  GET  /api/messages');
      console.log('  GET  /api/admin/emails');
      console.log('  GET  /api/admin/users');
      console.log('');
      scheduleEmailChecks();
      console.log('✅ Sistema listo para recibir peticiones');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

startServer();

module.exports = app;
