import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MetricasDashboard {
    totalAcciones: number;
    enProceso: number;
    implementadas: number;
    verificadas: number;
    cerradas: number;
    vencidas: number;
    porVencer: number;
    tasaCumplimiento: number;
    promedioImplementacion: number;
    porTipo: {
        correctiva: number;
        preventiva: number;
        mejora: number;
    };
}

interface AccionVencida {
    codigo: string;
    descripcion: string;
    fechaCompromiso: string;
    estado: string;
    responsable?: string;
}

/**
 * Exporta el dashboard de acciones correctivas a PDF
 */
export const exportarDashboardAPDF = (
    metricas: MetricasDashboard,
    accionesVencidas: AccionVencida[]
) => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Configuración de colores
    const colorPrimario: [number, number, number] = [37, 99, 235]; // #2563EB
    const colorSecundario: [number, number, number] = [107, 114, 128]; // #6B7280
    const colorAdvertencia: [number, number, number] = [249, 115, 22]; // #F97316
    const colorPeligro: [number, number, number] = [239, 68, 68]; // #EF4444

    // Header
    doc.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Tablero de Acciones Correctivas', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporte generado: ${fecha}`, 105, 30, { align: 'center' });

    let yPos = 50;

    // Sección: Métricas Principales
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Métricas Principales', 14, yPos);
    yPos += 10;

    // Tabla de métricas
    const metricasData = [
        ['Total de Acciones', metricas.totalAcciones.toString()],
        ['En Proceso', metricas.enProceso.toString()],
        ['Implementadas', metricas.implementadas.toString()],
        ['Verificadas', metricas.verificadas.toString()],
        ['Cerradas', metricas.cerradas.toString()],
        ['Tasa de Cumplimiento', `${metricas.tasaCumplimiento}%`],
        ['Tiempo Promedio de Implementación', `${metricas.promedioImplementacion} días`],
    ];

    autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: metricasData,
        theme: 'grid',
        headStyles: {
            fillColor: colorPrimario,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        styles: {
            fontSize: 10,
        },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 60, halign: 'center', fontStyle: 'bold' },
        },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Sección: Alertas
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Alertas y Prioridades', 14, yPos);
    yPos += 10;

    const alertasData = [
        ['Acciones Vencidas', metricas.vencidas.toString()],
        ['Por Vencer (7 días)', metricas.porVencer.toString()],
    ];

    autoTable(doc, {
        startY: yPos,
        head: [['Alerta', 'Cantidad']],
        body: alertasData,
        theme: 'grid',
        headStyles: {
            fillColor: colorAdvertencia,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        styles: {
            fontSize: 10,
        },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 60, halign: 'center', fontStyle: 'bold' },
        },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Sección: Distribución por Tipo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución por Tipo', 14, yPos);
    yPos += 10;

    const tiposData = [
        ['Correctivas', metricas.porTipo.correctiva.toString()],
        ['Preventivas', metricas.porTipo.preventiva.toString()],
        ['Mejora', metricas.porTipo.mejora.toString()],
    ];

    autoTable(doc, {
        startY: yPos,
        head: [['Tipo', 'Cantidad']],
        body: tiposData,
        theme: 'grid',
        headStyles: {
            fillColor: colorSecundario,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        styles: {
            fontSize: 10,
        },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 60, halign: 'center', fontStyle: 'bold' },
        },
    });

    // Nueva página si hay acciones vencidas
    if (accionesVencidas.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colorPeligro[0], colorPeligro[1], colorPeligro[2]);
        doc.text('Acciones Vencidas - Requieren Atención Inmediata', 14, yPos);
        yPos += 10;

        const vencidasData = accionesVencidas.map(accion => [
            accion.codigo,
            accion.descripcion.substring(0, 50) + (accion.descripcion.length > 50 ? '...' : ''),
            new Date(accion.fechaCompromiso).toLocaleDateString('es-CO'),
            accion.estado,
            accion.responsable || 'Sin asignar',
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Código', 'Descripción', 'Fecha Compromiso', 'Estado', 'Responsable']],
            body: vencidasData,
            theme: 'striped',
            headStyles: {
                fillColor: colorPeligro,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            styles: {
                fontSize: 9,
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 70 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 35 },
            },
        });
    }

    // Footer en todas las páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
        doc.text(
            `Página ${i} de ${pageCount}`,
            105,
            290,
            { align: 'center' }
        );
        doc.text(
            'Sistema de Gestión de Calidad',
            14,
            290
        );
    }

    // Guardar PDF
    const fechaArchivo = new Date().toISOString().split('T')[0];
    doc.save(`dashboard_acciones_correctivas_${fechaArchivo}.pdf`);
};
