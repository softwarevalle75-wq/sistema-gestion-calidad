import * as XLSX from 'xlsx';
import { AccionCorrectiva } from '@/services/accionCorrectiva.service';

/**
 * Exporta un array de acciones correctivas a un archivo Excel
 */
export const exportarAccionesAExcel = (acciones: AccionCorrectiva[], nombreArchivo: string = 'acciones_correctivas') => {
    // Preparar datos para exportación
    const datosExcel = acciones.map(accion => ({
        'Código': accion.codigo,
        'Tipo': accion.tipo || '',
        'Descripción': accion.descripcion || '',
        'Estado': accion.estado,
        'Responsable': accion.responsable
            ? `${accion.responsable.nombre} ${accion.responsable.primerApellido || ''}`.trim()
            : '',
        'Implementado Por': accion.implementador
            ? `${accion.implementador.nombre} ${accion.implementador.primerApellido || ''}`.trim()
            : '',
        'Verificado Por': accion.verificador
            ? `${accion.verificador.nombre} ${accion.verificador.primerApellido || ''}`.trim()
            : '',
        'Fecha Compromiso': accion.fechaCompromiso
            ? new Date(accion.fechaCompromiso).toLocaleDateString('es-CO')
            : '',
        'Fecha Implementación': accion.fechaImplementacion
            ? new Date(accion.fechaImplementacion).toLocaleDateString('es-CO')
            : '',
        'Fecha Verificación': accion.fechaVerificacion
            ? new Date(accion.fechaVerificacion).toLocaleDateString('es-CO')
            : '',
        'Eficacia Verificada': accion.eficaciaVerificada || '',
        'Observación': accion.observacion || '',
        'Creado': new Date(accion.creadoEn).toLocaleDateString('es-CO'),
    }));

    // Crear hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar ancho de columnas
    const columnWidths = [
        { wch: 15 }, // Código
        { wch: 12 }, // Tipo
        { wch: 40 }, // Descripción
        { wch: 15 }, // Estado
        { wch: 25 }, // Responsable
        { wch: 25 }, // Implementado Por
        { wch: 25 }, // Verificado Por
        { wch: 18 }, // Fecha Compromiso
        { wch: 20 }, // Fecha Implementación
        { wch: 20 }, // Fecha Verificación
        { wch: 18 }, // Eficacia Verificada
        { wch: 30 }, // Observación
        { wch: 15 }, // Creado
    ];
    ws['!cols'] = columnWidths;

    // Crear libro de trabajod
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Acciones Correctivas');

    // Generar archivo
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${nombreArchivo}_${fecha}.xlsx`);
};

/**
 * Exporta datos genéricos a Excel
 */
export const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filename}_${fecha}.xlsx`);
};
