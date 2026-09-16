import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  TrendingUpIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4 mb-8">
      <Card className="premium-card overflow-hidden group bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="relative z-10 pb-2">
          <CardDescription className="font-bold text-red-900/70 dark:text-red-300 uppercase text-[10px] tracking-widest">No Conformidades Activas</CardDescription>
          <CardTitle className="text-4xl font-black tracking-tight text-red-900 dark:text-white tabular-nums">
            12
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-full text-[10px] font-bold uppercase bg-white/50 text-red-700 border-red-200 px-2 py-0.5 shadow-sm backdrop-blur-sm"
            >
              <AlertTriangle className="size-3" />3 Mayores
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="relative z-10 flex-col items-start gap-1 text-xs border-t border-red-200/30 dark:border-red-800/30 pt-3 mt-2">
          <div className="line-clamp-1 flex items-center gap-1.5 font-bold text-red-700">
            Requiere atención <AlertTriangle className="size-3" />
          </div>
          <div className="text-red-900/60 dark:text-red-400 font-medium">9 menores en tratamiento</div>
        </CardFooter>
      </Card>

      <Card className="premium-card overflow-hidden group bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="relative z-10 pb-2">
          <CardDescription className="font-bold text-blue-900/70 dark:text-blue-300 uppercase text-[10px] tracking-widest">Auditorías Programadas</CardDescription>
          <CardTitle className="text-4xl font-black tracking-tight text-blue-900 dark:text-white tabular-nums">
            8
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-full text-[10px] font-bold uppercase bg-white/50 text-blue-700 border-blue-200 px-2 py-0.5 shadow-sm backdrop-blur-sm">
              <FileCheck className="size-3" />
              Este mes
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="relative z-10 flex-col items-start gap-1 text-xs border-t border-blue-200/30 dark:border-blue-800/30 pt-3 mt-2">
          <div className="line-clamp-1 flex items-center gap-1.5 font-bold text-blue-700">
            5 internas, 3 externas <FileCheck className="size-3" />
          </div>
          <div className="text-blue-900/60 dark:text-blue-400 font-medium">
            Próxima: ISO 9001 - 15 Nov
          </div>
        </CardFooter>
      </Card>

      <Card className="premium-card overflow-hidden group bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="relative z-10 pb-2">
          <CardDescription className="font-bold text-emerald-900/70 dark:text-emerald-300 uppercase text-[10px] tracking-widest">Índice de Cumplimiento</CardDescription>
          <CardTitle className="text-4xl font-black tracking-tight text-emerald-900 dark:text-white tabular-nums">
            94.5%
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-full text-[10px] font-bold uppercase bg-white/50 text-emerald-700 border-emerald-200 px-2 py-0.5 shadow-sm backdrop-blur-sm"
            >
              <TrendingUpIcon className="size-3" />
              +2.5%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="relative z-10 flex-col items-start gap-1 text-xs border-t border-emerald-200/30 dark:border-emerald-800/30 pt-3 mt-2">
          <div className="line-clamp-1 flex items-center gap-1.5 font-bold text-emerald-700">
            Mejora continua <TrendingUpIcon className="size-3" />
          </div>
          <div className="text-emerald-900/60 dark:text-emerald-400 font-medium">Supera meta del 92%</div>
        </CardFooter>
      </Card>

      <Card className="premium-card overflow-hidden group bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="relative z-10 pb-2">
          <CardDescription className="font-bold text-amber-900/70 dark:text-amber-300 uppercase text-[10px] tracking-widest">Acciones Correctivas</CardDescription>
          <CardTitle className="text-4xl font-black tracking-tight text-amber-900 dark:text-white tabular-nums">
            28
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-full text-[10px] font-bold uppercase bg-white/50 text-amber-700 border-amber-200 px-2 py-0.5 shadow-sm backdrop-blur-sm"
            >
              <CheckCircle2 className="size-3" />
              85% Cerradas
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="relative z-10 flex-col items-start gap-1 text-xs border-t border-amber-200/30 dark:border-amber-800/30 pt-3 mt-2">
          <div className="line-clamp-1 flex items-center gap-1.5 font-bold text-amber-700">
            24 cerradas, 4 en proceso <CheckCircle2 className="size-3" />
          </div>
          <div className="text-amber-900/60 dark:text-amber-400 font-medium">Efectividad del 91%</div>
        </CardFooter>
      </Card>
    </div>
  );
}
