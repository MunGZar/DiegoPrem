/**
 * Script para generar contraseñas hasheadas
 * Ejecuta: node generate-passwords.js
 */

const bcrypt = require('bcrypt');

const passwords = {
  admin: 'Admin123!',
  user: 'User123!'
};

async function generateHashes() {
  console.log('Generando contraseñas hasheadas...\n');
  
  for (const [username, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Usuario: ${username}`);
    console.log(`Contraseña: ${password}`);
    console.log(`Hash: ${hash}\n`);
  }
  
  console.log('Actualiza estos hashes en database/schema.sql');
}

generateHashes();
