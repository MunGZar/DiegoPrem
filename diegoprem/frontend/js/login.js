/**
 * DiegoPrem - Login Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // Verificar si ya está autenticado
  if (Storage.getToken()) {
    const user = Storage.getUser();
    if (user && user.role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'dashboard.html';
    }
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('loginButton');
  const errorMessage = document.getElementById('errorMessage');
  const togglePassword = document.getElementById('togglePassword');

  // Toggle password visibility
  togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
  });

  // Handle form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    hideError();

    try {
      const response = await API.post('/auth/login', { username, password });

      if (response.success) {
        Storage.setToken(response.token);
        Storage.setUser(response.user);

        // Redirigir según el rol
        if (response.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      } else {
        showError(response.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      showError(error.message || 'Error de conexión. Verifica que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  });

  function setLoading(loading) {
    loginButton.disabled = loading;
    const btnText = loginButton.querySelector('.btn-text');
    const btnLoader = loginButton.querySelector('.btn-loader');

    if (loading) {
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
    } else {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  function hideError() {
    errorMessage.classList.add('hidden');
  }
});
