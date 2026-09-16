import { apiClient } from "@/lib/api";

export const DOMINIOS_INSTITUCIONALES_DEFAULT = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
];

let dominiosCache: string[] | null = null;

export function dominiosInstitucionales(): string[] {
  return dominiosCache ?? DOMINIOS_INSTITUCIONALES_DEFAULT;
}

export function esCorreoInstitucional(
  email: string,
  dominios: string[] = dominiosInstitucionales(),
): boolean {
  const dominio = email.trim().toLowerCase().split("@")[1];
  if (!dominio) return false;
  return dominios.some((item) => item.toLowerCase() === dominio);
}

export function mensajeCorreoInstitucional(
  dominios: string[] = dominiosInstitucionales(),
): string {
  const lista = dominios.map((item) => `@${item}`).join(", ");
  return `Debe usar un correo de Gmail o Outlook (${lista})`;
}

export async function cargarDominiosInstitucionales(): Promise<string[]> {
  try {
    const { data } = await apiClient.get("/auth/politica-acceso");
    if (Array.isArray(data?.dominios_institucionales) && data.dominios_institucionales.length) {
      dominiosCache = data.dominios_institucionales;
    }
  } catch {
    // Conserva los dominios por defecto si el backend no responde
  }
  return dominiosInstitucionales();
}
