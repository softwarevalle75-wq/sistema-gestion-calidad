import { Card, CardContent } from "@/components/ui/card";
import { DashboardPHVAMetrics } from "@/services/dashboardPhva.service";
import {
  ClipboardList,
  Cog,
  SearchCheck,
  Rocket,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  Target,
  Shield,
  FileSearch,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";

interface DashboardPHVAProps {
  metrics?: DashboardPHVAMetrics | null;
}

interface MetricItem {
  label: string;
  value: number | string;
  icon: React.ElementType;
}

interface PHVABlock {
  title: string;
  subtitle: string;
  gradient: string;
  borderColor: string;
  iconBg: string;
  textColor: string;
  icon: React.ElementType;
  items: MetricItem[];
}

const buildBlocks = (metrics?: DashboardPHVAMetrics | null): PHVABlock[] => [
  {
    title: "PLANEAR",
    subtitle: "Definir & Preparar",
    gradient: "from-indigo-500 via-blue-500 to-cyan-500",
    borderColor: "border-indigo-200 hover:border-indigo-400",
    iconBg: "bg-indigo-50 text-indigo-600",
    textColor: "text-indigo-700",
    icon: ClipboardList,
    items: [
      { label: "Procesos definidos", value: metrics?.plan.procesosDefinidos ?? "—", icon: Target },
      { label: "Riesgos identificados", value: metrics?.plan.riesgosIdentificados ?? "—", icon: AlertTriangle },
      { label: "Competencias definidas", value: metrics?.plan.competenciasDefinidas ?? "—", icon: GraduationCap },
    ],
  },
  {
    title: "HACER",
    subtitle: "Ejecutar & Operar",
    gradient: "from-emerald-400 via-teal-500 to-green-600",
    borderColor: "border-emerald-200 hover:border-emerald-400",
    iconBg: "bg-emerald-50 text-emerald-600",
    textColor: "text-emerald-700",
    icon: Cog,
    items: [
      { label: "Operaciones ejecutadas", value: metrics?.do.operacionesEjecutadas ?? "—", icon: Rocket },
      { label: "Capacitaciones realizadas", value: metrics?.do.capacitacionesRealizadas ?? "—", icon: GraduationCap },
      { label: "Controles aplicados", value: metrics?.do.controlesAplicados ?? "—", icon: Shield },
    ],
  },
  {
    title: "VERIFICAR",
    subtitle: "Medir & Auditar",
    gradient: "from-amber-400 via-orange-500 to-yellow-600",
    borderColor: "border-amber-200 hover:border-amber-400",
    iconBg: "bg-amber-50 text-amber-600",
    textColor: "text-amber-700",
    icon: SearchCheck,
    items: [
      { label: "Indicadores medidos", value: metrics?.check.indicadoresMedidos ?? "—", icon: TrendingUp },
      { label: "Auditorías ejecutadas", value: metrics?.check.auditoriasEjecutadas ?? "—", icon: FileSearch },
      { label: "Hallazgos detectados", value: metrics?.check.hallazgosDetectados ?? "—", icon: AlertTriangle },
    ],
  },
  {
    title: "ACTUAR",
    subtitle: "Corregir & Mejorar",
    gradient: "from-rose-500 via-pink-500 to-purple-600",
    borderColor: "border-rose-200 hover:border-rose-400",
    iconBg: "bg-rose-50 text-rose-600",
    textColor: "text-rose-700",
    icon: Rocket,
    items: [
      { label: "Acciones correctivas", value: metrics?.act.accionesCorrectivas ?? "—", icon: CheckCircle2 },
      { label: "Eficacia verificada", value: metrics?.act.eficaciaVerificada ?? "—", icon: TrendingUp },
      { label: "Riesgos actualizados", value: metrics?.act.riesgosActualizados ?? "—", icon: RefreshCcw },
    ],
  },
];

export default function DashboardPHVA({ metrics }: DashboardPHVAProps) {
  const blocks = buildBlocks(metrics);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-blue-500 via-emerald-500 to-rose-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ciclo PHVA</h2>
          <p className="text-xs text-gray-500">
            Planear — Hacer — Verificar — Actuar (ISO 9001:2015)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {blocks.map((block) => {
          const BlockIcon = block.icon;
          return (
            <Card
              key={block.title}
              className={`relative overflow-hidden border-2 ${block.borderColor} transition-all duration-300 hover:shadow-lg group`}
            >
              {/* Gradient header strip */}
              <div
                className={`h-1.5 bg-gradient-to-r ${block.gradient}`}
              />

              <CardContent className="pt-5 pb-4 px-5">
                {/* Title row */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`h-10 w-10 rounded-xl ${block.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <BlockIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${block.textColor}`}>
                      {block.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {block.subtitle}
                    </p>
                  </div>
                </div>

                {/* Metric items */}
                <div className="space-y-3">
                  {block.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600 truncate">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 tabular-nums ml-2">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>

              {/* Decorative background element */}
              <div
                className={`absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${block.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
