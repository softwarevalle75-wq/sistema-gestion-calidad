import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Save, ShieldCheck, AlertTriangle, CheckCircle2, FileText, ListChecks, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CampoFormulario,
  FormularioDinamico,
  formularioDinamicoService,
} from "@/services/formulario-dinamico.service";
import { procesoService, Proceso } from "@/services/proceso.service";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeFormularioAuditoria } from "@/utils/documentosRegistrosSGC";

type FormularioFormState = {
  codigo: string;
  nombre: string;
  descripcion: string;
  modulo: string;
  entidadTipo: string;
  procesoId: string;
  activo: boolean;
};

type CampoFormState = {
  nombre: string;
  etiqueta: string;
  tipoCampo: string;
  requerido: boolean;
  seccionIso: string;
  clausulaIso: string;
  subclausulaIso: string;
  evidenciaRequerida: boolean;
  orden: number;
  activo: boolean;
  opcionesRaw: string;
};

const initialFormularioState: FormularioFormState = {
  codigo: "",
  nombre: "",
  descripcion: "",
  modulo: "auditorias",
  entidadTipo: "auditoria",
  procesoId: "",
  activo: false,
};

const initialCampoState: CampoFormState = {
  nombre: "",
  etiqueta: "",
  tipoCampo: "text",
  requerido: false,
  seccionIso: "contexto",
  clausulaIso: "",
  subclausulaIso: "",
  evidenciaRequerida: false,
  orden: 1,
  activo: true,
  opcionesRaw: "",
};

const ISO_TEMPLATE_FIELDS: Array<{
  nombre: string;
  etiqueta: string;
  tipoCampo: string;
  requerido: boolean;
  orden: number;
  opciones?: string[];
}> = [
  { nombre: "clausula_iso", etiqueta: "Cláusula ISO 9001 aplicable", tipoCampo: "text", requerido: true, orden: 1 },
  { nombre: "criterio_auditoria", etiqueta: "Criterio de auditoría", tipoCampo: "textarea", requerido: true, orden: 2 },
  { nombre: "evidencia_objetiva", etiqueta: "Evidencia objetiva", tipoCampo: "textarea", requerido: true, orden: 3 },
  {
    nombre: "resultado_auditoria",
    etiqueta: "Resultado de auditoría",
    tipoCampo: "select",
    requerido: true,
    orden: 4,
    opciones: ["conforme", "no_conforme", "observacion"],
  },
  { nombre: "conclusion_auditoria", etiqueta: "Conclusión de auditoría", tipoCampo: "textarea", requerido: true, orden: 5 },
];

