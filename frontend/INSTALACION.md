# 📋 Guía de Instalación - Sistema de Gestión de Calidad

Esta guía te ayudará a configurar el proyecto completo en un nuevo PC.

## 📦 Requisitos Previos

### Software Necesario

1. **Python 3.11 o superior**
   - Descargar de: https://www.python.org/downloads/
   - Durante la instalación, marcar "Add Python to PATH"

2. **Node.js 22.0.0 o superior**
   - Descargar de: https://nodejs.org/
   - Recomendado: Usar la versión LTS (Long Term Support)

3. **PostgreSQL 14 o superior**
   - Descargar de: https://www.postgresql.org/download/
   - Durante la instalación, recordar la contraseña del usuario `postgres`

4. **Git** (opcional, para clonar el repositorio)
   - Descargar de: https://git-scm.com/downloads

5. **Editor de Código** (recomendado)
   - Visual Studio Code: https://code.visualstudio.com/

---

## 🚀 Instalación Paso a Paso

### 1. Clonar o Descargar el Proyecto

```bash
# Si usas Git
git clone <url-del-repositorio>
cd "gestion de calidad"

# Encontrarás dos subdirectorios principales:
# - backend-fastapi/  (API REST, Python, FastAPI)
# - front-react/      (Frontend SPA, React, TypeScript, Vite)
```

> 💡 **¿Buscas desplegar en producción (Vercel + Render + Cloud DB)?** Consulta la [Guía de Despliegue en Producción](DESPLIEGUE.md).

---

### 2. Configurar el Backend (FastAPI + PostgreSQL)

#### 2.1. Crear Base de Datos PostgreSQL

```bash
# Abrir terminal de PostgreSQL (psql)
   psql -U postgres

# Dentro de psql, ejecutar:
CREATE DATABASE calidad_db;
CREATE USER calidad_user WITH PASSWORD 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON DATABASE calidad_db TO calidad_user;
\q
```

#### 2.2. Configurar Variables de Entorno

Crear archivo `.env` en la carpeta `backend-fastapi/`:

```bash
cd backend-fastapi
```

Crear archivo `.env` con el siguiente contenido:

```env
# Configuración de la aplicación
APP_NAME="Sistema de Gestión de Calidad"
APP_VERSION="1.0.0"
ENVIRONMENT=development

# Base de datos PostgreSQL
DATABASE_URL=postgresql://calidad_user:tu_contraseña_segura@localhost:5432/calidad_db

# Seguridad JWT
SECRET_KEY=tu_clave_secreta_muy_larga_y_segura_aqui_cambiar_en_produccion
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS (Frontend URL)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

> **⚠️ IMPORTANTE**: Cambiar `tu_contraseña_segura` y `SECRET_KEY` por valores reales y seguros.

#### 2.3. Crear Entorno Virtual de Python

```bash
# En la carpeta backend-fastapi/
python -m venv venv

# Activar el entorno virtual
# En Windows:
venv\Scripts\activate

# En Linux/Mac:
source venv/bin/activate
```

#### 2.4. Instalar Dependencias de Python

```bash
# Con el entorno virtual activado
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2.5. Crear las Tablas en la Base de Datos

```bash
# Ejecutar el script de inicialización
python -m app.db.init_db
```

#### 2.6. (Opcional) Cargar Datos de Prueba

```bash
# Crear usuarios de prueba
python -m app.db.create_users

# Cargar datos de ejemplo
python -m app.db.seed_data
```

---

### 3. Configurar el Frontend (React + Vite)

#### 3.1. Instalar Dependencias de Node.js

```bash
# Ir a la carpeta del frontend
cd ../front-react

# Instalar dependencias
npm install
```

#### 3.2. Configurar Variables de Entorno del Frontend

Crear archivo `.env` en la carpeta `front-react/`:

```env
# URL del backend (asegúrate que termine en /api/v1)
VITE_API_URL=http://localhost:8000/api/v1

# Supabase (para almacenamiento de archivos) - Opcional
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_key
```

> **📝 Nota**: Si no usas Supabase, puedes dejar estos valores vacíos.

---

## ▶️ Ejecutar el Proyecto

### Opción 1: Ejecutar Backend y Frontend por Separado

