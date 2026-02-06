/**
 * DiegoPrem - Configuración del Frontend
 */
const CONFIG = {
  API_URL: 'https://games-fax-optimal-morning.trycloudflare.com/api',
  TOKEN_KEY: 'diegoprem_token',
  USER_KEY: 'diegoprem_user'
};

// Utilidades para localStorage
const Storage = {
  setToken(token) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
  },
  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  },
  setUser(user) {
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },
  getUser() {
    const user = localStorage.getItem(CONFIG.USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  clear() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
  }
};

// Cliente API con autenticación
const API = {
  async request(endpoint, options = {}) {
    const token = Storage.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          Storage.clear();
          window.location.href = 'login.html';
        }
        throw new Error(data.message || 'Error en la petición');
      }
      
      return data;
    } catch (error) {
      console.error('Error en API:', error);
      throw error;
    }
  },
  
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// Utilidades de formato
const Utils = {
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  timeAgo(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
      año: 31536000,
      mes: 2592000,
      semana: 604800,
      día: 86400,
      hora: 3600,
      minuto: 60
    };
    
    for (const [name, value] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / value);
      if (interval >= 1) {
        return `Hace ${interval} ${name}${interval > 1 ? (name === 'mes' ? 'es' : 's') : ''}`;
      }
    }
    
    return 'Hace un momento';
  },
  
  copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
  },
  
  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
};