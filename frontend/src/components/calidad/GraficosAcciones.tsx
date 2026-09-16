import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AccionCorrectiva } from "@/services/accionCorrectiva.service";

interface GraficosAccionesProps {
    acciones: AccionCorrectiva[];
}

const COLORS = {
    correctiva: '#F43F5E', // Rose 500
    preventiva: '#FB923C', // Orange 400
    mejora: '#10B981',     // Emerald 500
    pendiente: '#94A3B8',  // Slate 400
    en_proceso: '#3B82F6', // Blue 500
    implementada: '#A855F7', // Purple 500
    verificada: '#059669', // Emerald 600
    cerrada: '#475569',    // Slate 600
};

const GRADIENTS = {
    blue: ['#60A5FA', '#2563EB'],
    emerald: ['#34D399', '#059669'],
    rose: ['#FB7185', '#E11D48'],
    amber: ['#FBBF24', '#D97706'],
    violet: ['#A78BFA', '#7C3AED'],
};

export default function GraficosAcciones({ acciones }: GraficosAccionesProps) {
    // Datos para gráfico por Estado
    const datosEstado = useMemo(() => {
        const counts = acciones.reduce((acc, curr) => {
            acc[curr.estado] = (acc[curr.estado] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return [
            { name: 'Pendiente', valor: counts['pendiente'] || 0, fill: COLORS.pendiente },
            { name: 'En Proceso', valor: counts['en_proceso'] || 0, fill: COLORS.en_proceso },
            { name: 'Implementada', valor: counts['implementada'] || 0, fill: COLORS.implementada },
            { name: 'Verificada', valor: counts['verificada'] || 0, fill: COLORS.verificada },
            { name: 'Cerrada', valor: counts['cerrada'] || 0, fill: COLORS.cerrada },
        ];
    }, [acciones]);

    // Datos para gráfico por Tipo
    const datosTipo = useMemo(() => {
        const counts = acciones.reduce((acc, curr) => {
            acc[curr.tipo] = (acc[curr.tipo] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return [
            { name: 'Correctiva', value: counts['correctiva'] || 0, color: COLORS.correctiva },
            { name: 'Preventiva', value: counts['preventiva'] || 0, color: COLORS.preventiva },
            { name: 'Mejora', value: counts['mejora'] || 0, color: COLORS.mejora },
        ].filter(item => item.value > 0);
    }, [acciones]);

    const totalAcciones = acciones.length;


    // Datos para tendencia mensual (últimos 6 meses)
    const datosTendencia = useMemo(() => {
        const hoy = new Date();
        const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1);
            return {
                mes: d.toLocaleString('es-CO', { month: 'short' }), // Ene, Feb, etc.
                key: `${d.getFullYear()}-${d.getMonth()}`,
                total: 0,
                cerradas: 0
            };
        });

        acciones.forEach(accion => {
            const fecha = new Date(accion.creadoEn);
            const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;
            const mesData = ultimos6Meses.find(m => m.key === key);

            if (mesData) {
                mesData.total += 1;
                if (accion.estado === 'cerrada' || accion.estado === 'verificada') {
                    mesData.cerradas += 1;
                }
            }
        });

        return ultimos6Meses;
    }, [acciones]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
            {/* Estado de Acciones - Barras */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-1 rounded-2xl shadow-sm border-[#E5E7EB] min-w-0">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-[#0F172A]">Estado de Gestión</CardTitle>
                    <CardDescription>Distribución actual por fase operativa</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={datosEstado} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    {Object.entries(GRADIENTS).map(([key, colors]) => (
                                        <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={colors[0]} stopOpacity={1} />
                                            <stop offset="100%" stopColor={colors[1]} stopOpacity={1} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="name"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748B', fontWeight: 500 }}
                                />
                                <YAxis
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748B' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                    cursor={{ fill: '#F8FAFC', radius: 4 }}
                                />
                                <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={40}>
                                    {datosEstado.map((entry, index) => {
                                        let gradId = 'grad-blue';
                                        if (entry.name === 'Cerrada') gradId = 'grad-violet';
                                        if (entry.name === 'Verificada') gradId = 'grad-emerald';
                                        if (entry.name === 'Pendiente') gradId = 'grad-rose';
                                        return <Cell key={`cell-${index}`} fill={`url(#${gradId})`} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Tipos de Acciones - Donut */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-1 rounded-2xl shadow-sm border-[#E5E7EB] min-w-0">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-[#0F172A]">Clasificación</CardTitle>
                    <CardDescription>Naturaleza de las acciones reportadas</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full relative flex items-center justify-center">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-[#0F172A] leading-none">{totalAcciones}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={datosTipo}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={75}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {datosTipo.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '8px 12px'
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-xs font-semibold text-slate-600">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Tendencia de Creación - Área */}
            <Card className="col-span-1 md:col-span-2 rounded-2xl shadow-sm border-[#E5E7EB] min-w-0">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-[#0F172A]">Dinámica Mensual</CardTitle>
                    <CardDescription>Evolución de hallazgos vs resoluciones (Últimos 6 meses)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={datosTendencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCerradas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="mes"
                                    axisLine={false}
                                    tickLine={false}
                                    fontSize={11}
                                    tick={{ fill: '#64748B', fontWeight: 500 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    fontSize={11}
                                    tick={{ fill: '#64748B' }}
                                />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    name="Reportadas"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                    animationDuration={1500}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cerradas"
                                    name="Resueltas"
                                    stroke="#10B981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorCerradas)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
