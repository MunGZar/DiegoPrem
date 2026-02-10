/**
 * DiegoPrem - Servicio de Correo IMAP
 * Lee correos electrónicos y extrae códigos de verificación
 * 
 * CORRECCIÓN: Ahora filtra correctamente palabras como "para" que no son códigos
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
          'login',
          'sesión',
          'sesion',
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
          // Patrón 1: Buscar explícitamente "código" seguido de números
          /(?:c[oó]digo|code|verification\s*code)[:\s]*([0-9][\s\xa0]*[0-9][\s\xa0]*[0-9][\s\xa0]*[0-9](?:[\s\xa0]*[0-9])*)/i,
          // Patrón 2: Números con espacios/tabs entre ellos (4-8 dígitos)
          /(?:^|[^a-záéíóúñ])([0-9][\s\xa0\t]+[0-9][\s\xa0\t]+[0-9][\s\xa0\t]+[0-9](?:[\s\xa0\t]+[0-9])*)(?:[^0-9]|$)/i,
          // Patrón 3: Bloque de 4-8 dígitos continuos (último recurso)
          /\b(\d{4,8})\b/i
        ],
        // Solo aceptar códigos numéricos puros
        numericOnly: true,
        // Longitud esperada del código
        codeLength: [4, 6, 8]
      },
      disney: {
        senders: ['disneyplus@mail.disneyplus.com'],
        patterns: [/\b(\d{6})\b/i],
        numericOnly: true,
        codeLength: [6]
      },
      hbo: {
        senders: ['no-reply@hbomax.com'],
        patterns: [/\b(\d{6})\b/i],
        numericOnly: true,
        codeLength: [6]
      }
    };
  }

  /**
   * Lista negra de palabras que NO son códigos
   */
  static get BLACKLIST_WORDS() {
    return [
      'para', 'inicio', 'sesion', 'login', 'enlace', 'click',
      'haga', 'este', 'tiene', 'donde', 'esta', 'está', 'pero',
      'como', 'pueden', 'será', 'sera', 'nuevo', 'cuenta', 'aqui',
      'aquí', 'desde', 'ahora', 'más', 'mas', 'información',
      'informacion', 'ayuda', 'servicio', 'usar', 'dispositivo',
      'puede', 'hacer', 'netflix', 'disney', 'correo', 'email'
    ];
  }

  /**
   * Patrones genéricos de extracción de códigos
   */
  static get GENERIC_PATTERNS() {
    return [
      {
        name: 'Keyword Digits',
        regex: /(?:c[oó]digo|code|verification code|código de verificación)[:\s]+(\d{4,8})/i
      },
      {
        name: 'Keyword AlphaNum',
        regex: /(?:c[oó]digo|code|verification code)[:\s]+((?=[A-Z0-9]*\d)[A-Z0-9]{4,8})/i
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
   * @param {Object} config - Configuración de plataforma (opcional)
   * @returns {boolean}
   */
  static isValidCode(code, config = null) {
    if (!code) return false;

    const trimmedCode = code.trim();
    const lowerCode = trimmedCode.toLowerCase();

    // Verificar longitud mínima
    if (trimmedCode.length < 4) {
      console.log(`ℹ️ Código muy corto: ${code}`);
      return false;
    }

    // Si la plataforma requiere solo números, verificar
    if (config && config.numericOnly) {
      const cleanNumeric = trimmedCode.replace(/[\s\xa0\t]/g, '');
      if (!/^\d+$/.test(cleanNumeric)) {
        console.log(`ℹ️ Rechazando código no numérico para plataforma que requiere solo números: ${code}`);
        return false;
      }

      // Verificar longitud esperada si está configurada
      if (config.codeLength && config.codeLength.length > 0) {
        if (!config.codeLength.includes(cleanNumeric.length)) {
          console.log(`ℹ️ Longitud incorrecta (${cleanNumeric.length}). Esperada: ${config.codeLength.join(' o ')}`);
          return false;
        }
      }
    }

    // Evitar años comunes
    if (/^20[0-9]{2}$/.test(trimmedCode)) {
      console.log(`ℹ️ Rechazando año: ${code}`);
      return false;
    }

    // Evitar números genéricos comunes
    const commonNumbers = ['1000', '2000', '3000', '4000', '5000', '1234', '4321', '0000'];
    if (commonNumbers.includes(trimmedCode)) {
      console.log(`ℹ️ Rechazando número común: ${code}`);
      return false;
    }

    // Evitar palabras de la lista negra
    if (this.BLACKLIST_WORDS.includes(lowerCode)) {
      console.log(`ℹ️ Rechazando palabra en lista negra: ${code}`);
      return false;
    }

    // Evitar palabras puramente alfabéticas
    if (/^[a-záéíóúñ]+$/i.test(trimmedCode)) {
      console.log(`ℹ️ Rechazando palabra alfabética: ${code}`);
      return false;
    }

    // Códigos válidos deben tener al menos un número
    if (!/[0-9]/.test(trimmedCode)) {
      console.log(`ℹ️ Rechazando código sin números: ${code}`);
      return false;
    }

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

    console.log(`🔍 Buscando código con patrones específicos de ${platform}...`);

    for (let i = 0; i < config.patterns.length; i++) {
      const pattern = config.patterns[i];
      const matches = text.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));

      for (const match of matches) {
        if (match && match[1]) {
          // Limpiar espacios, tabs y NBSP
          const code = match[1].replace(/[\s\xa0\t]/g, '');

          console.log(`   Patrón ${i + 1} encontró: "${match[1]}" → limpio: "${code}"`);

          if (this.isValidCode(code, config)) {
            console.log(`✨ Código específico de ${platform} encontrado: ${code}`);
            return code;
          }
        }
      }
    }

    return null;
  }

  /**
   * Intenta extraer código usando patrones genéricos
   * @param {string} text - Texto limpio del correo
   * @param {Object} config - Configuración de plataforma (opcional)
   * @returns {string|null} Código extraído o null
   */
  static extractGenericCode(text, config = null) {
    console.log(`🔍 Intentando patrones genéricos...`);

    for (const pattern of this.GENERIC_PATTERNS) {
      const match = text.match(pattern.regex);
      if (match && match[1]) {
        const code = match[1].trim();

        console.log(`   ${pattern.name} encontró: "${code}"`);

        if (this.isValidCode(code, config)) {
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

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Extrayendo código para: ${platform || 'Genérica'}`);
    console.log(`${'='.repeat(60)}`);

    // Verificar palabras clave permitidas si la plataforma las tiene
    if (config && config.allowedKeywords) {
      if (!this.hasAllowedKeywords(fullText, config.allowedKeywords)) {
        console.log(`❌ Omitiendo: No contiene palabras clave permitidas.`);
        console.log(`${'='.repeat(60)}\n`);
        return null;
      }
      console.log(`✓ Contiene palabras clave permitidas`);
    }

    const cleanedText = this.cleanText(text);

    // 1. Intentar con patrones específicos de plataforma
    if (config) {
      const platformCode = this.extractPlatformCode(cleanedText, config, platform);
      if (platformCode) {
        console.log(`${'='.repeat(60)}\n`);
        return platformCode;
      }

      console.log(`ℹ️ No se encontró con patrones específicos, probando genéricos...`);
    }

    // 2. Intentar con patrones genéricos (solo si no es una plataforma con numericOnly)
    if (!config || !config.numericOnly) {
      const genericCode = this.extractGenericCode(cleanedText, config);
      console.log(`${'='.repeat(60)}\n`);
      return genericCode;
    }

    console.log(`❌ No se encontró código válido`);
    console.log(`${'='.repeat(60)}\n`);
    return null;
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
