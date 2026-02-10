const EmailService = require('./services/emailService');

const tests = [
    {
        name: 'Netflix con palabra clave y espacios',
        text: 'Su código de inicio de sesión es 2 8 0 4. No lo comparta.',
        subject: 'Código de Netflix',
        platform: 'netflix',
        expected: '2804'
    },
    {
        name: 'Netflix "para" (debe ser rechazado)',
        text: 'Hola, este mensaje es para usted. Iniciar sesión ahora. Código: 2026',
        subject: 'Netflix Info',
        platform: 'netflix',
        expected: null // 2026 es un año, debe ser rechazado si isValidCode funciona bien
    },
    {
        name: 'Netflix 6 dígitos "Hogar" con NBSP',
        text: 'Actualizar Hogar Netflix. Código de verificación: 1\xa02\xa03\xa04\xa05\xa06',
        subject: 'Tu código de actualización',
        platform: 'netflix',
        expected: '123456'
    },
    {
        name: 'Netflix "Login" con código pegado',
        text: 'Alguien intentó un Inicio de sesión. Use el código 987654 para entrar.',
        subject: 'Alerta de seguridad',
        platform: 'netflix',
        expected: '987654'
    }
];

console.log('--- INICIANDO PRUEBAS DE EXTRACCIÓN ---');

tests.forEach(test => {
    console.log(`\n🧪 Prueba: ${test.name}`);
    const result = EmailService.extractCode(test.text, test.subject, test.platform);

    if (result === test.expected) {
        console.log(`✅ PASÓ (Resultado: ${result})`);
    } else {
        console.log(`❌ FALLÓ (Esperaba: ${test.expected}, Obtuvo: ${result})`);
    }
});
