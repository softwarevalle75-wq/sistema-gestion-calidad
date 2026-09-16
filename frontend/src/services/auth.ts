import apiClient, { API_BASE_URL } from "@/lib/api";

export interface LoginData {
  nombre_usuario: string;
  password: string;
}

export interface UsuarioSesion {
  id: string;
  nombre_usuario: string;
  email: string;
  nombre_completo: string;
  cargo?: string;
  activo: boolean;
  foto_url?: string;
  permisos: string[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  usuario: UsuarioSesion;
  requiere_otp?: boolean;
}

export interface LoginResponse {
  access_token?: string | null;
  token_type?: string;
  usuario?: UsuarioSesion | null;
  requiere_otp?: boolean;
  otp_token?: string | null;
  mensaje?: string | null;
  correo_enmascarado?: string | null;
}

function guardarSesion(result: { access_token?: string | null; usuario?: UsuarioSesion | null }) {
  if (result.access_token && result.usuario) {
    localStorage.setItem("token", result.access_token);
    localStorage.setItem("user", JSON.stringify(result.usuario));
  }
}

export async function login(data: LoginData): Promise<LoginResponse> {
  try {
    try {
      console.info("🔧 Request URL:", (apiClient.defaults.baseURL || API_BASE_URL) + "/auth/login");
    } catch {}

    const response = await apiClient.post<LoginResponse>("/auth/login", data, {
      timeout: 60000,
    });
    const result = response.data;

    if (result.access_token && !result.requiere_otp) {
      guardarSesion(result);
    }
    return result;
  } catch (error) {
    console.error("Error en login:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Error desconocido");
  }
}

export async function verificarOtp(otpToken: string, codigo: string): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/auth/login/verificar-otp", {
    otp_token: otpToken,
    codigo,
  });
  const result = response.data;
  guardarSesion(result);
  return result;
}

export async function reenviarOtp(otpToken: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login/reenviar-otp", {
    otp_token: otpToken,
  });
  return response.data;
}

export async function logout() {
  try {
    await apiClient.post("/auth/logout");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return { message: "Sesión cerrada exitosamente" };
  } catch (error) {
    console.error("Error en logout:", error);

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Error desconocido");
  }
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getCurrentUser() {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export async function refreshCurrentUserSession() {
  const stored = getCurrentUser();
  const response = await apiClient.get("/auth/me");
  const data = response.data || {};
  const merged = {
    ...stored,
    ...data,
    email: data.correo_electronico || stored?.email,
    nombre_completo: data.nombre_completo || stored?.nombre_completo,
    permisos: Array.isArray(data.permisos) ? data.permisos : stored?.permisos || [],
  };
  localStorage.setItem("user", JSON.stringify(merged));
  return merged;
}

export function isAuthenticated(): boolean {
  const token = getToken();
  return token !== null && token !== "";
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
