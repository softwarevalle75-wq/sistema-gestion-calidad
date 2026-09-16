import { apiClient } from "@/lib/api";

export interface UploadResponse {
    url: string;
    filename: string;
}

export const uploadService = {
    // Subir un archivo de evidencia
    async uploadEvidencia(file: File): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiClient.post("/uploads/evidencia", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    // Subir el logo del sistema
    async uploadLogo(file: File): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiClient.post("/uploads/logo", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },
};
