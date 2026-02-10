/**
 * DiegoPrem - Servicio de Correo IMAP
 * Lee correos electrónicos y extrae códigos de verificación
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const Email = require('../models/Email');
const Message = require('../models/Message');

class EmailService {
  /**
   * Extraer código de verificación del contenido del correo
   * Busca patrones comunes de códigos (4-8 dígitos o alfanuméricos)
   */
  static extractCode(text) {
    if (!text) return null;

    // Patrones comunes para códigos de verificación
    const patterns = [
      /(?:código|code|verification code|código de verificación)[:\s]+([A-Z0-9]{4,8})/i,
      /(?:tu código es|your code is)[:\s]+([A-Z0-9]{4,8})/i,
      /\b([A-Z0-9]{6})\b/,  // Código de 6 caracteres
      /\b(\d{4,8})\b/,      // Código numérico de 4-8 dígitos
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Conectar a un servidor IMAP y obtener el último correo
   */
  static async fetchLatestEmail(emailConfig) {
    return new Promise((resolve, reject) => {
      // 🔍 DEBUG: Ver qué credenciales se están usando
      const maskedPass = emailConfig.imap_password
        ? `${emailConfig.imap_password.substring(0, 4)}...${emailConfig.imap_password.substring(emailConfig.imap_password.length - 4)} (${emailConfig.imap_password.length} chars)`
        : 'NO PASSWORD';
      console.log(`🔍 DEBUG IMAP Connection:`);
      console.log(`   User: "${emailConfig.email_address}"`);
      console.log(`   Host: "${emailConfig.imap_host}"`);
      console.log(`   Port: ${emailConfig.imap_port || 993}`);
      console.log(`   Password: ${maskedPass}`);

      const imap = new Imap({
        user: emailConfig.email_address,
        password: emailConfig.imap_password,
        host: emailConfig.imap_host,
        port: emailConfig.imap_port || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      let latestEmail = null;

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          // Buscar el último correo
          const f = imap.seq.fetch(`${box.messages.total}:*`, {
            bodies: '',
            struct: true
          });

          f.on('message', (msg, seqno) => {
            msg.on('body', (stream, info) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) {
                  console.error('Error parseando correo:', err);
                  return;
                }

                const textContent = parsed.text || parsed.html || '';
                const extractedCode = this.extractCode(textContent);

                latestEmail = {
                  subject: parsed.subject,
                  sender: parsed.from?.text || '',
                  content: textContent.substring(0, 5000), // Limitar contenido
                  extracted_code: extractedCode,
                  received_at: parsed.date || new Date()
                };
              });
            });
          });

          f.once('error', (err) => {
            console.error('Error en fetch:', err);
            imap.end();
            reject(err);
          });

          f.once('end', () => {
            imap.end();
          });
        });
      });

      imap.once('error', (err) => {
        console.error('Error de conexión IMAP:', err);
        reject(err);
      });

      imap.once('end', () => {
        resolve(latestEmail);
      });

      imap.connect();
    });
  }

  /**
   * Verificar correos de todas las cuentas activas
   */
  static async checkAllEmails() {
    try {
      const emails = await Email.findAll(true); // Solo activos
      const results = [];

      for (const emailConfig of emails) {
        try {
          console.log(`📧 Verificando correo: ${emailConfig.email_address}`);

          const latestEmail = await this.fetchLatestEmail(emailConfig);

          if (latestEmail) {
            // Guardar o actualizar mensaje
            await Message.createOrUpdate({
              email_id: emailConfig.id,
              ...latestEmail
            });

            results.push({
              email: emailConfig.email_address,
              platform: emailConfig.platform_name,
              success: true,
              code: latestEmail.extracted_code
            });

            console.log(`✅ Código encontrado para ${emailConfig.platform_name}: ${latestEmail.extracted_code || 'N/A'}`);
          }

          // Actualizar última verificación
          await Email.updateLastChecked(emailConfig.id);

        } catch (error) {
          console.error(`❌ Error verificando ${emailConfig.email_address}:`, error.message);
          results.push({
            email: emailConfig.email_address,
            platform: emailConfig.platform_name,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error en checkAllEmails:', error);
      throw error;
    }
  }

  /**
   * Verificar un correo específico
   */
  static async checkSingleEmail(emailId) {
    try {
      const emailConfig = await Email.findById(emailId);

      if (!emailConfig) {
        throw new Error('Correo no encontrado');
      }

      console.log(`📧 Verificando correo: ${emailConfig.email_address}`);

      const latestEmail = await this.fetchLatestEmail(emailConfig);

      if (latestEmail) {
        await Message.createOrUpdate({
          email_id: emailConfig.id,
          ...latestEmail
        });

        await Email.updateLastChecked(emailConfig.id);

        return {
          success: true,
          message: 'Correo verificado exitosamente',
          code: latestEmail.extracted_code,
          data: latestEmail
        };
      }

      return {
        success: false,
        message: 'No se encontraron correos nuevos'
      };

    } catch (error) {
      console.error(`Error verificando correo ${emailId}:`, error);
      throw error;
    }
  }
}

module.exports = EmailService;
