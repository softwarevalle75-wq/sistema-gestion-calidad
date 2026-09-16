/**
 * Servicio para gestionar las migraciones de base de datos.
 */

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';

const API_URL = `${API_BASE_URL.replace(/\/v1$/, '')}/migraciones`;

export interface MigracionInfo {
    revision: string;
    down_revision: string | null;
    descripcion: string;
    fecha_creacion: string | null;
    aplicada: boolean;
    fecha_aplicacion: string | null;
}

export interface MigracionEstadoActual {
    revision_actual: string | null;
    descripcion: string | null;
    total_migraciones: number;
    migraciones_aplicadas: number;
    migraciones_pendientes: number;
    ultima_actualizacion: string;
}

export interface MigracionListaResponse {
    migraciones: MigracionInfo[];
    estado: MigracionEstadoActual;
}

export interface MigracionOperacionRequest {
    target: string;
}

export interface MigracionOperacionResponse {
    success: boolean;
    message: string;
    revision_anterior: string | null;
    revision_nueva: string | null;
    output: string | null;
}

/**
 * Obtiene el token de autenticación del localStorage
 */
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };
};

export const migracionService = {
    /**
     * Lista todas las migraciones disponibles y su estado
     */
    listarMigraciones: async (): Promise<MigracionListaResponse> => {
        try {
            const response = await axios.get<MigracionListaResponse>(
                `${API_URL}/`,
                getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Error al listar migraciones:', error);
            throw error;
        }
    },

    /**
     * Obtiene el estado actual de las migraciones
     */
    obtenerEstadoActual: async (): Promise<MigracionEstadoActual> => {
        try {
            const response = await axios.get<MigracionEstadoActual>(
                `${API_URL}/current`,
                getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Error al obtener estado actual:', error);
            throw error;
        }
    },

    /**
     * Obtiene el historial de migraciones
     */
    obtenerHistorial: async (): Promise<{ historial: string; timestamp: string }> => {
        try {
            const response = await axios.get(
                `${API_URL}/history`,
                getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Error al obtener historial:', error);
            throw error;
        }
    },

    /**
     * Aplica migraciones hasta la revisión especificada
     * @param target - Revisión objetivo o 'head' para aplicar todas
     */
    aplicarMigraciones: async (
        target: string = 'head'
    ): Promise<MigracionOperacionResponse> => {
        try {
            const response = await axios.post<MigracionOperacionResponse>(
                `${API_URL}/upgrade`,
                { target },
                getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Error al aplicar migraciones:', error);
            throw error;
        }
    },

    /**
     * Revierte migraciones hasta la revisión especificada
     * @param target - Revisión objetivo o '-1' para revertir una migración
     */
    revertirMigraciones: async (
        target: string
    ): Promise<MigracionOperacionResponse> => {
        try {
            const response = await axios.post<MigracionOperacionResponse>(
                `${API_URL}/downgrade`,
                { target },
                getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Error al revertir migraciones:', error);
            throw error;
        }
    },
};
