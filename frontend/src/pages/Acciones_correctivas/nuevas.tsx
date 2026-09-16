import { useState, useEffect } from "react";
import { Save, X, AlertCircle, FileText, Activity, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { accionCorrectivaService } from "@/services/accionCorrectiva.service";
import { noConformidadService } from "@/services/noConformidad.service";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";

interface NoConformidad {
  id: string;
  codigo: string;
  descripcion: string;
}

interface Usuario {
  id: string;
  nombre: string;
  primerApellido: string;
}

interface NuevasAccionesCorrectivasProps {
  onSuccess?: () => void;
  embedded?: boolean;
}

export default function NuevasAccionesCorrectivas({ onSuccess, embedded = false }: NuevasAccionesCorrectivasProps) {
  const [noConformidades, setNoConformidades] = useState<NoConformidad[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    noConformidadId: "",
    codigo: "",
    tipo: "",
    descripcion: "",
    analisisCausaRaiz: "",
    planAccion: "",
    responsableId: "",
    fechaCompromiso: "",
    fechaImplementacion: "",
    estado: "pendiente",
    observacion: "",
  });
  const codigoAutomatico = useCodigoAutomatico("accion_correctiva", true);

  useEffect(() => {
    if (codigoAutomatico) {
      setFormData((prev) => ({ ...prev, codigo: codigoAutomatico }));
    }
  }, [codigoAutomatico]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const noConformidadesData = await noConformidadService.getAll();
      const noConformidadesFormatted = noConformidadesData
        .filter((nc: any) => nc.estado === "abierta" || nc.estado === "en_tratamiento")
        .map((nc: any) => ({
          id: nc.id.toString(),
          codigo: nc.codigo,
          descripcion: nc.descripcion,
        }));

      const { apiClient } = await import("@/lib/api");
      const usuariosRes = await apiClient.get("/usuarios", { params: { limit: 1000, activo: true } });
      const usuariosData = usuariosRes.data;

      setNoConformidades(noConformidadesFormatted);
      setUsuarios(usuariosData);
    } catch (error: any) {
      console.error("Error:", error);
      setError(error.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.noConformidadId || !formData.tipo) {
      setError("Por favor completa los campos obligatorios");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Mapear a snake_case para el backend
      const payload = {
        no_conformidad_id: formData.noConformidadId,
        codigo: formData.codigo || undefined,
        tipo: formData.tipo,
        descripcion: formData.descripcion,
        analisis_causa_raiz: formData.analisisCausaRaiz,
        plan_accion: formData.planAccion,
        responsable_id: formData.responsableId || null,
        fecha_compromiso: formData.fechaCompromiso || null,
        fecha_implementacion: formData.fechaImplementacion || null,
        estado: formData.estado,
        observacion: formData.observacion,
      };

      const response = await accionCorrectivaService.create(payload as any);

      toast.success("Acción correctiva creada exitosamente");

      // Reset form
      setFormData({
        noConformidadId: "",
        codigo: "",
        tipo: "",
        descripcion: "",
        analisisCausaRaiz: "",
        planAccion: "",
        responsableId: "",
        fechaCompromiso: "",
        fechaImplementacion: "",
        estado: "pendiente",
        observacion: "",
      });

      // Llamar al callback si existe
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage = error.message || "Error al crear la acción correctiva";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("¿Estás seguro de cancelar? Se perderán los datos ingresados.")) {
      setFormData({
        noConformidadId: "",
        codigo: "",
        tipo: "",
        descripcion: "",
        analisisCausaRaiz: "",
        planAccion: "",
        responsableId: "",
        fechaCompromiso: "",
        fechaImplementacion: "",
        estado: "pendiente",
        observacion: "",
      });
      setError(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando" />;
  }

  return (
    <div className={embedded ? "min-w-0 space-y-4" : "min-h-screen min-w-0 bg-[#F5F7FA] p-4 md:p-8"}>
      <div className={embedded ? "space-y-4" : "max-w-7xl mx-auto space-y-8"}>

        {!embedded && (
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-5 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] flex items-start sm:items-center gap-3">
                <Activity className="h-7 w-7 sm:h-9 sm:w-9 text-[#2563EB] shrink-0" />
                <span className="break-words">Nueva Acción Correctiva</span>
              </h1>
              <p className="text-[#6B7280] mt-2 text-sm sm:text-lg">
                Registra una acción correctiva para resolver una no conformidad
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {noConformidades.length} NC disponibles
                </Badge>
              </div>
            </div>
          </div>
        </div>
        )}

        {embedded && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
              {noConformidades.length} NC disponibles
            </Badge>
          </div>
        )}

        {!embedded && (
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Guía de Registro</CardTitle>
            <CardDescription>
              Pasos clave para definir una acción correctiva efectiva
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Identificar Causa Raíz</span>
                  <span className="text-[#6B7280]">Analiza profundamente el origen del problema.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Definir Plan de Acción</span>
                  <span className="text-[#6B7280]">Establece medidas concretas y responsables.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <span className="font-bold text-[#9A3412] block mb-1">Seguimiento y Verificación</span>
                  <span className="text-[#6B7280]">Define fechas y verifica la efectividad.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Card className="bg-[#FEF2F2] border border-[#FECACA] shadow-sm rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-[#991B1B]">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <p className="font-bold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulario Principal */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-xl text-[#1E3A8A]">Información de la Acción Correctiva</CardTitle>
            <CardDescription>
              Los campos marcados con <span className="text-red-500">*</span> son obligatorios
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* No Conformidad */}
                <div className="space-y-2">
                  <Label className="font-bold">
                    No Conformidad Asociada <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.noConformidadId}
                    onValueChange={(value) => setFormData({ ...formData, noConformidadId: value })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona una NC" />
                    </SelectTrigger>
                    <SelectContent>
                      {noConformidades.map((nc) => (
                        <SelectItem key={nc.id} value={nc.id}>
                          [{nc.codigo}] {nc.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <CampoCodigoAutomatico value={formData.codigo} />

                {/* Tipo */}
                <div className="space-y-2">
                  <Label className="font-bold">
                    Tipo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="correctiva">Correctiva</SelectItem>
                      <SelectItem value="preventiva">Preventiva</SelectItem>
                      <SelectItem value="mejora">Mejora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Responsable */}
                <div className="space-y-2">
                  <Label className="font-bold">Responsable</Label>
                  <Select
                    value={formData.responsableId}
                    onValueChange={(value) => setFormData({ ...formData, responsableId: value })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((usuario) => (
                        <SelectItem key={usuario.id} value={usuario.id}>
                          {usuario.nombre} {usuario.primerApellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha Compromiso */}
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha Compromiso
                  </Label>
                  <Input
                    type="date"
                    value={formData.fechaCompromiso}
                    onChange={(e) => setFormData({ ...formData, fechaCompromiso: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                {/* Fecha Implementación */}
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha Implementación
                  </Label>
                  <Input
                    type="date"
                    value={formData.fechaImplementacion}
                    onChange={(e) => setFormData({ ...formData, fechaImplementacion: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label className="font-bold">Descripción</Label>
                <Textarea
                  placeholder="Describe la acción correctiva..."
                  rows={4}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              {/* Análisis Causa Raíz */}
              <div className="space-y-2">
                <Label className="font-bold">Análisis de Causa Raíz</Label>
                <Textarea
                  placeholder="Describe el análisis realizado (5 Porqués, Ishikawa, etc.)..."
                  rows={5}
                  value={formData.analisisCausaRaiz}
                  onChange={(e) => setFormData({ ...formData, analisisCausaRaiz: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              {/* Plan de Acción */}
              <div className="space-y-2">
                <Label className="font-bold">Plan de Acción</Label>
                <Textarea
                  placeholder="Detalla las acciones específicas, responsables y plazos..."
                  rows={5}
                  value={formData.planAccion}
                  onChange={(e) => setFormData({ ...formData, planAccion: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <Label className="font-bold">Observaciones</Label>
                <Textarea
                  placeholder="Observaciones adicionales..."
                  rows={4}
                  value={formData.observacion}
                  onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              {/* Botones */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleReset}
                  disabled={saving}
                  className="rounded-xl px-6 sm:px-8 w-full sm:w-auto"
                >
                  <X className="mr-2 h-5 w-5" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={saving}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl px-6 sm:px-8 font-bold w-full sm:w-auto whitespace-normal h-auto py-3"
                >
                  {saving ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Crear Acción Correctiva
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