export default function FormulariosAuditoriaAdmin() {
  const [loading, setLoading] = useState(true);
  const [savingFormulario, setSavingFormulario] = useState(false);
  const [savingCampo, setSavingCampo] = useState(false);

  const [formularios, setFormularios] = useState<FormularioDinamico[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [selectedFormularioId, setSelectedFormularioId] = useState<string>("");
  const [campos, setCampos] = useState<CampoFormulario[]>([]);

  const [showFormularioDialog, setShowFormularioDialog] = useState(false);
  const [showDocumento, setShowDocumento] = useState(false);
  const [editingFormulario, setEditingFormulario] = useState<FormularioDinamico | null>(null);
  const [formularioForm, setFormularioForm] = useState<FormularioFormState>(initialFormularioState);
  const codigoAutomatico = useCodigoAutomatico("formulario", showFormularioDialog && !editingFormulario);

  useEffect(() => {
    if (!editingFormulario && codigoAutomatico) {
      setFormularioForm((prev) => ({ ...prev, codigo: codigoAutomatico }));
    }
  }, [codigoAutomatico, editingFormulario]);

  const [showCampoDialog, setShowCampoDialog] = useState(false);
  const [editingCampo, setEditingCampo] = useState<CampoFormulario | null>(null);
  const [campoForm, setCampoForm] = useState<CampoFormState>(initialCampoState);

  const selectedFormulario = useMemo(
    () => formularios.find((item) => item.id === selectedFormularioId) || null,
    [formularios, selectedFormularioId]
  );
  const selectedFieldNames = useMemo(
    () => new Set(campos.map((c) => c.nombre.trim().toLowerCase())),
    [campos]
  );
  const missingIsoFields = useMemo(
    () => ISO_TEMPLATE_FIELDS.filter((field) => !selectedFieldNames.has(field.nombre)),
    [selectedFieldNames]
  );

  useEffect(() => {
    cargarFormularios();
  }, []);

  useEffect(() => {
    if (selectedFormularioId) {
      cargarCampos(selectedFormularioId);
      return;
    }
    setCampos([]);
  }, [selectedFormularioId]);

  const cargarFormularios = async () => {
    try {
      setLoading(true);
      const [data, procesosData] = await Promise.all([
        formularioDinamicoService.getFormularios({
          modulo: "auditorias",
          entidadTipo: "auditoria",
          limit: 200,
        }),
        procesoService.listar({ limit: 300 }),
      ]);
      setFormularios(data);
      setProcesos(Array.isArray(procesosData) ? procesosData : []);
      if (!selectedFormularioId && data.length > 0) {
        setSelectedFormularioId(data[0].id);
      } else if (selectedFormularioId && !data.find((f) => f.id === selectedFormularioId)) {
        setSelectedFormularioId(data[0]?.id || "");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "No se pudieron cargar formularios");
    } finally {
      setLoading(false);
    }
  };

  const cargarCampos = async (formularioId: string) => {
    try {
      const data = await formularioDinamicoService.getCampos({ formularioId });
      setCampos(data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "No se pudieron cargar campos");
    }
  };

  const openCrearFormulario = () => {
    setEditingFormulario(null);
    setFormularioForm(initialFormularioState);
    setShowFormularioDialog(true);
  };

  const openEditarFormulario = (formulario: FormularioDinamico) => {
    setEditingFormulario(formulario);
    setFormularioForm({
      codigo: formulario.codigo,
      nombre: formulario.nombre,
      descripcion: formulario.descripcion || "",
      modulo: formulario.modulo,
      entidadTipo: formulario.entidadTipo,
      procesoId: formulario.procesoId || "",
      activo: formulario.activo,
    });
    setShowFormularioDialog(true);
  };

  const guardarFormulario = async () => {
    if (!formularioForm.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    try {
      setSavingFormulario(true);
      if (editingFormulario) {
        await formularioDinamicoService.actualizarFormulario(editingFormulario.id, {
          nombre: formularioForm.nombre.trim(),
          descripcion: formularioForm.descripcion.trim() || undefined,
          modulo: "auditorias",
          entidadTipo: "auditoria",
          procesoId: formularioForm.procesoId || undefined,
          activo: formularioForm.activo,
        });
        toast.success("Formulario actualizado");
      } else {
        const created = await formularioDinamicoService.crearFormulario({
          codigo: formularioForm.codigo.trim() || undefined,
          nombre: formularioForm.nombre.trim(),
          descripcion: formularioForm.descripcion.trim() || undefined,
          modulo: "auditorias",
          entidadTipo: "auditoria",
          procesoId: formularioForm.procesoId || undefined,
          activo: false,
        });
        setSelectedFormularioId(created.id);
        toast.success("Formulario creado en borrador. Aplica la plantilla ISO para activarlo.");
      }
      setShowFormularioDialog(false);
      await cargarFormularios();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "No se pudo guardar el formulario");
    } finally {
      setSavingFormulario(false);
    }
  };

  const eliminarFormulario = async (formulario: FormularioDinamico) => {
    if (!window.confirm(`¿Eliminar el formulario "${formulario.nombre}"?`)) return;
    try {
      await formularioDinamicoService.eliminarFormulario(formulario.id);
      toast.success("Formulario eliminado");
      await cargarFormularios();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "No se pudo eliminar el formulario");
    }
  };

  const openCrearCampo = () => {
    if (!selectedFormularioId) {
      toast.error("Selecciona primero un formulario");
      return;
    }
    setEditingCampo(null);
    setCampoForm({
      ...initialCampoState,
      orden: campos.length + 1,
    });
    setShowCampoDialog(true);
  };

  const openEditarCampo = (campo: CampoFormulario) => {
    setEditingCampo(campo);
    setCampoForm({
      nombre: campo.nombre,
      etiqueta: campo.etiqueta,
      tipoCampo: campo.tipoCampo,
      requerido: campo.requerido,
      seccionIso: campo.seccionIso || "contexto",
      clausulaIso: campo.clausulaIso || "",
      subclausulaIso: campo.subclausulaIso || "",
      evidenciaRequerida: Boolean(campo.evidenciaRequerida),
      orden: campo.orden,
      activo: campo.activo,
      opcionesRaw: campo.opciones ? JSON.stringify(campo.opciones, null, 2) : "",
    });
    setShowCampoDialog(true);
  };

  const parseOpciones = (raw: string) => {
    const value = raw.trim();
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      throw new Error("El JSON de opciones no es válido");
    }
  };

  const guardarCampo = async () => {
    if (!selectedFormularioId) {
      toast.error("Selecciona un formulario");
      return;
    }
    if (!campoForm.nombre.trim() || !campoForm.etiqueta.trim()) {
      toast.error("Nombre y etiqueta son obligatorios");
      return;
    }

    try {
      setSavingCampo(true);
      const opciones = parseOpciones(campoForm.opcionesRaw);
      const payload = {
        formularioId: selectedFormularioId,
        nombre: campoForm.nombre.trim(),
        etiqueta: campoForm.etiqueta.trim(),
        tipoCampo: campoForm.tipoCampo,
        requerido: campoForm.requerido,
        seccionIso: campoForm.seccionIso,
        clausulaIso: campoForm.clausulaIso || undefined,
        subclausulaIso: campoForm.subclausulaIso || undefined,
        evidenciaRequerida: campoForm.evidenciaRequerida,
        orden: Number(campoForm.orden) || 1,
        activo: campoForm.activo,
        opciones,
      };

      if (editingCampo) {
        await formularioDinamicoService.actualizarCampo(editingCampo.id, payload);
        toast.success("Campo actualizado");
      } else {
        await formularioDinamicoService.crearCampo(payload);
        toast.success("Campo creado");
      }

      setShowCampoDialog(false);
      await cargarCampos(selectedFormularioId);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "No se pudo guardar el campo");
    } finally {
      setSavingCampo(false);
    }
  };

  const eliminarCampo = async (campo: CampoFormulario) => {
    if (!window.confirm(`¿Eliminar el campo "${campo.etiqueta}"?`)) return;
    try {
      await formularioDinamicoService.eliminarCampo(campo.id);
      toast.success("Campo eliminado");
      await cargarCampos(selectedFormularioId);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "No se pudo eliminar el campo");
    }
  };

  const aplicarPlantillaIso = async () => {
    if (!selectedFormularioId) {
      toast.error("Selecciona un formulario");
      return;
    }
    if (missingIsoFields.length === 0) {
      toast.success("Este formulario ya cumple la estructura ISO mínima.");
      return;
    }
    try {
      setSavingCampo(true);
      for (const field of missingIsoFields) {
        await formularioDinamicoService.crearCampo({
          formularioId: selectedFormularioId,
          nombre: field.nombre,
          etiqueta: field.etiqueta,
          tipoCampo: field.tipoCampo,
          requerido: field.requerido,
          seccionIso: "evaluacion",
          clausulaIso: "9.2",
          evidenciaRequerida: field.nombre === "evidencia_objetiva",
          orden: field.orden,
          opciones: field.opciones,
          activo: true,
        });
      }
      if (selectedFormulario && !selectedFormulario.activo) {
        await formularioDinamicoService.actualizarFormulario(selectedFormulario.id, {
          activo: true,
          modulo: "auditorias",
          entidadTipo: "auditoria",
        });
      }
      toast.success("Plantilla ISO aplicada correctamente.");
      await cargarCampos(selectedFormularioId);
      await cargarFormularios();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "No se pudo aplicar la plantilla ISO");
    } finally {
      setSavingCampo(false);
    }
  };

  const crearNuevaVersion = async () => {
    if (!selectedFormulario) return;
    try {
      const nuevo = await formularioDinamicoService.crearNuevaVersionFormulario(selectedFormulario.id);
      toast.success(`Nueva versión creada: v${nuevo.version}`);
      await cargarFormularios();
      setSelectedFormularioId(nuevo.id);
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear nueva versión");
    }
  };

  const aprobarFormularioSeleccionado = async () => {
    if (!selectedFormulario) return;
    try {
      const aprobado = await formularioDinamicoService.aprobarFormulario(selectedFormulario.id);
      toast.success(`Formulario aprobado (v${aprobado.version})`);
      await cargarFormularios();
      await cargarCampos(aprobado.id);
    } catch (error: any) {
      toast.error(error.message || "No se pudo aprobar el formulario");
    }
  };

  const formulariosActivos = useMemo(
    () => formularios.filter((item) => item.activo).length,
    [formularios]
  );
  const camposActivos = useMemo(
    () => campos.filter((item) => item.activo).length,
    [campos]
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <FileText className="h-9 w-9 text-[#2563EB]" />
                  Formularios Dinámicos de Auditoría
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">
                  Checklists ISO 9001: cláusula, criterio, evidencia, resultado y conclusión.
                </p>
            </div>
            <Button onClick={openCrearFormulario} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold gap-2">
              <Plus className="h-5 w-5" />
              Nuevo formulario
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A]">Formularios</p>
                <p className="text-2xl font-bold text-[#1E3A8A]">{formularios.length}</p>
              </div>
              <FileText className="h-6 w-6 text-[#2563EB]" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#065F46]">Activos</p>
                <p className="text-2xl font-bold text-[#065F46]">{formulariosActivos}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-[#10B981]" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A]">Campos actuales</p>
                <p className="text-2xl font-bold text-[#1E3A8A]">{campos.length}</p>
              </div>
              <ListChecks className="h-6 w-6 text-[#2563EB]" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#9A3412]">ISO pendientes</p>
                <p className="text-2xl font-bold text-[#9A3412]">{missingIsoFields.length}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-[#F97316]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-slate-200 shadow-sm xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Formularios</CardTitle>
            <CardDescription>Catálogo para módulo auditorías</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner message="Cargando" />
            ) : formularios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No hay formularios registrados.
              </div>
            ) : (
              <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
                {formularios.map((formulario) => (
                  <div
                    key={formulario.id}
                    className={`rounded-xl border p-3 transition-all ${selectedFormularioId === formulario.id
                        ? "border-blue-300 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex-1 text-left"
                        onClick={() => setSelectedFormularioId(formulario.id)}
                      >
                        <p className="text-sm font-semibold text-slate-900">{formulario.nombre}</p>
                        <p className="text-xs text-muted-foreground">{formulario.codigo}</p>
                        {formulario.descripcion && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{formulario.descripcion}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant={formulario.activo ? "default" : "secondary"}>
                            {formulario.activo ? "Activo" : "Inactivo"}
                          </Badge>
                          {formulario.estadoWorkflow && (
                            <Badge variant="outline">{formulario.estadoWorkflow}</Badge>
                          )}
                          <Badge variant="outline">v{formulario.version}</Badge>
                        </div>
                      </button>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedFormularioId(formulario.id);
                            setShowDocumento(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEditarFormulario(formulario)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => eliminarFormulario(formulario)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm xl:col-span-2">
          <CardHeader className="space-y-4 xl:flex xl:flex-row xl:items-start xl:justify-between xl:space-y-0">
            <div>
              <CardTitle className="text-base">Campos del formulario</CardTitle>
              <CardDescription>
                {selectedFormulario
                  ? `${selectedFormulario.nombre} (${campos.length} campos, ${camposActivos} activos)`
                  : "Selecciona un formulario para administrar campos"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={crearNuevaVersion} disabled={!selectedFormularioId} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva versión
              </Button>
              <Button variant="outline" onClick={aprobarFormularioSeleccionado} disabled={!selectedFormularioId} className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Aprobar
              </Button>
              <Button
                variant="outline"
                onClick={aplicarPlantillaIso}
                disabled={!selectedFormularioId || savingCampo}
                className="gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Plantilla ISO
              </Button>
              <Button onClick={openCrearCampo} disabled={!selectedFormularioId} className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Nuevo campo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedFormularioId && (
              <div
                className={`mb-4 rounded-xl border p-3 ${missingIsoFields.length === 0
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                  }`}
              >
                {missingIsoFields.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Estructura conforme con ISO 9001
                  </div>
                ) : (
                  <div className="text-sm text-amber-800">
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Campos ISO faltantes
                    </div>
                    <p className="text-xs sm:text-sm">{missingIsoFields.map((f) => f.etiqueta).join(" | ")}</p>
                  </div>
                )}
              </div>
            )}

            {!selectedFormularioId ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No hay formulario seleccionado.
              </div>
            ) : campos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Este formulario aún no tiene campos.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Orden</TableHead>
                      <TableHead>Etiqueta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Req.</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campos.map((campo) => (
                      <TableRow key={campo.id} className="hover:bg-slate-50/70">
                        <TableCell>{campo.orden}</TableCell>
                        <TableCell className="font-medium">{campo.etiqueta}</TableCell>
                        <TableCell>{campo.tipoCampo}</TableCell>
                        <TableCell>{campo.requerido ? "Sí" : "No"}</TableCell>
                        <TableCell>{campo.activo ? "Sí" : "No"}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditarCampo(campo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => eliminarCampo(campo)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showFormularioDialog} onOpenChange={setShowFormularioDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFormulario ? "Editar formulario" : "Nuevo formulario"}</DialogTitle>
            <DialogDescription>Define la plantilla que se usará en auditorías.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <CampoCodigoAutomatico value={formularioForm.codigo} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={formularioForm.nombre}
                onChange={(e) => setFormularioForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Checklist Auditoría ISO 9001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                className="min-h-[88px]"
                value={formularioForm.descripcion}
                onChange={(e) => setFormularioForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Módulo</Label>
                <Input
                  value={formularioForm.modulo}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <Label>Entidad</Label>
                <Input
                  value={formularioForm.entidadTipo}
                  disabled
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Proceso vinculado</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={formularioForm.procesoId}
                onChange={(e) => setFormularioForm((prev) => ({ ...prev, procesoId: e.target.value }))}
              >
                <option value="">General (sin proceso específico)</option>
                {procesos.map((proceso) => (
                  <option key={proceso.id} value={proceso.id}>
                    {proceso.codigo} - {proceso.nombre}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                checked={formularioForm.activo}
                onChange={(e) => setFormularioForm((prev) => ({ ...prev, activo: e.target.checked }))}
              />
              Formulario activo
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormularioDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarFormulario} disabled={savingFormulario} className="gap-2">
              <Save className="h-4 w-4" />
              {savingFormulario ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCampoDialog} onOpenChange={setShowCampoDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingCampo ? "Editar campo" : "Nuevo campo"}</DialogTitle>
            <DialogDescription>Configura pregunta, tipo y validaciones del checklist.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre técnico</Label>
              <Input
                value={campoForm.nombre}
                onChange={(e) => setCampoForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="existe_politica_calidad"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Etiqueta visible</Label>
              <Input
                value={campoForm.etiqueta}
                onChange={(e) => setCampoForm((prev) => ({ ...prev, etiqueta: e.target.value }))}
                placeholder="¿Existe política de calidad documentada?"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de campo</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={campoForm.tipoCampo}
                  onChange={(e) => setCampoForm((prev) => ({ ...prev, tipoCampo: e.target.value }))}
                >
                  <option value="text">Texto</option>
                  <option value="textarea">Texto largo</option>
                  <option value="number">Número</option>
                  <option value="date">Fecha</option>
                  <option value="boolean">Booleano</option>
                  <option value="select">Select</option>
                  <option value="radio">Radio</option>
                  <option value="checkbox">Checkbox</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={campoForm.orden}
                  onChange={(e) => setCampoForm((prev) => ({ ...prev, orden: Number(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Sección ISO</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={campoForm.seccionIso}
                  onChange={(e) => setCampoForm((prev) => ({ ...prev, seccionIso: e.target.value }))}
                >
                  <option value="contexto">Contexto</option>
                  <option value="liderazgo">Liderazgo</option>
                  <option value="planificacion">Planificación</option>
                  <option value="apoyo">Apoyo</option>
                  <option value="operacion">Operación</option>
                  <option value="evaluacion">Evaluación</option>
                  <option value="mejora">Mejora</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Cláusula ISO</Label>
                <Input
                  value={campoForm.clausulaIso}
                  onChange={(e) => setCampoForm((prev) => ({ ...prev, clausulaIso: e.target.value }))}
                  placeholder="Ej: 9.2"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subcláusula</Label>
                <Input
                  value={campoForm.subclausulaIso}
                  onChange={(e) => setCampoForm((prev) => ({ ...prev, subclausulaIso: e.target.value }))}
                  placeholder="Ej: 9.2.1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Opciones (JSON)</Label>
              <Textarea
                className="min-h-[96px]"
                value={campoForm.opcionesRaw}
                onChange={(e) => setCampoForm((prev) => ({ ...prev, opcionesRaw: e.target.value }))}
                placeholder={'["Sí","No","N/A"] o [{"label":"Cumple","value":"cumple"}]'}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={campoForm.requerido}
                  onChange={(e) => setCampoForm((prev) => ({ ...prev, requerido: e.target.checked }))}
                />
                Requerido
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={campoForm.evidenciaRequerida}
                  onChange={(e) => setCampoForm((prev) => ({ ...prev, evidenciaRequerida: e.target.checked }))}
                />
                Requiere evidencia
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={campoForm.activo}
                  onChange={(e) => setCampoForm((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                Activo
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarCampo} disabled={savingCampo} className="gap-2">
              <Save className="h-4 w-4" />
              {savingCampo ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VistaDocumentoSGCDialog
        open={showDocumento}
        onOpenChange={setShowDocumento}
        data={
          selectedFormulario
            ? datosSGCDesdeFormularioAuditoria(
                selectedFormulario,
                selectedFormularioId === selectedFormulario.id ? campos : [],
                procesos.find((p) => p.id === selectedFormulario.procesoId)?.nombre,
              )
            : null
        }
        title="Formulario de auditoría"
        description="Documento controlado con la estructura del checklist ISO 9001."
      />
      </div>
    </div>
  );
}
