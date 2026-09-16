import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";

export interface FiltrosAcciones {
    responsable?: string;
    tipo?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    busqueda?: string;
}

interface FiltrosAccionesProps {
    filtros: FiltrosAcciones;
    onFiltrosChange: (filtros: FiltrosAcciones) => void;
    responsables?: Array<{ id: string; nombre: string }>;
}

export default function FiltrosAccionesCorrectivas({
    filtros,
    onFiltrosChange,
    responsables = [],
}: FiltrosAccionesProps) {
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    const handleChange = (campo: keyof FiltrosAcciones, valor: string) => {
        onFiltrosChange({
            ...filtros,
            [campo]: valor || undefined,
        });
    };

    const limpiarFiltros = () => {
        onFiltrosChange({});
    };

    const filtrosActivos = Object.values(filtros).filter(Boolean).length;

    return (
        <div className="space-y-4">
            {/* Botón de toggle y búsqueda rápida */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <Input
                        placeholder={SEARCH_ANY_PLACEHOLDER}
                        value={filtros.busqueda || ""}
                        onChange={(e) => handleChange("busqueda", e.target.value)}
                        className="rounded-xl border-[#E5E7EB]"
                    />
                </div>
                <Button
                    onClick={() => setMostrarFiltros(!mostrarFiltros)}
                    variant="outline"
                    className="rounded-xl border-[#E5E7EB] hover:bg-[#F8FAFC] relative"
                >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros Avanzados
                    {filtrosActivos > 0 && (
                        <span className="absolute -top-2 -right-2 h-5 w-5 bg-[#2563EB] text-white text-xs rounded-full flex items-center justify-center">
                            {filtrosActivos}
                        </span>
                    )}
                </Button>
            </div>

            {/* Panel de filtros avanzados */}
            {mostrarFiltros && (
                <Card className="rounded-2xl shadow-sm border-[#E5E7EB] bg-[#F8FAFC]">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Filtro por Tipo */}
                            <div className="space-y-2">
                                <Label htmlFor="tipo" className="text-sm font-medium text-[#1E3A8A]">
                                    Tipo de Acción
                                </Label>
                                <Select
                                    value={filtros.tipo || "todos"}
                                    onValueChange={(value) => handleChange("tipo", value === "todos" ? "" : value)}
                                >
                                    <SelectTrigger id="tipo" className="rounded-xl border-[#E5E7EB] bg-white">
                                        <SelectValue placeholder="Todos los tipos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos los tipos</SelectItem>
                                        <SelectItem value="correctiva">Correctiva</SelectItem>
                                        <SelectItem value="preventiva">Preventiva</SelectItem>
                                        <SelectItem value="mejora">Mejora</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtro por Estado */}
                            <div className="space-y-2">
                                <Label htmlFor="estado" className="text-sm font-medium text-[#1E3A8A]">
                                    Estado
                                </Label>
                                <Select
                                    value={filtros.estado || "todos"}
                                    onValueChange={(value) => handleChange("estado", value === "todos" ? "" : value)}
                                >
                                    <SelectTrigger id="estado" className="rounded-xl border-[#E5E7EB] bg-white">
                                        <SelectValue placeholder="Todos los estados" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos los estados</SelectItem>
                                        <SelectItem value="pendiente">Pendiente</SelectItem>
                                        <SelectItem value="en_proceso">En Proceso</SelectItem>
                                        <SelectItem value="implementada">Implementada</SelectItem>
                                        <SelectItem value="verificada">Verificada</SelectItem>
                                        <SelectItem value="cerrada">Cerrada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtro por Responsable */}
                            {responsables.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="responsable" className="text-sm font-medium text-[#1E3A8A]">
                                        Responsable
                                    </Label>
                                    <Select
                                        value={filtros.responsable || "todos"}
                                        onValueChange={(value) => handleChange("responsable", value === "todos" ? "" : value)}
                                    >
                                        <SelectTrigger id="responsable" className="rounded-xl border-[#E5E7EB] bg-white">
                                            <SelectValue placeholder="Todos los responsables" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos">Todos los responsables</SelectItem>
                                            {responsables.map((resp) => (
                                                <SelectItem key={resp.id} value={resp.id}>
                                                    {resp.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Filtro por Fecha Desde */}
                            <div className="space-y-2">
                                <Label htmlFor="fechaDesde" className="text-sm font-medium text-[#1E3A8A]">
                                    Fecha Desde
                                </Label>
                                <Input
                                    id="fechaDesde"
                                    type="date"
                                    value={filtros.fechaDesde || ""}
                                    onChange={(e) => handleChange("fechaDesde", e.target.value)}
                                    className="rounded-xl border-[#E5E7EB] bg-white"
                                />
                            </div>

                            {/* Filtro por Fecha Hasta */}
                            <div className="space-y-2">
                                <Label htmlFor="fechaHasta" className="text-sm font-medium text-[#1E3A8A]">
                                    Fecha Hasta
                                </Label>
                                <Input
                                    id="fechaHasta"
                                    type="date"
                                    value={filtros.fechaHasta || ""}
                                    onChange={(e) => handleChange("fechaHasta", e.target.value)}
                                    className="rounded-xl border-[#E5E7EB] bg-white"
                                />
                            </div>
                        </div>

                        {/* Botón limpiar filtros */}
                        {filtrosActivos > 0 && (
                            <div className="mt-4 flex justify-end">
                                <Button
                                    onClick={limpiarFiltros}
                                    variant="ghost"
                                    size="sm"
                                    className="text-[#6B7280] hover:text-[#1E3A8A] hover:bg-white rounded-xl"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Limpiar filtros
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
