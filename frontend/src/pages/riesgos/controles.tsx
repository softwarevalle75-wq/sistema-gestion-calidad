import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Shield, Plus, Eye, Search, RefreshCw, Save, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeControlRiesgo } from "@/utils/documentosRegistrosSGC";

import { API_BASE_URL as API_URL } from "@/lib/api";

interface ControlRiesgo {
  id: string;
  riesgo_id: string;
  descripcion?: string;
  tipo_control?: string;
  responsable_id?: string;
  frecuencia?: string;
  efectividad?: string;
  activo?: boolean;
  creado_en: string;
  actualizado_en?: string;
}

interface Riesgo {
  id: string;
  codigo: string;
  nombre?: string;
  descripcion?: string;
  responsable?: {
    id?: string;
    nombre?: string;
    primerApellido?: string;
  };
}

const ControlesRiesgos: React.FC = () => {
  const [controles, setControles] = useState<ControlRiesgo[]>([]);
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [loading, setLoading] = useState(true);

  // Diálogos
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedControl, setSelectedControl] = useState<ControlRiesgo | null>(null);

  // Formulario crear
  const [formData, setFormData] = useState({
    riesgo_id: "",
    descripcion: "",
    tipo_control: "",
    frecuencia: "",
    efectividad: "",
  });

  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthToken = () => localStorage.getItem("token");

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("No hay sesión activa");

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const [controlesRes, riesgosRes] = await Promise.all([
        fetch(`${API_URL}/controles-riesgo`, { headers }),
        fetch(`${API_URL}/riesgos`, { headers }),
      ]);

      if (!controlesRes.ok || !riesgosRes.ok) throw new Error("Error al cargar datos");

      const [controlesData, riesgosData] = await Promise.all([
        controlesRes.json(),
        riesgosRes.json(),
      ]);

      console.log('Datos de controles recibidos:', controlesData);
      console.log('Primer control:', controlesData[0]);

      setControles(controlesData);
      setRiesgos(riesgosData);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar los controles de riesgos");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateControl = async () => {
    if (!formData.riesgo_id || !formData.descripcion.trim()) {
      toast.error("Riesgo y descripción son obligatorios");
      return;
    }

    try {
      setSaving(true);
      const token = getAuthToken();
      if (!token) throw new Error("No hay sesión activa");

      const response = await fetch(`${API_URL}/controles-riesgo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al crear control");
      }

      toast.success("Control creado exitosamente");
      setShowCreateDialog(false);
      setFormData({
        riesgo_id: "",
        descripcion: "",
        tipo_control: "",
        frecuencia: "",
        efectividad: "",
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al crear control");
    } finally {
      setSaving(false);
    }
  };

  const handleView = (control: ControlRiesgo) => {
    setSelectedControl(control);
    setShowViewDialog(true);
  };

  // Mapas y helpers
  const riesgoMap = riesgos.reduce((acc, r) => {
    acc[r.id] = r;
    return acc;
  }, {} as Record<string, Riesgo>);

  const filteredControles = controles.filter((control) =>
    matchesTextSearch(searchTerm, control, riesgoMap[control.riesgo_id])
  );

  // Estadísticas
  const total = controles.length;
  const preventivos = controles.filter(c => c.tipo_control === "preventivo").length;
  const altaEfectividad = controles.filter(c => c.efectividad === "alta").length;
  const correctivosDetectivos = controles.filter(c => c.tipo_control === "correctivo" || c.tipo_control === "detectivo").length;
  const efectividadPercentage = total === 0 ? 0 : Math.round((altaEfectividad / total) * 100);

  const getTipoBadge = (tipo?: string) => {
    const estilos: Record<string, string> = {
      preventivo: "bg-[#DBEAFE] text-[#2563EB]",
      correctivo: "bg-[#FFF7ED] text-[#F97316]",
      detectivo: "bg-[#EDE9FE] text-[#7C3AED]",
    };
    const label = tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : "Sin tipo";
    return <Badge className={estilos[tipo || ""] || "bg-gray-100 text-gray-800"}>{label}</Badge>;
  };

  const getEfectividadBadge = (efectividad?: string) => {
    const estilos: Record<string, string> = {
      alta: "bg-[#ECFDF5] text-[#065F46]",
      media: "bg-[#FFF7ED] text-[#F97316]",
      baja: "bg-[#FEF2F2] text-[#991B1B]",
    };
    const label = efectividad ? efectividad.charAt(0).toUpperCase() + efectividad.slice(1) : "N/A";
    return <Badge className={estilos[efectividad || ""] || "bg-gray-100 text-gray-800"}>{label}</Badge>;
  };

  if (loading) {
    return <LoadingSpinner message="Cargando" />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <TooltipProvider>
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <Shield className="h-9 w-9 text-[#2563EB]" />
                  Controles de Riesgos
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">
                  Implementa medidas para mitigar riesgos identificados
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                    {total} controles
                  </Badge>
                  {altaEfectividad > 0 && (
                    <Badge className="bg-[#ECFDF5] text-[#065F46] border border-[#D1FAE5]">
                      {altaEfectividad} alta efectividad
                    </Badge>
                  )}
                </div>
              </div>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold">
                <Plus className="mr-2 h-5 w-5" />
                Nuevo Control
              </Button>
            </div>
          </div>

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Total Controles</CardDescription>
                  <Shield className="h-8 w-8 text-[#2563EB]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">Implementados en el sistema</div>
              </CardContent>
            </Card>

            <Card className="bg-[#DBEAFE] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Preventivos</CardDescription>
                  <Shield className="h-8 w-8 text-[#2563EB]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{preventivos}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">Controles preventivos</div>
              </CardContent>
            </Card>

            <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#065F46]">Alta Efectividad</CardDescription>
                  <CheckCircle className="h-8 w-8 text-[#10B981]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#065F46]">{altaEfectividad}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium mb-2">
                  Cobertura: {efectividadPercentage}%
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                  <div className="bg-[#10B981] h-3 rounded-full transition-all" style={{ width: `${efectividadPercentage}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#9A3412]">Correctivos/Detectivos</CardDescription>
                  <AlertTriangle className="h-8 w-8 text-[#F97316]/70" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#9A3412]">{correctivosDetectivos}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">Requieren seguimiento</div>
              </CardContent>
            </Card>
          </div>

          {/* Guía */}
          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Guía de Gestión de Controles</CardTitle>
              <CardDescription>Mejores prácticas para implementar controles efectivos</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                  <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="font-bold text-[#1E3A8A] block mb-1">Identificar Riesgo</span>
                    <span className="text-[#6B7280]">Asocia el control al riesgo correspondiente.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                  <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="font-bold text-[#065F46] block mb-1">Definir Tipo y Frecuencia</span>
                    <span className="text-[#6B7280]">Clasifica y establece periodicidad de aplicación.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                  <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="font-bold text-[#9A3412] block mb-1">Evaluar Efectividad</span>
                    <span className="text-[#6B7280]">Revisa periódicamente su impacto real.</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buscador */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
              <Input
                placeholder={SEARCH_ANY_PLACEHOLDER}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-6 rounded-xl border-[#E5E7EB]"
              />
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E3A8A]">Listado de Controles</h2>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                  {filteredControles.length} resultados
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Riesgo</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Descripción</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Tipo</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Frecuencia</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Efectividad</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Fecha Creación</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredControles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-[#6B7280]">
                        <div className="flex flex-col items-center">
                          <Shield className="h-16 w-16 text-gray-300 mb-4" />
                          <p className="text-lg font-medium">
                            {searchTerm ? "No se encontraron controles" : "No hay controles registrados"}
                          </p>
                          {!searchTerm && (
                            <Button onClick={() => setShowCreateDialog(true)} className="mt-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl">
                              <Plus className="mr-2 h-5 w-5" />
                              Crear primer control
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredControles.map((control) => {
                      const riesgo = riesgoMap[control.riesgo_id];
                      return (
                        <TableRow key={control.id} className="hover:bg-[#F5F3FF] transition-colors">
                          <TableCell className="px-6 py-4">
                            <div>
                              <Badge className="bg-[#E0EDFF] text-[#2563EB] font-bold px-4 py-2">
                                {riesgo?.codigo || '-'}
                              </Badge>
                              <p className="text-sm font-medium text-[#1F2937] mt-1">{riesgo?.nombre || 'Sin nombre'}</p>
                              <p className="text-sm text-[#6B7280] mt-1">{riesgo?.descripcion || 'Sin descripción'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 font-medium max-w-md">
                            {control.descripcion || <span className="italic text-[#6B7280]">Sin descripción</span>}
                          </TableCell>
                          <TableCell className="px-6 py-4">{getTipoBadge(control.tipo_control)}</TableCell>
                          <TableCell className="px-6 py-4 text-[#6B7280]">
                            {control.frecuencia ? control.frecuencia.charAt(0).toUpperCase() + control.frecuencia.slice(1) : 'No definida'}
                          </TableCell>
                          <TableCell className="px-6 py-4">{getEfectividadBadge(control.efectividad)}</TableCell>
                          <TableCell className="px-6 py-4 text-[#6B7280]">
                            {control.creado_en ? (
                              new Date(control.creado_en).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            ) : (
                              <span className="italic text-[#9CA3AF]">Fecha no registrada</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => handleView(control)} className="rounded-xl">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Ver detalles</p></TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Diálogo Crear */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <Plus className="h-7 w-7 text-[#2563EB]" />
                  Nuevo Control de Riesgo
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Riesgo Asociado <span className="text-red-500">*</span></Label>
                    <Select value={formData.riesgo_id} onValueChange={(v) => setFormData({ ...formData, riesgo_id: v })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona un riesgo" />
                      </SelectTrigger>
                      <SelectContent>
                        {riesgos.map((riesgo) => (
                          <SelectItem key={riesgo.id} value={riesgo.id}>
                            [{riesgo.codigo}] {riesgo.nombre || 'Sin nombre'}{riesgo.descripcion ? ` - ${riesgo.descripcion}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Tipo de Control</Label>
                    <Select value={formData.tipo_control} onValueChange={(v) => setFormData({ ...formData, tipo_control: v })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preventivo">Preventivo</SelectItem>
                        <SelectItem value="correctivo">Correctivo</SelectItem>
                        <SelectItem value="detectivo">Detectivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Descripción del Control <span className="text-red-500">*</span></Label>
                  <Textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={5}
                    placeholder="Describe detalladamente el control implementado..."
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Frecuencia</Label>
                    <Select value={formData.frecuencia} onValueChange={(v) => setFormData({ ...formData, frecuencia: v })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona frecuencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="continuo">Continuo</SelectItem>
                        <SelectItem value="diario">Diario</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Efectividad</Label>
                    <Select value={formData.efectividad} onValueChange={(v) => setFormData({ ...formData, efectividad: v })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona efectividad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button onClick={handleCreateControl} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold">
                  {saving ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Crear Control
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <VistaDocumentoSGCDialog
            open={showViewDialog}
            onOpenChange={setShowViewDialog}
            data={
              selectedControl
                ? datosSGCDesdeControlRiesgo(selectedControl, riesgoMap[selectedControl.riesgo_id])
                : null
            }
            title="Control de riesgo"
            description="Documento controlado con el detalle del control asociado al riesgo."
          />

        </div>
      </TooltipProvider>
    </div>
  );
};

export default ControlesRiesgos;
