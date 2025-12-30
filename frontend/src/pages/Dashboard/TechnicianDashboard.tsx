import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import { apiUrl } from "@/config/api";
import {
    ArrowUpIcon,
    BoltIcon
} from "../../icons";
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

interface Orden {
    id: number;
    idx: number;
    cliente: string;
    status: 'pendiente' | 'resuelto';
    fecha_inicio: string;
    tecnico_asignado: number | null;
    servicios_realizados: string[];
}

export default function TechnicianDashboard() {
    const [ordenes, setOrdenes] = useState<Orden[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<number | null>(null);
    const [selectedRange, setSelectedRange] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserId(user.id);
            } catch (e) {
                console.error("Error parsing user from localStorage", e);
            }
        }

        const fetchOrdenes = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                if (!token) return;
                const response = await fetch(apiUrl("/api/ordenes/"), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrdenes(data);
                }
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrdenes();
    }, []);

    const myOrdenes = useMemo(() => {
        if (!userId) return [];
        return ordenes.filter(o => o.tecnico_asignado === userId);
    }, [ordenes, userId]);

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
        colors: ["#465fff"],
        chart: {
            fontFamily: "Outfit, sans-serif",
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
                    colors: "#64748b",
                    fontSize: "12px"
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: "#64748b",
                    fontSize: "12px"
                }
            }
        },
        grid: {
            borderColor: "#f1f5f9",
            strokeDashArray: 4,
            yaxis: { lines: { show: true } }
        },
        fill: {
            type: "gradient",
            gradient: {
                shade: "light",
                type: "vertical",
                shadeIntensity: 0.25,
                gradientToColors: undefined,
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 0.85,
                stops: [50, 0, 100]
            }
        },
        tooltip: {
            theme: "light",
            x: { show: false },
            y: { formatter: (val: number) => `${val} Órdenes` },
        },
    };

    const targetOptions: ApexOptions = {
        colors: ["#465FFF"],
        chart: {
            fontFamily: "Outfit, sans-serif",
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
                    background: "#E4E7EC",
                    strokeWidth: "100%",
                    margin: 5,
                },
                dataLabels: {
                    name: {
                        show: true,
                        fontSize: "14px",
                        fontWeight: "500",
                        offsetY: -10,
                        color: "#64748b"
                    },
                    value: {
                        fontSize: "32px",
                        fontWeight: "700",
                        offsetY: -45,
                        color: "#1D2939",
                        formatter: (val) => val + "%",
                    },
                },
            },
        },
        fill: {
            type: "gradient",
            gradient: {
                shade: "dark",
                type: "horizontal",
                shadeIntensity: 0.5,
                gradientToColors: ["#6366f1"],
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
            }
        },
        stroke: { lineCap: "round" },
        labels: ["Progreso Mensual"],
    };

    const targetProgress = Math.min(100, Math.round((stats.resolved / 20) * 100));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <>
            <PageMeta
                title="Panel del Técnico | Sistema DigitalFlow"
                description="Panel de control para técnicos"
            />
            <div className="grid grid-cols-12 gap-4 md:gap-6">
                {/* Metrics Section */}
                <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                Vista General
                            </h3>
                        </div>
                        <div className="flex gap-x-3.5">
                            <div className="inline-flex w-full items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
                                <button
                                    onClick={() => setSelectedRange('weekly')}
                                    className={`text-theme-sm w-full rounded-md px-3 py-2 font-medium transition-all ${selectedRange === 'weekly'
                                        ? 'shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    Semanal
                                </button>
                                <button
                                    onClick={() => setSelectedRange('monthly')}
                                    className={`text-theme-sm w-full rounded-md px-3 py-2 font-medium transition-all ${selectedRange === 'monthly'
                                        ? 'shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    Mensual
                                </button>
                                <button
                                    onClick={() => setSelectedRange('yearly')}
                                    className={`text-theme-sm w-full rounded-md px-3 py-2 font-medium transition-all ${selectedRange === 'yearly'
                                        ? 'shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    Anual
                                </button>
                            </div>
                            <div>
                                <button
                                    className="text-theme-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                                >
                                    <svg
                                        className="fill-white stroke-current dark:fill-gray-800"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M2.29004 5.90393H17.7067"
                                            stroke=""
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M17.7075 14.0961H2.29085"
                                            stroke=""
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 12.0826 3.33331Z"
                                            fill=""
                                            stroke=""
                                            strokeWidth="1.5"
                                        />
                                        <path
                                            d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z"
                                            fill=""
                                            stroke=""
                                            strokeWidth="1.5"
                                        />
                                    </svg>
                                    <span className="hidden sm:block">Filtrar</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
                        {/* Metric 1: Total Orders */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Órdenes Totales</span>
                                    <h4 className="mt-1 font-bold text-gray-800 text-2xl dark:text-white/90">{stats.total}</h4>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full dark:bg-blue-500/10">
                                    <BoltIcon className="size-3" />
                                    Activo
                                </div>
                            </div>
                        </div>

                        {/* Metric 2: Resolved */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Resueltas</span>
                                    <h4 className="mt-1 font-bold text-gray-800 text-2xl dark:text-white/90">{stats.resolved}</h4>
                                </div>
                                <Badge color="success" size="sm">
                                    <ArrowUpIcon className="size-3" />
                                    {stats.completionRate}% Éxito
                                </Badge>
                            </div>
                        </div>

                        {/* Metric 3: Pending */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Pendientes</span>
                                    <h4 className="mt-1 font-bold text-gray-800 text-2xl dark:text-white/90">{stats.pending}</h4>
                                </div>
                                <div className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full dark:bg-orange-500/10">
                                    Por atender
                                </div>
                            </div>
                        </div>

                        {/* Metric 4: Clients */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Clientes Atendidos</span>
                                    <h4 className="mt-1 font-bold text-gray-800 text-2xl dark:text-white/90">{stats.clients}</h4>
                                </div>
                                <div className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full dark:bg-purple-500/10">
                                    Fidelidad
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Left Column: Chart & Recent Orders */}
                <div className="col-span-12 space-y-6 xl:col-span-8">
                    {/* Monthly Orders Chart */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Rendimiento Mensual</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Órdenes completadas por mes</p>
                            </div>
                        </div>
                        <div className="max-w-full overflow-x-auto custom-scrollbar">
                            <div className="-ml-4 min-w-[600px] xl:min-w-full">
                                <Chart options={chartOptions} series={[{ name: "Órdenes", data: chartData.counts }]} type="bar" height={220} />
                            </div>
                        </div>
                    </div>

                    {/* Recent Orders Table */}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="px-5 py-4 sm:px-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Órdenes Recientes</h3>
                            <button className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">Ver todas</button>
                        </div>
                        <div className="max-w-full overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50 dark:bg-white/5">
                                    <TableRow>
                                        <TableCell isHeader className="py-3 px-5 font-semibold text-gray-600 text-start text-xs uppercase tracking-wider dark:text-gray-400">Folio</TableCell>
                                        <TableCell isHeader className="py-3 px-5 font-semibold text-gray-600 text-start text-xs uppercase tracking-wider dark:text-gray-400">Cliente</TableCell>
                                        <TableCell isHeader className="py-3 px-5 font-semibold text-gray-600 text-start text-xs uppercase tracking-wider dark:text-gray-400">Fecha</TableCell>
                                        <TableCell isHeader className="py-3 px-5 font-semibold text-gray-600 text-start text-xs uppercase tracking-wider dark:text-gray-400">Estado</TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {recentOrders.map((o) => (
                                        <TableRow key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                            <TableCell className="py-4 px-5 font-bold text-gray-800 text-sm dark:text-white/90">#{o.idx}</TableCell>
                                            <TableCell className="py-4 px-5 text-gray-700 text-sm dark:text-gray-300 font-medium">{o.cliente}</TableCell>
                                            <TableCell className="py-4 px-5 text-gray-500 text-sm dark:text-gray-400">{o.fecha_inicio}</TableCell>
                                            <TableCell className="py-4 px-5">
                                                <Badge size="sm" color={o.status === "resuelto" ? "success" : "warning"}>
                                                    {o.status === "resuelto" ? "Resuelto" : "Pendiente"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {recentOrders.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-10 text-center text-gray-500 dark:text-gray-400">No tienes órdenes recientes</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Target & Top Clients */}
                <div className="col-span-12 space-y-6 xl:col-span-4">
                    {/* Monthly Target Section */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                        <div className="mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Meta Mensual</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Progreso basado en 20 órdenes</p>
                        </div>
                        <div className="relative flex justify-center">
                            <div className="w-full max-w-[280px]">
                                <Chart options={targetOptions} series={[targetProgress]} type="radialBar" height={300} />
                            </div>
                        </div>
                        <div className="mt-4 p-4 rounded-xl bg-brand-50/50 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/20">
                            <p className="text-center text-sm text-gray-700 dark:text-gray-300">
                                Has resuelto <span className="font-bold text-brand-600 dark:text-brand-400">{stats.resolved}</span> órdenes este mes.
                                {targetProgress >= 100 ? " ¡Meta alcanzada! 🚀" : ` Te faltan ${20 - stats.resolved} para tu objetivo.`}
                            </p>
                        </div>
                    </div>

                    {/* Top Clients Section */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Principales Clientes</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Clientes con mayor volumen de órdenes</p>

                        <div className="space-y-6">
                            {clientStats.map(([name, count], idx) => (
                                <div key={name} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-xs dark:bg-white/5 dark:text-gray-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                                                {idx + 1}
                                            </div>
                                            <span className="font-semibold text-gray-800 text-sm dark:text-white/90 truncate max-w-[150px]">{name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{count} Órdenes</span>
                                    </div>
                                    <div className="relative h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                        <div
                                            className="absolute left-0 top-0 h-full rounded-full bg-brand-500 transition-all duration-1000 ease-out"
                                            style={{ width: `${stats.total > 0 ? Math.min(100, (count / stats.total) * 100) : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                            {clientStats.length === 0 && (
                                <div className="py-8 text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos de clientes disponibles</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
