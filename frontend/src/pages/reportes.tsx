import React, { useMemo, useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  FileCheck,
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { analyticsService, DashboardMetrics } from "@/services/analytics";
import { ReportItem, reportsService } from "@/services/reports";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CategoryFilter = 'todos' | 'auditorias' | 'noconformidades';
type PeriodFilter = 'semana' | 'mes' | 'trimestre' | 'año';

interface ReportCategoryOption {
  id: CategoryFilter;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  count: number;
}

const PERIOD_DAYS: Record<PeriodFilter, number> = {
  semana: 7,
  mes: 30,
  trimestre: 90,
  año: 365,
};

const STATUS_STYLES: Record<'completado' | 'procesando' | 'error', string> = {
  completado: 'bg-[#ECFDF5] text-[#10B981] border-[#10B981]/20',
  procesando: 'bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]/20',
  error: 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20',
};

const normalizeCategory = (category: string | undefined | null): CategoryFilter | null => {
  if (!category) {
    return null;
  }

  const raw = category.toLowerCase().trim();
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s-]+/g, '');

  if (normalized.includes('auditoria')) {
    return 'auditorias';
  }
  if (normalized.includes('noconformidad')) {
    return 'noconformidades';
  }
  return null;
};

const STATUS_LABELS: Record<string, string> = {
  completado: 'Completado',
  completada: 'Completada',
  cerrada: 'Cerrada',
  cerrado: 'Cerrado',
  procesando: 'Procesando',
  en_curso: 'En curso',
  planificada: 'Planificada',
  planificado: 'Planificado',
  error: 'Error',
  fallido: 'Error',
  cancelada: 'Cancelada',
  cancelado: 'Cancelado',
};

const normalizeStatus = (status: string): 'completado' | 'procesando' | 'error' => {
  const statusKey = (status || '').toLowerCase();
  if (['error', 'fallido', 'cancelada', 'cancelado'].includes(statusKey)) {
    return 'error';
  }
  if (['completado', 'completada', 'cerrada', 'cerrado'].includes(statusKey)) {
    return 'completado';
  }
  if (['procesando', 'en_curso', 'planificada', 'planificado'].includes(statusKey)) {
    return 'procesando';
  }
  return 'procesando';
};

const formatStatusLabel = (status: string) => {
  const statusKey = (status || '').toLowerCase();
  if (!statusKey) {
    return 'Sin estado';
  }
  return STATUS_LABELS[statusKey] || statusKey.replaceAll('_', ' ');
};

