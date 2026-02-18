/**
 * DiegoPrem - Modelo de Message
 * Operaciones CRUD para mensajes de correo electrónico
 */

const { pool } = require('../config/database');

class Message {
  /**
   * Crear o actualizar el último mensaje de un correo
   * Solo mantiene el más reciente por email_id
   */
  static async createOrUpdate(messageData) {
    try {
      const { email_id, subject, sender, recipient, content, extracted_code, received_at } = messageData;

      // Insertar nuevo mensaje (ya no eliminamos el anterior para mantener historial)
      const [result] = await pool.query(
        `INSERT INTO messages (email_id, subject, sender, recipient, content, extracted_code, received_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [email_id, subject, sender, recipient || null, content, extracted_code, received_at]
      );

      // Limpieza: Mantener solo los últimos 100 mensajes en total para evitar saturación
      // Esto es opcional pero recomendado en sistemas de alta frecuencia
      try {
        await pool.query(`
          DELETE FROM messages 
          WHERE id NOT IN (
            SELECT id FROM (
              SELECT id FROM messages 
              ORDER BY received_at DESC 
              LIMIT 100
            ) as t
          )
        `);
      } catch (cleanupError) {
        console.error('Error durante limpieza de mensajes:', cleanupError);
      }

      return { id: result.insertId, ...messageData };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener el último mensaje de un correo específico
   */
  static async getLatestByEmailId(email_id) {
    try {
      const [rows] = await pool.query(
        `SELECT m.*, e.platform_name, e.platform_logo, e.email_address 
         FROM messages m
         JOIN emails e ON m.email_id = e.id
         WHERE m.email_id = ?
         ORDER BY m.received_at DESC
         LIMIT 1`,
        [email_id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todos los últimos mensajes agrupados por plataforma
   */
  static async getLatestMessages() {
    try {
      // Obtenemos los últimos mensajes de los últimos 7 días, limitados a 50
      const [rows] = await pool.query(`
        SELECT 
          e.id AS email_id,
          e.platform_name,
          e.platform_logo,
          e.email_address,
          m.id AS message_id,
          m.subject,
          m.sender,
          m.recipient,
          m.content,
          m.extracted_code,
          m.received_at
        FROM emails e
        JOIN messages m ON e.id = m.email_id
        WHERE e.active = TRUE
        ORDER BY m.received_at DESC
        LIMIT 50
      `);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar mensajes por plataforma
   */
  static async findByPlatform(platform_name) {
    try {
      const [rows] = await pool.query(
        `SELECT m.*, e.platform_name, e.platform_logo, e.email_address
         FROM messages m
         JOIN emails e ON m.email_id = e.id
         WHERE e.platform_name = ? AND e.active = TRUE
         ORDER BY m.received_at DESC`,
        [platform_name]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar mensaje por ID
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT m.*, e.platform_name, e.platform_logo, e.email_address
         FROM messages m
         JOIN emails e ON m.email_id = e.id
         WHERE m.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar mensaje
   */
  static async delete(id) {
    try {
      await pool.query('DELETE FROM messages WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar todos los mensajes de un correo
   */
  static async deleteByEmailId(email_id) {
    try {
      await pool.query('DELETE FROM messages WHERE email_id = ?', [email_id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   */
  static async getStats() {
    try {
      const [rows] = await pool.query(`
        SELECT 
          COUNT(DISTINCT email_id) as total_emails_with_messages,
          COUNT(*) as total_messages,
          MAX(received_at) as last_message_received
        FROM messages
      `);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Message;
