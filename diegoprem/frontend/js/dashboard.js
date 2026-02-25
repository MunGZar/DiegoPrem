/**
 * DiegoPrem - Dashboard JavaScript
 * Sistema de Gestión de Códigos de Verificación
 */

let allPlatforms = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación
  if (!Storage.getToken()) {
    window.location.href = 'login.html';
    return;
  }

  const user = Storage.getUser();
  document.getElementById('usernameDisplay').textContent = user.username;

  // Event listeners
  document.getElementById('refreshButton').addEventListener('click', loadMessages);
  document.getElementById('searchInput').addEventListener('input', filterPlatforms);
  document.getElementById('userMenuButton').addEventListener('click', toggleUserMenu);
  document.getElementById('logoutButton').addEventListener('click', logout);
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', closeModal);

  // Cargar datos iniciales
  await loadMessages();

  // Mostrar opción de admin si corresponde
  if (user.role === 'admin') {
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
      adminLink.classList.remove('hidden');
      adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'admin.html';
      });
    }
  }

  // Configurar actualizaciones en tiempo real (SSE)
  setupRealTimeUpdates();

  // Auto-refresh de respaldo cada 2 minutos (menos frecuente gracias a SSE)
  setInterval(loadMessages, 120000);
});

/**
 * Configura la conexión de EventSource para actualizaciones en tiempo real
 */
function setupRealTimeUpdates() {
  // Construir la URL de eventos (usando el mismo origen que la API_URL)
  const eventUrl = `${CONFIG.API_URL}/events`;

  console.log(`📡 Conectando a eventos en tiempo real: ${eventUrl}`);

  try {
    const eventSource = new EventSource(eventUrl);

    eventSource.onopen = () => {
      console.log('✅ Conexión SSE establecida con éxito');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🔔 Actualización recibida vía SSE:', data);

        // Recargar el dashboard sin intervención del usuario
        // Si es una actualización de Netflix, esto refrescará el highlight
        loadMessages();
      } catch (err) {
        console.error('Error al procesar mensaje SSE:', err);
      }
    };

    eventSource.onerror = (error) => {
      if (eventSource.readyState === EventSource.CLOSED) {
        console.error('❌ Conexión SSE cerrada. Intentando reconectar...');
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        console.warn('⚠️ Conexión SSE perdida, reintentando automáticamente...');
      }
    };
  } catch (error) {
    console.error('No se pudo establecer conexión SSE:', error);
  }
}

async function loadMessages() {
  const grid = document.getElementById('platformsGrid');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');

  // Mostrar estado de carga
  loadingState?.classList.remove('hidden');
  emptyState?.classList.add('hidden');
  grid.innerHTML = '';

  try {
    const response = await API.get('/messages');
    allPlatforms = response.data;

    // Ocultar carga independientemente del resultado
    loadingState?.classList.add('hidden');

    if (!allPlatforms || allPlatforms.length === 0) {
      emptyState?.classList.remove('hidden');
      document.getElementById('moduleSections')?.classList.add('hidden');
      hideNetflixLive();
    } else {
      emptyState?.classList.add('hidden');
      document.getElementById('moduleSections')?.classList.remove('hidden');
      renderNetflixLive(allPlatforms);
      renderPlatforms(allPlatforms);
      loadStats();
    }
  } catch (error) {
    console.error('Error cargando mensajes:', error);
    loadingState?.classList.add('hidden');
    showError('Error al cargar los mensajes');
    hideNetflixLive();
  }
}

function renderPlatforms(platforms) {
  const accessGrid = document.getElementById('accessGrid');
  const securityGrid = document.getElementById('securityGrid');
  const accessModule = document.getElementById('accessModule');
  const securityModule = document.getElementById('securityModule');

  if (accessGrid) accessGrid.innerHTML = '';
  if (securityGrid) securityGrid.innerHTML = '';

  // Keywords to categorize as "Seguridad" (Password Reset)
  const securityKeywords = ['restablecer', 'password', 'contraseña', 'seguridad', 'reset'];

  let hasAccess = false;
  let hasSecurity = false;

  platforms.forEach(platform => {
    const card = createPlatformCard(platform);

    // Determine category based on message subject or platform name if message is null
    const subject = (platform.message?.subject || '').toLowerCase();
    const isSecurity = securityKeywords.some(keyword => subject.includes(keyword));

    if (isSecurity) {
      if (securityGrid) {
        securityGrid.appendChild(card);
        hasSecurity = true;
      }
    } else {
      if (accessGrid) {
        accessGrid.appendChild(card);
        hasAccess = true;
      }
    }
  });

  // Hide/Show sections based on content
  if (accessModule) {
    hasAccess ? accessModule.classList.remove('hidden') : accessModule.classList.add('hidden');
  }
  if (securityModule) {
    hasSecurity ? securityModule.classList.remove('hidden') : securityModule.classList.add('hidden');
  }

  // Show empty state if both are empty
  const emptyState = document.getElementById('emptyState');
  if (!hasAccess && !hasSecurity) {
    emptyState?.classList.remove('hidden');
    document.getElementById('moduleSections')?.classList.add('hidden');
  } else {
    emptyState?.classList.add('hidden');
    document.getElementById('moduleSections')?.classList.remove('hidden');
  }
}