const formatDate = (dateValue: string) => {
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha no disponible';
  }
  return parsedDate.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const ReportesView = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('todos');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('mes');

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashDataResult, reportDataResult] = await Promise.allSettled([
          analyticsService.getAllDashboardData(),
          reportsService.getAvailableReports()
        ]);

        if (dashDataResult.status === 'fulfilled') {
          setMetrics(dashDataResult.value);
        } else {
          console.error("Error fetching analytics:", dashDataResult.reason);
          toast.error("No se pudieron cargar las métricas del dashboard");
        }

        if (reportDataResult.status === 'fulfilled') {
          setReportsList(Array.isArray(reportDataResult.value) ? reportDataResult.value : []);
        } else {
          console.error("Error fetching reports list:", reportDataResult.reason);
          setReportsList([]);
          toast.error("No se pudieron cargar los reportes disponibles");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate totals from metrics
  const totalDocumentos = metrics?.documentos?.por_estado
    ? Object.values(metrics.documentos.por_estado).reduce((a, b) => a + b, 0)
    : 0;

  const totalAuditorias = metrics?.auditorias?.total_auditorias || 0;
  const ncCerradas = metrics?.calidad?.noconformidades?.['cerrada'] || 0;
  const ncEnTratamiento = metrics?.calidad?.noconformidades?.['en_tratamiento'] || 0;

  const stats = [
    { label: 'Documentos Totales', value: loading ? '...' : totalDocumentos.toString(), change: 'Activos', icon: FileText, color: 'bg-blue-500' },
    { label: 'Auditorías Realizadas', value: loading ? '...' : totalAuditorias.toString(), change: 'Anuales', icon: FileCheck, color: 'bg-green-500' },
    { label: 'NC Cerradas', value: loading ? '...' : ncCerradas.toString(), change: 'Verificadas', icon: CheckCircle, color: 'bg-purple-500' },
    { label: 'NC En Tratamiento', value: loading ? '...' : ncEnTratamiento.toString(), change: 'Pendientes', icon: Clock, color: 'bg-orange-500' }
  ];

  const reportCategories = useMemo<ReportCategoryOption[]>(() => {
    const auditoriasCount = reportsList.filter((report) => normalizeCategory(report.category) === 'auditorias').length;
    const noconformidadesCount = reportsList.filter((report) => normalizeCategory(report.category) === 'noconformidades').length;
    return [
      { id: 'todos', name: 'Todos los Reportes', icon: FileText, count: reportsList.length },
      { id: 'auditorias', name: 'Auditorías', icon: FileCheck, count: auditoriasCount },
      { id: 'noconformidades', name: 'No Conformidades', icon: AlertCircle, count: noconformidadesCount },
    ];
  }, [reportsList]);

  const filteredReports = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - PERIOD_DAYS[selectedPeriod]);

    return reportsList
      .filter((report) => {
        if (selectedCategory === 'todos') {
          return true;
        }
        return normalizeCategory(report.category) === selectedCategory;
      })
      .filter((report) => {
        const reportDate = new Date(report.date);
        if (Number.isNaN(reportDate.getTime())) {
          return true;
        }
        return reportDate >= cutoffDate;
      });
  }, [reportsList, selectedCategory, selectedPeriod]);

  const handleReportDownload = (report: ReportItem) => {
    const category = normalizeCategory(report.category);

    if (category === 'auditorias') {
      const codigo = report.codigo || report.id || 'report';
      toast.promise(reportsService.downloadAuditoriaReport(String(report.id), String(codigo)), {
        loading: 'Generando reporte de auditoría...',
        success: 'Descargado correctamente',
        error: 'Error al generar reporte'
      });
      return;
    }

    if (category === 'noconformidades') {
      toast.promise(reportsService.downloadNCReport(), {
        loading: 'Generando reporte...',
        success: 'Descargado correctamente',
        error: 'Error al generar reporte'
      });
      return;
    }

    toast.info("Descarga no disponible para este tipo de reporte aún");
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <BarChart3 className="h-9 w-9 text-[#2563EB]" />
                Reportes y Análisis
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Sistema de Gestión de Calidad ISO 9001:2015
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  Total {filteredReports.length} reportes
                </Badge>
                <Badge className="bg-[#ECFDF5] text-[#22C55E]">
                  Cumplimiento Normativo
                </Badge>
              </div>
            </div>
            <button
              onClick={() => {
                toast.promise(reportsService.downloadNCReport(), {
                  loading: 'Generando reporte global de No Conformidades...',
                  success: 'Reporte descargado correctamente',
                  error: 'Error al generar el reporte'
                });
              }}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold flex items-center gap-2 transition-all"
            >
              <Download size={20} />
              Generar Reporte Global
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const StatIcon = stat.icon;
            return (
              <Card key={stat.label} className="bg-white border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="font-semibold text-[#6B7280]">{stat.label}</CardDescription>
                    <div className="p-2 bg-[#E0EDFF] rounded-lg">
                      <StatIcon className="text-[#2563EB]" size={20} />
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-bold text-[#1E3A8A]">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <span className={`text-xs font-bold ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change} vs mes anterior
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions & Filters Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Categorías y Filtros (Izquierda) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-2xl shadow-sm border-[#E5E7EB]">
              <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                <CardTitle className="text-lg text-[#1E3A8A] flex items-center gap-2">
                  <Filter size={18} />
                  Filtrar por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  {reportCategories.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`w-full p-3 rounded-xl font-medium flex items-center justify-between transition-all ${selectedCategory === cat.id
                          ? 'bg-[#2563EB] text-white shadow-md'
                          : 'bg-white text-slate-700 hover:bg-[#EFF6FF]'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <CatIcon size={18} />
                          {cat.name}
                        </div>
                        <Badge className={`${selectedCategory === cat.id ? 'bg-white/20' : 'bg-[#E0EDFF] text-[#2563EB] border-none'}`}>
                          {cat.count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm border-[#E5E7EB]">
              <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                <CardTitle className="text-lg text-[#1E3A8A] flex items-center gap-2">
                  <Calendar size={18} />
                  Rango de Tiempo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as PeriodFilter)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all font-medium text-[#1E3A8A]"
                >
                  <option value="semana">Última Semana</option>
                  <option value="mes">Último Mes</option>
                  <option value="trimestre">Último Trimestre</option>
                  <option value="año">Último Año</option>
                </select>
              </CardContent>
            </Card>
          </div>

          {/* Listado de Reportes (Derecha) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
              <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-8 py-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#1E3A8A]">Reportes Disponibles</h2>
                <Badge variant="outline" className="bg-white text-[#6B7280]">
                  Registrados: {filteredReports.length}
                </Badge>
              </div>

              <div className="divide-y divide-[#E5E7EB]">
                {filteredReports.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="font-semibold text-[#1E3A8A]">No hay reportes para los filtros seleccionados</p>
                    <p className="text-sm text-[#6B7280] mt-2">Ajusta la categoría o el rango de tiempo para ver resultados.</p>
                  </div>
                ) : (
                  filteredReports.map((report) => {
                    const normalizedStatus = normalizeStatus(report.status);
                    const reportCategory = normalizeCategory(report.category);
                    const canDownload = reportCategory === 'auditorias' || reportCategory === 'noconformidades';
                    return (
                      <div key={report.id} className="p-6 hover:bg-[#EFF6FF] transition-colors duration-200 group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="bg-[#E0EDFF] p-3 rounded-xl">
                                <FileText className="text-[#2563EB]" size={24} />
                              </div>
                              <div>
                                <h3 className="font-bold text-[#111827] text-lg group-hover:text-[#2563EB] transition-colors">
                                  {report.title}
                                </h3>
                                <p className="text-[#6B7280] text-sm mt-1">
                                  {report.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 mt-6 text-sm">
                              <span className="flex items-center gap-2 text-[#6B7280] font-medium">
                                <Clock size={16} />
                                {formatDate(report.date)}
                              </span>
                              <Badge className="bg-[#F8FAFC] border-[#E5E7EB] text-[#1E3A8A] font-bold">
                                {report.format || 'PDF'}
                              </Badge>
                              {report.size && <span className="text-[#6B7280] font-mono">{report.size}</span>}
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${STATUS_STYLES[normalizedStatus]}`}>
                                {formatStatusLabel(report.status)}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleReportDownload(report)}
                            aria-disabled={!canDownload}
                            className={`p-4 rounded-xl border transition-all ${canDownload
                              ? 'bg-[#F8FAFC] hover:bg-[#2563EB] text-[#6B7280] hover:text-white border-[#E5E7EB]'
                              : 'bg-[#F3F4F6] text-[#9CA3AF] border-[#E5E7EB] cursor-not-allowed'
                              }`}>
                            <Download size={22} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <Card className="mt-8 border-none bg-transparent shadow-none">
              <CardContent className="p-0 text-center">
                <p className="text-sm text-[#6B7280] italic flex items-center justify-center gap-2">
                  <AlertCircle size={14} />
                  Todos los reportes son generados automáticamente y cumplen con los requisitos de ISO 9001:2015
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportesView;
