/**
 * DiegoPrem - Configuración de Base de Datos
 * Conexión a MySQL usando mysql2 con soporte para promesas
 */

const mysql = require('mysql2');
require('dotenv').config();

// Pool de conexiones para mejor rendimiento
const pool = mysql.createPool({
  host: process.env.DB_HOST ,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'diegoprem',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Convertir a promesas
const promisePool = pool.promise();

// Verificar conexión
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Conexión exitosa a MySQL');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a MySQL:', error.message);
    return false;
  }
};

module.exports = {
  pool: promisePool,
  testConnection
};
