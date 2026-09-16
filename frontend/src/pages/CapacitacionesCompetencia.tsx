import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Award, Brain, TrendingUp, Eye, RefreshCw, Search, GraduationCap, Plus } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { competenciaService, EvaluacionCompetencia, Competencia } from "@/services/competencia.service";
import { usuarioService, Usuario } from "@/services/usuario.service";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeCompetencia } from "@/utils/documentosRegistrosSGC";

const EMPTY_FORM = {
  usuarioId: "",
  competenciaId: "",
  nivel: "Básico",
  estado: "Pendiente",
  observaciones: "",
};

const CapacitacionesCompetencias: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionCompetencia[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<EvaluacionCompetencia | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroUsuarioForm, setFiltroUsuarioForm] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [evals, comps, users] = await Promise.all([
        competenciaService.getEvaluaciones(),
        competenciaService.getAll(),
        usuarioService.getAllActive(),
      ]);
      setEvaluaciones(evals);
      setCompetencias(comps);
      setUsuarios(users);
    } catch (err) {
      console.error("Error al cargar competencias:", err);
      toast.error("Error al cargar las evaluaciones de competencias");
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluaciones = evaluaciones.filter((e) =>
    matchesTextSearch(searchTerm, e)
  );

  const nombreUsuarioEvaluado = (usuario?: EvaluacionCompetencia["usuario"]) => {
    if (!usuario) return "";
    const apellido = usuario.primer_apellido || usuario.primerApellido || "";
    return `${usuario.nombre} ${apellido}`.trim();
  };

  const openDialog = (evaluacion: EvaluacionCompetencia) => {
    setSelectedEvaluacion(evaluacion);
    setOpen(true);
  };

  const handleCreateEvaluacion = async () => {
    if (!form.usuarioId || !form.competenciaId) {
      toast.error("Selecciona un usuario y una competencia");
      return;
    }

    try {
      setSaving(true);
      await competenciaService.evaluarUsuario({
        usuario_id: form.usuarioId,
        competencia_id: form.competenciaId,
        nivel: form.nivel,
        estado: form.estado,
        fecha_evaluacion: new Date().toISOString().slice(0, 10),
        observaciones: form.observaciones || undefined,
      });
      toast.success("Evaluación registrada correctamente");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await cargarDatos();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo registrar la evaluación");
    } finally {
      setSaving(false);
    }
  };

  const totalEvaluaciones = evaluaciones.length;
  const reforzadas = evaluaciones.filter((e) => e.estado === "Reforzada" || e.estado === "Desarrollada").length;
  const pendientes = evaluaciones.filter((e) => e.estado === "Pendiente" || e.estado === "En Desarrollo").length;

  if (loading) {
    return <LoadingSpinner message="Cargando competencias..." />;
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
                  <Brain className="h-9 w-9 text-[#2563EB]" />
                  Competencias Desarrolladas
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">
                  Evaluación y seguimiento de competencias (ISO 9001:2015 - 7.2)
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                    {totalEvaluaciones} evaluaciones registradas
                  </Badge>
                  {reforzadas > 0 && (
                    <Badge className="bg-[#ECFDF5] text-[#065F46] border border-[#10B981]/30">
                      {reforzadas} competentes
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                onClick={() => {
                  setFiltroUsuarioForm("");
                  setCreateOpen(true);
                }}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-6 py-6 h-auto font-bold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nueva Evaluación
              </Button>
            </div>
          </div>

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Total Evaluaciones</CardDescription>
                  <Brain className="h-8 w-8 text-[#2563EB]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{totalEvaluaciones}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Registros en sistema
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#ECFEFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#0E7490]">Competentes</CardDescription>
                  <Award className="h-8 w-8 text-[#06B6D4]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#0E7490]">{reforzadas}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Nivel Avanzado / Reforzada
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#9A3412]">Pendientes</CardDescription>
                  <TrendingUp className="h-8 w-8 text-[#F97316]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#9A3412]">{pendientes}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                  En Desarrollo
                </Badge>
              </CardContent>
            </Card>
          </div>

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

          {/* Tabla principal */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E3A8A]">Evaluación de Competencias</h2>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={cargarDatos}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                  {filteredEvaluaciones.length} resultados
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Competencia</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Usuario</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Fecha Eval.</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Nivel</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Estado</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-[#6B7280]">
                        <div className="flex flex-col items-center">
                          <GraduationCap className="h-16 w-16 text-gray-300 mb-4" />
                          <p className="text-lg font-medium">
                            {searchTerm ? "No se encontraron registros" : "No hay evaluaciones registradas"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvaluaciones.map((item) => (
                      <TableRow key={item.id} className="hover:bg-[#F5F3FF] transition-colors">
                        <TableCell className="px-6 py-4 font-bold">{item.competencia?.nombre || 'Desconocida'}</TableCell>
                        <TableCell className="px-6 py-4 text-[#6B7280]">
                          {item.usuario ? nombreUsuarioEvaluado(item.usuario) : 'Usuario eliminado'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[#6B7280]">
                          {new Date(item.fechaEvaluacion).toLocaleDateString('es-CO')}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className={`px-4 py-2 font-bold ${item.nivel === 'Avanzado' ? 'bg-[#E0EDFF] text-[#2563EB]' : 'bg-gray-100 text-gray-700'
                            }`}>
                            {item.nivel}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            className={
                              item.estado === "Reforzada" || item.estado === "Desarrollada"
                                ? "bg-[#ECFDF5] text-[#065F46] font-bold px-4 py-2"
                                : "bg-[#FFF7ED] text-[#9A3412] font-bold px-4 py-2"
                            }
                          >
                            {item.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => openDialog(item)} className="rounded-xl">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Ver detalles</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Modal Detalle */}
          <VistaDocumentoSGCDialog
            open={open}
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) setSelectedEvaluacion(null);
            }}
            data={selectedEvaluacion ? datosSGCDesdeCompetencia(selectedEvaluacion) : null}
            title="Evaluación de competencia"
            description="Documento controlado con el nivel, estado y evidencia de la competencia."
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1E3A8A]">Nueva Evaluación</DialogTitle>
                <DialogDescription>Registra el nivel de competencia de un colaborador.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Usuario</Label>
                  <Input
                    placeholder={SEARCH_ANY_PLACEHOLDER}
                    value={filtroUsuarioForm}
                    onChange={(e) => setFiltroUsuarioForm(e.target.value)}
                    className="rounded-xl"
                  />
                  <Select value={form.usuarioId} onValueChange={(value) => setForm({ ...form, usuarioId: value })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios
                        .filter((user) => matchesTextSearch(filtroUsuarioForm, user))
                        .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nombre} {user.primer_apellido}
                          {user.documento ? ` — CC ${user.documento}` : ""}
                          {user.correo_electronico ? ` — ${user.correo_electronico}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Competencia</Label>
                  <Select value={form.competenciaId} onValueChange={(value) => setForm({ ...form, competenciaId: value })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona una competencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {competencias.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {comp.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nivel</Label>
                    <Select value={form.nivel} onValueChange={(value) => setForm({ ...form, nivel: value })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Básico">Básico</SelectItem>
                        <SelectItem value="Intermedio">Intermedio</SelectItem>
                        <SelectItem value="Avanzado">Avanzado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={form.estado} onValueChange={(value) => setForm({ ...form, estado: value })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="En Desarrollo">En Desarrollo</SelectItem>
                        <SelectItem value="Reforzada">Reforzada</SelectItem>
                        <SelectItem value="Desarrollada">Desarrollada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Input
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    placeholder="Evidencia o comentarios de la evaluación"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                  onClick={handleCreateEvaluacion}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Registrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default CapacitacionesCompetencias;
