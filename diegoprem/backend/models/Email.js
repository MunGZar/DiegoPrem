/**
 * DiegoPrem - Modelo de Email
 * Operaciones CRUD para cuentas de correo electrónico
 */

const { pool } = require('../config/database');

class Email {
  /**
   * Crear nueva cuenta de correo
   */
  static async create(emailData) {
    try {
      const { email_address, imap_password, imap_host, imap_port, platform_name, platform_logo } = emailData;
      
      const [result] = await pool.query(
        `INSERT INTO emails (email_address, imap_password, imap_host, imap_port, platform_name, platform_logo) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email_address, imap_password, imap_host, imap_port || 993, platform_name, platform_logo]
      );
      
      return { id: result.insertId, ...emailData };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todos los correos activos
   */
  static async findAll(activeOnly = false) {
    try {
      let query = 'SELECT * FROM emails';
      if (activeOnly) {
        query += ' WHERE active = TRUE';
      }
      query += ' ORDER BY platform_name ASC';
      
      const [rows] = await pool.query(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar correo por ID
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM emails WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar correo por dirección
   */
  static async findByAddress(email_address) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM emails WHERE email_address = ?',
        [email_address]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener correos por plataforma
   */
  static async findByPlatform(platform_name) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM emails WHERE platform_name = ? AND active = TRUE',
        [platform_name]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar correo
   */
  static async update(id, updates) {
    try {
      const allowedFields = [
        'email_address', 'imap_password', 'imap_host', 'imap_port',
        'platform_name', 'platform_logo', 'active'
      ];
      
      const fields = [];
      const values = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      values.push(id);
      const query = `UPDATE emails SET ${fields.join(', ')} WHERE id = ?`;
      
      await pool.query(query, values);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar última verificación
   */
  static async updateLastChecked(id) {
    try {
      await pool.query(
        'UPDATE emails SET last_checked = NOW() WHERE id = ?',
        [id]
      );
    } catch (error) {
      console.error('Error actualizando last_checked:', error);
    }
  }

  /**
   * Eliminar correo
   */
  static async delete(id) {
    try {
      await pool.query('DELETE FROM emails WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Desactivar correo (soft delete)
   */
  static async deactivate(id) {
    try {
      await pool.query('UPDATE emails SET active = FALSE WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Email;