function createPlatformCard(platform) {
  const card = document.createElement('div');
  card.className = 'platform-card';

  const hasMessage = platform.message !== null;
  const code = hasMessage ? platform.message.extracted_code : null;

  card.innerHTML = `
    <div class="platform-header">
      <img src="${platform.platform_logo || 'https://via.placeholder.com/60'}" 
           alt="${platform.platform_name}" 
           class="platform-logo"
           onerror="this.src='https://via.placeholder.com/60'">
      <div class="platform-info">
        <h3>${platform.platform_name}</h3>
        <p class="platform-email">${(hasMessage && platform.message.recipient) ? platform.message.recipient : platform.email_address || platform.message.subject}</p>
        ${(hasMessage && platform.message.subject) ? `<p class="platform-subject" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem; opacity: 0.7;">${truncate(platform.message.subject, 40)}</p>` : ''}
      </div>
    </div>
    <div class="platform-body">
      ${hasMessage ? `
        <div class="message-content">
          <p class="message-label">Código de Verificación</p>
          ${code ? `
            <div class="code-display">${code}</div>
          ` : `
            <div class="no-code">No se detectó código en el mensaje</div>
          `}
        </div>
        <div class="message-meta">
          <span class="meta-item">📅 ${Utils.timeAgo(platform.message.received_at)}</span>
          ${platform.message.recipient ? `<span class="meta-item">📥 ${truncate(platform.message.recipient, 35)}</span>` : ''}
          ${platform.message.subject ? `<span class="meta-item">📧 ${truncate(platform.message.subject, 30)}</span>` : ''}
        </div>
        <div class="platform-actions">
          ${code ? `
            <button class="btn-copy" onclick="copyCode('${code}', this)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copiar Código
            </button>
          ` : ''}
          <button class="btn-view" onclick="viewMessage(${platform.message.id})">Ver Detalles</button>
        </div>
      ` : `
        <div class="no-code">No hay mensajes recientes</div>
      `}
    </div>
  `;

  return card;
}

async function copyCode(code, button) {
  try {
    await Utils.copyToClipboard(code);
    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      ¡Copiado!
    `;
    button.classList.add('copied');

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error('Error copiando:', error);
  }
}

async function viewMessage(messageId) {
  try {
    const response = await API.get(`/messages/${messageId}`);
    const message = response.data;

    const modal = document.getElementById('messageModal');
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div>
          <p class="message-label">Remitente</p>
          <p style="margin-top: 0.5rem; font-family: var(--font-mono); color: var(--text-primary);">${message.sender || 'Desconocido'}</p>
        </div>
        <div>
          <p class="message-label">Destinatario</p>
          <p style="margin-top: 0.5rem; font-family: var(--font-mono); color: var(--text-primary);">${message.recipient || 'Desconocido'}</p>
        </div>
        <div>
          <p class="message-label">Asunto</p>
          <p style="margin-top: 0.5rem; color: var(--text-primary);">${message.subject || 'Sin asunto'}</p>
        </div>
        <div>
          <p class="message-label">Fecha</p>
          <p style="margin-top: 0.5rem; color: var(--text-primary);">${Utils.formatDate(message.received_at)}</p>
        </div>
        ${message.extracted_code ? `
          <div>
            <p class="message-label">Código Extraído</p>
            <div class="code-display" style="margin-top: 0.5rem;">${message.extracted_code}</div>
          </div>
        ` : ''}
        <div>
          <p class="message-label">Contenido</p>
          <div style="margin-top: 0.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); max-height: 300px; overflow-y: auto; white-space: pre-wrap; color: var(--text-secondary); font-size: 0.9rem;">${message.content.substring(0, 1000)}${message.content.length > 1000 ? '...' : ''}</div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  } catch (error) {
    console.error('Error cargando mensaje:', error);
  }
}

function closeModal() {
  document.getElementById('messageModal').classList.add('hidden');
}

function filterPlatforms(e) {
  const searchTerm = e.target.value.toLowerCase().trim();

  if (!searchTerm) {
    renderPlatforms(allPlatforms);
    return;
  }

  const filtered = allPlatforms.filter(p => {
    const platName = (p.platform_name || '').toLowerCase();
    const platEmail = (p.email_address || '').toLowerCase();
    const msgSender = (p.message?.sender || '').toLowerCase();
    const msgRecipient = (p.message?.recipient || '').toLowerCase();
    const msgSubject = (p.message?.subject || '').toLowerCase();

    return platName.includes(searchTerm) ||
      platEmail.includes(searchTerm) ||
      msgSender.includes(searchTerm) ||
      msgRecipient.includes(searchTerm) ||
      msgSubject.includes(searchTerm);
  });

  renderPlatforms(filtered);
}

