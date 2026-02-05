/**
 * DiegoPrem - Configuración de Base de Datos
 * Conexión a MySQL usando mysql2 con soporte para promesas
 */

const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

const promisePool = pool.promise();

async function testConnection() {
  try {
    const conn = await promisePool.getConnection();
    console.log("✅ Conectado a MySQL Railway");
    conn.release();
  } catch (err) {
    console.error("❌ Error MySQL:", err);
  }
}

module.exports = { pool: promisePool, testConnection };
