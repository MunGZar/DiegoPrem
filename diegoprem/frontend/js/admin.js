/**
 * DiegoPrem - Admin Panel JavaScript
 */

let currentSection = 'emails';

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
  
  loadSection('emails');
});

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
  const tbody = document.querySelector('#emailsTable tbody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="8" class="text-center"><div class="loader-small"></div><p>Cargando...</p></td></tr>';
  
  try {
    const response = await API.get('/admin/emails');
    tbody.innerHTML = '';
    
    response.data.forEach(email => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${email.id}</td>
        <td><strong>${email.platform_name}</strong></td>
        <td style="font-family: var(--font-mono); font-size: 0.9rem;">${email.email_address}</td>
        <td>${email.imap_host}</td>
        <td>${email.imap_port}</td>
        <td><span class="status-badge ${email.active ? 'status-active' : 'status-inactive'}">${email.active ? 'Activo' : 'Inactivo'}</span></td>
        <td style="font-size: 0.85rem;">${Utils.timeAgo(email.last_checked)}</td>
        <td>
          <div class="table-actions">
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
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color: var(--error); padding: 2rem;">Error al cargar correos</td></tr>';
  }
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
  const container = document.getElementById('messagesContent');
  container.innerHTML = '<div class="loading-state"><div class="loader"></div><p>Cargando mensajes...</p></div>';
  
  try {
    const response = await API.get('/messages');
    container.innerHTML = '<div class="platforms-grid" id="adminMessagesGrid"></div>';
    
    const grid = document.getElementById('adminMessagesGrid');
    response.data.forEach(platform => {
      if (platform.message) {
        const card = document.createElement('div');
        card.className = 'platform-card';
        card.innerHTML = `
          <div class="platform-header">
            <img src="${platform.platform_logo}" alt="${platform.platform_name}" class="platform-logo">
            <div class="platform-info">
              <h3>${platform.platform_name}</h3>
              <p class="platform-email">${platform.email_address}</p>
            </div>
          </div>
          <div class="platform-body">
            <p class="message-label">Código: ${platform.message.extracted_code || 'N/A'}</p>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0.5rem 0;">${Utils.formatDate(platform.message.received_at)}</p>
            <button class="btn-secondary" onclick="deleteMessage(${platform.message.id})" style="width: 100%; margin-top: 1rem;">Eliminar Mensaje</button>
          </div>
        `;
        grid.appendChild(card);
      }
    });
  } catch (error) {
    container.innerHTML = '<div class="empty-state"><p style="color: var(--error);">Error al cargar mensajes</p></div>';
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

function editEmail(id) {
  alert('Función de edición en desarrollo');
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