async function loadStats() {
  try {
    const response = await API.get('/messages/stats/summary');
    const stats = response.data;

    // allPlatforms ahora contiene una lista de mensajes planos
    document.getElementById('totalPlatforms').textContent = allPlatforms.length;
    document.getElementById('totalEmails').textContent = stats.total_active_emails || 0;

    if (stats.last_message_received) {
      document.getElementById('lastMessage').textContent = Utils.timeAgo(stats.last_message_received);
    } else {
      document.getElementById('lastMessage').textContent = 'Sin mensajes';
    }

    document.getElementById('statsSection').classList.remove('hidden');
  } catch (error) {
    console.error('Error cargando stats:', error);
  }
}

function toggleUserMenu() {
  document.getElementById('userDropdown').classList.toggle('hidden');
}

function logout() {
  Storage.clear();
  window.location.href = 'login.html';
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max) + '...' : str;
}

function showError(message) {
  console.error(message);
}

/**
 * ============================================
 * LIVE NETFLIX HIGHLIGHT
 * ============================================
 * Renderiza el destacado especial de Netflix
 * Muestra el último código recibido de Netflix
 */
function renderNetflixLive(platforms) {
  // Buscar plataforma Netflix con mensaje y código
  const netflix = platforms.find(p =>
    p.platform_name.toLowerCase().includes('netflix') &&
    p.message &&
    p.message.extracted_code
  );

  const card = document.getElementById('liveNetflixCard');

  // Si no hay Netflix o no hay código, ocultar la tarjeta
  if (!netflix || !card) {
    hideNetflixLive();
    return;
  }

  // Actualizar código
  const codeElement = document.getElementById('liveNetflixCode');
  if (codeElement) {
    codeElement.textContent = netflix.message.extracted_code;
    // Animar el código cuando se actualiza
    codeElement.style.animation = 'none';
    setTimeout(() => {
      codeElement.style.animation = 'pulse 0.5s ease';
    }, 10);
  }

  // Actualizar email
  const emailElement = document.getElementById('liveNetflixEmail');
  if (emailElement) {
    emailElement.textContent = netflix.message.recipient || netflix.email_address || netflix.message.subject;

  }

  // Configurar botón copiar código
  const copyCodeBtn = document.getElementById('copyNetflixCode');
  if (copyCodeBtn) {
    // Remover listeners previos
    copyCodeBtn.replaceWith(copyCodeBtn.cloneNode(true));
    const newCopyCodeBtn = document.getElementById('copyNetflixCode');

    newCopyCodeBtn.addEventListener('click', async () => {
      try {
        await Utils.copyToClipboard(netflix.message.extracted_code);
        const originalText = newCopyCodeBtn.textContent;
        newCopyCodeBtn.textContent = '✓ ¡Copiado!';
        newCopyCodeBtn.style.transform = 'scale(1.05)';

        setTimeout(() => {
          newCopyCodeBtn.textContent = originalText;
          newCopyCodeBtn.style.transform = 'scale(1)';
        }, 2000);
      } catch (error) {
        console.error('Error al copiar código:', error);
        newCopyCodeBtn.textContent = '✗ Error';
        setTimeout(() => {
          newCopyCodeBtn.textContent = 'Copiar código';
        }, 2000);
      }
    });
  }

  // Configurar botón copiar email
  const copyEmailBtn = document.getElementById('copyNetflixEmail');
  if (copyEmailBtn) {
    // Remover listeners previos
    copyEmailBtn.replaceWith(copyEmailBtn.cloneNode(true));
    const newCopyEmailBtn = document.getElementById('copyNetflixEmail');

    newCopyEmailBtn.addEventListener('click', async () => {
      try {
        await Utils.copyToClipboard(netflix.email_address);
        const originalText = newCopyEmailBtn.textContent;
        newCopyEmailBtn.textContent = '✓ ¡Copiado!';
        newCopyEmailBtn.style.transform = 'scale(1.05)';

        setTimeout(() => {
          newCopyEmailBtn.textContent = originalText;
          newCopyEmailBtn.style.transform = 'scale(1)';
        }, 2000);
      } catch (error) {
        console.error('Error al copiar email:', error);
        newCopyEmailBtn.textContent = '✗ Error';
        setTimeout(() => {
          newCopyEmailBtn.textContent = 'Copiar correo';
        }, 2000);
      }
    });
  }

  // Mostrar card con animación
  card.classList.remove('hidden');
  card.style.animation = 'fadeInUp 0.6s ease';
}

/**
 * Oculta el Live Netflix Highlight
 */
function hideNetflixLive() {
  const card = document.getElementById('liveNetflixCard');
  if (card) {
    card.classList.add('hidden');
  }
}

// Cerrar menú al hacer clic fuera
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu')) {
    document.getElementById('userDropdown').classList.add('hidden');
  }
});

// Cerrar modal con tecla ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});