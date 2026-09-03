import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { fetchApi } from "@/config/api";
import { ArrowUpIcon, BoltIcon } from "../../icons";
import Badge from "../../components/ui/badge/Badge";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../components/ui/table";

/* --------------------------------------------------------------------------
   Mismo lenguaje que AppSidebar / Órdenes de servicio: banda marina
   (#17235B) con acento dorado (#E6A23C), lienzo blanco, líneas de 1 px
   (#e7ded0) y azul eléctrico (#1B5CFF) como único acento de acción. En
   oscuro, la familia slate del contenedor (#0f172a → #111827 → #243048).
   -------------------------------------------------------------------------- */

const panelClass =
    "rounded-[16px] border border-[#e7ded0] bg-white shadow-[0_6px_20px_-14px_rgba(9,9,11,0.16)] dark:border-[#273244] dark:bg-[#111827]";

const cardHeadingClass =
    "text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]";

const cardSubtitleClass = "mt-0.5 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]";

interface Orden {
    id: number;
    idx: number;
    cliente: string;
    status: 'pendiente' | 'resuelto';
    fecha_inicio: string;
    tecnico_asignado: number | null;
    creado_por?: number | null;
    creado_por_id?: number | null;
    servicios_realizados: string[];
}

const RANGES = [
    { key: 'weekly', label: 'Semanal' },
    { key: 'monthly', label: 'Mensual' },
    { key: 'yearly', label: 'Anual' },
] as const;

