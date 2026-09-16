import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Shield,
  Target,
  GraduationCap,
  BarChart3,
  LifeBuoy,
  Users,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ManualSection {
  title: string;
  description: string;
  steps: string[];
  path: string;
  icon: React.ElementType;
}

const SECTIONS: ManualSection[] = [
  {
    title: "Panel de Control",
    description: "Vista general del SGC: indicadores PHVA, pendientes y accesos rápidos.",
    steps: ["Revise las tarjetas de documentos, NC, auditorías y riesgos.", "Use los accesos directos para crear un proceso o reportar una NC."],
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Gestión Documental",
    description: "Cree, revise, apruebe y controle versiones de documentos ISO 9001.",
    steps: ["Cree un documento en Gestionar Documentos.", "Envíelo a revisión y aprobación.", "Consulte versiones y documentos públicos."],
    path: "/documentos",
    icon: FileText,
  },
  {
    title: "Procesos",
    description: "Modele el mapa de procesos, etapas y responsables.",
    steps: ["Consulte el mapa de procesos.", "Cree o edite un proceso desde el listado.", "Asigne etapas PHVA y responsables."],
    path: "/procesos",
    icon: FolderOpen,
  },
  {
    title: "No Conformidades y Acciones",
    description: "Reporte hallazgos, defina causas raíz y cierre acciones correctivas.",
    steps: ["Registre una NC abierta.", "Inicie tratamiento y cree una acción correctiva.", "Verifique eficacia y cierre el ciclo."],
    path: "/No_conformidades_Abiertas",
    icon: ClipboardCheck,
  },
  {
    title: "Auditorías",
    description: "Planifique el programa anual, ejecute auditorías y registre hallazgos.",
    steps: ["Defina el programa anual.", "Planifique y ejecute la auditoría.", "Registre hallazgos y genere el informe."],
    path: "/AuditoriasPlanificacion",
    icon: Shield,
  },
  {
    title: "Riesgos e Indicadores",
    description: "Evalúe riesgos, controles, objetivos e indicadores de desempeño.",
    steps: ["Actualice la matriz de riesgos.", "Defina objetivos y metas.", "Revise el tablero de indicadores."],
    path: "/riesgos/matriz",
    icon: Target,
  },
  {
    title: "Capacitaciones",
    description: "Programe formaciones, tome asistencia y evalúe competencias (cláusula 7.2).",
    steps: ["Programe una capacitación.", "Registre asistencia.", "Evalúe competencias del personal."],
    path: "/capacitaciones/programadas",
    icon: GraduationCap,
  },
  {
    title: "Usuarios y Permisos",
    description: "Administre cuentas, roles y áreas de la organización.",
    steps: ["Cree o importe usuarios.", "Asigne roles y permisos.", "Defina responsables por área."],
    path: "/ListaDeUsuarios",
    icon: Users,
  },
  {
    title: "Reportes y Soporte",
    description: "Genere reportes PDF y gestione tickets de mesa de ayuda.",
    steps: ["Descargue reportes de auditorías o NC.", "Abra un ticket si necesita soporte técnico."],
    path: "/reportes",
    icon: BarChart3,
  },
];

export default function ManualUsuario() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    return SECTIONS.filter((section) => matchesTextSearch(query, section));
  }, [query]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <BookOpen className="h-9 w-9 text-[#2563EB]" />
                Manual de Usuario
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Guía práctica para operar el Sistema de Gestión de Calidad ISO 9001:2015
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">9 módulos</Badge>
                <Badge className="bg-[#ECFDF5] text-[#22C55E]">Ciclo PHVA</Badge>
              </div>
            </div>
            <Button
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-6 py-6 h-auto font-bold"
              onClick={() => navigate("/mesa-ayuda")}
            >
              <LifeBuoy className="h-5 w-5 mr-2" />
              Ir a Mesa de Ayuda
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={SEARCH_ANY_PLACEHOLDER}
              className="pl-10 py-6 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className="rounded-2xl border-[#E5E7EB] shadow-sm flex flex-col">
                <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                  <CardTitle className="text-[#1E3A8A] flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-[#2563EB]" />
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <ol className="space-y-2 text-sm text-[#4B5563] mb-6">
                    {section.steps.map((step, index) => (
                      <li key={step} className="flex gap-2">
                        <span className="font-bold text-[#2563EB]">{index + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <Button
                    className="mt-auto w-full rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                    onClick={() => navigate(section.path)}
                  >
                    Ir al módulo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center">
            <p className="text-[#1E3A8A] font-semibold">No hay resultados para “{query}”</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setQuery("")}>
              Limpiar búsqueda
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
