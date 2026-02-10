/**
 * DiegoPrem - Controlador de Administración
 * Maneja operaciones CRUD para administradores
 */

const User = require('../models/User');
const Email = require('../models/Email');
const Message = require('../models/Message');
const EmailService = require('../services/emailService');

class AdminController {
  // ==================== USUARIOS ====================

  /**
   * Obtener todos los usuarios
   */
  static async getUsers(req, res) {
    try {
      const users = await User.findAll();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error en getUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios'
      });
    }
  }

  /**
   * Crear nuevo usuario
   */
  static async createUser(req, res) {
    try {
      const { username, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Usuario y contraseña son requeridos'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El usuario ya existe'
        });
      }

      const user = await User.create(username, password, role || 'user');

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: user
      });

    } catch (error) {
      console.error('Error en createUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear usuario'
      });
    }
  }

  /**
   * Actualizar usuario
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await User.update(id, updates);

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: user
      });

    } catch (error) {
      console.error('Error en updateUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario'
      });
    }
  }

  /**
   * Eliminar usuario
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // No permitir eliminar el propio usuario
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propio usuario'
        });
      }

      await User.delete(id);

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error en deleteUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario'
      });
    }
  }

  // ==================== CORREOS ====================

  /**
   * Obtener todos los correos
   */
  static async getEmails(req, res) {
    try {
      const emails = await Email.findAll();
      res.json({
        success: true,
        data: emails
      });
    } catch (error) {
      console.error('Error en getEmails:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener correos'
      });
    }
  }

  /**
   * Crear nuevo correo
   */
  static async createEmail(req, res) {
    try {
      const emailData = req.body;

      if (!emailData.email_address || !emailData.platform_name) {
        return res.status(400).json({
          success: false,
          message: 'Dirección de correo y nombre de plataforma son requeridos'
        });
      }

      const existingEmail = await Email.findByAddress(emailData.email_address);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'El correo ya está registrado'
        });
      }

      const email = await Email.create(emailData);

      res.status(201).json({
        success: true,
        message: 'Correo creado exitosamente',
        data: email
      });

    } catch (error) {
      console.error('Error en createEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear correo'
      });
    }
  }

  /**
   * Actualizar correo
   */
  static async updateEmail(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const email = await Email.update(id, updates);

      res.json({
        success: true,
        message: 'Correo actualizado exitosamente',
        data: email
      });

    } catch (error) {
      console.error('Error en updateEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar correo'
      });
    }
  }

  /**
   * Eliminar correo
   */
  static async deleteEmail(req, res) {
    try {
      const { id } = req.params;

      await Email.delete(id);

      res.json({
        success: true,
        message: 'Correo eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error en deleteEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar correo'
      });
    }
  }

  /**
   * Verificar correo manualmente
   */
  static async checkEmail(req, res) {
    try {
      const { id } = req.params;

      const result = await EmailService.checkSingleEmail(id);

      // Notificar a todos los clientes que hubo una actualización
      const broadcast = req.app.get('broadcastUpdate');
      if (broadcast) {
        broadcast({ type: 'update', source: 'manual', emailId: id });
      }

      res.json({
        success: true,
        message: 'Verificación completada',
        data: result
      });

    } catch (error) {
      console.error('Error en checkEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar correo: ' + error.message
      });
    }
  }

  /**
   * Verificar todos los correos
   */
  static async checkAllEmails(req, res) {
    try {
      const results = await EmailService.checkAllEmails();

      // Notificar a todos los clientes que hubo una actualización
      const broadcast = req.app.get('broadcastUpdate');
      if (broadcast) {
        broadcast({ type: 'update', source: 'manual-all' });
      }

      res.json({
        success: true,
        message: 'Verificación masiva completada',
        data: results
      });

    } catch (error) {
      console.error('Error en checkAllEmails:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar correos'
      });
    }
  }

  // ==================== MENSAJES ====================

  /**
   * Eliminar mensaje
   */
  static async deleteMessage(req, res) {
    try {
      const { id } = req.params;

      await Message.delete(id);

      res.json({
        success: true,
        message: 'Mensaje eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error en deleteMessage:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar mensaje'
      });
    }
  }

  /**
   * Eliminar todos los mensajes de un correo
   */
  static async deleteMessagesByEmail(req, res) {
    try {
      const { emailId } = req.params;

      await Message.deleteByEmailId(emailId);

      res.json({
        success: true,
        message: 'Mensajes eliminados exitosamente'
      });

    } catch (error) {
      console.error('Error en deleteMessagesByEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar mensajes'
      });
    }
  }
}

module.exports = AdminController;
