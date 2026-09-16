"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
const chartData = [
  { date: "2024-04-01", noConformidades: 8, accionesCorrectivas: 12 },
  { date: "2024-04-02", noConformidades: 6, accionesCorrectivas: 14 },
  { date: "2024-04-03", noConformidades: 9, accionesCorrectivas: 11 },
  { date: "2024-04-04", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-04-05", noConformidades: 11, accionesCorrectivas: 13 },
  { date: "2024-04-06", noConformidades: 5, accionesCorrectivas: 16 },
  { date: "2024-04-07", noConformidades: 8, accionesCorrectivas: 14 },
  { date: "2024-04-08", noConformidades: 12, accionesCorrectivas: 10 },
  { date: "2024-04-09", noConformidades: 4, accionesCorrectivas: 18 },
  { date: "2024-04-10", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-04-11", noConformidades: 10, accionesCorrectivas: 13 },
  { date: "2024-04-12", noConformidades: 6, accionesCorrectivas: 17 },
  { date: "2024-04-13", noConformidades: 9, accionesCorrectivas: 14 },
  { date: "2024-04-14", noConformidades: 5, accionesCorrectivas: 16 },
  { date: "2024-04-15", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-04-16", noConformidades: 8, accionesCorrectivas: 13 },
  { date: "2024-04-17", noConformidades: 11, accionesCorrectivas: 12 },
  { date: "2024-04-18", noConformidades: 6, accionesCorrectivas: 17 },
  { date: "2024-04-19", noConformidades: 9, accionesCorrectivas: 14 },
  { date: "2024-04-20", noConformidades: 4, accionesCorrectivas: 19 },
  { date: "2024-04-21", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-04-22", noConformidades: 8, accionesCorrectivas: 13 },
  { date: "2024-04-23", noConformidades: 10, accionesCorrectivas: 12 },
  { date: "2024-04-24", noConformidades: 5, accionesCorrectivas: 18 },
  { date: "2024-04-25", noConformidades: 6, accionesCorrectivas: 16 },
  { date: "2024-04-26", noConformidades: 3, accionesCorrectivas: 20 },
  { date: "2024-04-27", noConformidades: 9, accionesCorrectivas: 14 },
  { date: "2024-04-28", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-04-29", noConformidades: 8, accionesCorrectivas: 13 },
  { date: "2024-04-30", noConformidades: 11, accionesCorrectivas: 11 },
  { date: "2024-05-01", noConformidades: 6, accionesCorrectivas: 17 },
  { date: "2024-05-02", noConformidades: 8, accionesCorrectivas: 14 },
  { date: "2024-05-03", noConformidades: 5, accionesCorrectivas: 18 },
  { date: "2024-05-04", noConformidades: 10, accionesCorrectivas: 13 },
  { date: "2024-05-05", noConformidades: 12, accionesCorrectivas: 10 },
  { date: "2024-05-06", noConformidades: 14, accionesCorrectivas: 9 },
  { date: "2024-05-07", noConformidades: 7, accionesCorrectivas: 16 },
  { date: "2024-05-08", noConformidades: 5, accionesCorrectivas: 19 },
  { date: "2024-05-09", noConformidades: 6, accionesCorrectivas: 17 },
  { date: "2024-05-10", noConformidades: 9, accionesCorrectivas: 14 },
  { date: "2024-05-11", noConformidades: 8, accionesCorrectivas: 15 },
  { date: "2024-05-12", noConformidades: 6, accionesCorrectivas: 18 },
  { date: "2024-05-13", noConformidades: 4, accionesCorrectivas: 20 },
  { date: "2024-05-14", noConformidades: 11, accionesCorrectivas: 12 },
  { date: "2024-05-15", noConformidades: 9, accionesCorrectivas: 14 },
  { date: "2024-05-16", noConformidades: 7, accionesCorrectivas: 16 },
  { date: "2024-05-17", noConformidades: 10, accionesCorrectivas: 13 },
  { date: "2024-05-18", noConformidades: 6, accionesCorrectivas: 17 },
  { date: "2024-05-19", noConformidades: 5, accionesCorrectivas: 18 },
  { date: "2024-05-20", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-05-21", noConformidades: 3, accionesCorrectivas: 21 },
  { date: "2024-05-22", noConformidades: 4, accionesCorrectivas: 19 },
  { date: "2024-05-23", noConformidades: 8, accionesCorrectivas: 14 },
  { date: "2024-05-24", noConformidades: 6, accionesCorrectivas: 16 },
  { date: "2024-05-25", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-05-26", noConformidades: 5, accionesCorrectivas: 17 },
  { date: "2024-05-27", noConformidades: 10, accionesCorrectivas: 12 },
  { date: "2024-05-28", noConformidades: 6, accionesCorrectivas: 16 },
  { date: "2024-05-29", noConformidades: 4, accionesCorrectivas: 18 },
  { date: "2024-05-30", noConformidades: 8, accionesCorrectivas: 14 },
  { date: "2024-05-31", noConformidades: 5, accionesCorrectivas: 17 },
  { date: "2024-06-01", noConformidades: 6, accionesCorrectivas: 16 },
  { date: "2024-06-02", noConformidades: 11, accionesCorrectivas: 11 },
  { date: "2024-06-03", noConformidades: 4, accionesCorrectivas: 19 },
  { date: "2024-06-04", noConformidades: 9, accionesCorrectivas: 13 },
  { date: "2024-06-05", noConformidades: 3, accionesCorrectivas: 20 },
  { date: "2024-06-06", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-06-07", noConformidades: 8, accionesCorrectivas: 14 },
  { date: "2024-06-08", noConformidades: 10, accionesCorrectivas: 12 },
  { date: "2024-06-09", noConformidades: 12, accionesCorrectivas: 10 },
  { date: "2024-06-10", noConformidades: 5, accionesCorrectivas: 18 },
  { date: "2024-06-11", noConformidades: 4, accionesCorrectivas: 19 },
  { date: "2024-06-12", noConformidades: 11, accionesCorrectivas: 11 },
  { date: "2024-06-13", noConformidades: 3, accionesCorrectivas: 21 },
  { date: "2024-06-14", noConformidades: 9, accionesCorrectivas: 13 },
  { date: "2024-06-15", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-06-16", noConformidades: 8, accionesCorrectivas: 14 },
  { date: "2024-06-17", noConformidades: 13, accionesCorrectivas: 9 },
  { date: "2024-06-18", noConformidades: 5, accionesCorrectivas: 17 },
  { date: "2024-06-19", noConformidades: 8, accionesCorrectivas: 14 },
  { date: "2024-06-20", noConformidades: 10, accionesCorrectivas: 12 },
  { date: "2024-06-21", noConformidades: 6, accionesCorrectivas: 16 },
  { date: "2024-06-22", noConformidades: 7, accionesCorrectivas: 15 },
  { date: "2024-06-23", noConformidades: 12, accionesCorrectivas: 10 },
  { date: "2024-06-24", noConformidades: 5, accionesCorrectivas: 18 },
  { date: "2024-06-25", noConformidades: 6, accionesCorrectivas: 17 },
  { date: "2024-06-26", noConformidades: 9, accionesCorrectivas: 13 },
  { date: "2024-06-27", noConformidades: 11, accionesCorrectivas: 11 },
  { date: "2024-06-28", noConformidades: 5, accionesCorrectivas: 18 },
  { date: "2024-06-29", noConformidades: 4, accionesCorrectivas: 19 },
  { date: "2024-06-30", noConformidades: 10, accionesCorrectivas: 12 },
]

const chartConfig = {
  items: {
    label: "Items",
  },
  noConformidades: {
    label: "No Conformidades",
    color: "hsl(var(--chart-1))",
  },
  accionesCorrectivas: {
    label: "Acciones Correctivas",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader className="relative pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-1 rounded-full bg-blue-600" />
          <CardTitle className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Indicadores de Gestión de Calidad</CardTitle>
        </div>
        <CardDescription className="text-slate-500 font-medium ml-3">
          <span className="@[540px]/card:block hidden">
            Evolución de No Conformidades y Acciones Correctivas
          </span>
          <span className="@[540px]/card:hidden">Últimos 3 meses</span>
        </CardDescription>
        <div className="absolute right-4 top-4">
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="@[767px]/card:flex hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-sm"
          >
            <ToggleGroupItem value="90d" className="h-8 px-4 rounded-lg data-[state=on]:bg-blue-600 data-[state=on]:text-white transition-all text-xs font-bold">
              90 Días
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" className="h-8 px-4 rounded-lg data-[state=on]:bg-blue-600 data-[state=on]:text-white transition-all text-xs font-bold">
              30 Días
            </ToggleGroupItem>
            <ToggleGroupItem value="7d" className="h-8 px-4 rounded-lg data-[state=on]:bg-blue-600 data-[state=on]:text-white transition-all text-xs font-bold">
              7 Días
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="@[767px]/card:hidden flex w-40"
              aria-label="Seleccionar período"
            >
              <SelectValue placeholder="Últimos 3 meses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Últimos 3 meses
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Últimos 30 días
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Últimos 7 días
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillNoConformidades" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-noConformidades)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-noConformidades)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillAccionesCorrectivas" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-accionesCorrectivas)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-accionesCorrectivas)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("es-ES", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("es-ES", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="accionesCorrectivas"
              type="natural"
              fill="url(#fillAccionesCorrectivas)"
              stroke="var(--color-accionesCorrectivas)"
              stackId="a"
            />
            <Area
              dataKey="noConformidades"
              type="natural"
              fill="url(#fillNoConformidades)"
              stroke="var(--color-noConformidades)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
