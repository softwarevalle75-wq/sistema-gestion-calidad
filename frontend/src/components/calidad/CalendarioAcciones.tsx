import { useState, useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccionCorrectiva } from "@/services/accionCorrectiva.service";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CalendarioAccionesProps {
    acciones: AccionCorrectiva[];
    onSelectAccion?: (id: string) => void;
}

export default function CalendarioAcciones({ acciones, onSelectAccion }: CalendarioAccionesProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(new Date());

    // Generar días del mes actual para renderizar la cuadrícula
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Semana empieza el lunes
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        return eachDayOfInterval({
            start: startDate,
            end: endDate
        });
    }, [currentMonth]);

    // Agrupar acciones por fecha de compromiso
    const accionesPorFecha = useMemo(() => {
        const map = new Map<string, AccionCorrectiva[]>();

        acciones.forEach(accion => {
            if (accion.fechaCompromiso) {
                // Ajustar zona horaria si es necesario o usar solo fecha string YYYY-MM-DD
                const dateKey = new Date(accion.fechaCompromiso).toISOString().split('T')[0];
                const existing = map.get(dateKey) || [];
                map.set(dateKey, [...existing, accion]);
            }
        });

        return map;
    }, [acciones]);

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'pendiente': return 'bg-gray-400';
            case 'en_proceso': return 'bg-blue-500';
            case 'implementada': return 'bg-purple-500';
            case 'verificada': return 'bg-green-500';
            case 'cerrada': return 'bg-slate-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] h-full flex flex-col">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
                <div className="min-w-0">
                    <CardTitle className="text-lg text-[#1E3A8A] flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 shrink-0" />
                        <span className="break-words">Calendario de Compromisos</span>
                    </CardTitle>
                    <CardDescription>
                        Visualiza las fechas límite de tus acciones
                    </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-full">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold min-w-[8rem] text-center capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </span>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-full">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs ml-2 text-blue-600">
                        Hoy
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 auto-rows-fr min-h-[280px] sm:h-[400px]">
                    {calendarDays.map((day, dayIdx) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const accionesDelDia = accionesPorFecha.get(dateKey) || [];
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isDayToday = isToday(day);

                        return (
                            <div
                                key={day.toString()}
                                className={`
                                    min-h-[40px] sm:min-h-[50px] p-1 sm:p-2 border rounded-lg flex flex-col gap-1 transition-colors relative
                                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/50 text-gray-400'}
                                    ${isDayToday ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-100'}
                                    hover:border-blue-200 hover:shadow-sm
                                `}
                            >
                                <span className={`text-xs font-medium ${!isCurrentMonth && 'opacity-50'}`}>
                                    {format(day, 'd')}
                                </span>

                                {accionesDelDia.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-1 overflow-visible z-10">
                                        <TooltipProvider>
                                            {accionesDelDia.slice(0, 3).map((accion, i) => (
                                                <Tooltip key={accion.id}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectAccion?.(accion.id);
                                                            }}
                                                            className={`h-1.5 w-full rounded-full cursor-pointer ${getEstadoColor(accion.estado)}`}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="p-3 max-w-[250px] bg-white border border-gray-200 shadow-lg text-black">
                                                        <div className="space-y-1">
                                                            <p className="font-bold text-xs">{accion.codigo}</p>
                                                            <p className="text-xs line-clamp-2">{accion.descripcion}</p>
                                                            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                                                                <span className="capitalize">{accion.estado.replace('_', ' ')}</span>
                                                                <span className="capitalize">{accion.tipo}</span>
                                                            </div>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </TooltipProvider>

                                        {accionesDelDia.length > 3 && (
                                            <span className="text-[10px] text-gray-400 text-center leading-none">
                                                +{accionesDelDia.length - 3} más
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs justify-center border-t pt-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                        <span>Pendiente</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>En Proceso</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        <span>Implementada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span>Verificada</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
