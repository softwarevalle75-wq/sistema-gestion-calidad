import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usuarioService, Usuario } from "@/services/usuario.service";
import {
  etapaProcesoService,
  EtapaProceso,
  EtapaProcesoCreate,
  TipoEtapaProceso,
  EtapaPhva,
} from "@/services/etapaProceso.service";
import LoadingSpinner from "../ui/LoadingSpinner";
import { hasAnyPermission } from "@/lib/permissions";

type Props = {
  procesoId: string;
};

const PHVA_COLORS: Record<string, string> = {
  planear: "bg-blue-100 text-blue-800 border-blue-200",
  hacer: "bg-green-100 text-green-800 border-green-200",
  verificar: "bg-yellow-100 text-yellow-800 border-yellow-200",
  actuar: "bg-orange-100 text-orange-800 border-orange-200",
};

const defaultForm = (procesoId: string): EtapaProcesoCreate => ({
  proceso_id: procesoId,
  nombre: "",
  descripcion: "",
  orden: 1,
  responsable_id: undefined,
  tiempo_estimado: undefined,
  activa: true,
  es_critica: false,
  tipo_etapa: "transformacion",
  etapa_phva: undefined,
  entradas: "",
  salidas: "",
  controles: "",
  criterios_aceptacion: "",
  documentos_requeridos: "",
  registros_requeridos: "",
});

