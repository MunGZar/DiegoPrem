/**
 * DiegoPrem - Modelo de Usuario
 * Operaciones CRUD para usuarios del sistema
 */

const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  /**
   * Crear un nuevo usuario
   */
  static async create(username, password, role = 'user') {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
      );
      return { id: result.insertId, username, role };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar usuario por nombre de usuario
   */
  static async findByUsername(username) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE username = ? AND active = TRUE',
        [username]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar usuario por ID
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, role, created_at, last_login, active FROM users WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todos los usuarios
   */
  static async findAll() {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, role, created_at, last_login, active FROM users ORDER BY created_at DESC'
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar usuario
   */
  static async update(id, updates) {
    try {
      const allowedFields = ['username', 'role', 'active'];
      const fields = [];
      const values = [];

      // Si se incluye password, hashearlo
      if (updates.password) {
        const hashedPassword = await bcrypt.hash(updates.password, 10);
        fields.push('password_hash = ?');
        values.push(hashedPassword);
      }

      // Construir query dinámicamente
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
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      
      await pool.query(query, values);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar usuario (soft delete)
   */
  static async delete(id) {
    try {
      await pool.query('UPDATE users SET active = FALSE WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verificar contraseña
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Actualizar último login
   */
  static async updateLastLogin(id) {
    try {
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error actualizando last_login:', error);
    }
  }
}

module.exports = User;
