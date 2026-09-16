import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar, CheckCircle, AlertTriangle, FileText, Eye,
    ArrowLeft, Plus, Play, ExternalLink, Activity, Save, ShieldCheck
} from 'lucide-react';
import { auditoriaService, Auditoria, HallazgoAuditoria } from '@/services/auditoria.service';
import { CampoFormulario, FormularioDinamico, formularioDinamicoService } from '@/services/formulario-dinamico.service';
import { EtapaProceso, etapaProcesoService } from '@/services/etapaProceso.service';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeAuditoria, datosSGCDesdeHallazgo } from "@/utils/documentosRegistrosSGC";

export default function AuditoriaEjecucion() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [auditoria, setAuditoria] = useState<Auditoria | null>(null);
    const [hallazgos, setHallazgos] = useState<HallazgoAuditoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [showHallazgoModal, setShowHallazgoModal] = useState(false);
    const [showDocumento, setShowDocumento] = useState(false);
    const [hallazgoVista, setHallazgoVista] = useState<HallazgoAuditoria | null>(null);
    const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
    const [checklistLoading, setChecklistLoading] = useState(false);
    const [checklistSaving, setChecklistSaving] = useState(false);
    const [formularioChecklist, setFormularioChecklist] = useState<FormularioDinamico | null>(null);
    const [camposChecklist, setCamposChecklist] = useState<CampoFormulario[]>([]);
    const [respuestasChecklist, setRespuestasChecklist] = useState<Record<string, { respuestaId?: string; valor: string; archivoAdjunto?: string }>>({});
    const [etapasProceso, setEtapasProceso] = useState<EtapaProceso[]>([]);

    // Estado para formulario de hallazgo
    const [hallazgoForm, setHallazgoForm] = useState<Partial<HallazgoAuditoria>>({
        tipo: 'no_conformidad_menor',
        descripcion: '',
        clausulaIso: '',
        evidencia: '',
        etapaProcesoId: undefined
    });
    const codigoHallazgoAuto = useCodigoAutomatico("hallazgo", showHallazgoModal);

    useEffect(() => {
        if (id) {
            cargarDatos(id);
        }
    }, [id]);

    const cargarDatos = async (auditoriaId: string) => {
        try {
            setLoading(true);
            const [audData, hallazgosData] = await Promise.all([
                auditoriaService.getById(auditoriaId),
                auditoriaService.getHallazgos(auditoriaId)
            ]);
            setAuditoria(audData);
            setHallazgos(hallazgosData);
            const procesoId = audData.procesoId || (audData as any).proceso_id;
            if (procesoId) {
                const etapas = await etapaProcesoService.getByProceso(procesoId);
                setEtapasProceso(etapas);
            } else {
                setEtapasProceso([]);
            }
            await cargarChecklist(auditoriaId, procesoId);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            toast.error('Error al cargar la auditoría');
        } finally {
            setLoading(false);
        }
    };

    const handleIniciar = async () => {
        if (!auditoria) return;
        try {
            await auditoriaService.iniciar(auditoria.id);
            toast.success('Auditoría iniciada correctamente');
            cargarDatos(auditoria.id);
        } catch (error) {
            toast.error('Error al iniciar auditoría');
        }
    };

    const handleFinalizar = async () => {
        if (!auditoria) return;
        try {
            await auditoriaService.finalizar(auditoria.id);
            toast.success('Auditoría finalizada correctamente');
            setIsFinalizeDialogOpen(false);
            cargarDatos(auditoria.id);
        } catch (error) {
            toast.error('Error al finalizar auditoría');
        }
    };

    const handleDescargarInforme = async () => {
        if (!auditoria || !id) return;
        try {
            const blob = await auditoriaService.downloadInforme(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Informe_Auditoria_${auditoria.codigo}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Informe descargado correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al descargar el informe');
        }
    };

    const handleCrearHallazgo = async () => {
        if (!auditoria || !id) return;
        try {
            // Construir payload compatible con backend (snake_case y alias)
            const payload = {
                ...hallazgoForm,
                auditoria_id: id,
                auditoriaId: id,
                proceso_id: auditoria.procesoId,
                codigo: codigoHallazgoAuto || undefined,
            };

            await auditoriaService.createHallazgo(payload);
            toast.success('Hallazgo registrado');
            setShowHallazgoModal(false);
            setHallazgoForm({ tipo: 'no_conformidad_menor', descripcion: '', clausulaIso: '', evidencia: '', etapaProcesoId: undefined });
            cargarDatos(id);
        } catch (error: any) {
            console.error('Error detallado:', error);
            let mensaje = 'Error al registrar hallazgo';

            if (error.response && error.response.data && error.response.data.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    mensaje = error.response.data.detail.map((e: any) => `${e.loc.join('.')} - ${e.msg}`).join(', ');
                } else {
                    mensaje = error.response.data.detail;
                }
            } else if (error.message) {
                mensaje = error.message;
            }

            toast.error(mensaje);
        }
    };

    const handleGenerarNC = async (hallazgoId: string) => {
        try {
            const nc = await auditoriaService.generarNC(hallazgoId);
            toast.success(`No Conformidad ${nc.codigo} generada exitosamente`);
            if (id) cargarDatos(id);
        } catch (error) {
            console.error(error);
            toast.error('Error al generar No Conformidad');
        }
    };

    const cargarChecklist = async (auditoriaId: string, procesoId?: string) => {
        try {
            setChecklistLoading(true);
            let formularios = await formularioDinamicoService.getFormularios({
                modulo: 'auditorias',
                entidadTipo: 'auditoria',
                procesoId,
                activo: true,
                estadoWorkflow: 'aprobado',
                limit: 100
            });
            if (!formularios.length) {
                // Fallback a formulario general sin proceso para no bloquear ejecuciones.
                formularios = await formularioDinamicoService.getFormularios({
                    modulo: 'auditorias',
                    entidadTipo: 'auditoria',
                    activo: true,
                    estadoWorkflow: 'aprobado',
                    limit: 100
                });
            }

            const formulario = formularios[0] || null;
            setFormularioChecklist(formulario);

            if (!formulario) {
                setCamposChecklist([]);
                setRespuestasChecklist({});
                return;
            }

            if (
                auditoria &&
                (auditoria.formularioChecklistId !== formulario.id ||
                    auditoria.formularioChecklistVersion !== formulario.version)
            ) {
                try {
                    const updated = await auditoriaService.update(auditoria.id, {
                        formularioChecklistId: formulario.id,
                        formularioChecklistVersion: formulario.version,
                    });
                    setAuditoria(updated);
                } catch (e) {
                    console.warn('No se pudo fijar checklist versionado en auditoría', e);
                }
            }

            const [campos, respuestas] = await Promise.all([
                formularioDinamicoService.getCampos({ formularioId: formulario.id, activo: true }),
                formularioDinamicoService.getRespuestas({ auditoriaId })
            ]);

            setCamposChecklist(campos);
            const respuestasMap = respuestas.reduce<Record<string, { respuestaId?: string; valor: string }>>((acc, item) => {
                acc[item.campoFormularioId] = {
                    respuestaId: item.id,
                    valor: item.valor || '',
                    archivoAdjunto: item.archivoAdjunto || '',
                };
                return acc;
            }, {});
            setRespuestasChecklist(respuestasMap);
        } catch (error: any) {
            console.error('Error al cargar checklist dinámico:', error);
            toast.error(error.message || 'No se pudo cargar el checklist dinámico');
        } finally {
            setChecklistLoading(false);
        }
    };

    const actualizarRespuestaChecklist = (campoId: string, valor: string) => {
        setRespuestasChecklist((prev) => ({
            ...prev,
            [campoId]: {
                ...prev[campoId],
                valor,
            },
        }));
    };

    const actualizarEvidenciaChecklist = (campoId: string, archivoAdjunto: string) => {
        setRespuestasChecklist((prev) => ({
            ...prev,
            [campoId]: {
                ...prev[campoId],
                archivoAdjunto,
            },
        }));
    };

    const normalizarOpcionesCampo = (opciones: any): Array<{ label: string; value: string }> => {
        if (!opciones) return [];
        if (Array.isArray(opciones)) {
            return opciones.map((item) =>
                typeof item === 'string'
                    ? { label: item, value: item }
                    : { label: item?.label ?? item?.value ?? String(item), value: item?.value ?? item?.label ?? String(item) }
            );
        }
        return [];
    };

    const guardarChecklist = async () => {
        if (!auditoria) return;
        if (!camposChecklist.length) return;

        const faltantes = camposChecklist.filter((campo) => campo.requerido && !(respuestasChecklist[campo.id]?.valor || '').trim());
        const faltantesEvidencia = camposChecklist.filter(
            (campo) => campo.evidenciaRequerida && !(respuestasChecklist[campo.id]?.archivoAdjunto || '').trim()
        );
        if (faltantes.length) {
            toast.error(`Completa los campos obligatorios (${faltantes.length})`);
            return;
        }
        if (faltantesEvidencia.length) {
            toast.error(`Adjunta evidencia en campos requeridos (${faltantesEvidencia.length})`);
            return;
        }

        try {
            setChecklistSaving(true);
            const payload = camposChecklist.map((campo) => ({
                campoFormularioId: campo.id,
                valor: respuestasChecklist[campo.id]?.valor || '',
                respuestaId: respuestasChecklist[campo.id]?.respuestaId,
                archivoAdjunto: respuestasChecklist[campo.id]?.archivoAdjunto || '',
            }));

            const guardadas = await formularioDinamicoService.guardarRespuestasAuditoria(auditoria.id, payload);
            const nuevasRespuestas = guardadas.reduce<Record<string, { respuestaId?: string; valor: string; archivoAdjunto?: string }>>((acc, item) => {
                acc[item.campoFormularioId] = { respuestaId: item.id, valor: item.valor || '', archivoAdjunto: item.archivoAdjunto || '' };
                return acc;
            }, {});

            setRespuestasChecklist((prev) => ({ ...prev, ...nuevasRespuestas }));
            toast.success('Checklist guardado correctamente');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al guardar checklist');
        } finally {
            setChecklistSaving(false);
        }
    };

    const renderCampoChecklist = (campo: CampoFormulario) => {
        const valorActual = respuestasChecklist[campo.id]?.valor || '';
        const opciones = normalizarOpcionesCampo(campo.opciones);
        const tipo = (campo.tipoCampo || '').toLowerCase();

        if (tipo === 'textarea') {
            return (
                <textarea
                    className="w-full p-2 border rounded-md min-h-[88px]"
                    value={valorActual}
                    onChange={(e) => actualizarRespuestaChecklist(campo.id, e.target.value)}
                    placeholder={campo.etiqueta}
                />
            );
        }

        if (tipo === 'date' || tipo === 'fecha') {
            return (
                <Input
                    type="date"
                    value={valorActual}
                    onChange={(e) => actualizarRespuestaChecklist(campo.id, e.target.value)}
                />
            );
        }

        if (tipo === 'number' || tipo === 'numero') {
            return (
                <Input
                    type="number"
                    value={valorActual}
                    onChange={(e) => actualizarRespuestaChecklist(campo.id, e.target.value)}
                />
            );
        }

        if (tipo === 'boolean' || tipo === 'bool') {
            return (
                <select
                    className="w-full p-2 border rounded-md bg-white"
                    value={valorActual}
                    onChange={(e) => actualizarRespuestaChecklist(campo.id, e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                </select>
            );
        }

        if (opciones.length > 0) {
            return (
                <select
                    className="w-full p-2 border rounded-md bg-white"
                    value={valorActual}
                    onChange={(e) => actualizarRespuestaChecklist(campo.id, e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {opciones.map((op) => (
                        <option key={`${campo.id}-${op.value}`} value={op.value}>
                            {op.label}
                        </option>
                    ))}
                </select>
            );
        }

        return (
            <Input
                type="text"
                value={valorActual}
                onChange={(e) => actualizarRespuestaChecklist(campo.id, e.target.value)}
                placeholder={campo.etiqueta}
            />
        );
    };

    const getEstadoBadge = (estado: string) => {
        const map: Record<string, string> = {
            planificada: 'bg-blue-100 text-blue-800',
            en_curso: 'bg-yellow-100 text-yellow-800',
            completada: 'bg-green-100 text-green-800',
            cerrada: 'bg-gray-100 text-gray-800'
        };
        return <Badge className={`${map[estado] || 'bg-gray-100'} border-none uppercase`}>{estado.replace('_', ' ')}</Badge>;
    };

    if (loading) return <LoadingSpinner message="Cargando" />;
    if (!auditoria) return <div className="p-8 text-center">Auditoría no encontrada</div>;

    const camposRequeridos = camposChecklist.filter((c) => c.requerido);
    const completos = camposRequeridos.filter((c) => (respuestasChecklist[c.id]?.valor || '').trim()).length;
    const pctChecklist = camposRequeridos.length > 0 ? Math.round((completos / camposRequeridos.length) * 100) : 0;
    const faltantesChecklist = camposRequeridos.filter((c) => !(respuestasChecklist[c.id]?.valor || '').trim());
    const camposPorSeccion = camposChecklist.reduce<Record<string, CampoFormulario[]>>((acc, c) => {
        const key = (c.seccionIso || 'sin_seccion').toLowerCase();
        acc[key] = acc[key] || [];
        acc[key].push(c);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header de Navegación */}
                <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl h-10 w-10 p-0">
                        <ArrowLeft className="h-5 w-5 text-[#1E3A8A]" />
                    </Button>
                    <h1 className="text-2xl font-bold text-[#1E3A8A]">Ejecución de Auditoría</h1>
                    </div>
                    <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                            setHallazgoVista(null);
                            setShowDocumento(true);
                        }}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver documento
                    </Button>
                </div>
                </div>

                {/* Panel Principal de Estado */}
                <Card className="border-l-4 border-l-[#2563EB] shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge variant="outline" className="text-sm font-bold border-blue-200 text-blue-700 bg-blue-50">
                                    {auditoria.codigo}
                                </Badge>
                                {getEstadoBadge(auditoria.estado)}
                            </div>
                            <CardTitle className="text-2xl text-gray-900">{auditoria.nombre}</CardTitle>
                            <CardDescription className="mt-2 text-base">
                                {auditoria.objetivo || "Sin objetivo definido"}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleDescargarInforme}
                                variant="outline"
                                className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-2"
                            >
                                <FileText className="h-4 w-4" /> Descargar Informe
                            </Button>

                            {auditoria.estado === 'planificada' && (
                                <Button onClick={handleIniciar} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                    <Play className="h-4 w-4" /> Iniciar Ejecución
                                </Button>
                            )}
                            {auditoria.estado === 'en_curso' && (
                                <Button onClick={() => setIsFinalizeDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                    <CheckCircle className="h-4 w-4" /> Finalizar Auditoría
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase">Auditor Líder</span>
                                <p className="font-medium text-gray-900">{auditoria.auditorLider?.nombre || 'No asignado'}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase">Fechas</span>
                                <p className="font-medium text-gray-900 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {auditoria.fechaInicio ? new Date(auditoria.fechaInicio).toLocaleDateString() : 'Pendiente'}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase">Norma</span>
                                <p className="font-medium text-gray-900">{auditoria.normaReferencia || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase">Progreso</span>
                                <p className="font-medium text-blue-600">{hallazgos.length} Hallazgos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Checklist Dinámico */}
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                Checklist ISO por secciones
                            </CardTitle>
                            <CardDescription>
                                {formularioChecklist
                                    ? `${formularioChecklist.nombre} v${formularioChecklist.version} (${camposChecklist.length} campos)`
                                    : 'No hay formulario dinámico configurado para auditorías.'}
                            </CardDescription>
                        </div>
                        {camposChecklist.length > 0 && (
                            <Button onClick={guardarChecklist} disabled={checklistSaving} className="gap-2">
                                <Save className="h-4 w-4" />
                                {checklistSaving ? 'Guardando...' : 'Guardar checklist'}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {camposChecklist.length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-700">Cumplimiento checklist</p>
                                    <p className="text-sm font-bold text-emerald-700">{pctChecklist}%</p>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctChecklist}%` }} />
                                </div>
                                {faltantesChecklist.length > 0 && (
                                    <p className="text-xs text-amber-700 mt-2">
                                        Faltantes para cierre: {faltantesChecklist.map((f) => f.etiqueta).join(' | ')}
                                    </p>
                                )}
                            </div>
                        )}
                        {checklistLoading ? (
                            <p className="text-sm text-gray-500">Cargando checklist...</p>
                        ) : camposChecklist.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Configura un formulario en `modulo=auditorias` y `entidad_tipo=auditoria` para usar este bloque.
                            </p>
                        ) : (
                            <div className="space-y-5">
                                {Object.entries(camposPorSeccion).map(([seccion, camposSeccion]) => (
                                    <div key={seccion} className="border rounded-xl p-4">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                                            {seccion.replace('_', ' ')}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {camposSeccion.map((campo) => (
                                                <div key={campo.id} className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-800 block">
                                                        {campo.etiqueta}
                                                        {campo.requerido && <span className="text-red-600"> *</span>}
                                                        {campo.clausulaIso && (
                                                            <span className="ml-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                                                ISO {campo.clausulaIso}
                                                            </span>
                                                        )}
                                                    </label>
                                                    {renderCampoChecklist(campo)}
                                                    {campo.evidenciaRequerida && (
                                                        <Input
                                                            type="text"
                                                            value={respuestasChecklist[campo.id]?.archivoAdjunto || ''}
                                                            onChange={(e) => actualizarEvidenciaChecklist(campo.id, e.target.value)}
                                                            placeholder="URL o referencia de evidencia"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sección de Hallazgos */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-[#1E3A8A] flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Hallazgos Registrados
                        </h2>
                        {auditoria.estado === 'en_curso' && (
                            <Button onClick={() => setShowHallazgoModal(true)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                                <Plus className="h-4 w-4 mr-2" /> Nuevo Hallazgo
                            </Button>
                        )}
                    </div>

                    {hallazgos.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No se han registrado hallazgos en esta auditoría.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {hallazgos.map((hallazgo) => (
                                <Card key={hallazgo.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <div className={`h-1 w-full ${hallazgo.tipo.includes('mayor') ? 'bg-red-500' :
                                        hallazgo.tipo.includes('menor') ? 'bg-yellow-500' : 'bg-blue-500'
                                        }`} />
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className={`
                             ${hallazgo.tipo.includes('no_conformidad') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'} uppercase font-bold text-[10px]
                           `}>
                                                        {hallazgo.tipo.replace(/_/g, ' ')}
                                                    </Badge>
                                                    <span className="text-xs text-gray-500 font-mono">{hallazgo.clausulaIso && `ISO: ${hallazgo.clausulaIso}`}</span>
                                                    {hallazgo.etapaProcesoId && (
                                                        <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                                                            Etapa: {etapasProceso.find((e) => e.id === hallazgo.etapaProcesoId)?.nombre || hallazgo.etapaProcesoId}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-bold text-gray-900 text-lg">{hallazgo.descripcion}</p>
                                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                    <span className="font-bold text-xs uppercase text-gray-500 block mb-1">Evidencia Objetiva:</span>
                                                    {hallazgo.evidencia || "No registrada"}
                                                </p>
                                            </div>

                                            {/* Acciones de Integración */}
                                            <div className="flex flex-col gap-2 min-w-[200px] border-l pl-4 border-gray-100">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-xl"
                                                    onClick={() => {
                                                        setHallazgoVista(hallazgo);
                                                        setShowDocumento(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" /> Ver
                                                </Button>
                                                {hallazgo.noConformidadId ? (
                                                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                                        <span className="text-xs font-bold text-green-700 flex items-center gap-1 mb-1">
                                                            <CheckCircle className="h-3 w-3" /> Integrado con Calidad
                                                        </span>
                                                        <Button variant="link" className="h-auto p-0 text-green-700 font-bold text-sm">
                                                            Ver No Conformidad <ExternalLink className="ml-1 h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    hallazgo.tipo.includes('no_conformidad') && (
                                                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                                            <span className="text-xs font-bold text-orange-700 flex items-center gap-1 mb-2">
                                                                <AlertTriangle className="h-3 w-3" /> Acción Requerida
                                                            </span>
                                                            <Button
                                                                onClick={() => handleGenerarNC(hallazgo.id)}
                                                                size="sm"
                                                                className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs"
                                                            >
                                                                Generar NC Automática
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Crear Hallazgo */}
            <Dialog open={showHallazgoModal} onOpenChange={setShowHallazgoModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Registrar Nuevo Hallazgo</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <CampoCodigoAutomatico native value={codigoHallazgoAuto} />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Tipo de Hallazgo</label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={hallazgoForm.tipo}
                                    onChange={(e) => setHallazgoForm({ ...hallazgoForm, tipo: e.target.value })}
                                >
                                    <option value="no_conformidad_mayor">NC Mayor</option>
                                    <option value="no_conformidad_menor">NC Menor</option>
                                    <option value="observacion">Observación</option>
                                    <option value="oportunidad_mejora">Oportunidad de Mejora</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Cláusula ISO</label>
                                <Input
                                    value={hallazgoForm.clausulaIso}
                                    onChange={(e) => setHallazgoForm({ ...hallazgoForm, clausulaIso: e.target.value })}
                                    placeholder="Ej: 9.2.1"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Etapa del proceso afectada (opcional)</label>
                            <select
                                className="w-full p-2 border rounded-md"
                                value={hallazgoForm.etapaProcesoId || ""}
                                onChange={(e) => setHallazgoForm({ ...hallazgoForm, etapaProcesoId: e.target.value || undefined })}
                            >
                                <option value="">Sin etapa específica</option>
                                {etapasProceso.map((etapa) => (
                                    <option key={etapa.id} value={etapa.id}>
                                        {etapa.orden}. {etapa.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Descripción del Hallazgo</label>
                            <textarea
                                className="w-full p-2 border rounded-md min-h-[100px]"
                                value={hallazgoForm.descripcion}
                                onChange={(e) => setHallazgoForm({ ...hallazgoForm, descripcion: e.target.value })}
                                placeholder="Describa el hallazgo..."
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Evidencia Objetiva</label>
                            <textarea
                                className="w-full p-2 border rounded-md min-h-[60px]"
                                value={hallazgoForm.evidencia}
                                onChange={(e) => setHallazgoForm({ ...hallazgoForm, evidencia: e.target.value })}
                                placeholder="Documentos, registros o hechos observados..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowHallazgoModal(false);
                                setHallazgoForm({ tipo: 'no_conformidad_menor', descripcion: '', clausulaIso: '', evidencia: '', etapaProcesoId: undefined });
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleCrearHallazgo}>Registrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alert Confirmar Finalización */}
            <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Finalizar Auditoría?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción cerrará la ejecución y generará el informe preliminar. Asegúrese de haber registrado todos los hallazgos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleFinalizar} className="bg-green-600">
                            Confirmar Finalización
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <VistaDocumentoSGCDialog
                open={showDocumento}
                onOpenChange={(open) => {
                    setShowDocumento(open);
                    if (!open) setHallazgoVista(null);
                }}
                data={
                    hallazgoVista
                        ? datosSGCDesdeHallazgo(hallazgoVista, auditoria)
                        : datosSGCDesdeAuditoria(auditoria, hallazgos)
                }
                title={hallazgoVista ? "Hallazgo de auditoría" : "Ejecución de auditoría"}
                description={
                    hallazgoVista
                        ? "Documento controlado con el hallazgo y su evidencia objetiva."
                        : "Documento controlado con el estado de ejecución, checklist y hallazgos."
                }
            />

        </div>
    );
}
