/**
 * DiegoPrem - Controlador de Mensajes
 * Maneja las operaciones relacionadas con mensajes para usuarios normales
 */

const Message = require('../models/Message');
const Email = require('../models/Email');

class MessageController {
  /**
   * Obtener todos los últimos mensajes (uno por plataforma)
   */
  static async getLatestMessages(req, res) {
    try {
      const messages = await Message.getLatestMessages();

      // Mapeamos los resultados para que el frontend reciba una lista plana
      // donde cada objeto representa una "tarjeta" de plataforma con su mensaje específico
      const formattedData = messages.map(msg => ({
        email_id: msg.email_id,
        platform_name: msg.platform_name,
        platform_logo: msg.platform_logo,
        email_address: msg.email_address,
        message: {
          id: msg.message_id,
          subject: msg.subject,
          sender: msg.sender,
          content: msg.content,
          extracted_code: msg.extracted_code,
          received_at: msg.received_at
        }
      }));

      res.json({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('Error en getLatestMessages:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener mensajes'
      });
    }
  }

  /**
   * Buscar mensajes por plataforma
   */
  static async searchByPlatform(req, res) {
    try {
      const { platform } = req.params;

      const messages = await Message.findByPlatform(platform);

      res.json({
        success: true,
        data: messages
      });

    } catch (error) {
      console.error('Error en searchByPlatform:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar mensajes'
      });
    }
  }

  /**
   * Obtener mensaje específico por ID
   */
  static async getMessageById(req, res) {
    try {
      const { id } = req.params;

      const message = await Message.findById(id);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje no encontrado'
        });
      }

      res.json({
        success: true,
        data: message
      });

    } catch (error) {
      console.error('Error en getMessageById:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener mensaje'
      });
    }
  }

  /**
   * Obtener estadísticas de mensajes
   */
  static async getStats(req, res) {
    try {
      const stats = await Message.getStats();
      const totalEmails = await Email.findAll(true);

      res.json({
        success: true,
        data: {
          ...stats,
          total_active_emails: totalEmails.length
        }
      });

    } catch (error) {
      console.error('Error en getStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas'
      });
    }
  }
}

module.exports = MessageController;
