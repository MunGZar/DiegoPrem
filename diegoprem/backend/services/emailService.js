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
      netflix: {
        senders: ['info@account.netflix.com', 'info@mailer.netflix.com'],
        allowedKeywords: [
          'inicio de sesión',
          'login',
          'restablecer',
          'password',
          'contraseña',
          'hogar',
          'household',
          'ubicación',
          'red wifi',
          'actualizar'
        ],
        patterns: [
          /([0-9]\s[0-9]\s[0-9]\s[0-9])/i, // Formato con espacios: 2 8 0 4
          /\b(\d{4,8})\b/i // Formato continuo: 1234 o 123456
        ]
      },
      disney: {
        senders: ['disneyplus@mail.disneyplus.com'],
        patterns: [/\b(\d{6})\b/i]
      },
      hbo: {
        senders: ['no-reply@hbomax.com'],
        patterns: [/\b(\d{6})\b/i]
      }
    };
  }

  /**
   * Lista negra de palabras que no son códigos
   */
  static get BLACKLIST_WORDS() {
    return [
      'para',
      'inicio',
      'sesion',
      'login',
      'enlace',
      'click',
      'haga',
      'este',
      'tiene'
    ];
  }

  /**
   * Patrones genéricos de extracción de códigos
   */
  static get GENERIC_PATTERNS() {
    return [
      {
        name: 'Keyword Digits',
        regex: /(?:código|code|verification code|código de verificación)[:\s]+(\d{4,8})/i
      },
      {
        name: 'Keyword AlphaNum',
        regex: /(?:código|code|verification code)[:\s]+(?=.*[0-9])([A-Z0-9]{4,8})/i
      },
      {
        name: 'Generic Digits',
        regex: /\b(\d{4,8})\b/
      }
    ];
  }

  /**
   * Limpia el texto removiendo caracteres de control
   * @param {string} text - Texto a limpiar
   * @returns {string} Texto limpio
   */
  static cleanText(text) {
    if (!text) return '';
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Verifica si el texto contiene palabras clave permitidas
   * @param {string} text - Texto a verificar
   * @param {Array} keywords - Lista de palabras clave
   * @returns {boolean}
   */
  static hasAllowedKeywords(text, keywords) {
    if (!keywords || keywords.length === 0) return true;

    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  /**
   * Verifica si un código es válido
   * @param {string} code - Código a validar
   * @returns {boolean}
   */
  static isValidCode(code) {
    if (!code || code.length < 4) return false;

    const lowerCode = code.toLowerCase();

    // Evitar años comunes
    if (/^20[0-9]{2}$/.test(code)) return false;

    // Evitar números genéricos
    if (code === '3000') return false;

    // Evitar palabras de la lista negra
    if (this.BLACKLIST_WORDS.includes(lowerCode)) return false;

    return true;
  }

  /**
   * Intenta extraer código usando patrones específicos de plataforma
   * @param {string} text - Texto limpio del correo
   * @param {Object} config - Configuración de la plataforma
   * @param {string} platform - Nombre de la plataforma
   * @returns {string|null} Código extraído o null
   */
  static extractPlatformCode(text, config, platform) {
    if (!config || !config.patterns) return null;

    for (const pattern of config.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Limpiar espacios y NBSP
        const code = match[1].replace(/[\s\xa0]/g, '');

        if (this.isValidCode(code)) {
          console.log(`✨ Código específico de ${platform} encontrado: ${code}`);
          return code;
        }
      }
    }

    return null;
  }

  /**
   * Intenta extraer código usando patrones genéricos
   * @param {string} text - Texto limpio del correo
   * @returns {string|null} Código extraído o null
   */
  static extractGenericCode(text) {
    for (const pattern of this.GENERIC_PATTERNS) {
      const match = text.match(pattern.regex);
      if (match && match[1]) {
        const code = match[1].trim();

        if (this.isValidCode(code)) {
          console.log(`✨ Código genérico (${pattern.name}) encontrado: ${code}`);
          return code;
        }
      }
    }

    return null;
  }

  /**
   * Extrae código de verificación del contenido del correo
   * @param {string} text - Contenido del correo
   * @param {string} subject - Asunto del correo
   * @param {string} platform - Nombre de la plataforma
   * @returns {string|null} Código extraído o null
   */
  static extractCode(text, subject = '', platform = null) {
    if (!text) return null;

    const platformKey = platform?.toLowerCase();
    const config = this.PLATFORM_CONFIGS[platformKey];
    const fullText = `${subject} ${text}`;

    console.log(`🔍 Extrayendo código para plataforma: ${platform || 'Genérica'}`);

    // Verificar palabras clave permitidas si la plataforma las tiene
    if (config && config.allowedKeywords) {
      if (!this.hasAllowedKeywords(fullText, config.allowedKeywords)) {
        console.log(`ℹ️ Omitiendo mensaje de ${platform}: No contiene palabras clave permitidas.`);
        return null;
      }
    }

    const cleanedText = this.cleanText(text);

    // 1. Intentar con patrones específicos de plataforma
    if (config) {
      const platformCode = this.extractPlatformCode(cleanedText, config, platform);
      if (platformCode) return platformCode;

      console.log(`ℹ️ No se encontró patrón específico para ${platform}, probando genéricos...`);
    }

    // 2. Intentar con patrones genéricos
    return this.extractGenericCode(cleanedText);
  }

  /**
   * Verifica si el remitente es válido para la plataforma
   * @param {string} sender - Correo del remitente
   * @param {string} platformKey - Clave de la plataforma
   * @param {Object} config - Configuración de la plataforma
   * @returns {boolean}
   */
  static isValidSender(sender, platformKey, config) {
    const lowerSender = sender.toLowerCase();

    if (config && config.senders) {
      return config.senders.some(s => lowerSender.includes(s.toLowerCase()));
    }

    // Si no hay configuración específica, verificar que incluya el nombre de la plataforma
    if (platformKey) {
      return lowerSender.includes(platformKey);
    }

    return true;
  }

  /**
   * Procesa un mensaje individual
   * @param {Object} parsed - Mensaje parseado
   * @param {Object} emailConfig - Configuración del correo
   * @param {Object} latestEmail - Último correo encontrado (referencia)
   * @returns {Object|null} Email procesado o null
   */
  static processMessage(parsed, emailConfig, latestEmail) {
    const sender = (parsed.from?.text || '').toLowerCase();
    const platformKey = (emailConfig.platform_name || '').toLowerCase();
    const config = this.PLATFORM_CONFIGS[platformKey];

    // Validar remitente
    if (platformKey && !this.isValidSender(sender, platformKey, config)) {
      console.log(`ℹ️ Omitiendo correo de: ${sender} (no coincide con plataforma: ${platformKey})`);
      return null;
    }

    const textContent = parsed.text || parsed.html || '';
    const extractedCode = this.extractCode(
      textContent,
      parsed.subject || '',
      emailConfig.platform_name
    );

    const emailData = {
      subject: parsed.subject,
      sender: parsed.from?.text || '',
      content: textContent.substring(0, 5000),
      extracted_code: extractedCode,
      received_at: parsed.date || new Date()
    };

    // Actualizar si es más reciente
    if (!latestEmail || (emailData.received_at > latestEmail.received_at)) {
      return emailData;
    }

    return null;
  }

  /**
   * Conecta a un servidor IMAP y obtiene el último correo relevante
   * @param {Object} emailConfig - Configuración del correo
   * @returns {Promise<Object|null>}
   */
  static async fetchLatestEmail(emailConfig) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: emailConfig.email_address,
        password: emailConfig.imap_password,
        host: emailConfig.imap_host,
        port: emailConfig.imap_port || 993,
        tls: true,
        tlsOptions: {
          rejectUnauthorized: false,
          servername: emailConfig.imap_host
        }
      });

      let latestEmail = null;
      let pendingParses = 0;
      let fetchEnded = false;
      let hasError = false;

      const cleanup = () => {
        try {
          imap.end();
        } catch (err) {
          // Ignorar errores al cerrar
        }
      };

      const checkFinish = () => {
        if (fetchEnded && pendingParses === 0 && !hasError) {
          cleanup();
          resolve(latestEmail);
        }
      };

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            cleanup();
            return reject(new Error(`Error abriendo INBOX: ${err.message}`));
          }

          if (box.messages.total === 0) {
            cleanup();
            return resolve(null);
          }

          // Buscar los últimos 5 correos
          const fetchRange = box.messages.total > 5
            ? `${box.messages.total - 4}:*`
            : '1:*';

          const fetch = imap.seq.fetch(fetchRange, { bodies: '' });

          fetch.on('message', (msg) => {
            pendingParses++;

            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                pendingParses--;

                if (!err && parsed) {
                  const processedEmail = this.processMessage(
                    parsed,
                    emailConfig,
                    latestEmail
                  );

                  if (processedEmail) {
                    latestEmail = processedEmail;
                  }
                }

                checkFinish();
              });
            });

            msg.once('error', (err) => {
              console.error('Error en mensaje:', err);
              pendingParses--;
              checkFinish();
            });
          });

          fetch.once('error', (err) => {
            console.error('Error en fetch:', err);
            fetchEnded = true;
            hasError = true;
            cleanup();
            reject(new Error(`Error obteniendo correos: ${err.message}`));
          });

          fetch.once('end', () => {
            fetchEnded = true;
            checkFinish();
          });
        });
      });

      imap.once('error', (err) => {
        hasError = true;
        cleanup();
        reject(new Error(`Error de conexión IMAP: ${err.message}`));
      });

      imap.once('end', () => {
        // Conexión cerrada normalmente
      });

      try {
        imap.connect();
      } catch (err) {
        reject(new Error(`Error al conectar: ${err.message}`));
      }
    });
  }

  /**
   * Verifica correos de todas las cuentas activas
   * @returns {Promise<Array>} Resultados de la verificación
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
              code: latestEmail.extracted_code,
              timestamp: new Date()
            });

            const codeStatus = latestEmail.extracted_code || 'N/A';
            console.log(`✅ Código encontrado para ${emailConfig.platform_name}: ${codeStatus}`);
          } else {
            results.push({
              email: emailConfig.email_address,
              platform: emailConfig.platform_name,
              success: true,
              code: null,
              message: 'No se encontraron correos nuevos',
              timestamp: new Date()
            });
          }

          // Actualizar última verificación
          await Email.updateLastChecked(emailConfig.id);

        } catch (error) {
          console.error(`❌ Error verificando ${emailConfig.email_address}:`, error.message);
          results.push({
            email: emailConfig.email_address,
            platform: emailConfig.platform_name,
            success: false,
            error: error.message,
            timestamp: new Date()
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Error en checkAllEmails:', error);
      throw new Error(`Error verificando correos: ${error.message}`);
    }
  }

  /**
   * Verifica un correo específico por ID
   * @param {number} emailId - ID del correo a verificar
   * @returns {Promise<Object>} Resultado de la verificación
   */
  static async checkSingleEmail(emailId) {
    try {
      const emailConfig = await Email.findById(emailId);

      if (!emailConfig) {
        throw new Error(`Correo con ID ${emailId} no encontrado`);
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
          data: {
            subject: latestEmail.subject,
            sender: latestEmail.sender,
            received_at: latestEmail.received_at,
            has_code: !!latestEmail.extracted_code
          }
        };
      }

      await Email.updateLastChecked(emailConfig.id);

      return {
        success: true,
        message: 'No se encontraron correos nuevos',
        code: null,
        data: null
      };

    } catch (error) {
      console.error(`❌ Error verificando correo ${emailId}:`, error.message);
      throw new Error(`Error verificando correo: ${error.message}`);
    }
  }
}

module.exports = EmailService;