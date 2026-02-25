/**
 * DiegoPrem - Admin Panel JavaScript
 */

let currentSection = 'emails';
let allMessages = []; // Almacenar mensajes para filtrado local
let allEmails = []; // Almacenar correos para filtrado local
let selectedMessages = []; // Almacenar IDs de mensajes seleccionados

document.addEventListener('DOMContentLoaded', () => {
  if (!Storage.getToken()) {
    window.location.href = 'login.html';
    return;
  }

  const user = Storage.getUser();
  if (user.role !== 'admin') {
    window.location.href = 'dashboard.html';
    return;
  }

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      switchSection(section);
    });
  });

  // Buttons
  document.getElementById('addNewBtn').addEventListener('click', openAddForm);
  document.getElementById('checkAllEmailsBtn').addEventListener('click', checkAllEmails);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', closeModal);

  // Bulk delete buttons
  document.getElementById('selectAllMessages')?.addEventListener('change', handleSelectAllMessages);
  document.getElementById('deleteSelectedMessagesBtn')?.addEventListener('click', deleteSelectedMessages);

  // Configurar filtrado de mensajes
  setupMessageFilters();

  // Configurar filtrado de correos
  setupEmailFilters();

  loadSection('emails');

  // Configurar actualizaciones en tiempo real (SSE)
  setupRealTimeUpdates();
});

/**
 * Configura los event listeners para el filtrado de correos
 */
function setupEmailFilters() {
  const searchInput = document.getElementById('emailSearch');
  const platformFilter = document.getElementById('emailPlatformFilter');
  const clearBtn = document.getElementById('clearEmailFilters');

  if (!searchInput) return;

  searchInput.addEventListener('input', filterEmails);
  platformFilter.addEventListener('change', filterEmails);
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    platformFilter.value = 'all';
    filterEmails();
  });
}

/**
 * Filtra y renderiza los correos basados en la búsqueda y el filtro de plataforma
 */
function filterEmails() {
  const searchTerm = document.getElementById('emailSearch').value.toLowerCase();
  const platformTerm = document.getElementById('emailPlatformFilter').value;

  const filtered = allEmails.filter(email => {
    const matchesSearch =
      email.platform_name.toLowerCase().includes(searchTerm) ||
      email.email_address.toLowerCase().includes(searchTerm);

    const matchesPlatform = platformTerm === 'all' || email.platform_name === platformTerm;

    return matchesSearch && matchesPlatform;
  });

  renderEmailsTable(filtered);
}

/**
 * Configura los event listeners para el filtrado de mensajes
 */
function setupMessageFilters() {
  const searchInput = document.getElementById('messageSearch');
  const platformFilter = document.getElementById('platformFilter');
  const clearBtn = document.getElementById('clearSearch');

  if (!searchInput) return; // Puede que no estemos en la sección de mensajes

  searchInput.addEventListener('input', filterMessages);
  platformFilter.addEventListener('change', filterMessages);
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    platformFilter.value = 'all';
    filterMessages();
  });
}

/**
 * Filtra y renderiza los mensajes basados en la búsqueda y el filtro de plataforma
 */
function filterMessages() {
  const searchTerm = document.getElementById('messageSearch').value.toLowerCase();
  const platformTerm = document.getElementById('platformFilter').value;

  const filtered = allMessages.filter(platform => {
    if (!platform.message) return false;

    const matchesSearch =
      platform.platform_name.toLowerCase().includes(searchTerm) ||
      platform.email_address.toLowerCase().includes(searchTerm) ||
      (platform.message.extracted_code && platform.message.extracted_code.toLowerCase().includes(searchTerm)) ||
      (platform.message.recipient && platform.message.recipient.toLowerCase().includes(searchTerm));

    const matchesPlatform = platformTerm === 'all' || platform.platform_name === platformTerm;

    return matchesSearch && matchesPlatform;
  });

  renderMessagesTable(filtered);
}

/**
 * Configura la conexión de EventSource para actualizaciones en tiempo real
 */