#### Terminal 1 - Backend:

```bash
cd backend-fastapi
source venv/bin/activate  # En Windows: venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El backend estará disponible en: http://localhost:8000
- Documentación API: http://localhost:8000/docs

#### Terminal 2 - Frontend:

```bash
cd front-react
npm run dev
```

El frontend estará disponible en: http://localhost:5173

---

### Opción 2: Usar Scripts de Inicio (Recomendado)

Puedes crear scripts para facilitar el inicio:

#### Windows - `start.bat`:

```batch
@echo off
echo Iniciando Backend...
start cmd /k "cd backend-fastapi && venv\Scripts\activate && uvicorn app.main:app --reload"

echo Iniciando Frontend...
start cmd /k "cd front-react && npm run dev"

echo Sistema iniciado!
```

#### Linux/Mac - `start.sh`:

```bash
#!/bin/bash

# Iniciar backend en segundo plano
cd backend-fastapi
source venv/bin/activate
uvicorn app.main:app --reload &
BACKEND_PID=$!

# Iniciar frontend
cd ../front-react
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Sistema iniciado!"

# Esperar a que terminen
wait
```

---

## 👤 Usuarios de Prueba

Si ejecutaste el script `create_users.py`, tendrás estos usuarios:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin@empresa.com | admin123 | Administrador |
| calidad@empresa.com | calidad123 | Coordinador de Calidad |
| usuario@empresa.com | usuario123 | Usuario Regular |

---

## 🔧 Solución de Problemas Comunes

### Error: "No module named 'app'"

```bash
# Asegúrate de estar en la carpeta backend-fastapi/ y tener el entorno virtual activado
cd backend-fastapi
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### Error: "Connection refused" al conectar a PostgreSQL

- Verificar que PostgreSQL esté corriendo
- Verificar las credenciales en el archivo `.env`
- Verificar el puerto (por defecto 5432)

### Error: "Port 8000 already in use"

```bash
# En Linux/Mac
lsof -ti:8000 | xargs kill -9

# En Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Error: "npm install" falla

```bash
# Limpiar caché de npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Estructura del Proyecto

```
gestion de calidad/
├── backend-fastapi/         # Backend (FastAPI)
│   ├── app/
│   │   ├── api/            # Endpoints de la API
│   │   ├── models/         # Modelos de base de datos
│   │   ├── schemas/        # Schemas Pydantic
│   │   ├── db/             # Configuración de BD
│   │   └── main.py         # Aplicación principal
│   ├── venv/               # Entorno virtual Python
│   ├── requirements.txt    # Dependencias Python
│   └── .env                # Variables de entorno
│
└── front-react/             # Frontend (React + Vite)
    ├── src/
    │   ├── components/     # Componentes React
    │   ├── pages/          # Páginas
    │   ├── services/       # Servicios API
    │   └── lib/            # Utilidades
    ├── package.json        # Dependencias Node.js
    └── .env                # Variables de entorno
```

---

## 🔒 Seguridad en Producción

Antes de desplegar en producción:

1. ✅ Cambiar `SECRET_KEY` en `.env` del backend
2. ✅ Usar contraseñas seguras para la base de datos
3. ✅ Configurar `ENVIRONMENT=production`
4. ✅ Actualizar `CORS_ORIGINS` con la URL real del frontend
5. ✅ Usar HTTPS en producción
6. ✅ Configurar firewall y límites de rate limiting

---

## 📞 Soporte

Si encuentras problemas durante la instalación:

1. Verifica que todos los requisitos previos estén instalados
2. Revisa los logs de error en la terminal
3. Consulta la documentación de FastAPI: https://fastapi.tiangolo.com/
4. Consulta la documentación de Vite: https://vitejs.dev/

---

## 📝 Notas Adicionales

- **Desarrollo**: Usa `npm run dev` para el frontend y `uvicorn --reload` para el backend
- **Producción**: Usa `npm run build` para compilar el frontend y `uvicorn` sin `--reload`
- **Base de Datos**: Haz backups regulares de PostgreSQL
- **Actualizaciones**: Mantén las dependencias actualizadas con `pip list --outdated` y `npm outdated`

---

¡Listo! El sistema debería estar funcionando correctamente. 🎉
