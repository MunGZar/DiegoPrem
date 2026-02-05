/**
 * DiegoPrem - Middleware de Autenticación
 * Verifica tokens JWT y roles de usuario
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar token JWT
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Acceso denegado. Token no proporcionado.' 
    });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Adjuntar datos del usuario al request
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Token inválido o expirado.' 
    });
  }
};

/**
 * Middleware para verificar rol de administrador
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requieren permisos de administrador.' 
    });
  }
  next();
};

/**
 * Middleware opcional para autenticación (no bloquea si no hay token)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      req.user = verified;
    } catch (error) {
      // Token inválido, pero continuamos sin autenticación
      req.user = null;
    }
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth
};
