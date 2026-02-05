/**
 * DiegoPrem - Rutas de Mensajes
 */

const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los últimos mensajes
router.get('/', MessageController.getLatestMessages);

// Buscar por plataforma
router.get('/platform/:platform', MessageController.searchByPlatform);

// Obtener mensaje específico
router.get('/:id', MessageController.getMessageById);

// Estadísticas
router.get('/stats/summary', MessageController.getStats);

module.exports = router;
