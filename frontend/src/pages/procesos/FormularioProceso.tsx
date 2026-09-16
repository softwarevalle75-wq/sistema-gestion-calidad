import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import procesoService, {
    ProcesoCreate,
    TipoProceso,
    EtapaPHVA,
    EstadoProceso
} from "@/services/proceso.service";
import { areaService, Area } from "@/services/area.service";
import { usuarioService, Usuario } from "@/services/usuario.service";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";

export default function FormularioProceso() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [areas, setAreas] = useState<Area[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);

    const [formData, setFormData] = useState<ProcesoCreate>({
        codigo: "",
        nombre: "",
        objetivo: "",
        alcance: "",
        tipo_proceso: TipoProceso.OPERATIVO,
        etapa_phva: EtapaPHVA.HACER,
        estado: EstadoProceso.BORRADOR,
        version: "1.0",
        restringido: false,
        entradas: "",
        salidas: "",
        recursos_necesarios: "",
        criterios_desempeno: "",
        riesgos_oportunidades: "",
        area_id: undefined,
        responsable_id: undefined,
    });
    const areaSeleccionada = areas.find((area) => area.id === formData.area_id);
    const codigoAutomatico = useCodigoAutomatico("proceso", !isEditing, {
        tipo: formData.tipo_proceso,
        areaCodigo: areaSeleccionada?.codigo,
    });

    useEffect(() => {
        if (!isEditing && codigoAutomatico) {
            setFormData((prev) => ({ ...prev, codigo: codigoAutomatico }));
        }
    }, [codigoAutomatico, isEditing]);

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    useEffect(() => {
        if (isEditing) {
            cargarProceso();
        }
    }, [id]);

    const cargarDatosIniciales = async () => {
        try {
            const [areasData, usuariosData] = await Promise.all([
                areaService.getAll(),
                usuarioService.getAllActive()
            ]);
            setAreas(areasData);
            setUsuarios(usuariosData);
        } catch (error) {
            console.error("Error cargando datos iniciales:", error);
            toast.error("Error al cargar áreas y usuarios");
        }
    };

    const cargarProceso = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const proceso = await procesoService.obtener(id);
            setFormData({
                codigo: proceso.codigo,
                nombre: proceso.nombre,
                objetivo: proceso.objetivo,
                alcance: proceso.alcance,
                tipo_proceso: proceso.tipo_proceso,
                etapa_phva: proceso.etapa_phva,
                estado: proceso.estado,
                version: proceso.version,
                restringido: proceso.restringido,
                entradas: proceso.entradas,
                salidas: proceso.salidas,
                recursos_necesarios: proceso.recursos_necesarios,
                criterios_desempeno: proceso.criterios_desempeno,
                riesgos_oportunidades: proceso.riesgos_oportunidades,
                area_id: proceso.area_id,
                responsable_id: proceso.responsable_id,
            });
        } catch (error) {
            console.error("Error cargando proceso:", error);
            toast.error("Error al cargar el proceso");
            navigate("/procesos/listado");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre) {
            toast.error("El nombre es obligatorio");
            return;
        }

        try {
            setGuardando(true);

            if (isEditing && id) {
                await procesoService.actualizar(id, formData);
                toast.success("Proceso actualizado exitosamente");
            } else {
                await procesoService.crear(formData);
                toast.success("Proceso creado exitosamente");
            }

            navigate("/procesos/listado");
        } catch (error: any) {
            console.error("Error guardando proceso:", error);
            toast.error(error.response?.data?.detail || "Error al guardar el proceso");
        } finally {
            setGuardando(false);
        }
    };

    const handleChange = (field: keyof ProcesoCreate, value: any) => {
        // Manejar el valor especial "_ninguno_" para campos opcionales
        const finalValue = value === "_ninguno_" ? undefined : value;
        setFormData(prev => ({ ...prev, [field]: finalValue }));
    };

    if (loading) {
        return <LoadingSpinner message="Cargando Procesos" />;
    }

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate("/procesos/listado")}
                        className="rounded-xl"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-[#1E3A8A]">
                            {isEditing ? "Editar Proceso" : "Nuevo Proceso"}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {isEditing ? "Actualiza la información del proceso" : "Crea un nuevo proceso ISO 9001"}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información Básica */}
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl">Información Básica</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CampoCodigoAutomatico value={formData.codigo} />

                                <div className="space-y-2">
                                    <Label htmlFor="version">Versión</Label>
                                    <Input
                                        id="version"
                                        value={formData.version || ""}
                                        onChange={(e) => handleChange("version", e.target.value)}
                                        placeholder="1.0"
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre del Proceso *</Label>
                                <Input
                                    id="nombre"
                                    value={formData.nombre}
                                    onChange={(e) => handleChange("nombre", e.target.value)}
                                    placeholder="Planificación Estratégica"
                                    className="rounded-xl"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="area_id">Área Responsable</Label>
                                    <Select
                                        value={formData.area_id || ""}
                                        onValueChange={(value) => handleChange("area_id", value || undefined)}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Seleccionar área..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_ninguno_">Sin asignar</SelectItem>
                                            {areas.map((area) => (
                                                <SelectItem key={area.id} value={area.id}>
                                                    {area.nombre} ({area.codigo})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="responsable_id">Líder del Proceso</Label>
                                    <Select
                                        value={formData.responsable_id || ""}
                                        onValueChange={(value) => handleChange("responsable_id", value || undefined)}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Seleccionar líder..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_ninguno_">Sin asignar</SelectItem>
                                            {usuarios.map((usuario) => (
                                                <SelectItem key={usuario.id} value={usuario.id}>
                                                    {usuario.nombre} {usuario.primer_apellido}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tipo_proceso">Tipo de Proceso</Label>
                                    <Select
                                        value={formData.tipo_proceso}
                                        onValueChange={(value) => handleChange("tipo_proceso", value as TipoProceso)}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={TipoProceso.ESTRATEGICO}>Estratégico</SelectItem>
                                            <SelectItem value={TipoProceso.OPERATIVO}>Operativo</SelectItem>
                                            <SelectItem value={TipoProceso.APOYO}>Apoyo</SelectItem>
                                            <SelectItem value={TipoProceso.MEDICION}>Medición</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="etapa_phva">Etapa PHVA</Label>
                                    <Select
                                        value={formData.etapa_phva}
                                        onValueChange={(value) => handleChange("etapa_phva", value as EtapaPHVA)}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={EtapaPHVA.PLANEAR}>Planear</SelectItem>
                                            <SelectItem value={EtapaPHVA.HACER}>Hacer</SelectItem>
                                            <SelectItem value={EtapaPHVA.VERIFICAR}>Verificar</SelectItem>
                                            <SelectItem value={EtapaPHVA.ACTUAR}>Actuar</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="estado">Estado</Label>
                                    <Select
                                        value={formData.estado}
                                        onValueChange={(value) => handleChange("estado", value as EstadoProceso)}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={EstadoProceso.BORRADOR}>Borrador</SelectItem>
                                            <SelectItem value={EstadoProceso.REVISION}>En Revisión</SelectItem>
                                            <SelectItem value={EstadoProceso.ACTIVO}>Activo</SelectItem>
                                            <SelectItem value={EstadoProceso.SUSPENDIDO}>Suspendido</SelectItem>
                                            <SelectItem value={EstadoProceso.OBSOLETO}>Obsoleto</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="restringido"
                                    checked={formData.restringido}
                                    onCheckedChange={(checked) => handleChange("restringido", checked)}
                                />
                                <Label htmlFor="restringido" className="cursor-pointer">
                                    Proceso restringido (acceso limitado)
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Caracterización ISO 9001 */}
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl">Caracterización del Proceso (ISO 9001)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="objetivo">Objetivo</Label>
                                <Textarea
                                    id="objetivo"
                                    value={formData.objetivo || ""}
                                    onChange={(e) => handleChange("objetivo", e.target.value)}
                                    placeholder="Describir el propósito del proceso..."
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="alcance">Alcance</Label>
                                <Textarea
                                    id="alcance"
                                    value={formData.alcance || ""}
                                    onChange={(e) => handleChange("alcance", e.target.value)}
                                    placeholder="Definir los límites del proceso..."
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="entradas">Entradas</Label>
                                    <Textarea
                                        id="entradas"
                                        value={formData.entradas || ""}
                                        onChange={(e) => handleChange("entradas", e.target.value)}
                                        placeholder="Insumos, información, requisitos..."
                                        className="rounded-xl min-h-[100px]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="salidas">Salidas</Label>
                                    <Textarea
                                        id="salidas"
                                        value={formData.salidas || ""}
                                        onChange={(e) => handleChange("salidas", e.target.value)}
                                        placeholder="Productos, servicios, resultados..."
                                        className="rounded-xl min-h-[100px]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="recursos_necesarios">Recursos Necesarios</Label>
                                <Textarea
                                    id="recursos_necesarios"
                                    value={formData.recursos_necesarios || ""}
                                    onChange={(e) => handleChange("recursos_necesarios", e.target.value)}
                                    placeholder="Personal, equipos, infraestructura..."
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="criterios_desempeno">Criterios de Desempeño</Label>
                                <Textarea
                                    id="criterios_desempeno"
                                    value={formData.criterios_desempeno || ""}
                                    onChange={(e) => handleChange("criterios_desempeno", e.target.value)}
                                    placeholder="Indicadores, metas, métodos de medición..."
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="riesgos_oportunidades">Riesgos y Oportunidades</Label>
                                <Textarea
                                    id="riesgos_oportunidades"
                                    value={formData.riesgos_oportunidades || ""}
                                    onChange={(e) => handleChange("riesgos_oportunidades", e.target.value)}
                                    placeholder="Riesgos identificados y oportunidades de mejora..."
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Botones de Acción */}
                    <div className="flex gap-4 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate("/procesos/listado")}
                            className="rounded-xl px-6"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={guardando}
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-6"
                        >
                            {guardando ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {isEditing ? "Actualizar" : "Crear"} Proceso
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
