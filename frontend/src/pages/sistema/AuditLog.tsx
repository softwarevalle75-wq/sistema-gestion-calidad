import { useEffect, useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Filter,
  RefreshCcw,
  Search,
  Shield,
  Trash2,
  PenLine,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auditLogService, AuditLogEntry } from "@/services/auditLog.service";
import { getCurrentUser } from "@/services/auth";

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  CREATE: { icon: Plus, color: "text-green-700", bg: "bg-green-100 border-green-200", label: "Crear" },
  UPDATE: { icon: PenLine, color: "text-blue-700", bg: "bg-blue-100 border-blue-200", label: "Actualizar" },
  DELETE: { icon: Trash2, color: "text-red-700", bg: "bg-red-100 border-red-200", label: "Eliminar" },
  CERRAR: { icon: CheckCircle2, color: "text-purple-700", bg: "bg-purple-100 border-purple-200", label: "Cerrar" },
  VERIFICAR: { icon: Shield, color: "text-indigo-700", bg: "bg-indigo-100 border-indigo-200", label: "Verificar" },
};

const TABLE_LABELS: Record<string, string> = {
  procesos: "Procesos",
  etapa_procesos: "Etapas de Proceso",
  riesgos: "Riesgos",
  control_riesgos: "Controles de Riesgo",
  auditorias: "Auditorías",
  hallazgos_auditoria: "Hallazgos",
  no_conformidades: "No Conformidades",
  acciones_correctivas: "Acciones Correctivas",
  indicadores: "Indicadores",
  capacitaciones: "Capacitaciones",
  competencias: "Competencias",
  evaluaciones_competencia: "Evaluaciones",
  documentos: "Documentos",
  usuarios: "Usuarios",
  responsables_proceso: "Responsables",
};

export default function AuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [tabla, setTabla] = useState("");
  const [accion, setAccion] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const user = getCurrentUser();
  const permisos: string[] = user?.permisos || [];
  const canView =
    permisos.includes("sistema.admin") ||
    user?.roles?.some((r: any) => ["ADMIN", "admin"].includes(r?.rol?.clave));

  const fetchLogs = async (overrides?: {
    tabla?: string;
    accion?: string;
    usuarioId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) => {
    const tablaVal = overrides?.tabla ?? tabla;
    const accionVal = overrides?.accion ?? accion;
    const usuarioIdVal = overrides?.usuarioId ?? usuarioId;
    const fechaDesdeVal = overrides?.fechaDesde ?? fechaDesde;
    const fechaHastaVal = overrides?.fechaHasta ?? fechaHasta;

    try {
      setLoading(true);
      setError(null);
      const data = await auditLogService.getAll({
        limit: 300,
        tabla: tablaVal || undefined,
        accion: accionVal || undefined,
        usuario_id: usuarioIdVal || undefined,
        fecha_desde: fechaDesdeVal ? `${fechaDesdeVal}T00:00:00` : undefined,
        fecha_hasta: fechaHastaVal ? `${fechaHastaVal}T23:59:59` : undefined,
      });
      setLogs(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setTabla("");
    setAccion("");
    setUsuarioId("");
    setFechaDesde("");
    setFechaHasta("");
    fetchLogs({ tabla: "", accion: "", usuarioId: "", fechaDesde: "", fechaHasta: "" });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso restringido</h2>
            <p className="text-gray-500">Se requiere rol de Administrador para acceder al Audit Log.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <LoadingSpinner message="Cargando registros de auditoría..." />;

  // Stats
  const totalHoy = logs.filter(
    (l) => new Date(l.fecha).toDateString() === new Date().toDateString()
  ).length;
  const porAccion = logs.reduce((acc, l) => {
    acc[l.accion] = (acc[l.accion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const totalTablas = new Set(logs.map((l) => l.tabla)).size;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Database className="h-9 w-9 text-[#2563EB]" />
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A]">Audit Log</h1>
              <p className="text-[#6B7280]">
                Registro de trazabilidad — ISO 9001:2015
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fetchLogs()}
            >
              <RefreshCcw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total registros</p>
                  <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Hoy</p>
                  <p className="text-2xl font-bold text-emerald-600">{totalHoy}</p>
                </div>
                <Shield className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Tablas afectadas</p>
                  <p className="text-2xl font-bold text-purple-600">{totalTablas}</p>
                </div>
                <Database className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                {Object.entries(porAccion).map(([accionKey, count]) => {
                  const config = ACTION_CONFIG[accionKey] || ACTION_CONFIG.UPDATE;
                  return (
                    <Badge key={accionKey} variant="outline" className={`${config.bg} ${config.color} text-xs`}>
                      {config.label}: {count}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="border-0 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                Filtros de búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Tabla</label>
                  <select
                    className="w-full p-2 border rounded-md mt-1 text-sm"
                    value={tabla}
                    onChange={(e) => setTabla(e.target.value)}
                  >
                    <option value="">Todas las tablas</option>
                    {Object.entries(TABLE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Acción</label>
                  <select
                    className="w-full p-2 border rounded-md mt-1 text-sm"
                    value={accion}
                    onChange={(e) => setAccion(e.target.value)}
                  >
                    <option value="">Todas las acciones</option>
                    {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Usuario ID</label>
                  <Input
                    placeholder="UUID del usuario"
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Desde</label>
                  <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Hasta</label>
                  <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="mt-1" />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={() => fetchLogs()} className="flex-1 gap-2">
                    <Search className="h-4 w-4" />
                    Buscar
                  </Button>
                  <Button variant="outline" onClick={clearFilters} className="flex-1">
                    Limpiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {/* Log table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-600 w-8"></th>
                    <th className="text-left p-3 font-semibold text-gray-600">Fecha / Hora</th>
                    <th className="text-left p-3 font-semibold text-gray-600">Tabla</th>
                    <th className="text-left p-3 font-semibold text-gray-600">Acción</th>
                    <th className="text-left p-3 font-semibold text-gray-600">Registro ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const config = ACTION_CONFIG[log.accion] || ACTION_CONFIG.UPDATE;
                    const ActionIcon = config.icon;
                    const isExpanded = expandedRows.has(log.id);

                    return (
                      <>
                        <tr
                          key={log.id}
                          className={`border-b cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? "bg-blue-50/30" : ""
                            }`}
                          onClick={() => toggleRow(log.id)}
                        >
                          <td className="p-3">
                            {log.cambios_json ? (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )
                            ) : (
                              <span className="h-4 w-4 block" />
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap text-gray-700">
                            <div className="font-medium">
                              {new Date(log.fecha).toLocaleDateString("es-CO")}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(log.fecha).toLocaleTimeString("es-CO")}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              {TABLE_LABELS[log.tabla] || log.tabla}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`${config.bg} ${config.color} gap-1`}
                            >
                              <ActionIcon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs text-gray-500 max-w-[180px] truncate">
                            {log.registro_id}
                          </td>
                        </tr>
                        {isExpanded && log.cambios_json && (
                          <tr key={`${log.id}-detail`}>
                            <td colSpan={5} className="p-0">
                              <div className="bg-slate-900 text-green-300 p-4 mx-3 mb-3 rounded-xl text-xs font-mono overflow-x-auto animate-in slide-in-from-top-1 duration-150">
                                <pre>{JSON.stringify(log.cambios_json, null, 2)}</pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400">
                        <Database className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">Sin registros de auditoría</p>
                        <p className="text-xs mt-1">Los cambios del sistema aparecerán aquí</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