export default function EtapasProceso({ procesoId }: Props) {
  const canManageEtapas = hasAnyPermission(["procesos.admin"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [etapas, setEtapas] = useState<EtapaProceso[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<EtapaProceso | null>(null);
  const [form, setForm] = useState<EtapaProcesoCreate>(defaultForm(procesoId));

  const etapasOrdenadas = useMemo(
    () => [...etapas].sort((a, b) => a.orden - b.orden),
    [etapas]
  );

  useEffect(() => {
    void cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procesoId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [etapasData, usuariosData] = await Promise.all([
        etapaProcesoService.getByProceso(procesoId),
        usuarioService.getAllActive(),
      ]);
      setEtapas(etapasData);
      setUsuarios(usuariosData);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar las etapas del proceso");
    } finally {
      setLoading(false);
    }
  };

  const abrirNueva = () => {
    setEditing(null);
    setForm({
      ...defaultForm(procesoId),
      orden: Math.max(1, ...etapasOrdenadas.map((e) => e.orden + 1)),
    });
    setOpenDialog(true);
  };

  const abrirEditar = (etapa: EtapaProceso) => {
    setEditing(etapa);
    setForm({
      proceso_id: etapa.proceso_id,
      nombre: etapa.nombre,
      descripcion: etapa.descripcion || "",
      orden: etapa.orden,
      responsable_id: etapa.responsable_id,
      tiempo_estimado: etapa.tiempo_estimado,
      activa: etapa.activa,
      es_critica: etapa.es_critica,
      tipo_etapa: etapa.tipo_etapa || "transformacion",
      etapa_phva: etapa.etapa_phva,
      entradas: etapa.entradas || "",
      salidas: etapa.salidas || "",
      controles: etapa.controles || "",
      criterios_aceptacion: etapa.criterios_aceptacion || "",
      documentos_requeridos: etapa.documentos_requeridos || "",
      registros_requeridos: etapa.registros_requeridos || "",
    });
    setOpenDialog(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre de la etapa es obligatorio");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await etapaProcesoService.update(editing.id, form);
        toast.success("Etapa actualizada");
      } else {
        await etapaProcesoService.create(form);
        toast.success("Etapa creada");
      }
      setOpenDialog(false);
      await cargarDatos();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo guardar la etapa");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (etapaId: string) => {
    if (!window.confirm("¿Eliminar esta etapa?")) return;
    try {
      await etapaProcesoService.delete(etapaId);
      toast.success("Etapa eliminada");
      await cargarDatos();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo eliminar la etapa");
    }
  };

  const mover = async (etapaId: string, direction: "up" | "down") => {
    const idx = etapasOrdenadas.findIndex((e) => e.id === etapaId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === etapasOrdenadas.length - 1) return;

    const reordered = [...etapasOrdenadas];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    const payload = reordered.map((etapa, index) => ({ id: etapa.id, orden: index + 1 }));
    try {
      await etapaProcesoService.reordenar(procesoId, payload);
      await cargarDatos();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo reordenar la etapa");
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando Etapas" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Etapas del proceso</h3>
        {canManageEtapas && (
          <Button onClick={abrirNueva} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Etapa
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flujo</CardTitle>
        </CardHeader>
        <CardContent>
          {etapasOrdenadas.length === 0 ? (
            <p className="text-sm text-gray-500">Este proceso no tiene etapas registradas.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {etapasOrdenadas.map((etapa) => (
                <div key={etapa.id} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {etapa.orden}. {etapa.nombre}
                    {etapa.es_critica && <AlertTriangle className="h-3 w-3 ml-2 text-red-600" />}
                  </Badge>
                  <span className="text-gray-400">→</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de etapas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {etapasOrdenadas.map((etapa, index) => (
            <div key={etapa.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {etapa.orden}. {etapa.nombre}
                  </p>
                  <p className="text-sm text-gray-600">{etapa.descripcion || "Sin descripción"}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{etapa.tipo_etapa || "transformacion"}</Badge>
                    {etapa.etapa_phva && (
                      <Badge variant="outline" className={PHVA_COLORS[etapa.etapa_phva] || ""}>
                        {etapa.etapa_phva}
                      </Badge>
                    )}
                    {etapa.es_critica && <Badge className="bg-red-100 text-red-800">Crítica</Badge>}
                    <Badge variant="outline">Hallazgos: {etapa.hallazgos_count || 0}</Badge>
                  </div>
                </div>

                {canManageEtapas && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" onClick={() => mover(etapa.id, "up")} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => mover(etapa.id, "down")}
                      disabled={index === etapasOrdenadas.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => abrirEditar(etapa)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => eliminar(etapa.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={openDialog && canManageEtapas} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar etapa" : "Nueva etapa"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Orden</label>
                <Input
                  type="number"
                  min={1}
                  value={form.orden}
                  onChange={(e) => setForm({ ...form, orden: Number(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="min-h-[72px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo de etapa</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={form.tipo_etapa}
                  onChange={(e) => setForm({ ...form, tipo_etapa: e.target.value as TipoEtapaProceso })}
                >
                  <option value="entrada">Entrada</option>
                  <option value="transformacion">Transformación</option>
                  <option value="verificacion">Verificación</option>
                  <option value="decision">Decisión</option>
                  <option value="salida">Salida</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Etapa PHVA</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={form.etapa_phva || ""}
                  onChange={(e) =>
                    setForm({ ...form, etapa_phva: (e.target.value || undefined) as EtapaPhva | undefined })
                  }
                >
                  <option value="">Sin definir</option>
                  <option value="planear">Planear</option>
                  <option value="hacer">Hacer</option>
                  <option value="verificar">Verificar</option>
                  <option value="actuar">Actuar</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Responsable</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={form.responsable_id || ""}
                  onChange={(e) => setForm({ ...form, responsable_id: e.target.value || undefined })}
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.primer_apellido}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Entradas</label>
                <Textarea value={form.entradas} onChange={(e) => setForm({ ...form, entradas: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Salidas</label>
                <Textarea value={form.salidas} onChange={(e) => setForm({ ...form, salidas: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Criterios de aceptación</label>
                <Textarea
                  value={form.criterios_aceptacion}
                  onChange={(e) => setForm({ ...form, criterios_aceptacion: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Controles aplicados</label>
                <Textarea value={form.controles} onChange={(e) => setForm({ ...form, controles: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Documentos requeridos</label>
                <Textarea
                  value={form.documentos_requeridos}
                  onChange={(e) => setForm({ ...form, documentos_requeridos: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Registros requeridos</label>
                <Textarea
                  value={form.registros_requeridos}
                  onChange={(e) => setForm({ ...form, registros_requeridos: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Tiempo estimado (min)</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.tiempo_estimado ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tiempo_estimado: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.activa}
                    onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                  />
                  Etapa activa
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.es_critica}
                    onChange={(e) => setForm({ ...form, es_critica: e.target.checked })}
                  />
                  Etapa crítica
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Cancelar
            </Button>
            {canManageEtapas && (
              <Button onClick={guardar} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
