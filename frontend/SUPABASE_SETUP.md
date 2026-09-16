# Configuración de Supabase para Imágenes de Perfil

## 📋 Requisitos Previos

1. Cuenta en [Supabase](https://supabase.com)
2. Proyecto creado en Supabase

## 🔧 Configuración

### 1. Obtener las credenciales de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, ve a **Settings** → **API**
3. Copia las siguientes credenciales:
   - **Project URL** (ejemplo: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (clave pública anónima)

### 2. Configurar variables de entorno

Edita el archivo `frontend/.env.local` y reemplaza los valores:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_key_aqui
```

### 3. Crear el bucket de almacenamiento

El código creará automáticamente el bucket `profile-images` la primera vez que intentes subir una imagen, pero también puedes crearlo manualmente:

1. Ve a **Storage** en el menú lateral de Supabase
2. Click en **New bucket**
3. Configuración:
   - **Name**: `profile-images`
   - **Public bucket**: ✅ Activado
   - **File size limit**: 5242880 (5MB)
   - **Allowed MIME types**: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/gif`

### 4. Configurar políticas de seguridad (RLS)

Para permitir que los usuarios suban y accedan a las imágenes, necesitas configurar las políticas de Row Level Security:

1. Ve a **Storage** → **Policies** → **profile-images**
2. Crea las siguientes políticas:

#### Política 1: Permitir subir imágenes (INSERT)
```sql
CREATE POLICY "Usuarios pueden subir sus propias imágenes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'profile-images');
```

#### Política 2: Permitir ver imágenes (SELECT)
```sql
CREATE POLICY "Cualquiera puede ver imágenes de perfil"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
```

#### Política 3: Permitir actualizar imágenes (UPDATE)
```sql
CREATE POLICY "Usuarios pueden actualizar sus propias imágenes"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'profile-images')
WITH CHECK (bucket_id = 'profile-images');
```

#### Política 4: Permitir eliminar imágenes (DELETE)
```sql
CREATE POLICY "Usuarios pueden eliminar sus propias imágenes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'profile-images');
```

### 5. Configuración de CORS (opcional)

Si tienes problemas de CORS, asegúrate de que tu dominio esté permitido en:

**Settings** → **API** → **CORS Allowed Origins**

Agrega:
- `http://localhost:5173` (desarrollo)
- Tu dominio de producción

## 🚀 Uso

### Subir imagen de perfil

El componente `Perfil.tsx` ya está configurado para:

1. ✅ Validar que el archivo sea una imagen
2. ✅ Validar tamaño máximo de 5MB
3. ✅ Subir la imagen a Supabase Storage
4. ✅ Eliminar la imagen anterior automáticamente
5. ✅ Actualizar la URL en la base de datos
6. ✅ Mostrar preview antes de guardar
7. ✅ Indicador de carga durante la subida

### Estructura de almacenamiento

Las imágenes se guardan con la siguiente estructura:

```
profile-images/
  └── {usuarioId}/
      └── {usuarioId}-{timestamp}.{ext}
```

Ejemplo:
```
profile-images/
  └── 123/
      └── 123-1738123456789.jpg
```

## 🔒 Seguridad

- ✅ Validación de tipo de archivo (solo imágenes)
- ✅ Validación de tamaño máximo (5MB)
- ✅ Bucket público para acceso rápido
- ✅ Eliminación automática de imágenes antiguas
- ✅ Nombres únicos con timestamp

## 📝 Notas Importantes

1. **Primera vez**: La primera vez que subas una imagen, el sistema intentará crear el bucket automáticamente
2. **Política de privacidad**: Las imágenes son públicas por defecto (cualquiera con el link puede verlas)
3. **Límites de Supabase**: 
   - Plan gratuito: 1GB de almacenamiento
   - Plan Pro: 100GB de almacenamiento
4. **CDN**: Supabase usa CDN global, las imágenes se cargan rápido desde cualquier ubicación

## 🐛 Troubleshooting

### Error: "Bucket not found"
- Verifica que el bucket `profile-images` exista
- Verifica las variables de entorno

### Error: "Permission denied"
- Revisa las políticas RLS del bucket
- Asegúrate de que el bucket sea público

### Error: "CORS error"
- Agrega tu dominio a CORS Allowed Origins en Supabase

### La imagen no se muestra
- Verifica que la URL generada sea correcta
- Verifica que el bucket sea público
- Revisa la consola del navegador para errores

## 🔄 Migración de imágenes existentes

Si ya tienes imágenes en tu servidor local, puedes migrarlas manualmente:

1. Descarga las imágenes del servidor
2. Súbelas al bucket `profile-images` usando el panel de Supabase
3. Actualiza las URLs en la base de datos:

```sql
UPDATE usuarios 
SET foto_url = 'https://tu-proyecto.supabase.co/storage/v1/object/public/profile-images/...'
WHERE id = '...';
```

## 📚 Recursos

- [Documentación de Supabase Storage](https://supabase.com/docs/guides/storage)
- [Políticas de Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Límites de Supabase](https://supabase.com/docs/guides/platform/limits)
