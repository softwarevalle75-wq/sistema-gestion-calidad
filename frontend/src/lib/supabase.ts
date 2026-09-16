import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hacer Supabase opcional - solo se usa para storage de archivos
const isSupabaseConfigured = supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "your_supabase_url" &&
  supabaseUrl.startsWith("http");

// Cliente de Supabase (solo si está configurado).
// Se usa para Storage, no para Auth: sin eso el cliente intenta un lock
// Navigator LockManager (lock:sb-...-auth-token) y falla en el login.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        lock: async (_name, _acquireTimeout, fn) => await fn(),
      },
    })
  : null;

/**
 * Sube un archivo a Supabase Storage
 */
export async function uploadFileToSupabase(
  file: Buffer | File,
  filename: string,
  bucket: string = "documentos",
): Promise<{ path: string; url: string }> {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env"
    );
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Error al subir archivo: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: urlData.publicUrl,
    };
  } catch (error: any) {
    throw new Error(`Error en uploadFileToSupabase: ${error.message}`);
  }
}

/**
 * Elimina un archivo de Supabase Storage
 */
export async function deleteFileFromSupabase(
  filePath: string,
  bucket: string = "documentos",
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase no está configurado");
  }

  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  if (error) {
    throw new Error(`Error al eliminar archivo: ${error.message}`);
  }
}

/**
 * Obtiene URL firmada temporal (para archivos privados)
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600,
  bucket: string = "documentos",
): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase no está configurado");
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(`Error al generar URL firmada: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Verifica si Supabase está configurado
 */
export function isSupabaseAvailable(): boolean {
  return isSupabaseConfigured;
}
