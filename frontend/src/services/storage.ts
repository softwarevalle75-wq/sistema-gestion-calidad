import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/api";

const BUCKET_NAME = "imagenes";

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Sube una imagen de perfil a Supabase Storage
 * @param file - Archivo de imagen a subir
 * @param userId - ID del usuario (se usará para nombrar el archivo)
 * @returns URL pública de la imagen subida
 */
export async function uploadProfileImage(
  file: File,
  userId: string,
): Promise<UploadResult> {
  try {
    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      throw new Error("El archivo debe ser una imagen");
    }

    if (!supabase) {
      throw new Error("Supabase no está configurado");
    }

    // Validar tamaño máximo (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("La imagen no debe superar los 5MB");
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true, // Sobrescribir si ya existe
      });

    if (error) {
      console.error("Error al subir imagen:", error);
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error("Error en uploadProfileImage:", error);
    throw error;
  }
}

/**
 * Elimina una imagen de perfil de Supabase Storage
 * @param filePath - Ruta del archivo a eliminar
 */
export async function deleteProfileImage(filePath: string): Promise<void> {
  try {
    if (!supabase) {
      throw new Error("Supabase no está configurado");
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Error al eliminar imagen:", error);
      throw new Error(`Error al eliminar la imagen: ${error.message}`);
    }
  } catch (error) {
    console.error("Error en deleteProfileImage:", error);
    throw error;
  }
}

/**
 * Obtiene la URL pública de una imagen de perfil
 * @param filePath - Ruta del archivo
 * @returns URL pública de la imagen
 */
export function getProfileImageUrl(filePath: string): string {
  if (!supabase) return "";
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Verifica si el bucket de imágenes de perfil existe, si no, lo crea
 */
export async function ensureProfileImagesBucket(): Promise<void> {
  try {
    if (!supabase) return;

    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error("Error al listar buckets:", listError);
      return;
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(
        BUCKET_NAME,
        {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/gif",
          ],
        },
      );

      if (createError) {
        console.error("Error al crear bucket:", createError);
      } else {
        console.log('Bucket "imagenes" creado exitosamente');
      }
    }
  } catch (error) {
    console.error("Error en ensureProfileImagesBucket:", error);
  }
}

/**
 * Sube el logo del sistema a Supabase Storage
 * @param file - Archivo de imagen a subir
 * @returns URL pública de la imagen subida
 */
export async function uploadSystemLogo(file: File): Promise<string> {
  try {
    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      throw new Error("El archivo debe ser una imagen");
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("La imagen no debe superar los 5MB");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post("/uploads/logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.url;
  } catch (error) {
    console.error("Error en uploadSystemLogo:", error);
    throw error;
  }
}
