import React, { useState, useEffect } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Edit, Eye, Plus, ShieldCheck, ListChecks, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { auditoriaService, ProgramaAuditoria } from '@/services/auditoria.service';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeProgramaAuditoria } from "@/utils/documentosRegistrosSGC";

const ProgramaAnual: React.FC = () => {
    const [programas, setProgramas] = useState<ProgramaAuditoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDocumento, setShowDocumento] = useState(false);
    const [selectedPrograma, setSelectedPrograma] = useState<ProgramaAuditoria | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ProgramaAuditoria>>({
        anio: new Date().getFullYear(),
        objetivo: '',
        estado: 'borrador',
        criterioRiesgo: ''
    });

    useEffect(() => {
        cargarProgramas();
    }, []);

    const cargarProgramas = async () => {
        try {
            setLoading(true);
            const data = await auditoriaService.getAllProgramas();
            setProgramas(data);
        } catch (error: any) {
            console.error('Error cargando programas:', error);
            toast.error('Error al cargar programas de auditoría');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            anio: new Date().getFullYear() + 1,
            objetivo: '',
            estado: 'borrador',
            criterioRiesgo: ''
        });
        setShowModal(true);
    };

    const handleView = (programa: ProgramaAuditoria) => {
        setSelectedPrograma(programa);
        setShowDocumento(true);
    };

    const handleEdit = (programa: ProgramaAuditoria) => {
        setEditingId(programa.id);
        setFormData({
            anio: programa.anio,
            objetivo: programa.objetivo || '',
            estado: programa.estado,
            criterioRiesgo: programa.criterioRiesgo || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.objetivo || !String(formData.objetivo).trim()) {
            toast.error('El objetivo del programa es obligatorio (ISO 9001:2015 9.2)');
            return;
        }
        if (
            formData.estado === 'aprobado' &&
            (!formData.criterioRiesgo || !String(formData.criterioRiesgo).trim())
        ) {
            toast.error('Para aprobar el programa debes definir criterios de riesgo');
            return;
        }
        try {
            if (editingId) {
                await auditoriaService.updatePrograma(editingId, formData);
                toast.success('Programa actualizado correctamente');
            } else {
                await auditoriaService.createPrograma(formData);
                toast.success('Programa creado correctamente');
            }
            setShowModal(false);
            cargarProgramas();
        } catch (error: any) {
            console.error('Error guardando programa:', error);
            toast.error(error.message || 'Error al guardar el programa');
        }
    };

    const getEstadoBadgeColor = (estado: string) => {
        switch (estado) {
            case 'aprobado': return 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]/30';
            case 'en_ejecucion': return 'bg-[#FFF7ED] text-[#9A3412] border-[#F97316]/30';
            case 'finalizado': return 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]/30';
            case 'borrador': return 'bg-[#F8FAFC] text-[#6B7280] border-[#E5E7EB]';
            case 'cerrado': return 'bg-[#E0EDFF] text-[#1E3A8A] border-[#2563EB]/30';
            default: return 'bg-[#F8FAFC] text-[#6B7280] border-[#E5E7EB]';
        }
    };

    const totalProgramas = programas.length;
    const aprobados = programas.filter((p) => p.estado === 'aprobado').length;
    const enEjecucion = programas.filter((p) => p.estado === 'en_ejecucion').length;
    const conCriterioRiesgo = programas.filter((p) => !!p.criterioRiesgo && p.criterioRiesgo.trim().length > 0).length;

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                                <Calendar className="h-9 w-9 text-[#2563EB]" />
                                Programa Anual de Auditorías
                            </h1>
                            <p className="text-[#6B7280] mt-2 text-lg">
                                Planificación anual alineada a ISO 9001:2015 (9.2)
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                                    {totalProgramas} programas
                                </Badge>
                                {enEjecucion > 0 && (
                                    <Badge className="bg-[#FFF7ED] text-[#F97316] border border-[#F97316]/30">
                                        {enEjecucion} en ejecución
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Button onClick={handleCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold">
                            <Plus className="mr-2 h-5 w-5" />
                            Nuevo Programa
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription className="font-bold text-[#1E3A8A]">Programas</CardDescription>
                                <Calendar className="h-8 w-8 text-[#2563EB]" />
                            </div>
                            <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{totalProgramas}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription className="font-bold text-[#065F46]">Aprobados</CardDescription>
                                <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
                            </div>
                            <CardTitle className="text-4xl font-bold text-[#065F46]">{aprobados}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription className="font-bold text-[#9A3412]">En ejecución</CardDescription>
                                <ListChecks className="h-8 w-8 text-[#F97316]" />
                            </div>
                            <CardTitle className="text-4xl font-bold text-[#9A3412]">{enEjecucion}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription className="font-bold text-[#1E3A8A]">Con criterio de riesgo</CardDescription>
                                <ShieldCheck className="h-8 w-8 text-[#2563EB]" />
                            </div>
                            <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{conCriterioRiesgo}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
                    <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC]">
                        <h2 className="text-xl font-bold text-[#1E3A8A]">Programas registrados</h2>
                    </div>
                    {loading ? (
                        <div className="p-8"><LoadingSpinner message="Cargando" /></div>
                    ) : programas.length === 0 ? (
                        <div className="text-center p-16 text-[#6B7280]">No hay programas registrados.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-[#F8FAFC]">
                                <TableRow>
                                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Año</TableHead>
                                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Objetivo</TableHead>
                                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Estado</TableHead>
                                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Fecha de creación</TableHead>
                                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {programas.map((prog) => (
                                    <TableRow key={prog.id} className="hover:bg-[#F8FAFC]">
                                        <TableCell className="px-6 py-4 font-bold text-[#1E3A8A]">{prog.anio}</TableCell>
                                        <TableCell className="px-6 py-4 max-w-md truncate">{prog.objetivo || 'Sin objetivo definido'}</TableCell>
                                        <TableCell className="px-6 py-4">
                                            <Badge variant="outline" className={getEstadoBadgeColor(prog.estado)}>
                                                {prog.estado.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-[#6B7280]">{prog.creadoEn ? new Date(prog.creadoEn).toLocaleDateString("es-CO") : '-'}</TableCell>
                                        <TableCell className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleView(prog)}>
                                                    <Eye className="h-4 w-4 mr-1" /> Ver
                                                </Button>
                                                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleEdit(prog)}>
                                                    <Edit className="h-4 w-4 mr-1" /> Editar
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-[600px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[#1E3A8A]">{editingId ? 'Editar Programa' : 'Nuevo Programa Anual'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="anio">Año</Label>
                                <Input
                                    id="anio"
                                    type="number"
                                    required
                                    className="rounded-xl"
                                    value={formData.anio}
                                    onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="estado">Estado</Label>
                                <Select
                                    value={formData.estado}
                                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Seleccionar estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="borrador">Borrador</SelectItem>
                                        <SelectItem value="aprobado">Aprobado</SelectItem>
                                        <SelectItem value="en_ejecucion">En ejecución</SelectItem>
                                        <SelectItem value="finalizado">Finalizado</SelectItem>
                                        <SelectItem value="cerrado">Cerrado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="objetivo">Objetivo General</Label>
                            <Textarea
                                id="objetivo"
                                required
                                className="rounded-xl"
                                value={formData.objetivo}
                                onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                                placeholder="Describa el objetivo general del programa anual..."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="criterioRiesgo">Criterios de Riesgo</Label>
                            <Textarea
                                id="criterioRiesgo"
                                className="rounded-xl"
                                value={formData.criterioRiesgo}
                                onChange={(e) => setFormData({ ...formData, criterioRiesgo: e.target.value })}
                                placeholder="Defina criterios para priorizar auditorías: criticidad, resultados previos, cambios, quejas..."
                                rows={3}
                            />
                            <p className="text-xs text-[#6B7280]">
                                Obligatorio para aprobar el programa.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowModal(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl">
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <VistaDocumentoSGCDialog
                open={showDocumento}
                onOpenChange={setShowDocumento}
                data={selectedPrograma ? datosSGCDesdeProgramaAuditoria(selectedPrograma) : null}
                title="Programa anual de auditorías"
                description="Documento controlado con el objetivo, criterios de riesgo y estado del programa anual."
                extraActions={
                    selectedPrograma ? (
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                                setShowDocumento(false);
                                handleEdit(selectedPrograma);
                            }}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </Button>
                    ) : null
                }
            />
            </div>
        </div>
    );
};

export default ProgramaAnual;
