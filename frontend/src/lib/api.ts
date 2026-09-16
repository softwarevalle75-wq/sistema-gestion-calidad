/**
 * Cliente API centralizado para comunicación con el backend FastAPI
 */
import axios, { AxiosInstance, AxiosError } from "axios";

// Configuración base de la API
const rawBase = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
export const API_BASE_URL = rawBase.endsWith("/api/v1") ? rawBase : rawBase.replace(/\/+$/, '') + "/api/v1";

// Debug: mostrar la URL base en la consola del navegador (útil en dev)
if (import.meta.env.DEV) {
  console.info("🔧 API_BASE_URL:", API_BASE_URL);
}

const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || "30000");

/**
 * Instancia de axios configurada
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Interceptor para agregar el token JWT a todas las peticiones
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Axios 1.x: hay que borrar Content-Type para que el navegador ponga el boundary.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const headers = config.headers as any;
      if (headers && typeof headers.delete === "function") {
        headers.delete("Content-Type");
      } else if (headers) {
        delete headers["Content-Type"];
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor para manejar errores de respuesta
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Si el error es 401 (no autorizado), limpiar sesión y redirigir a login
    const requestUrl = String(error.config?.url || "");
    const isLoginFlow = /\/auth\/login/.test(requestUrl);
    if (error.response?.status === 401 && !isLoginFlow) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    // Extraer mensaje de error de la respuesta de FastAPI
    const rawDetail = (error.response?.data as any)?.detail;
    let errorMessage: string | null = null;
    if (typeof rawDetail === "string") {
      errorMessage = rawDetail;
    } else if (Array.isArray(rawDetail)) {
      errorMessage = rawDetail
        .map((item: any) => item?.msg || item?.detail || (typeof item === "string" ? item : null))
        .filter(Boolean)
        .join("; ");
    }

    if (!errorMessage) {
      errorMessage = error.message || "Error desconocido";
    }

    if (
      error.code === "ECONNABORTED" ||
      /timeout of \d+ms exceeded/i.test(String(error.message || errorMessage))
    ) {
      errorMessage =
        "El servidor tardó demasiado. Si ya le llegó el código, úselo; si no, espere un momento e inténtelo de nuevo.";
    }

    if (!error.response && /network error|err_network|failed to fetch|networkerror/i.test(String(error.message))) {
      errorMessage = "No se pudo conectar con el servidor. Verifique su conexión e inténtelo de nuevo.";
    }

    const errorObj = new Error(errorMessage) as any;
    errorObj.response = error.response;
    return Promise.reject(errorObj);
  }
);

/**
 * Tipos de respuesta comunes
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/**
 * Utilidad para manejar errores de API
 */
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Error desconocido";
};

/**
 * Exportar cliente por defecto
 */
export default apiClient;
