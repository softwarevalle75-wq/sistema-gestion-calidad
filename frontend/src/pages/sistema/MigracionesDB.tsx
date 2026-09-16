import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Database,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    RefreshCw,
    History,
    GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    migracionService,
    type MigracionInfo,
    type MigracionEstadoActual,
} from '@/services/migracion.service';

export default function MigracionesDB() {
    const [migraciones, setMigraciones] = useState<MigracionInfo[]>([]);
    const [estado, setEstado] = useState<MigracionEstadoActual | null>(null);
    const [loading, setLoading] = useState(true);
    const [operando, setOperando] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [operacionPendiente, setOperacionPendiente] = useState<{
        tipo: 'upgrade' | 'downgrade';
        target: string;
    } | null>(null);

    // Cargar datos iniciales
    useEffect(() => {
        cargarMigraciones();
    }, []);

    const cargarMigraciones = async () => {
        try {
            setLoading(true);
            const data = await migracionService.listarMigraciones();
            setMigraciones(data.migraciones);
            setEstado(data.estado);
        } catch (error) {
            console.error('Error al cargar migraciones:', error);
            toast.error('Error al cargar las migraciones');
        } finally {
            setLoading(false);
        }
    };

    const confirmarOperacion = (tipo: 'upgrade' | 'downgrade', target: string) => {
        setOperacionPendiente({ tipo, target });
        setShowConfirmDialog(true);
    };

    const ejecutarOperacion = async () => {
        if (!operacionPendiente) return;

        try {
            setOperando(true);
            setShowConfirmDialog(false);

            const { tipo, target } = operacionPendiente;
            let resultado;

            if (tipo === 'upgrade') {
                resultado = await migracionService.aplicarMigraciones(target);
                if (resultado.success) {
                    toast.success('Migraciones aplicadas exitosamente');
                } else {
                    toast.error(resultado.message);
                }
            } else {
                resultado = await migracionService.revertirMigraciones(target);
                if (resultado.success) {
                    toast.success('Migraciones revertidas exitosamente');
                } else {
                    toast.error(resultado.message);
                }
            }

            // Recargar datos
            await cargarMigraciones();
        } catch (error: any) {
            console.error('Error en operación:', error);
            toast.error(error.response?.data?.detail || 'Error al ejecutar la operación');
        } finally {
            setOperando(false);
            setOperacionPendiente(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
            <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                        <Database className="h-9 w-9 text-[#2563EB]" />
                        Migraciones de Base de Datos
                    </h1>
                    <p className="text-[#6B7280] mt-2">
                        Gestiona las migraciones de Alembic para el control de versiones de la base de datos
                    </p>
                </div>
                <Button onClick={cargarMigraciones} variant="outline" disabled={operando} className="rounded-xl">
                    <RefreshCw className={`h-4 w-4 mr-2 ${operando ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
            </div>
            </div>

            {/* Estado Actual */}
            {estado && (
                <Alert className="bg-blue-50 border-blue-200">
                    <GitBranch className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                        <div className="flex items-center justify-between">
                            <div>
                                <strong>Revisión actual:</strong>{' '}
                                <code className="bg-blue-100 px-2 py-1 rounded">
                                    {estado.revision_actual || 'Sin migraciones aplicadas'}
                                </code>
                                {estado.descripcion && (
                                    <span className="ml-2 text-sm">- {estado.descripcion}</span>
                                )}
                            </div>
                            <div className="text-sm">
                                Última actualización:{' '}
                                {new Date(estado.ultima_actualizacion).toLocaleString('es-ES')}
                            </div>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Migraciones</CardDescription>
                        <CardTitle className="text-3xl">{estado?.total_migraciones || 0}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Database className="h-4 w-4 text-gray-400" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Aplicadas</CardDescription>
                        <CardTitle className="text-3xl text-green-600">
                            {estado?.migraciones_aplicadas || 0}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Pendientes</CardDescription>
                        <CardTitle className="text-3xl text-yellow-600">
                            {estado?.migraciones_pendientes || 0}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Estado</CardDescription>
                        <CardTitle className="text-lg">
                            {estado?.migraciones_pendientes === 0 ? (
                                <Badge className="bg-green-500">Actualizada</Badge>
                            ) : (
                                <Badge className="bg-yellow-500">Pendiente</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                    </CardContent>
                </Card>
            </div>

            {/* Acciones Rápidas */}
            {estado && estado.migraciones_pendientes > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className="text-yellow-900 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Migraciones Pendientes
                        </CardTitle>
                        <CardDescription className="text-yellow-700">
                            Hay {estado.migraciones_pendientes} migración(es) pendiente(s) de aplicar
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => confirmarOperacion('upgrade', 'head')}
                            disabled={operando}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <ArrowUp className="h-4 w-4 mr-2" />
                            Aplicar Todas las Migraciones
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Tabla de Migraciones */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Migraciones</CardTitle>
                    <CardDescription>
                        Historial completo de migraciones de la base de datos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estado</TableHead>
                                <TableHead>Revisión</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Fecha Creación</TableHead>
                                <TableHead>Revisión Anterior</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {migraciones.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-gray-500">
                                        No hay migraciones disponibles
                                    </TableCell>
                                </TableRow>
                            ) : (
                                migraciones.map((migracion) => (
                                    <TableRow key={migracion.revision}>
                                        <TableCell>
                                            {migracion.aplicada ? (
                                                <Badge className="bg-green-500">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Aplicada
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Pendiente
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                                {migracion.revision.substring(0, 8)}
                                            </code>
                                        </TableCell>
                                        <TableCell className="font-medium">{migracion.descripcion}</TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {migracion.fecha_creacion
                                                ? new Date(migracion.fecha_creacion).toLocaleDateString('es-ES')
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {migracion.down_revision ? (
                                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                                    {migracion.down_revision.substring(0, 8)}
                                                </code>
                                            ) : (
                                                <span className="text-gray-400 text-sm">Base</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Acciones Avanzadas */}
            {estado && estado.migraciones_aplicadas > 0 && (
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-900 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Zona de Peligro
                        </CardTitle>
                        <CardDescription className="text-red-700">
                            Operaciones que pueden afectar la base de datos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => confirmarOperacion('downgrade', '-1')}
                            disabled={operando}
                            variant="destructive"
                        >
                            <ArrowDown className="h-4 w-4 mr-2" />
                            Revertir Última Migración
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Dialog de Confirmación */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Operación</DialogTitle>
                        <DialogDescription>
                            {operacionPendiente?.tipo === 'upgrade'
                                ? '¿Estás seguro de que deseas aplicar las migraciones? Esta operación modificará la estructura de la base de datos.'
                                : '¿Estás seguro de que deseas revertir la migración? Esta operación puede causar pérdida de datos.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={ejecutarOperacion}
                            className={
                                operacionPendiente?.tipo === 'upgrade'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                            }
                        >
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </div>
    );
}
