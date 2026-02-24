#!/bin/bash

# DiegoPrem - Script de Instalación Automática

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║                  🎬 DIEGOPREM - SETUP 🎬                     ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar requisitos
echo -e "${YELLOW}Verificando requisitos...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "Instala Node.js desde: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ MySQL no está instalado${NC}"
    echo "Instala MySQL desde: https://dev.mysql.com/downloads/"
    exit 1
fi
echo -e "${GREEN}✅ MySQL instalado${NC}"

echo ""
echo -e "${YELLOW}Configurando Backend...${NC}"

# Instalar dependencias del backend
cd backend
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
else
    echo -e "${RED}❌ Error instalando dependencias${NC}"
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Archivo .env creado${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANTE: Edita backend/.env con tus credenciales de MySQL${NC}"
else
    echo -e "${YELLOW}⚠️  El archivo .env ya existe${NC}"
fi

cd ..

echo ""
echo -e "${YELLOW}Configurando Base de Datos...${NC}"
echo -e "${YELLOW}Ingresa tu contraseña de MySQL root:${NC}"

# Crear base de datos
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS diegoprem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Base de datos creada${NC}"
    
    # Importar esquema
    mysql -u root -p diegoprem < database/schema.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Esquema importado${NC}"
    else
        echo -e "${RED}❌ Error importando esquema${NC}"
    fi
else
    echo -e "${RED}❌ Error creando base de datos${NC}"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║                  ✅ INSTALACIÓN COMPLETADA                   ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo ""
echo "1. Edita backend/.env con tu contraseña de MySQL"
echo "2. Genera contraseñas hasheadas:"
echo "   cd backend && node generate-passwords.js"
echo ""
echo "3. Actualiza database/schema.sql con los hashes generados"
echo ""
echo "4. Inicia el backend:"
echo "   cd backend && npm start"
echo ""
echo "5. En otra terminal, inicia el frontend:"
echo "   cd frontend && python -m http.server 8080"
echo ""
echo "6. Abre tu navegador en:"
echo "   http://localhost:8080/login.html"
echo ""
echo -e "${GREEN}Usuario admin: admin / Admin123!${NC}"
echo -e "${GREEN}Usuario normal: user / User123!${NC}"
echo ""
echo "📖 Documentación completa: docs/README.md"
echo ""
