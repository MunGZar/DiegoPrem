/**
 * DiegoPrem - Rutas de Autenticación
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Rutas públicas
router.post('/login', AuthController.login);

// Rutas protegidas
router.get('/verify', authenticateToken, AuthController.verifyToken);
router.post('/change-password', authenticateToken, AuthController.changePassword);

module.exports = router;
