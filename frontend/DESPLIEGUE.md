# 🚀 Guía Completa de Despliegue en Producción
## Sistema de Gestión de Calidad (SGC)

Esta guía detalla el procedimiento paso a paso para desplegar el **Sistema de Gestión de Calidad** en un entorno de producción en la nube o en un servidor propio (VPS), cubriendo tanto el Backend (FastAPI), el Frontend (React + Vite), la Base de Datos (PostgreSQL), y los servicios auxiliares (Supabase Storage y Brevo para OTP/Correos).

---

## 📐 1. Arquitectura de Despliegue

```mermaid
graph TD
    A[Usuario Final / Navegador] -->|HTTPS| B[Frontend en Vercel\nReact + Vite + Tailwind]
    B -->|API Requests con JWT| C[Backend en Render\nFastAPI ASGI Python 3.11]
    C -->|SQLAlchemy / Pool| D[(Base de Datos PostgreSQL\nRender Postgres / Neon / Supabase)]
    C -->|HTTPS / API Rest| E[Brevo API\nEnvío de OTP y Notificaciones]
    B -->|Carga / Lectura Directa| F[Supabase Storage\nBucket 'profile-images' & Documentos]
    C -->|Validación / Firmado| F
```

| Componente | Plataforma Recomendada | Repositorio GitHub | Variables Clave |
| :--- | :--- | :--- | :--- |
| **Backend API** | [Render](https://render.com) (Web Service) | `backend-fastapi` | `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `BREVO_API_KEY` |
| **Frontend SPA** | [Vercel](https://vercel.com) | `front-react` | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **Base de Datos** | Render Postgres / Supabase / Neon | — | PostgreSQL v14+ con SSL |
| **Almacenamiento**| [Supabase Storage](https://supabase.com) | — | Bucket `profile-images` (público con RLS) |
| **Correos / OTP** | [Brevo](https://www.brevo.com) (Sendinblue) | — | Envío por API HTTP (los puertos SMTP están bloqueados en Render) |

---

## 🗄️ 2. Paso 1: Configuración de la Base de Datos PostgreSQL

Antes de desplegar el backend, es indispensable contar con una base de datos PostgreSQL accesible vía URL con SSL.

### Opción recomendada: Render PostgreSQL o Supabase / Neon
1. En tu panel de **Render** (o **Supabase** / **Neon**):
   - Crear una nueva base de datos PostgreSQL: **New PostgreSQL**.
   - Nombre: `calidad_db_prod` (o el nombre preferido).
   - Región: Seleccionar la misma región donde alojarás el backend (ej. `Ohio (US East)` o `Frankfurt`).
2. Copiar la cadena de conexión externa (**External Database URL**):
   ```text
   postgresql://usuario:password@host-postgres.render.com/nombre_db
   ```
   > ⚠️ **Nota para SQLAlchemy**: Si la URL provista empieza por `postgres://`, SQLAlchemy requiere que sea `postgresql://`. El código del proyecto ya maneja o normaliza este formato, pero asegúrate de utilizar `postgresql://`.

---

## 📦 3. Paso 2: Configuración de Servicios Auxiliares

### A. Supabase Storage (Almacenamiento de Fotos de Perfil y Archivos)
1. Iniciar sesión en [Supabase Dashboard](https://app.supabase.com) y crear o seleccionar el proyecto.
2. Ir a **Storage** → **New bucket**:
   - Nombre del bucket: `profile-images` (y opcionalmente `documentos` o `imagenes`).
   - Marcar: **Public bucket** ✅.
   - File size limit: `5MB` (5242880 bytes).
   - Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/gif`.
3. Configurar las políticas de **Row Level Security (RLS)** en **Storage > Policies**:
   - **SELECT**: Habilitado para rol `public` (lectura pública de fotos de perfil).
   - **INSERT**: Habilitado para usuarios autenticados / public con validación de bucket.
   - **UPDATE** y **DELETE**: Habilitados para el propietario.
4. Obtener las credenciales en **Project Settings > API**:
   - `Project URL` (ej. `https://xxxx.supabase.co`).
   - `anon public key` (clave pública anónima).

### B. Brevo (Envío de Códigos OTP por Correo)
> ⚠️ **Importante**: Render y muchos proveedores Cloud bloquean los puertos SMTP tradicionales (25, 465, 587) para evitar spam. El backend está optimizado para usar la **API REST de Brevo** por HTTPS (puerto 443).

1. Crear una cuenta gratuita en [Brevo](https://www.brevo.com).
2. Ir a **Perfil > SMTP & API > Claves API** y generar una nueva clave API v3 (`xkeysib-...`).
3. En **Remitentes y Direcciones IP**, verificar el correo del remitente (ej. `calidad.iudc@gmail.com` o el correo institucional configurado).
4. Guardar la API Key y el correo remitente para las variables de entorno del backend.

---

## 🐍 4. Paso 3: Despliegue del Backend (FastAPI en Render)

### 4.1. Conectar Repositorio
1. Ir a [Render Dashboard](https://dashboard.render.com).
2. Hacer clic en **New +** → **Web Service**.
3. Vincular con GitHub y seleccionar el repositorio `backend-fastapi` (o `https://github.com/DEDVO20/backend-fastapi.git`).

### 4.2. Configuración del Servicio
- **Name**: `backend-fastapi` (o `calidad-backend`).
- **Region**: Misma región que tu base de datos.
- **Branch**: `main`.
- **Root Directory**: `.` (o dejar vacío si el repo contiene directamente el backend).
- **Runtime**: `Python 3` (o `Docker` si prefieres usar el Dockerfile existente).
- **Build Command**:
  ```bash
  pip install --upgrade pip && pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

### 4.3. Variables de Entorno en Render
En la pestaña **Environment** del Web Service en Render, agregar:

| Variable | Valor de Ejemplo / Descripción |
| :--- | :--- |
| `APP_NAME` | `Sistema de Gestion de Calidad` |
| `APP_VERSION` | `1.0.0` |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | `postgresql://user:password@host:5432/calidad_db?sslmode=require` |
| `SECRET_KEY` | *(Generar un string aleatorio largo y seguro de al menos 64 caracteres)* |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
| `OTP_EXPIRE_MINUTES` | `10` |
| `OTP_MAX_INTENTOS` | `5` |
| `OTP_REENVIO_SEGUNDOS` | `60` |
| `CORREOS_INSTITUCIONALES` | `gmail.com,outlook.com,hotmail.com,live.com` |
| `BREVO_API_KEY` | `xkeysib-tu_clave_brevo_aqui` |
| `BREVO_FROM` | `calidad.iudc@gmail.com` |
| `CORS_ORIGINS` | `https://front-react-puce-three.vercel.app,http://localhost:5173` *(incluir tu dominio final de Vercel)* |
| `SUPABASE_URL` | `https://tu-proyecto.supabase.co` |
| `SUPABASE_KEY` | `tu-supabase-anon-key` |
| `SUPABASE_BUCKET` | `profile-images` |

### 4.4. Inicializar Tablas y Datos de Producción
Una vez que el backend se compile y despliegue con éxito en Render:
1. Entrar a la pestaña **Shell** de tu servicio en Render.
2. Ejecutar la inicialización de base de datos para crear todas las tablas (35 modelos):
   ```bash
   python -m app.db.init_db
   ```
3. *(Opcional)* Si es la primera vez y necesitas sembrar roles, áreas y usuario inicial:
   ```bash
   python -m app.db.seed_data
   ```
4. Probar la salud del backend ingresando a:
   `https://tu-backend.onrender.com/docs`

---

## ⚛️ 5. Paso 4: Despliegue del Frontend (React + Vite en Vercel)

### 5.1. Conectar Repositorio en Vercel
1. Ir a [Vercel Dashboard](https://vercel.com/dashboard).
2. Hacer clic en **Add New...** → **Project**.
3. Importar el repositorio `front-react` (o `https://github.com/DEDVO20/front-react.git`).

### 5.2. Configuración del Proyecto
- **Framework Preset**: `Vite` (Vercel lo detecta automáticamente).
- **Root Directory**: `./` (o `front-react` si está en un monorepo).
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 5.3. Variables de Entorno en Vercel
En la sección **Environment Variables**, definir:

| Variable | Valor |
| :--- | :--- |
| `VITE_API_URL` | `https://tu-backend.onrender.com/api/v1` *(Debe terminar en `/api/v1` y sin barra final)* |
| `VITE_SUPABASE_URL` | `https://tu-proyecto.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `tu-clave-anon-de-supabase` |

### 5.4. Soporte para Single Page Application (SPA Routing)
El proyecto ya cuenta con el archivo `vercel.json` en la raíz de `front-react`:
```json
{
    "rewrites": [
        {
            "source": "/(.*)",
            "destination": "/index.html"
        }
    ]
}
```
Esto garantiza que al recargar páginas como `/procesos`, `/calidad` o `/usuarios`, el servidor web de Vercel siempre sirva `index.html` y no arroje error 404.

5. Hacer clic en **Deploy**. Al finalizar, Vercel asignará una URL como `https://front-react-puce-three.vercel.app`.

---

## 🔄 6. Paso 5: Sincronización y Validación Cruzada

1. **Ajustar CORS en el Backend**:
   - Vuelve a Render → Environment de `backend-fastapi`.
   - Asegúrate de que `CORS_ORIGINS` contenga la URL generada por Vercel:
     ```text
     https://front-react-puce-three.vercel.app,http://localhost:5173
     ```
   - Haz clic en **Save Changes** (esto redeployará automáticamente el backend con los nuevos orígenes permitidos).

2. **Verificación Funcional**:
   - [ ] Abrir el Frontend en el navegador.
   - [ ] Iniciar sesión con el usuario administrador (`admin` o correo correspondiente).
   - [ ] Probar el envío de código OTP y recepción por correo.
   - [ ] Navegar por los módulos: Procesos, Calidad (Indicadores, No Conformidades), Auditorías, Riesgos y Capacitaciones.
   - [ ] Probar la subida de fotos de perfil (validar conexión a Supabase).
   - [ ] Abrir las herramientas de desarrollador (`F12` > Network) para comprobar que todas las peticiones a `/api/v1/...` respondan con código `200` o `201`.

---

## 🐳 7. Opción Alternativa: Despliegue con Docker Compose en VPS (Ubuntu / Debian)

Si prefieres desplegar todo el sistema en un servidor virtual propio (DigitalOcean, AWS EC2, Linode, Hetzner, etc.):

### 7.1. Instalar Docker y Docker Compose
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
sudo usermod -aG docker $USER
```

### 7.2. Configurar el Backend con Docker Compose
En el directorio `backend-fastapi`:
1. Crear el archivo `.env` con las variables de producción:
   ```bash
   cp .env.example .env
   nano .env
   ```
2. Iniciar el stack de contenedores:
   ```bash
   docker compose up -d --build
   ```
3. Inicializar la base de datos dentro del contenedor:
   ```bash
   docker compose exec fastapi-app python -m app.db.init_db
   docker compose exec fastapi-app python -m app.db.seed_data
   ```

### 7.3. Servir Frontend y Configurar Nginx con SSL (Certbot)
1. Compilar el frontend en local o en el VPS:
   ```bash
   cd front-react
   npm install
   npm run build
   ```
   La carpeta `dist/` contendrá los archivos estáticos listos.

2. Configurar Nginx (`/etc/nginx/sites-available/calidad.conf`):
   ```nginx
   server {
       server_name app.tudominio.com;

       # Frontend estático
       location / {
           root /var/www/front-react/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Backend FastAPI Proxy
       location /api/ {
           proxy_pass http://127.0.0.1:8000/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Swagger Docs
       location /docs {
           proxy_pass http://127.0.0.1:8000/docs;
           proxy_set_header Host $host;
       }
       location /openapi.json {
           proxy_pass http://127.0.0.1:8000/openapi.json;
           proxy_set_header Host $host;
       }
   }
   ```
3. Activar el sitio y habilitar certificado SSL gratuito con Certbot:
   ```bash
   sudo ln -s /etc/nginx/sites-available/calidad.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d app.tudominio.com
   ```

---

## 🛠️ 8. Mantenimiento, Migraciones y Troubleshooting

### Actualización de Esquema y Migraciones
Si se agregan nuevos modelos o columnas:
- En desarrollo se puede usar Alembic:
  ```bash
  alembic revision --autogenerate -m "nombre_cambio"
  alembic upgrade head
  ```
- En el servidor de Render, se puede invocar desde la consola Shell:
  ```bash
  alembic upgrade head
  ```

### Solución de Problemas Frecuentes

1. **Error CORS (`Access to XMLHttpRequest has been blocked by CORS policy`)**:
   - Causa: La URL del frontend no está registrada exactamente en la variable `CORS_ORIGINS` del backend.
   - Solución: Revisa que la URL en `CORS_ORIGINS` incluya el protocolo (`https://`), sin barra al final (`/`), separadas por comas si hay varias.
2. **Error 500 al enviar código OTP**:
   - Causa: Falta la API Key de Brevo o el correo remitente no está verificado en Brevo.
   - Solución: Verifica que `BREVO_API_KEY` y `BREVO_FROM` estén correctamente configuradas en Render.
3. **Página en blanco o 404 al recargar rutas en Frontend**:
   - Causa: El servidor web no está redirigiendo todas las rutas a `index.html`.
   - Solución: Verifica que el archivo `vercel.json` esté en la raíz del repositorio de React.
4. **Error de conexión a la Base de Datos (`Is the server running on host...`)**:
   - Causa: La base de datos externa requiere conexión SSL o expiró la instancia gratuita.
   - Solución: Agrega `?sslmode=require` al final de `DATABASE_URL` y verifica en el dashboard de PostgreSQL que el servicio se encuentre activo.

---

¡Tu Sistema de Gestión de Calidad se encuentra listo para operar en producción! 🎉
