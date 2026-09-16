import { useEffect, useState } from "react";
import {
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  LayoutDashboard,
  ChevronRight,
  Target,
  ShieldCheck,
  AlertCircle,
  Plus,
  FileText,
  Users,
  ShieldAlert,
  BarChart3,
  CalendarDays,
  Settings,
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

import DashboardPHVA from "@/components/dashboard/DashboardPHVA";
import GraficosAcciones from "@/components/calidad/GraficosAcciones";
import { dashboardPhvaService, DashboardPHVAMetrics } from "@/services/dashboardPhva.service";
import { accionCorrectivaService, AccionCorrectiva } from "@/services/accionCorrectiva.service";
import { documentoService } from "@/services/documento.service";
import { auditoriaService } from "@/services/auditoria.service";
import { analyticsService } from "@/services/analytics";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface GlobalStats {
  docsPendientes: number;
  ncAbiertas: number;
  auditoriasProximas: number;
  riesgosCriticos: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardPHVAMetrics | null>(null);
  const [acciones, setAcciones] = useState<AccionCorrectiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    docsPendientes: 0,
    ncAbiertas: 0,
    auditoriasProximas: 0,
    riesgosCriticos: 0
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("¡Buenos días!");
    else if (hour < 18) setGreeting("¡Buenas tardes!");
    else setGreeting("¡Buenas noches!");

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        metricsRes,
        accionesRes,
        docsRes,
        auditoriasRes,
        calidadRes
      ] = await Promise.all([
        dashboardPhvaService.getMetrics().catch((error) => {
          console.error("Error cargando métricas PHVA", error);
          return null;
        }),
        accionCorrectivaService.getAll({ limit: 1000 }).catch((error) => {
          console.error("Error cargando acciones correctivas", error);
          return [];
        }),
        documentoService.getAll().catch((error) => {
          console.error("Error cargando documentos", error);
          return [];
        }),
        auditoriaService.getAll({ estado: "planificada" }).catch((error) => {
          console.error("Error cargando auditorías", error);
          return [];
        }),
        analyticsService.getCalidadMetrics().catch(() => ({ noconformidades: {} })),
      ]);

      const documentos = Array.isArray(docsRes) ? docsRes : [];
      const acciones = Array.isArray(accionesRes) ? accionesRes : [];
      const auditorias = Array.isArray(auditoriasRes) ? auditoriasRes : [];

      setMetrics(metricsRes);
      setAcciones(acciones);

      setGlobalStats({
        docsPendientes: documentos.filter((d) => d.estado === "revision" || d.estado === "aprobacion_pendiente").length,
        ncAbiertas: Object.values(calidadRes?.noconformidades || {}).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0),
        auditoriasProximas: auditorias.length,
        riesgosCriticos: metricsRes?.plan?.riesgosIdentificados
          ? Math.ceil(metricsRes.plan.riesgosIdentificados * 0.15)
          : 0,
      });
    } catch (error) {
      console.error("Error al sincronizar datos globales", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Sincronizando Sistema de Gestión..." />;

  const stats = [
    {
      label: "Documentos",
      value: `${globalStats.docsPendientes}`,
      suffix: "Pendientes",
      icon: FileText,
      color: "text-blue-600",
      iconBg: "bg-white/50",
      cardBg: "bg-[#E0EDFF] border-[#C7D2FE]",
      titleColor: "text-[#1E3A8A]",
      path: "/Aprobaciones_Pendientes",
      trend: "Revisión Crítica"
    },
    {
      label: "No Conformidades",
      value: `${globalStats.ncAbiertas}`,
      suffix: "Activas",
      icon: ShieldAlert,
      color: "text-rose-600",
      iconBg: "bg-white/50",
      cardBg: "bg-[#FFF1F2] border-[#FECDD3]",
      titleColor: "text-[#9F1239]",
      path: "/No_conformidades_Abiertas",
      trend: "Gestión NC"
    },
    {
      label: "Auditorías",
      value: `${globalStats.auditoriasProximas}`,
      suffix: "Planificadas",
      icon: CalendarDays,
      color: "text-amber-600",
      iconBg: "bg-white/50",
      cardBg: "bg-[#FFFBEB] border-[#FDE68A]",
      titleColor: "text-[#92400E]",
      path: "/AuditoriasPlanificacion",
      trend: "Ver Plan"
    },
    {
      label: "Riesgos",
      value: `${globalStats.riesgosCriticos}`,
      suffix: "Críticos",
      icon: ShieldCheck,
      color: "text-emerald-600",
      iconBg: "bg-white/50",
      cardBg: "bg-[#ECFDF5] border-[#D1FAE5]",
      titleColor: "text-[#065F46]",
      path: "/riesgos/matriz",
      trend: "Matriz QMS"
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">

          {/* ── Header Area (Premium Style) ── */}
          <header className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-5 sm:p-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB] font-bold px-3 py-0.5 rounded-full text-[10px] uppercase">
                  QMS Intelligence v3.0
                </Badge>
                <span className="hidden sm:flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Sistema Operativo Conectado</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1E3A8A] tracking-tight mb-2">
                {greeting} <span className="text-[#2563EB]">Admin</span>
              </h1>
              <p className="text-[#6B7280] text-base sm:text-lg font-medium">Control global y cumplimiento de la gestión de calidad.</p>
            </div>
          </header>

          {/* ── Key Highlights (Stats Grid) ── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  onClick={() => navigate(stat.path)}
                  className={`${stat.cardBg} p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.iconBg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <Badge variant="secondary" className="bg-white/50 text-[#6B7280] font-bold text-[10px] uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 group-hover:bg-[#E0EDFF] group-hover:text-[#2563EB] transition-colors">
                      {stat.trend} <ArrowUpRight className="w-3 h-3" />
                    </Badge>
                  </div>
                  <div>
                    <h3 className={`${stat.titleColor} text-xs font-bold uppercase tracking-widest mb-1 opacity-80`}>{stat.label}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-black ${stat.titleColor}`}>{stat.value}</span>
                      <span className={`text-sm font-bold ${stat.titleColor} opacity-70`}>{stat.suffix}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>

          {/* ── Dashboard Core Layout ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

            {/* Left Column: Health Matrix & PHVA */}
            <div className="xl:col-span-8 space-y-8">

              {/* Module Health Matrix */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-[#1E3A8A] uppercase tracking-tight">Estado de Módulos</h2>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-[#2563EB]/20 to-transparent rounded-full" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Documentación", icon: FileText, color: "blue", path: "/documentos", status: "88%", level: "active", bg: "bg-[#E0EDFF]" },
                    { label: "Procesos", icon: LayoutDashboard, color: "indigo", path: "/procesos", status: "Optimizado", level: "success", bg: "bg-[#F5F3FF]" },
                    { label: "Auditorías", icon: CheckCircle2, color: "emerald", path: "/AuditoriasPlanificacion", status: "Planificado", level: "warning", bg: "bg-[#ECFDF5]" },
                    { label: "Riesgos", icon: ShieldAlert, color: "rose", path: "/riesgos/matriz", status: "Crítico (3)", level: "danger", bg: "bg-[#FFF1F2]" },
                    { label: "Indicadores", icon: BarChart3, color: "violet", path: "/indicadores/tablero", status: "En Meta", level: "success", bg: "bg-[#F5F3FF]" },
                    { label: "Usuarios", icon: Users, color: "slate", path: "/ListaDeUsuarios", status: "Activos", level: "active", bg: "bg-[#F8FAFC]" },
                  ].map((m) => (
                    <button
                      key={m.label}
                      onClick={() => navigate(m.path)}
                      className={`group flex flex-col p-5 ${m.bg} rounded-2xl border border-[#E5E7EB] transition-all hover:shadow-lg hover:shadow-[#2563EB]/5 active:scale-[0.98] text-left`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl bg-white/60 text-${m.color}-600 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <m.icon className="w-5 h-5" />
                        </div>
                        <div className={`h-2 w-2 rounded-full ${m.level === 'danger' ? 'bg-rose-500 animate-pulse' : m.level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      </div>
                      <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest mb-1">{m.label}</span>
                      <span className="text-sm font-bold text-[#111827]">{m.status}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* PHVA Integration */}
              <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
                <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-4">
                  <div>
                    <CardTitle className="text-[#1E3A8A] text-lg font-bold">Ciclo de Mejora Continua</CardTitle>
                    <CardDescription>Metodología PHVA Proyectada</CardDescription>
                  </div>
                  <Badge className="bg-[#E0EDFF] text-[#2563EB] font-bold uppercase text-[10px]">ISO 9001:2015</Badge>
                </CardHeader>
                <CardContent className="p-6">
                  <DashboardPHVA metrics={metrics} />
                </CardContent>
              </Card>

              {/* Charts Section */}
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-bold text-[#1E3A8A] uppercase tracking-tight">Efectividad de Acciones</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#2563EB] font-bold hover:bg-[#EFF6FF] rounded-xl group"
                    onClick={() => navigate("/indicadores/tablero")}
                  >
                    Métricas Detalladas <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
                <Card className="p-3 sm:p-6 rounded-2xl border-[#E5E7EB] shadow-sm overflow-x-clip">
                  <GraficosAcciones acciones={acciones} />
                </Card>
              </div>
            </div>

            {/* Right Column: Feed & Quick Access */}
            <div className="xl:col-span-4 space-y-8">

              {/* System Control Card */}
              <button
                onClick={() => navigate("/configuracion")}
                className="w-full relative overflow-hidden group rounded-2xl shadow-lg hover:shadow-xl transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] to-[#1E40AF]" />
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                  <Settings className="w-24 h-24 text-white" />
                </div>
                <div className="relative p-6 text-left z-10 flex items-center justify-between">
                  <div>
                    <p className="text-[#93C5FD] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Centro de Comando</p>
                    <h4 className="text-xl font-black text-white tracking-tight">Ajustes del Sistema</h4>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </div>
              </button>

              {/* Quick Actions Matrix */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-[#1E3A8A] px-2 flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Accesos Directos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Nuevo Proceso", icon: Plus, color: "blue", path: "/procesos/nuevo", bg: "bg-[#E0EDFF]" },
                    { label: "Reportar NC", icon: AlertCircle, color: "rose", path: "/No_conformidades_Abiertas", bg: "bg-[#FFF1F2]" },
                    { label: "Plan Auditoría", icon: Clock, color: "amber", path: "/AuditoriasPlanificacion", bg: "bg-[#FFFBEB]" },
                    { label: "Aprobaciones", icon: CheckCircle2, color: "emerald", path: "/Aprobaciones_Pendientes", bg: "bg-[#ECFDF5]" },
                  ].map((act) => (
                    <button
                      key={act.label}
                      onClick={() => navigate(act.path)}
                      className={`flex flex-col items-center justify-center p-5 ${act.bg} border border-[#E5E7EB] rounded-2xl hover:border-[#2563EB]/30 hover:shadow-lg hover:shadow-[#2563EB]/5 transition-all group`}
                    >
                      <div className={`p-3 rounded-xl bg-white/60 text-${act.color}-600 group-hover:scale-110 transition-transform`}>
                        <act.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-[#4B5563] mt-3 group-hover:text-[#2563EB] transition-colors">{act.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Recent Feed */}
              <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB] flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-[#1E3A8A] text-lg font-bold">Actividad Reciente</CardTitle>
                  <Badge variant="outline" className="bg-white text-[#6B7280]">Hoy</Badge>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {acciones.slice(0, 5).map((acc, i) => (
                      <div
                        key={acc.id}
                        className="flex gap-4 relative group cursor-pointer"
                        onClick={() => navigate(`/acciones-correctivas/${acc.id}/solucionar`)}
                      >
                        {i !== acciones.slice(0, 5).length - 1 && (
                          <div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-[#E5E7EB]" />
                        )}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 shadow-sm ${acc.estado === 'cerrada' ? 'bg-emerald-100 text-emerald-600' :
                          acc.estado === 'pendiente' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                          {acc.estado === 'cerrada' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1F2937] leading-tight group-hover:text-[#2563EB] transition-colors">
                            {acc.descripcion.length > 40 ? acc.descripcion.substring(0, 40) + "..." : acc.descripcion}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-[#9CA3AF] tracking-wider uppercase">{acc.tipo}</span>
                            <span className="w-1 h-1 rounded-full bg-[#E5E7EB]" />
                            <span className="text-[10px] font-medium text-[#9CA3AF]">Hace 2 horas</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full mt-8 bg-[#F9FAFB] text-[#6B7280] text-xs font-bold rounded-xl hover:bg-[#F3F4F6] transition-colors"
                    onClick={() => navigate("/acciones-correctivas/dashboard")}
                  >
                    Ver Historial Completo <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
    </div>
  );
}
