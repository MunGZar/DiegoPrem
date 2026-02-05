/**
 * DiegoPrem - Rutas de Administración
 */

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol de administrador
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== USUARIOS ====================
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// ==================== CORREOS ====================
router.get('/emails', AdminController.getEmails);
router.post('/emails', AdminController.createEmail);
router.put('/emails/:id', AdminController.updateEmail);
router.delete('/emails/:id', AdminController.deleteEmail);

// Verificación manual de correos
router.post('/emails/:id/check', AdminController.checkEmail);
router.post('/emails/check-all', AdminController.checkAllEmails);

// ==================== MENSAJES ====================
router.delete('/messages/:id', AdminController.deleteMessage);
router.delete('/messages/email/:emailId', AdminController.deleteMessagesByEmail);

module.exports = router;
