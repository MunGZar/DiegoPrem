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
   * Configuración de plataformas conocidas
   */
  static get PLATFORM_CONFIGS() {
    return {
      'netflix': {
        senders: ['info@account.netflix.com', 'info@mailer.netflix.com'],
        allowedKeywords: [
          'inicio de sesión', 'login',
          'restablecer', 'password', 'contraseña',
          'hogar', 'household', 'ubicación', 'red wifi', 'actualizar'
        ],
        patterns: [
          /([0-9]\s[0-9]\s[0-9]\s[0-9])/, // Formato con espacios: 2 8 0 4
          /([0-9]{4,8})/,                // Formato continuo: 1234 o 123456
          /\b(\d{4,8})\b/                // Genérico limitado a 4-8
        ]
      },
      'disney': {
        senders: ['disneyplus@mail.disneyplus.com'],
        patterns: [/\b(\d{6})\b/]
      },
      'hbo': {
        senders: ['no-reply@hbomax.com'],
        patterns: [/\b(\d{6})\b/]
      }
    };
  }

  /**
   * Extraer código de verificación del contenido del correo
   */
  static extractCode(text, subject = '', platform = null) {
    if (!text) return null;

    const platformKey = platform?.toLowerCase();
    const config = this.PLATFORM_CONFIGS[platformKey];

    const fullText = (subject + ' ' + text).toLowerCase();
    console.log(`🔍 Extrayendo código para plataforma: ${platform || 'Genérica'}`);

    // Si la plataforma tiene keywords permitidas, verificar que al menos una esté presente
    if (config && config.allowedKeywords) {
      const hasKeyword = config.allowedKeywords.some(keyword => fullText.includes(keyword.toLowerCase()));
      if (!hasKeyword) {
        console.log(`ℹ️ Omitiendo mensaje de ${platform}: No contiene palabras clave permitidas.`);
        return null;
      }
    }

    // Si tenemos patrones específicos para la plataforma, usarlos primero
    if (config && config.patterns) {
      for (const pattern of config.patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const code = match[1].replace(/\s/g, '');
          console.log(`✨ Código específico de plataforma encontrado: ${code}`);
          return code;
        }
      }
      // Si es una plataforma conocida pero no encontramos su patrón, 
      // podríamos querer saltarnos los patrones genéricos para evitar falsos positivos
      console.log(`ℹ️ No se encontró patrón específico para ${platform}, probando genéricos como respaldo...`);
    }

    // Patrones genéricos de respaldo
    const genericPatterns = [
      /(?:código|code|verification code|código de verificación)[:\s]+([A-Z0-9]{4,8})/i,
      /(?:tu código es|your code is)[:\s]+([A-Z0-9]{4,8})/i,
      /\b([A-Z0-9]{6})\b/,
      /\b(\d{4,8})\b/,
    ];

    for (const regex of genericPatterns) {
      const match = text.match(regex);
      if (match && match[1]) {
        const val = match[1].trim();
        // Ignorar años comunes
        if (val.match(/^202[0-9]$/) || val === '3000') continue;

        console.log(`✨ Código genérico encontrado: ${val}`);
        return val;
      }
    }

    return null;
  }

  /**
   * Conectar a un servidor IMAP y obtener el último correo relevante
   */
  static async fetchLatestEmail(emailConfig) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: emailConfig.email_address,
        password: emailConfig.imap_password,
        host: emailConfig.imap_host,
        port: emailConfig.imap_port || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false, servername: emailConfig.imap_host }
      });

      let latestEmail = null;
      let pendingParses = 0;
      let fetchEnded = false;

      const checkFinish = () => {
        if (fetchEnded && pendingParses === 0) {
          imap.end();
          resolve(latestEmail);
        }
      };

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (box.messages.total === 0) {
            imap.end();
            return resolve(null);
          }

          // Buscar los últimos 5 correos
          const fetchRange = box.messages.total > 5 ? `${box.messages.total - 4}:*` : `1:*`;
          const f = imap.seq.fetch(fetchRange, { bodies: '' });

          f.on('message', (msg) => {
            pendingParses++;
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                pendingParses--;
                if (!err && parsed) {
                  const sender = (parsed.from?.text || '').toLowerCase();
                  const platformKey = (emailConfig.platform_name || '').toLowerCase();
                  const config = this.PLATFORM_CONFIGS[platformKey];

                  // Lógica de filtrado estricto por plataforma
                  let isValid = true;
                  if (platformKey) {
                    if (config && config.senders) {
                      isValid = config.senders.some(s => sender.includes(s.toLowerCase()));
                    } else {
                      // Si no tenemos configurada la plataforma en el código, 
                      // al menos verificamos que el remitente incluya el nombre de la plataforma
                      isValid = sender.includes(platformKey);
                    }
                  }

                  if (isValid) {
                    const textContent = parsed.text || parsed.html || '';
                    const extractedCode = this.extractCode(textContent, parsed.subject || '', emailConfig.platform_name);

                    if (!latestEmail || (parsed.date > latestEmail.received_at)) {
                      latestEmail = {
                        subject: parsed.subject,
                        sender: parsed.from?.text || '',
                        content: textContent.substring(0, 5000),
                        extracted_code: extractedCode,
                        received_at: parsed.date || new Date()
                      };
                    }
                  } else {
                    console.log(`ℹ️ Omitiendo correo de: ${sender} (no coincide con plataforma solicitada: ${platformKey})`);
                  }
                }
                checkFinish();
              });
            });
          });

          f.once('error', (err) => {
            fetchEnded = true;
            checkFinish();
          });

          f.once('end', () => {
            fetchEnded = true;
            checkFinish();
          });
        });
      });

      imap.once('error', (err) => reject(err));
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