function setupRealTimeUpdates() {
  const eventUrl = `${CONFIG.API_URL}/events`;
  console.log(`📡 Admin: Conectando a eventos en tiempo real: ${eventUrl}`);

  try {
    const eventSource = new EventSource(eventUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🔔 Admin: Actualización recibida vía SSE:', data);

        // Recargar la sección actual para mostrar los datos nuevos
        loadSection(currentSection);
      } catch (err) {
        console.error('Error al procesar mensaje SSE:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.warn('⚠️ Admin: Conexión SSE perdida, reintentando...');
    };
  } catch (error) {
    console.error('No se pudo establecer conexión SSE en Admin:', error);
  }
}




function switchSection(section) {
  currentSection = section;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-section="${section}"]`).classList.add('active');

  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.remove('active');
  });
  document.getElementById(`${section}Section`).classList.add('active');

  const titles = { emails: 'Gestión de Correos', users: 'Gestión de Usuarios', messages: 'Gestión de Mensajes' };
  document.getElementById('sectionTitle').textContent = titles[section];

  loadSection(section);
}

async function loadSection(section) {
  if (section === 'emails') await loadEmails();
  else if (section === 'users') await loadUsers();
  else if (section === 'messages') await loadMessages();
}

async function loadEmails() {
  const tbody = document.getElementById('emailsTableBody');
  const emptyState = document.getElementById('emailsEmptyState');

  if (!tbody) return;

  tbody.innerHTML = '<tr class="loading-row"><td colspan="6" class="text-center"><div class="loader-small"></div><p>Cargando...</p></td></tr>';
  emptyState.classList.add('hidden');

  try {
    const response = await API.get('/admin/emails');
    allEmails = response.data;

    // Actualizar opciones del filtro de plataforma para correos
    updateEmailPlatformFilterOptions(allEmails);

    renderEmailsTable(allEmails);
  } catch (error) {
    console.error('Error al cargar correos:', error);
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--error); padding: 2rem;">Error al cargar correos</td></tr>';
  }
}

/**
 * Actualiza las opciones del select de plataformas para correos
 */
function updateEmailPlatformFilterOptions(emails) {
  const filter = document.getElementById('emailPlatformFilter');
  if (!filter) return;

  const currentVal = filter.value;
  const uniquePlatforms = [...new Set(emails.map(e => e.platform_name))].sort();

  filter.innerHTML = '<option value="all">Todas las plataformas</option>';
  uniquePlatforms.forEach(p => {
    const option = document.createElement('option');
    option.value = p;
    option.textContent = p;
    filter.appendChild(option);
  });

  filter.value = currentVal;
}

/**
 * Renderiza la tabla de correos con los datos proporcionados
 */
function renderEmailsTable(emails) {
  const tbody = document.getElementById('emailsTableBody');
  const emptyState = document.getElementById('emailsEmptyState');

  if (!tbody) return;
  tbody.innerHTML = '';

  if (emails.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  emails.forEach(email => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="platform-cell">
          <img src="${email.platform_logo}" alt="${email.platform_name}" onerror="this.src='https://via.placeholder.com/32'">
          <strong>${email.platform_name}</strong>
        </div>
      </td>
      <td style="font-family: var(--font-mono); font-size: 0.9rem;">${email.email_address}</td>
      <td style="font-size: 0.85rem;">
        <div style="opacity: 0.8;">Host: ${email.imap_host}</div>
        <div style="opacity: 0.6;">Puerto: ${email.imap_port}</div>
      </td>
      <td>
        <span class="status-badge ${email.active ? 'status-active' : 'status-inactive'}">
          ${email.active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td style="font-size: 0.85rem;">
        <div class="date-cell">
          ${email.last_checked ? Utils.formatDate(email.last_checked) : 'Nunca'}
          <br>
          <small>${email.last_checked ? Utils.timeAgo(email.last_checked) : '-'}</small>
        </div>
      </td>
      <td>
        <div class="table-actions" style="justify-content: center;">
          <button class="btn-icon btn-check" onclick="checkEmail(${email.id})" title="Verificar ahora">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
          <button class="btn-icon btn-edit" onclick="editEmail(${email.id})" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon btn-delete" onclick="deleteEmail(${email.id})" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="7" class="text-center"><div class="loader-small"></div><p>Cargando...</p></td></tr>';

  try {
    const response = await API.get('/admin/users');
    tbody.innerHTML = '';

    response.data.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.id}</td>
        <td><strong>${user.username}</strong></td>
        <td><span class="role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}">${user.role}</span></td>
        <td style="font-size: 0.85rem;">${Utils.formatDate(user.created_at)}</td>
        <td style="font-size: 0.85rem;">${Utils.formatDate(user.last_login)}</td>
        <td><span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">${user.active ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn-icon btn-edit" onclick="editUser(${user.id})" title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon btn-delete" onclick="deleteUser(${user.id})" title="Eliminar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: var(--error); padding: 2rem;">Error al cargar usuarios</td></tr>';
  }
}

async function loadMessages() {
  const tbody = document.getElementById('messagesTableBody');
  const emptyState = document.getElementById('messagesEmptyState');

  if (!tbody) return;

  tbody.innerHTML = '<tr class="loading-row"><td colspan="5" class="text-center"><div class="loader-small"></div><p>Cargando...</p></td></tr>';
  emptyState.classList.add('hidden');

  try {
    const response = await API.get('/messages');
    allMessages = response.data;


    // Actualizar opciones del filtro de plataforma
    updatePlatformFilterOptions(allMessages);

    renderMessagesTable(allMessages);

  } catch (error) {
    console.error('Error al cargar mensajes:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--error); padding: 2rem;">Error al cargar mensajes</td></tr>';
  }
}

/**
 * Actualiza las opciones del select de plataformas
 */
function updatePlatformFilterOptions(platforms) {
  const filter = document.getElementById('platformFilter');
  if (!filter) return;

  const currentVal = filter.value;
  const uniquePlatforms = [...new Set(platforms.map(p => p.platform_name))].sort();

  filter.innerHTML = '<option value="all">Todas las plataformas</option>';
  uniquePlatforms.forEach(p => {
    const option = document.createElement('option');
    option.value = p;
    option.textContent = p;
    filter.appendChild(option);
  });

  filter.value = currentVal;
}

/**
 * Renderiza la tabla de mensajes con los datos proporcionados
 */
function renderMessagesTable(platforms) {
  const tbody = document.getElementById('messagesTableBody');
  const emptyState = document.getElementById('messagesEmptyState');

  tbody.innerHTML = '';

  const messagesWithPlatform = platforms.filter(p => p.message);

  if (messagesWithPlatform.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Reset selected messages state if needed, or keep it depending on UX. Here we keep it but update UI.
  updateSelectedMessagesUI();

  messagesWithPlatform.forEach(p => {
    const msg = p.message;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="message-checkbox" value="${msg.id}" ${selectedMessages.includes(String(msg.id)) ? 'checked' : ''}>
      </td>
      <td>
        <div class="platform-cell">
          <img src="${p.platform_logo}" alt="${p.platform_name}" onerror="this.src='https://via.placeholder.com/32'">
          <strong>${p.platform_name}</strong>
        </div>
      </td>
      <td>
        <div class="recipient-cell" title="${msg.recipient || p.email_address}">
          ${msg.recipient || p.email_address}
        </div>
      </td>
      <td>
        <span class="code-badge">${msg.extracted_code || 'N/A'}</span>
      </td>
      <td>
        <div class="date-cell">
          ${Utils.formatDate(msg.received_at)}<br>
          <small>${Utils.timeAgo(msg.received_at)}</small>
        </div>
      </td>
      <td>
        <div class="table-actions" style="justify-content: center;">
          <button class="btn-icon btn-check" onclick="copyValue('${msg.extracted_code}')" title="Copiar código">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="btn-icon btn-edit" onclick="viewMessageDetails(${msg.id})" title="Ver detalles">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="btn-icon btn-delete" onclick="deleteMessage(${msg.id})" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    // Add checkbox listener
    const checkbox = tr.querySelector('.message-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => handleSelectMessage(e, String(msg.id)));
    }

    tbody.appendChild(tr);
  });
}

function handleSelectMessage(e, id) {
  if (e.target.checked) {
    if (!selectedMessages.includes(id)) selectedMessages.push(id);
  } else {
    selectedMessages = selectedMessages.filter(msgId => msgId !== id);
  }
  updateSelectedMessagesUI();
}

function handleSelectAllMessages(e) {
  const isChecked = e.target.checked;
  const visibleCheckboxes = document.querySelectorAll('.message-checkbox');

  if (isChecked) {
    visibleCheckboxes.forEach(cb => {
      cb.checked = true;
      if (!selectedMessages.includes(cb.value)) selectedMessages.push(cb.value);
    });
  } else {
    visibleCheckboxes.forEach(cb => {
      cb.checked = false;
      selectedMessages = selectedMessages.filter(id => id !== cb.value);
    });
  }
  updateSelectedMessagesUI();
}

function updateSelectedMessagesUI() {
  const countSpan = document.getElementById('selectedMessagesCount');
  const deleteBtn = document.getElementById('deleteSelectedMessagesBtn');
  const selectAll = document.getElementById('selectAllMessages');

  if (countSpan) countSpan.textContent = selectedMessages.length;

  if (selectedMessages.length > 0) {
    deleteBtn?.classList.remove('hidden');
  } else {
    deleteBtn?.classList.add('hidden');
  }

  // Update select all indeterminate or checked state if needed
  if (selectAll) {
    const visibleCheckboxes = document.querySelectorAll('.message-checkbox');
    if (visibleCheckboxes.length > 0) {
      const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
      const someChecked = Array.from(visibleCheckboxes).some(cb => cb.checked);
      selectAll.checked = allChecked;
      selectAll.indeterminate = someChecked && !allChecked;
    } else {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }
  }
}

async function deleteSelectedMessages() {
  if (selectedMessages.length === 0) return;

  if (!confirm(`¿Eliminar los ${selectedMessages.length} mensajes seleccionados?`)) return;

  try {
    const response = await API.post('/admin/messages/bulk-delete', { ids: selectedMessages });
    selectedMessages = []; // Clean state
    updateSelectedMessagesUI();
    loadMessages(); // Reload table
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

/**
 * Copia un valor al portapapeles y muestra feedback
 */
async function copyValue(value) {
  if (!value || value === 'N/A') return;
  await Utils.copyToClipboard(value);
  // Podríamos añadir un toast aquí si existiera
}

/**
 * Muestra los detalles completos de un mensaje en el modal
 */
async function viewMessageDetails(id) {
  try {
    const response = await API.get(`/messages/${id}`);
    const msg = response.data;

    const modal = document.getElementById('formModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('dynamicForm');

    modalTitle.textContent = `Mensaje de ${msg.platform_name}`;
    form.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <p><strong>De:</strong> ${msg.sender}</p>
        <p><strong>Para:</strong> ${msg.recipient || msg.email_address}</p>
        <p><strong>Asunto:</strong> ${msg.subject}</p>
        <p><strong>Fecha:</strong> ${Utils.formatDate(msg.received_at)}</p>
      </div>
      <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; max-height: 400px; overflow-y: auto; color: #333; font-family: sans-serif;">
        ${msg.content}
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cerrar</button>
        <button type="button" class="btn-primary" onclick="copyValue('${msg.extracted_code}')">Copiar Código (${msg.extracted_code})</button>
      </div>
    `;

    modal.classList.remove('hidden');
  } catch (error) {
    alert('Error al cargar detalles del mensaje');
  }
}

