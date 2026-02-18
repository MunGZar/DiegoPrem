-- ============================================
-- DiegoPrem Database Schema
-- Sistema de gestión de códigos de streaming
-- ============================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS diegoprem
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE diegoprem;

-- ============================================
-- Tabla de Usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla de Correos Electrónicos
-- ============================================
CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_address VARCHAR(255) UNIQUE NOT NULL,
    imap_password VARCHAR(255) NOT NULL,
    imap_host VARCHAR(100) NOT NULL,
    imap_port INT DEFAULT 993,
    platform_name VARCHAR(100) NOT NULL,
    platform_logo VARCHAR(500) NULL,
    active BOOLEAN DEFAULT TRUE,
    last_checked TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_platform (platform_name),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla de Mensajes
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_id INT NOT NULL,
    subject VARCHAR(500) NULL,
    sender VARCHAR(255) NULL,
    recipient VARCHAR(255) NULL,
    content TEXT NOT NULL,
    extracted_code VARCHAR(50) NULL,
    received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    INDEX idx_email_id (email_id),
    INDEX idx_received_at (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Datos iniciales
-- ============================================

-- Usuario administrador por defecto
-- Usuario: admin
-- Contraseña: Admin123!
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$A2CMt0CY.UrDnNBYW8DidudMKxw3tCPF9SSjTxVCe55WBnV0Kwxz2', 'admin');

-- Usuario normal de ejemplo
-- Usuario: user
-- Contraseña: User123!
INSERT INTO users (username, password_hash, role) VALUES
('user', '$2b$10$A2CMt0CY.UrDnNBYW8DidudMKxw3tCPF9SSjTxVCe55WBnV0Kwxz2', 'user');

-- Correos de ejemplo para plataformas de streaming
INSERT INTO emails (email_address, imap_password, imap_host, platform_name, platform_logo) VALUES
('netflix@example.com', 'encrypted_password', 'imap.gmail.com', 'Netflix', 'https://cdn.worldvectorlogo.com/logos/netflix-3.svg'),
('hbo@example.com', 'encrypted_password', 'imap.gmail.com', 'HBO Max', 'https://cdn.worldvectorlogo.com/logos/hbo-max-1.svg'),
('prime@example.com', 'encrypted_password', 'imap.gmail.com', 'Prime Video', 'https://cdn.worldvectorlogo.com/logos/amazon-prime-video.svg'),
('disney@example.com', 'encrypted_password', 'imap.gmail.com', 'Disney+', 'https://cdn.worldvectorlogo.com/logos/disney-plus.svg'),
('star@example.com', 'encrypted_password', 'imap.gmail.com', 'Star+', 'https://cdn.worldvectorlogo.com/logos/star-logo.svg');

-- ============================================
-- Vistas útiles
-- ============================================

-- Vista para obtener el último mensaje por plataforma
CREATE OR REPLACE VIEW latest_messages AS
SELECT 
    e.id AS email_id,
    e.platform_name,
    e.platform_logo,
    e.email_address,
    m.id AS message_id,
    m.subject,
    m.sender,
    m.content,
    m.extracted_code,
    m.received_at
FROM emails e
LEFT JOIN messages m ON e.id = m.email_id
WHERE m.id = (
    SELECT id 
    FROM messages 
    WHERE email_id = e.id 
    ORDER BY received_at DESC 
    LIMIT 1
)
AND e.active = TRUE
ORDER BY e.platform_name;

-- Vista para estadísticas del sistema
CREATE OR REPLACE VIEW system_stats AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE active = TRUE) AS total_users,
    (SELECT COUNT(*) FROM emails WHERE active = TRUE) AS total_emails,
    (SELECT COUNT(*) FROM messages) AS total_messages,
    (SELECT COUNT(*) FROM emails WHERE active = TRUE AND last_checked IS NOT NULL) AS emails_checked,
    (SELECT MAX(received_at) FROM messages) AS last_message_received;
