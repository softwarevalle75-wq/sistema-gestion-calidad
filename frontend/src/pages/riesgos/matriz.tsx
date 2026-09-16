import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, Plus, Eye, Search, RefreshCw, Save, Shield, CheckCircle, Clock
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
import { apiClient } from "@/lib/api";
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeRiesgo } from "@/utils/documentosRegistrosSGC";
import type { Riesgo as RiesgoSGC } from "@/services/riesgo.service";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";

interface Riesgo {
  id: string;
  codigo: string;
  nombre?: string;
  descripcion?: string;
  tipo_riesgo?: string;
  proceso_id?: string;
  area_id?: string;
  probabilidad?: number;
  impacto?: number;
  nivel_riesgo?: string;
  tratamiento?: string;
  responsable_id?: string;
  estado?: string;
  fecha_identificacion?: string;
  fecha_revision?: string;
  creado_en: string;
  actualizado_en?: string;
  responsable?: {
    id?: string;
    nombre?: string;
    primerApellido?: string;
  };
}

interface Proceso {
  id: string;
  nombre: string;
}

const MatrizRiesgos: React.FC = () => {
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(true);

  // Diálogos
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedRiesgo, setSelectedRiesgo] = useState<Riesgo | null>(null);

  // Formulario crear
  const [formData, setFormData] = useState({
    procesoId: "",
    codigo: "",
    nombre: "",
    descripcion: "",
    tipo: "",
    probabilidad: "",
    impacto: "",
    tratamiento: "",
    fechaIdentificacion: new Date().toISOString().split('T')[0],
  });

  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCell, setSelectedCell] = useState<{ prob: number, imp: number } | null>(null);
  const codigoAutomatico = useCodigoAutomatico("riesgo", showCreateDialog);

  useEffect(() => {
    if (showCreateDialog && codigoAutomatico) {
      setFormData((prev) => ({ ...prev, codigo: codigoAutomatico }));
    }
  }, [codigoAutomatico, showCreateDialog]);

  useEffect(() => {
    fetchProcesos();
    fetchRiesgos();
  }, []);

  const fetchProcesos = async () => {
    try {
      const response = await apiClient.get('/procesos');
      setProcesos(response.data);
    } catch (error) {
      console.error("Error al cargar procesos:", error);
    }
  };

  const fetchRiesgos = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/riesgos');
      setRiesgos(response.data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar riesgos");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRiesgo = async () => {
    if (!formData.procesoId || !formData.probabilidad || !formData.impacto) {
      toast.error("Proceso, probabilidad e impacto son obligatorios");
      return;
    }

    try {
      setSaving(true);
      const probabilidad = parseInt(formData.probabilidad);
      const impacto = parseInt(formData.impacto);
      const nivel = probabilidad * impacto;

      let nivelRiesgoStr = "Bajo";
      if (nivel >= 15) nivelRiesgoStr = "Crítico";
      else if (nivel >= 10) nivelRiesgoStr = "Alto";
      else if (nivel >= 5) nivelRiesgoStr = "Medio";

      const payload = {
        proceso_id: formData.procesoId,
        codigo: formData.codigo.trim() ? formData.codigo.toUpperCase() : undefined,
        nombre: formData.nombre.trim() || null,
        descripcion: formData.descripcion,
        tipo_riesgo: formData.tipo || "operacional",
        probabilidad,
        impacto,
        nivel_riesgo: nivelRiesgoStr,
        tratamiento: formData.tratamiento || null,
        fecha_identificacion: formData.fechaIdentificacion || null,
        estado: "activo"
      };

      await apiClient.post('/riesgos', payload);

      toast.success("Riesgo creado exitosamente");
      setShowCreateDialog(false);
      setFormData({
        procesoId: "",
        codigo: "",
        nombre: "",
        descripcion: "",
        tipo: "",
        probabilidad: "",
        impacto: "",
        tratamiento: "",
        fechaIdentificacion: new Date().toISOString().split('T')[0],
      });
      fetchRiesgos();
    } catch (error: any) {
      toast.error(error.message || "Error al crear riesgo");
    } finally {
      setSaving(false);
    }
  };

  const handleView = (riesgo: Riesgo) => {
    setSelectedRiesgo(riesgo);
    setShowViewDialog(true);
  };

  // Helpers
  const procesoMap = procesos.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as Record<string, Proceso | undefined>);

  const filteredRiesgos = riesgos.filter(r =>
    matchesTextSearch(searchTerm, r, r.proceso_id ? procesoMap[r.proceso_id] : undefined)
  );

  // Estadísticas
  const total = riesgos.length;
  const criticos = riesgos.filter(r => {
    const nivel = r.nivel_riesgo;
    if (typeof nivel === 'string') {
      return nivel.toLowerCase() === 'crítico' || nivel.toLowerCase() === 'critico';
    }
    return false;
  }).length;
  const altos = riesgos.filter(r => {
    const nivel = r.nivel_riesgo;
    if (typeof nivel === 'string') {
      return nivel.toLowerCase() === 'alto';
    }
    return false;
  }).length;
  const medios = riesgos.filter(r => {
    const nivel = r.nivel_riesgo;
    if (typeof nivel === 'string') {
      return nivel.toLowerCase() === 'medio';
    }
    return false;
  }).length;
  const bajos = riesgos.filter(r => {
    const nivel = r.nivel_riesgo;
    if (typeof nivel === 'string') {
      return nivel.toLowerCase() === 'bajo';
    }
    return false;
  }).length;
  const coveragePercentage = total === 0 ? 0 : Math.round(((medios + bajos) / total) * 100);

  const getNivelColor = (nivel?: string) => {
    if (!nivel) return "bg-gray-200 text-gray-700";
    const nivelLower = nivel.toLowerCase();
    if (nivelLower === 'crítico' || nivelLower === 'critico') return "bg-[#FEF2F2] border-[#EF4444] text-[#991B1B]";
    if (nivelLower === 'alto') return "bg-[#FFF7ED] border-[#F97316] text-[#9A3412]";
    if (nivelLower === 'medio') return "bg-[#FFFBEB] border-[#F59E0B] text-[#92400E]";
    return "bg-[#ECFDF5] border-[#10B981] text-[#065F46]";
  };

  const getNivelLabel = (nivel?: string) => {
    if (!nivel) return "Sin evaluar";
    return nivel.charAt(0).toUpperCase() + nivel.slice(1);
  };

  // Helper functions for numeric levels (used in matrix)
  const getNivelColorNumeric = (nivel: number) => {
    if (nivel >= 15) return "bg-[#FEF2F2] border-[#EF4444] text-[#991B1B]";
    if (nivel >= 10) return "bg-[#FFF7ED] border-[#F97316] text-[#9A3412]";
    if (nivel >= 5) return "bg-[#FFFBEB] border-[#F59E0B] text-[#92400E]";
    return "bg-[#ECFDF5] border-[#10B981] text-[#065F46]";
  };

  const getNivelLabelNumeric = (nivel: number) => {
    if (nivel >= 15) return "Crítico";
    if (nivel >= 10) return "Alto";
    if (nivel >= 5) return "Medio";
    return "Bajo";
  };

  const getCeldasMatriz = (prob: number, imp: number) =>
    filteredRiesgos.filter(r => r.probabilidad === prob && r.impacto === imp);

  if (loading) {
    return <LoadingSpinner message="Cargando Matriz de Riesgo" />;
  }

  return (
    <div className="min-h-screen min-w-0 w-full overflow-x-hidden bg-[#F5F7FA] p-4 md:p-8">
      <TooltipProvider>
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 min-w-0">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <AlertTriangle className="h-7 w-7 sm:h-9 sm:w-9 text-[#2563EB] shrink-0" />
                  <span className="break-words">Matriz de Riesgos</span>
                </h1>
                <p className="text-[#6B7280] mt-2 text-sm sm:text-lg">
                  Identificación y evaluación de riesgos organizacionales
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                    {total} riesgos identificados
                  </Badge>
                  {criticos > 0 && (
                    <Badge className="bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30">
                      {criticos} críticos
                    </Badge>
                  )}
                </div>
              </div>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold w-full md:w-auto">
                <Plus className="mr-2 h-5 w-5" />
                Nuevo Riesgo
              </Button>
            </div>
          </div>

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Total Riesgos</CardDescription>
                  <AlertTriangle className="h-8 w-8 text-[#2563EB]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">Identificados en el sistema</div>
              </CardContent>
            </Card>

            <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#991B1B]">Críticos</CardDescription>
                  <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#991B1B]">{criticos}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-white/80 text-[#EF4444] border-[#EF4444]/20 font-bold uppercase text-[10px]">
                  Atención inmediata
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#9A3412]">Altos</CardDescription>
                  <AlertTriangle className="h-8 w-8 text-[#F97316]/70" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#9A3412]">{altos}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">Requieren acción</div>
              </CardContent>
            </Card>

            <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#065F46]">Controlables</CardDescription>
                  <CheckCircle className="h-8 w-8 text-[#10B981]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#065F46]">{medios + bajos}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium mb-2">
                  Cobertura: {coveragePercentage}%
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                  <div className="bg-[#10B981] h-3 rounded-full transition-all" style={{ width: `${coveragePercentage}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guía */}
          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Guía de Evaluación de Riesgos</CardTitle>
              <CardDescription>Mejores prácticas para identificar y evaluar riesgos</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                  <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="font-bold text-[#1E3A8A] block mb-1">Identificar Riesgo</span>
                    <span className="text-[#6B7280]">Asocia al proceso y describe claramente.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                  <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="font-bold text-[#065F46] block mb-1">Evaluar Probabilidad e Impacto</span>
                    <span className="text-[#6B7280]">Asigna valores del 1 al 5 según criterios.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                  <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="font-bold text-[#9A3412] block mb-1">Definir Tratamiento</span>
                    <span className="text-[#6B7280]">Establece acciones de mitigación.</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buscador */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
              <Input
                placeholder={SEARCH_ANY_PLACEHOLDER}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-6 rounded-xl border-[#E5E7EB]"
              />
            </div>
          </div>

          {/* Matriz Gráfica */}
          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-xl text-[#1E3A8A]">Matriz de Probabilidad vs Impacto</CardTitle>
              <CardDescription>Visualización gráfica de riesgos según su evaluación</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <p className="mb-3 text-xs text-[#6B7280] sm:hidden">Desliza la matriz hacia los lados para ver todos los niveles.</p>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full min-w-[520px] border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th className="border border-[#E5E7EB] bg-[#F8FAFC] p-2 sm:p-4 w-24 sm:w-32 text-left font-bold text-[#1E3A8A]"></th>
                      {[1, 2, 3, 4, 5].map((imp) => (
                        <th key={imp} className="border border-[#E5E7EB] bg-[#F8FAFC] p-2 sm:p-4 text-center font-bold text-[#1E3A8A] whitespace-nowrap">
                          Impacto {imp}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[5, 4, 3, 2, 1].map((prob) => (
                      <tr key={prob}>
                        <td className="border border-[#E5E7EB] bg-[#F8FAFC] p-2 sm:p-4 text-center font-bold text-[#1E3A8A] whitespace-nowrap">
                          Prob. {prob}
                        </td>
                        {[1, 2, 3, 4, 5].map((imp) => {
                          const nivel = prob * imp;
                          const riesgosCelda = getCeldasMatriz(prob, imp);
                          const bgColor = getNivelColorNumeric(nivel);
                          const isSelected = selectedCell?.prob === prob && selectedCell?.imp === imp;
                          const hasRiesgos = riesgosCelda.length > 0;

                          return (
                            <td
                              key={imp}
                              className={`border-2 ${bgColor} p-2 sm:p-4 min-h-16 sm:min-h-32 align-top transition-all cursor-pointer hover:opacity-80 ${isSelected ? 'ring-4 ring-blue-500' : ''
                                }`}
                              onClick={() => setSelectedCell(isSelected ? null : { prob, imp })}
                            >
                              {/* Solo mostrar el label si hay riesgos o si está seleccionado */}
                              {(hasRiesgos || isSelected) && (
                                <div className="font-bold text-[#1E3A8A] mb-2">
                                  {getNivelLabelNumeric(nivel)} ({nivel})
                                  {hasRiesgos && (
                                    <span className="ml-2 text-xs bg-white/80 px-2 py-1 rounded-full">
                                      {riesgosCelda.length}
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Solo mostrar los riesgos si la celda está seleccionada */}
                              {isSelected && (
                                <div className="space-y-2">
                                  {riesgosCelda.map((r) => (
                                    <div
                                      key={r.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleView(r);
                                      }}
                                      className="bg-white/90 p-3 rounded-lg shadow hover:shadow-md cursor-pointer transition-all"
                                    >
                                      <div className="font-bold text-[#2563EB]">{r.codigo}</div>
                                      <div className="text-xs font-medium text-[#1F2937] truncate">{r.nombre || 'Sin nombre'}</div>
                                      <div className="text-xs text-[#6B7280] truncate">{r.descripcion || 'Sin descripción'}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Leyenda */}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
                <span className="font-bold text-[#1E3A8A]">Leyenda:</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#ECFDF5] border-2 border-[#10B981] rounded"></div>
                  <span>Bajo (1-4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#FFFBEB] border-2 border-[#F59E0B] rounded"></div>
                  <span>Medio (5-9)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#FFF7ED] border-2 border-[#F97316] rounded"></div>
                  <span>Alto (10-14)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#FEF2F2] border-2 border-[#EF4444] rounded"></div>
                  <span>Crítico (15-25)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Listado */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-[#1E3A8A]">Listado de Riesgos</h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={fetchRiesgos}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                  {filteredRiesgos.length} resultados
                </Badge>
              </div>
            </div>

            {filteredRiesgos.length === 0 ? (
              <div className="flex flex-col items-center py-16 px-4 text-center text-[#6B7280]">
                <AlertTriangle className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-medium">
                  {searchTerm ? "No se encontraron riesgos" : "No hay riesgos identificados"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateDialog(true)} className="mt-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl w-full sm:w-auto">
                    <Plus className="mr-2 h-5 w-5" />
                    Identificar primer riesgo
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="md:hidden divide-y divide-[#E5E7EB]">
                  {filteredRiesgos.map((r) => (
                    <div key={r.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Badge className="bg-[#E0EDFF] text-[#2563EB] font-bold px-3 py-1">
                            {r.codigo}
                          </Badge>
                          <p className="mt-2 font-semibold text-[#111827] break-words">
                            {r.nombre || "Sin nombre"}
                          </p>
                          <p className="text-sm text-[#6B7280] break-words">
                            {r.proceso_id ? procesoMap[r.proceso_id]?.nombre || "-" : "-"}
                          </p>
                        </div>
                        <Badge className={`${getNivelColor(r.nivel_riesgo)} shrink-0`}>
                          {getNivelLabel(r.nivel_riesgo)}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#6B7280] break-words line-clamp-3">
                        {r.descripcion || "Sin descripción"}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
                        <span>Prob. {r.probabilidad || "-"} · Impacto {r.impacto || "-"}</span>
                        <Button size="sm" variant="outline" onClick={() => handleView(r)} className="rounded-xl">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#F8FAFC]">
                      <TableRow>
                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Código</TableHead>
                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Nombre</TableHead>
                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Proceso</TableHead>
                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Descripción</TableHead>
                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Tratamiento</TableHead>
                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Prob.</TableHead>
                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Impacto</TableHead>
                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Nivel</TableHead>
                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRiesgos.map((r) => (
                        <TableRow key={r.id} className="hover:bg-[#F5F3FF] transition-colors">
                          <TableCell className="px-6 py-4">
                            <Badge className="bg-[#E0EDFF] text-[#2563EB] font-bold px-4 py-2">
                              {r.codigo}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 sm:px-6 py-4 font-medium max-w-[180px] sm:max-w-xs break-words">
                            {r.nombre || <span className="italic text-[#6B7280]">Sin nombre</span>}
                          </TableCell>
                          <TableCell className="px-3 sm:px-6 py-4 text-[#6B7280] break-words">
                            {r.proceso_id ? procesoMap[r.proceso_id]?.nombre || '-' : '-'}
                          </TableCell>
                          <TableCell className="px-3 sm:px-6 py-4 font-medium max-w-[200px] sm:max-w-md break-words">
                            {r.descripcion || <span className="italic text-[#6B7280]">Sin descripción</span>}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="max-w-md">
                              {r.tratamiento ? (
                                <p className="text-sm line-clamp-2">{r.tratamiento}</p>
                              ) : (
                                <span className="text-sm text-gray-400">Sin tratamiento</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">{r.probabilidad || '-'}</TableCell>
                          <TableCell className="px-6 py-4 text-center">{r.impacto || '-'}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={getNivelColor(r.nivel_riesgo)}>
                              {getNivelLabel(r.nivel_riesgo)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => handleView(r)} className="rounded-xl">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Ver detalles</p></TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          {/* Diálogo Crear Riesgo */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-4xl w-[calc(100%-0.75rem)] rounded-2xl max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-[#1E3A8A] flex items-center gap-3 pr-8">
                  <Plus className="h-7 w-7 text-[#2563EB]" />
                  Nuevo Riesgo
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Proceso <span className="text-red-500">*</span></Label>
                    <Select value={formData.procesoId} onValueChange={(v) => setFormData({ ...formData, procesoId: v })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona proceso" />
                      </SelectTrigger>
                      <SelectContent>
                        {procesos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <CampoCodigoAutomatico value={formData.codigo} />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Nombre del Riesgo</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej. Falla en respaldo de información"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Descripción</Label>
                  <Textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={4}
                    placeholder="Describe detalladamente el riesgo..."
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Tipo</Label>
                    <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operacional">Operacional</SelectItem>
                        <SelectItem value="financiero">Financiero</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="reputacional">Reputacional</SelectItem>
                        <SelectItem value="estrategico">Estratégico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Probabilidad (1-5) <span className="text-red-500">*</span></Label>
                    <Select value={formData.probabilidad} onValueChange={(v) => setFormData({ ...formData, probabilidad: v })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Muy Baja</SelectItem>
                        <SelectItem value="2">2 - Baja</SelectItem>
                        <SelectItem value="3">3 - Media</SelectItem>
                        <SelectItem value="4">4 - Alta</SelectItem>
                        <SelectItem value="5">5 - Muy Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Impacto (1-5) <span className="text-red-500">*</span></Label>
                    <Select value={formData.impacto} onValueChange={(v) => setFormData({ ...formData, impacto: v })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Muy Bajo</SelectItem>
                        <SelectItem value="2">2 - Bajo</SelectItem>
                        <SelectItem value="3">3 - Medio</SelectItem>
                        <SelectItem value="4">4 - Alto</SelectItem>
                        <SelectItem value="5">5 - Muy Alto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Tratamiento / Mitigación</Label>
                  <Textarea
                    value={formData.tratamiento}
                    onChange={(e) => setFormData({ ...formData, tratamiento: e.target.value })}
                    rows={4}
                    placeholder="Describe el plan de tratamiento..."
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Fecha de Identificación</Label>
                  <Input type="date" value={formData.fechaIdentificacion} onChange={(e) => setFormData({ ...formData, fechaIdentificacion: e.target.value })} className="rounded-xl" />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-4 [&_button]:w-full sm:[&_button]:w-auto">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button onClick={handleCreateRiesgo} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold">
                  {saving ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Crear Riesgo
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
              selectedRiesgo
                ? datosSGCDesdeRiesgo({
                    ...selectedRiesgo,
                    proceso: selectedRiesgo.proceso_id
                      ? procesoMap[selectedRiesgo.proceso_id]
                      : undefined,
                  } as RiesgoSGC)
                : null
            }
            title="Riesgo"
            description="Documento controlado con la identificación, valoración y tratamiento del riesgo."
          />

        </div>
      </TooltipProvider>
    </div>
  );
};

export default MatrizRiesgos;