function capitalizar(texto: string) {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

export default function TechnicianDashboard() {
    const { user, loading: authLoading, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [ordenes, setOrdenes] = useState<Orden[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRange, setSelectedRange] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        if (authLoading || !isAuthenticated) return;
        const fetchOrdenes = async () => {
            try {
                const response = await fetchApi("/api/ordenes/");
                if (response.ok) {
                    const data = await response.json();
                    const rows = Array.isArray(data)
                        ? data
                        : Array.isArray((data as { results?: Orden[] })?.results)
                          ? (data as { results: Orden[] }).results
                          : [];
                    setOrdenes(rows);
                }
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrdenes();
    }, [authLoading, isAuthenticated]);

    const myOrdenes = useMemo(() => {
        if (!user?.id) return [];
        const userId = Number(user.id);
        return ordenes.filter((o) => {
            const tecnicoId = Number(o.tecnico_asignado ?? NaN);
            const creadoId = Number(o.creado_por ?? o.creado_por_id ?? NaN);
            return tecnicoId === userId || creadoId === userId;
        });
    }, [ordenes, user?.id]);

    const filteredOrdenes = useMemo(() => {
        const now = new Date();
        return myOrdenes.filter(o => {
            if (!o.fecha_inicio) return false;
            const date = new Date(o.fecha_inicio);
            if (isNaN(date.getTime())) return false;

            if (selectedRange === 'weekly') {
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                return date >= weekAgo;
            } else if (selectedRange === 'monthly') {
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                return date >= monthAgo;
            } else if (selectedRange === 'yearly') {
                const yearAgo = new Date(now);
                yearAgo.setFullYear(now.getFullYear() - 1);
                return date >= yearAgo;
            }
            return true;
        });
    }, [myOrdenes, selectedRange]);

    const stats = useMemo(() => {
        const total = filteredOrdenes.length;
        const pending = filteredOrdenes.filter(o => o.status === 'pendiente').length;
        const resolved = filteredOrdenes.filter(o => o.status === 'resuelto').length;
        const clients = new Set(filteredOrdenes.map(o => o.cliente)).size;
        const completionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        return { total, pending, resolved, clients, completionRate };
    }, [filteredOrdenes]);

    const chartData = useMemo(() => {
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const counts = new Array(12).fill(0);

        filteredOrdenes.forEach(o => {
            if (o.fecha_inicio) {
                const date = new Date(o.fecha_inicio);
                if (!isNaN(date.getTime())) {
                    counts[date.getMonth()]++;
                }
            }
        });

        return { months, counts };
    }, [filteredOrdenes]);

    const recentOrders = useMemo(() => {
        return [...filteredOrdenes].sort((a, b) => b.id - a.id).slice(0, 6);
    }, [filteredOrdenes]);

    const clientStats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOrdenes.forEach(o => {
            counts[o.cliente] = (counts[o.cliente] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [filteredOrdenes]);

    const chartOptions: ApexOptions = {
        colors: ["#1B5CFF"],
        chart: {
            fontFamily: "Geist, Outfit, ui-sans-serif, system-ui, sans-serif",
            type: "bar",
            height: 180,
            toolbar: { show: false },
            sparkline: { enabled: false }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "40%",
                borderRadius: 6,
                borderRadiusApplication: "end",
            },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: chartData.months,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: {
                    colors: "#6E6E77",
                    fontSize: "12px"
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: "#6E6E77",
                    fontSize: "12px"
                }
            }
        },
        grid: {
            borderColor: "#e7ded0",
            strokeDashArray: 4,
            yaxis: { lines: { show: true } }
        },
        fill: {
            type: "gradient",
            gradient: {
                shade: "light",
                type: "vertical",
                shadeIntensity: 0.2,
                gradientToColors: ["#4B7CFF"],
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 0.85,
                stops: [0, 100]
            }
        },
        tooltip: {
            theme: "light",
            x: { show: false },
            y: { formatter: (val: number) => `${val} órdenes` },
        },
    };

    const targetOptions: ApexOptions = {
        colors: ["#1B5CFF"],
        chart: {
            fontFamily: "Geist, Outfit, ui-sans-serif, system-ui, sans-serif",
            type: "radialBar",
            height: 330,
            sparkline: { enabled: true },
        },
        plotOptions: {
            radialBar: {
                startAngle: -90,
                endAngle: 90,
                hollow: { size: "75%" },
                track: {
                    background: "#EAE4D8",
                    strokeWidth: "100%",
                    margin: 5,
                },
                dataLabels: {
                    name: {
                        show: true,
                        fontSize: "13px",
                        fontWeight: "500",
                        offsetY: -10,
                        color: "#6E6E77"
                    },
                    value: {
                        fontSize: "32px",
                        fontWeight: "700",
                        offsetY: -45,
                        color: "#09090B",
                        formatter: (val) => val + "%",
                    },
                },
            },
        },
        fill: {
            type: "gradient",
            gradient: {
                shade: "light",
                type: "horizontal",
                shadeIntensity: 0.4,
                gradientToColors: ["#4B7CFF"],
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
            }
        },
        stroke: { lineCap: "round" },
        labels: ["Progreso mensual"],
    };

    const targetProgress = Math.min(100, Math.round((stats.resolved / 20) * 100));

    const ahora = new Date();
    const hora = ahora.getHours();
    const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
    const nombre = capitalizar(
        (user?.first_name || "").trim() || (user?.username || "").trim()
    );
    const fechaLarga = capitalizar(
        ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
    );

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center" role="status" aria-live="polite">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#1B5CFF] border-t-transparent" />
                <span className="sr-only">Cargando panel…</span>
            </div>
        );
    }

    return (
        <>
            <PageMeta
                title="Panel del Técnico | Sistema DigitalFlow"
                description="Panel de control para técnicos"
            />
            <div className="space-y-5 [font-family:'Geist','Outfit',system-ui,sans-serif] sm:space-y-6">
                {/* Banda marina de cabecera con el control de rango. */}
                <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-7">
                    <div
                        className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
                        aria-hidden
                    />
                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                        <div className="flex min-w-0 items-start gap-4">
                            <span
                                className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]"
                                aria-hidden
                            >
                                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                                    Panel del técnico · {fechaLarga}
                                </p>
                                <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[30px] sm:tracking-[-1px]">
                                    {saludo}{nombre ? `, ${nombre}` : ""}
                                </h1>
                                <p className="mt-1.5 max-w-[54ch] text-[14px] leading-[21px] text-white/70">
                                    Estas son tus órdenes asignadas, tu avance y los clientes atendidos en el periodo seleccionado.
                                </p>
                            </div>
                        </div>

                        <div
                            className="inline-flex shrink-0 items-center gap-1 self-start rounded-[12px] bg-white/10 p-1 lg:self-center"
                            role="group"
                            aria-label="Rango de tiempo"
                        >
                            {RANGES.map((r) => {
                                const active = selectedRange === r.key;
                                return (
                                    <button
                                        key={r.key}
                                        type="button"
                                        onClick={() => setSelectedRange(r.key)}
                                        aria-pressed={active}
                                        className={`inline-flex min-h-[40px] items-center justify-center rounded-[9px] px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                                            active
                                                ? "bg-white text-[#17235B] shadow-sm"
                                                : "text-white/70 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        {r.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </header>

                {/* Métricas */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
                    <article className={`${panelClass} p-4 transition-colors hover:border-[#1B5CFF]/35 sm:p-5`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">Órdenes totales</p>
                                <p className="mt-1.5 text-[26px] font-bold tabular-nums leading-none text-[#09090B] dark:text-[#F8FAFC]">{stats.total}</p>
                            </div>
                            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                                <BoltIcon className="size-4" />
                            </span>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[rgba(27,92,255,0.08)] px-2 py-0.5 text-[11px] font-medium text-[#1244D1] dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]">
                            En el periodo
                        </span>
                    </article>

                    <article className={`${panelClass} p-4 transition-colors hover:border-[#1B5CFF]/35 sm:p-5`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">Resueltas</p>
                                <p className="mt-1.5 text-[26px] font-bold tabular-nums leading-none text-[#09090B] dark:text-[#F8FAFC]">{stats.resolved}</p>
                            </div>
                            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(4,114,77,0.10)] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]">
                                <ArrowUpIcon className="size-4" />
                            </span>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[rgba(4,114,77,0.10)] px-2 py-0.5 text-[11px] font-semibold text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]">
                            {stats.completionRate}% de avance
                        </span>
                    </article>

                    <article className={`${panelClass} p-4 transition-colors hover:border-[#1B5CFF]/35 sm:p-5`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">Pendientes</p>
                                <p className="mt-1.5 text-[26px] font-bold tabular-nums leading-none text-[#09090B] dark:text-[#F8FAFC]">{stats.pending}</p>
                            </div>
                            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[rgba(230,162,60,0.16)] px-2 py-0.5 text-[11px] font-semibold text-[#9A6B15] dark:text-[#E6A23C]">
                            Por atender
                        </span>
                    </article>

                    <article className={`${panelClass} p-4 transition-colors hover:border-[#1B5CFF]/35 sm:p-5`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">Clientes atendidos</p>
                                <p className="mt-1.5 text-[26px] font-bold tabular-nums leading-none text-[#09090B] dark:text-[#F8FAFC]">{stats.clients}</p>
                            </div>
                            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#f5f0e8] text-[#6E6E77] dark:bg-[#243048] dark:text-[#8EA0B8]">
                                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </span>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#f5f0e8] px-2 py-0.5 text-[11px] font-medium text-[#6E6E77] dark:bg-[#243048] dark:text-[#8EA0B8]">
                            Únicos
                        </span>
                    </article>
                </div>

                <div className="grid grid-cols-12 gap-4 md:gap-6">
                    {/* Columna izquierda: gráfica + tabla */}
                    <div className="col-span-12 space-y-5 xl:col-span-8 sm:space-y-6">
                        <section className={`${panelClass} p-5 sm:p-6`}>
                            <div className="mb-5 flex items-center gap-2.5">
                                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M4 19V5M4 19h16M8 15v-4M13 15V8M18 15v-6" strokeLinecap="round" />
                                    </svg>
                                </span>
                                <div>
                                    <h2 className={cardHeadingClass}>Rendimiento mensual</h2>
                                    <p className={cardSubtitleClass}>Órdenes registradas por mes</p>
                                </div>
                            </div>
                            <div className="custom-scrollbar max-w-full overflow-x-auto">
                                <div className="-ml-4 min-w-[600px] xl:min-w-full">
                                    <Chart options={chartOptions} series={[{ name: "Órdenes", data: chartData.counts }]} type="bar" height={220} />
                                </div>
                            </div>
                        </section>

                        <section className={`${panelClass} overflow-hidden`}>
                            <div className="flex items-center justify-between border-b border-[#e7ded0] px-5 py-4 dark:border-[#273244] sm:px-6">
                                <h2 className={cardHeadingClass}>Órdenes recientes</h2>
                                <button
                                    type="button"
                                    onClick={() => navigate("/ordenes")}
                                    className="rounded-md text-[13px] font-semibold text-[#1B5CFF] transition-colors hover:text-[#1244D1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#4B7CFF]"
                                >
                                    Ver todas
                                </button>
                            </div>
                            <div className="max-w-full overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-[#FAFAFA] dark:bg-[#111827]">
                                        <TableRow>
                                            <TableCell isHeader className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-[#52525B] dark:text-[#B7C1D1]">Folio</TableCell>
                                            <TableCell isHeader className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-[#52525B] dark:text-[#B7C1D1]">Cliente</TableCell>
                                            <TableCell isHeader className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-[#52525B] dark:text-[#B7C1D1]">Fecha</TableCell>
                                            <TableCell isHeader className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-[#52525B] dark:text-[#B7C1D1]">Estado</TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-[#EDEDED] dark:divide-[#273244]">
                                        {recentOrders.map((o) => (
                                            <TableRow key={o.id} className="transition-colors hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]">
                                                <TableCell className="px-5 py-3.5 text-sm font-bold text-[#1B5CFF] dark:text-[#4B7CFF]">#{o.idx}</TableCell>
                                                <TableCell className="px-5 py-3.5 text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]">{o.cliente}</TableCell>
                                                <TableCell className="px-5 py-3.5 text-sm text-[#6E6E77] dark:text-[#8EA0B8]">{o.fecha_inicio}</TableCell>
                                                <TableCell className="px-5 py-3.5">
                                                    <Badge size="sm" color={o.status === "resuelto" ? "success" : "warning"}>
                                                        {o.status === "resuelto" ? "Resuelto" : "Pendiente"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {recentOrders.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="px-5 py-10 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]">No tienes órdenes recientes</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </section>
                    </div>

                    {/* Columna derecha: meta + clientes */}
                    <div className="col-span-12 space-y-5 xl:col-span-4 sm:space-y-6">
                        <section className={`${panelClass} p-5 sm:p-6`}>
                            <div className="mb-2">
                                <h2 className={cardHeadingClass}>Meta mensual</h2>
                                <p className={cardSubtitleClass}>Progreso sobre 20 órdenes</p>
                            </div>
                            <div className="relative flex justify-center">
                                <div className="w-full max-w-[280px]">
                                    <Chart options={targetOptions} series={[targetProgress]} type="radialBar" height={300} />
                                </div>
                            </div>
                            <div className="mt-4 rounded-[12px] border border-[rgba(27,92,255,0.20)] bg-[rgba(27,92,255,0.06)] p-4 dark:border-[rgba(75,124,255,0.24)] dark:bg-[rgba(75,124,255,0.08)]">
                                <p className="text-center text-[13px] leading-[19px] text-[#3d3d3a] dark:text-[#B7C1D1]">
                                    Has resuelto <span className="font-bold text-[#1244D1] dark:text-[#4B7CFF]">{stats.resolved}</span> órdenes este mes.
                                    {targetProgress >= 100 ? " ¡Meta alcanzada!" : ` Te faltan ${Math.max(0, 20 - stats.resolved)} para tu objetivo.`}
                                </p>
                            </div>
                        </section>

                        <section className={`${panelClass} p-5 sm:p-6`}>
                            <h2 className={cardHeadingClass}>Principales clientes</h2>
                            <p className={`${cardSubtitleClass} mb-5`}>Clientes con mayor volumen de órdenes</p>

                            <div className="space-y-5">
                                {clientStats.map(([name, count], idx) => (
                                    <div key={name} className="group">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#f5f0e8] text-xs font-bold text-[#6E6E77] transition-colors group-hover:bg-[#1B5CFF] group-hover:text-white dark:bg-[#243048] dark:text-[#8EA0B8]">
                                                    {idx + 1}
                                                </span>
                                                <span className="truncate text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">{name}</span>
                                            </div>
                                            <span className="shrink-0 text-xs font-bold tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]">{count} órdenes</span>
                                        </div>
                                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#f0ebe1] dark:bg-[#243048]">
                                            <div
                                                className="absolute left-0 top-0 h-full rounded-full bg-[#1B5CFF] transition-all duration-700 ease-out motion-reduce:transition-none dark:bg-[#4B7CFF]"
                                                style={{ width: `${stats.total > 0 ? Math.min(100, (count / stats.total) * 100) : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {clientStats.length === 0 && (
                                    <div className="py-8 text-center">
                                        <p className="text-sm text-[#6E6E77] dark:text-[#8EA0B8]">No hay datos de clientes disponibles</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}