function openAddForm() {
  const modal = document.getElementById('formModal');
  const modalTitle = document.getElementById('modalTitle');
  const form = document.getElementById('dynamicForm');

  if (currentSection === 'emails') {
    modalTitle.textContent = 'Agregar Nuevo Correo';
    form.innerHTML = `
      <div class="form-grid">
        <div class="form-field"><label>Correo Electrónico*</label><input type="email" name="email_address" required></div>
        <div class="form-field"><label>Contraseña IMAP*</label><input type="password" name="imap_password" required></div>
        <div class="form-field"><label>Host IMAP*</label><input type="text" name="imap_host" value="imap.gmail.com" required></div>
        <div class="form-field"><label>Puerto IMAP*</label><input type="number" name="imap_port" value="993" required></div>
        <div class="form-field"><label>Plataforma*</label><input type="text" name="platform_name" placeholder="Netflix, HBO Max..." required></div>
        <div class="form-field"><label>URL del Logo</label><input type="url" name="platform_logo" placeholder="https://..."></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-primary">Crear Correo</button>
      </div>
    `;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await API.post('/admin/emails', Object.fromEntries(formData));
        closeModal();
        loadEmails();
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };
  } else if (currentSection === 'users') {
    modalTitle.textContent = 'Agregar Nuevo Usuario';
    form.innerHTML = `
      <div class="form-grid">
        <div class="form-field"><label>Usuario*</label><input type="text" name="username" required></div>
        <div class="form-field"><label>Contraseña*</label><input type="password" name="password" required></div>
        <div class="form-field"><label>Rol*</label><select name="role" required><option value="user">Usuario</option><option value="admin">Administrador</option></select></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-primary">Crear Usuario</button>
      </div>
    `;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await API.post('/admin/users', Object.fromEntries(formData));
        closeModal();
        loadUsers();
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };
  }

  modal.classList.remove('hidden');
}

