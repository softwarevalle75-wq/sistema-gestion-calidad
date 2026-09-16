
import apiClient from "../lib/api";

export interface ReportItem {
    id: string;
    codigo?: string;
    title: string;
    category: string;
    date: string;
    status: string;
    format?: string;
    description?: string;
    size?: string;
}

const triggerBlobDownload = (data: BlobPart, filename: string) => {
    const blob = new Blob([data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const reportsService = {
    downloadAuditoriaReport: async (id: string, codigo: string) => {
        try {
            const response = await apiClient.get(`/reportes/auditorias/${id}/pdf`, {
                responseType: 'blob'
            });

            triggerBlobDownload(response.data, `auditoria_${codigo}.pdf`);
        } catch (error) {
            console.error("Error downloading report:", error);
            throw error;
        }
    },

    downloadNCReport: async (estado?: string) => {
        try {
            const params = estado ? { estado } : {};
            const response = await apiClient.get(`/reportes/noconformidades/pdf`, {
                params,
                responseType: 'blob'
            });

            triggerBlobDownload(
                response.data,
                `reporte_noconformidades_${new Date().getFullYear()}.pdf`
            );
        } catch (error) {
            console.error("Error downloading report:", error);
            throw error;
        }
    },

    getAvailableReports: async (): Promise<ReportItem[]> => {
        const response = await apiClient.get("/reportes/list");
        return response.data;
    }
};