async function checkEmail(id) {
  if (!confirm('¿Verificar este correo ahora?')) return;
  try {
    await API.post(`/admin/emails/${id}/check`);
    alert('Verificación completada');
    loadEmails();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function checkAllEmails() {
  if (!confirm('¿Verificar todos los correos ahora? Esto puede tardar varios minutos.')) return;
  try {
    await API.post('/admin/emails/check-all');
    alert('Verificación masiva completada');
    loadEmails();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function deleteEmail(id) {
  if (!confirm('¿Eliminar este correo? Esto también eliminará todos sus mensajes.')) return;
  try {
    await API.delete(`/admin/emails/${id}`);
    loadEmails();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function deleteUser(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  try {
    await API.delete(`/admin/users/${id}`);
    loadUsers();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function deleteMessage(id) {
  if (!confirm('¿Eliminar este mensaje?')) return;
  try {
    await API.delete(`/admin/messages/${id}`);
    loadMessages();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function editEmail(id) {
  const email = allEmails.find(e => e.id === id);
  if (!email) {
    alert('No se encontró la información del correo');
    return;
  }

  const modal = document.getElementById('formModal');
  const modalTitle = document.getElementById('modalTitle');
  const form = document.getElementById('dynamicForm');

  modalTitle.textContent = 'Editar Correo Electrónico';
  form.innerHTML = `
    <div class="form-grid">
      <div class="form-field">
        <label>Correo Electrónico*</label>
        <input type="email" name="email_address" value="${email.email_address}" required>
      </div>
      <div class="form-field">
        <label>Contraseña IMAP (Dejar en blanco para no cambiar)</label>
        <input type="password" name="imap_password" placeholder="********">
      </div>
      <div class="form-field">
        <label>Host IMAP*</label>
        <input type="text" name="imap_host" value="${email.imap_host}" required>
      </div>
      <div class="form-field">
        <label>Puerto IMAP*</label>
        <input type="number" name="imap_port" value="${email.imap_port}" required>
      </div>
      <div class="form-field">
        <label>Plataforma*</label>
        <input type="text" name="platform_name" value="${email.platform_name}" required>
      </div>
      <div class="form-field">
        <label>URL del Logo</label>
        <input type="url" name="platform_logo" value="${email.platform_logo || ''}" placeholder="https://...">
      </div>
      <div class="form-field">
        <label>Estado</label>
        <select name="active">
          <option value="true" ${email.active ? 'selected' : ''}>Activo</option>
          <option value="false" ${!email.active ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button type="submit" class="btn-primary">Guardar Cambios</button>
    </div>
  `;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Si la contraseña está vacía, la eliminamos para no sobreescribirla
    if (!data.imap_password) {
      delete data.imap_password;
    }

    // Convertir active de string a boolean
    data.active = data.active === 'true';

    try {
      await API.put(`/admin/emails/${id}`, data);
      closeModal();
      loadEmails();
      Utils.showNotification('Correo actualizado correctamente', 'success');
    } catch (error) {
      alert('Error al actualizar: ' + error.message);
    }
  };

  modal.classList.remove('hidden');
}

function editUser(id) {
  alert('Función de edición en desarrollo');
}

function closeModal() {
  document.getElementById('formModal').classList.add('hidden');
}

function logout() {
  Storage.clear();
  window.location.href = 'login.html';
}
