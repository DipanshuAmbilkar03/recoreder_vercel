"use client";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Line, Bar, Doughnut, Pie, Scatter } from "react-chartjs-2";
import styles from "./ChartComponents.module.css";

// Register Chart.js modules
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Register ArcElement for Pie/Doughnut
ChartJS.register(ArcElement);

/**
 * Neon Color Palette
 */
const NEON = {
    blue: "#3b82f6",
    cyan: "#06b6d4",
    green: "#10b981",
    emerald: "#059669",
    orange: "#f59e0b",
    red: "#ef4444",
    rose: "#f43f5e",
    purple: "#8b5cf6",
    slate: "#94a3b8",
};

/**
 * Water Level Trend — Line Chart
 * Expects: trendData = [{ period, avg_level, min_level, max_level }]
 */
export function WaterLevelTrendChart({ trendData = [], stationName = "" }) {
    if (!trendData.length) {
        return (
            <div className={styles.emptyChart}>
                <p>Select a station to view water level trends</p>
            </div>
        );
    }

    const labels = trendData.map((d) => d.period).reverse();
    const avgLevels = trendData.map((d) => Number(d.avg_level)).reverse();
    const minLevels = trendData.map((d) => Number(d.min_level)).reverse();
    const maxLevels = trendData.map((d) => Number(d.max_level)).reverse();
    const data = {
        labels,
        datasets: [
            {
                label: "Avg Level (m)",
                data: avgLevels,
                borderColor: NEON.blue,
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 4,
                borderWidth: 3,
            },
            {
                label: "Min Level (m)",
                data: minLevels,
                borderColor: NEON.green,
                backgroundColor: "transparent",
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            },
            {
                label: "Max Level (m)",
                data: maxLevels,
                borderColor: NEON.rose,
                backgroundColor: "transparent",
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            }
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: NEON.slate, font: { size: 12, weight: '600' }, usePointStyle: true, padding: 20 },
            },
            tooltip: {
                backgroundColor: "rgba(3, 5, 8, 0.95)",
                titleFont: { size: 14, weight: 'bold' },
                padding: 12,
                borderColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
            }
        },
        scales: {
            x: {
                grid: { color: "rgba(255,255,255,0.03)" },
                ticks: { color: NEON.slate }
            },
            y: {
                grid: { color: "rgba(255,255,255,0.03)" },
                ticks: { color: NEON.slate },
                title: { display: true, text: "meters", color: NEON.slate }
            }
        }
    };

    return (
        <div className={styles.chartContainer}>
            <Line data={data} options={options} />
        </div>
    );
}

function baseMiniLineOptions(yTitle = "Value") {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(3, 5, 8, 0.95)",
                borderColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
                padding: 10,
            }
        },
        scales: {
            x: {
                grid: { color: "rgba(255,255,255,0.03)" },
                ticks: { color: NEON.slate, maxRotation: 0, autoSkip: true }
            },
            y: {
                grid: { color: "rgba(255,255,255,0.03)" },
                ticks: { color: NEON.slate },
                title: { display: true, text: yTitle, color: NEON.slate }
            }
        }
    };
}

export function AquiferProfileLineChart({ aquiferData = [] }) {
    if (!aquiferData.length) return <div className={styles.emptyChart}><p>No aquifer data</p></div>;

    const sorted = [...aquiferData].sort((a, b) => Number(b.count) - Number(a.count));
    const data = {
        labels: sorted.map((d) => d.aquifer_type || "Unknown"),
        datasets: [{
            label: "Stations",
            data: sorted.map((d) => Number(d.count) || 0),
            borderColor: NEON.cyan,
            backgroundColor: "rgba(6, 182, 212, 0.18)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 5,
        }]
    };

    return (
        <div className={styles.chartContainerMini}>
            <Line data={data} options={baseMiniLineOptions("Stations")} />
        </div>
    );
}

export function InfrastructureStatusLineChart({ statusData = [] }) {
    if (!statusData.length) return <div className={styles.emptyChart}><p>No status data</p></div>;

    const normalized = [...statusData].map((d) => ({
        status: (d.status || "unknown").toUpperCase(),
        count: Number(d.count) || 0
    }));

    const total = normalized.reduce((sum, item) => sum + item.count, 0);
    const percentageSeries = normalized.map((item) => {
        if (total === 0) return 0;
        return Number(((item.count / total) * 100).toFixed(1));
    });

    const data = {
        labels: normalized.map((d) => d.status),
        datasets: [
            {
                type: "bar",
                label: "Node Count",
                data: normalized.map((d) => d.count),
                backgroundColor: normalized.map((d) => {
                    if (d.status.includes("ACTIVE")) return "rgba(16, 185, 129, 0.7)";
                    if (d.status.includes("INACTIVE") || d.status.includes("DOWN")) return "rgba(239, 68, 68, 0.7)";
                    return "rgba(245, 158, 11, 0.7)";
                }),
                borderRadius: 6,
                yAxisID: "y",
            },
            {
                type: "line",
                label: "Share (%)",
                data: percentageSeries,
                borderColor: NEON.cyan,
                backgroundColor: "rgba(6, 182, 212, 0.15)",
                tension: 0.35,
                borderWidth: 2.2,
                pointRadius: 3,
                pointHoverRadius: 5,
                yAxisID: "y1",
            }
        ]
    };

    return (
        <div className={styles.chartContainerMini}>
            <Bar
                data={data}
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            labels: { color: NEON.slate, boxWidth: 12 }
                        },
                        tooltip: {
                            backgroundColor: "rgba(3, 5, 8, 0.95)",
                            borderColor: "rgba(255,255,255,0.1)",
                            borderWidth: 1,
                            padding: 10,
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: "rgba(255,255,255,0.03)" },
                            ticks: { color: NEON.slate }
                        },
                        y: {
                            position: "left",
                            grid: { color: "rgba(255,255,255,0.03)" },
                            ticks: { color: NEON.slate },
                            title: { display: true, text: "Node Count", color: NEON.slate }
                        },
                        y1: {
                            position: "right",
                            grid: { drawOnChartArea: false },
                            ticks: {
                                color: NEON.slate,
                                callback: (value) => `${value}%`
                            },
                            title: { display: true, text: "Share %", color: NEON.slate },
                            suggestedMax: 100
                        }
                    }
                }}
            />
        </div>
    );
}

export function DepthBandLineChart({ correlationData = [] }) {
    if (!correlationData.length) return <div className={styles.emptyChart}><p>No depth correlation data</p></div>;

    const bands = [
        { label: "0-10m", min: 0, max: 10 },
        { label: "10-25m", min: 10, max: 25 },
        { label: "25-50m", min: 25, max: 50 },
        { label: "50-100m", min: 50, max: 100 },
        { label: "100m+", min: 100, max: Infinity },
    ];

    const bandAverages = bands.map((band) => {
        const values = correlationData
            .filter((d) => {
                const depth = Number(d.well_depth);
                return Number.isFinite(depth) && depth >= band.min && depth < band.max;
            })
            .map((d) => Number(d.avg_water_level))
            .filter((v) => Number.isFinite(v));

        if (!values.length) return null;
        return values.reduce((sum, v) => sum + v, 0) / values.length;
    });

    const data = {
        labels: bands.map((b) => b.label),
        datasets: [{
            label: "Avg Water Level",
            data: bandAverages,
            borderColor: NEON.orange,
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: true,
        }]
    };

    return (
        <div className={styles.chartContainerMini}>
            <Line data={data} options={baseMiniLineOptions("Avg Level (m)")} />
        </div>
    );
}

export function SeasonalMomentumLineChart({ seasonalData = [] }) {
    if (!seasonalData.length) return <div className={styles.emptyChart}><p>No seasonal data</p></div>;

    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthAverages = monthLabels.map((_, idx) => {
        const values = seasonalData
            .filter((d) => Number(d.month) === idx + 1)
            .map((d) => Number(d.avg_level))
            .filter((v) => Number.isFinite(v));

        if (!values.length) return null;
        return values.reduce((sum, v) => sum + v, 0) / values.length;
    });

    const data = {
        labels: monthLabels,
        datasets: [{
            label: "Avg Seasonal Level",
            data: monthAverages,
            borderColor: NEON.blue,
            backgroundColor: "rgba(59, 130, 246, 0.16)",
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            spanGaps: true,
        }]
    };

    return (
        <div className={styles.chartContainerMini}>
            <Line data={data} options={baseMiniLineOptions("Level (m)")} />
        </div>
    );
}

/**
 * Doughnut Chart for Aquifer Distribution
 */
export function AquiferDoughnutChart({ aquiferData = [] }) {
    const data = {
        labels: aquiferData.map(d => d.aquifer_type),
        datasets: [{
            data: aquiferData.map(d => d.count),
            backgroundColor: [NEON.blue, NEON.cyan, NEON.purple, NEON.emerald, NEON.orange],
            borderWidth: 0,
            hoverOffset: 10,
        }]
    };

    return (
        <div className={styles.chartContainer}>
            <Doughnut 
                data={data} 
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: NEON.slate, padding: 15 } }
                    }
                }} 
            />
        </div>
    );
}

/**
 * Pie Chart for Station Status
 */
export function StatusPieChart({ statusData = [] }) {
    const data = {
        labels: statusData.map(d => d.status.toUpperCase()),
        datasets: [{
            data: statusData.map(d => d.count),
            backgroundColor: [NEON.green, NEON.red, NEON.orange],
            borderWidth: 0,
        }]
    };

    return (
        <div className={styles.chartContainer}>
            <Pie 
                data={data} 
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: NEON.slate } }
                    }
                }} 
            />
        </div>
    );
}

/**
 * Scatter Plot for Depth vs Water Level
 */
export function DepthScatterPlot({ correlationData = [] }) {
    const data = {
        datasets: [{
            label: "Station Measurements",
            data: correlationData.map(d => ({ x: d.well_depth, y: d.avg_water_level })),
            backgroundColor: NEON.cyan,
            pointRadius: 5,
            pointHoverRadius: 8,
        }]
    };

    return (
        <div className={styles.chartContainer}>
            <Scatter 
                data={data} 
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { title: { display: true, text: 'Well Depth (m)', color: NEON.slate }, ticks: { color: NEON.slate } },
                        y: { title: { display: true, text: 'Water Level (m)', color: NEON.slate }, ticks: { color: NEON.slate } }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }} 
            />
        </div>
    );
}

/**
 * District Comparison — Horizontal Bar Chart
 */
export function DistrictComparisonChart({ districtData = [] }) {
    if (!districtData.length) return <div className={styles.emptyChart}><p>No data</p></div>;

    const values = districtData.map((d) => Number(d.avg_water_level));
    const maxValue = Math.max(...values, 0);

    const data = {
        labels: districtData.map((d) => d.district),
        datasets: [
            {
                label: "Avg Level (m)",
                data: values,
                backgroundColor: districtData.map((d) => {
                    const value = Number(d.avg_water_level);
                    const ratio = maxValue > 0 ? value / maxValue : 0;

                    if (ratio > 0.75) return "rgba(156, 163, 175, 0.88)";
                    if (ratio > 0.45) return "rgba(115, 115, 115, 0.82)";
                    return "rgba(82, 82, 82, 0.78)";
                }),
                borderColor: "rgba(212, 212, 212, 0.35)",
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    };

    return (
        <div className={styles.chartContainerLarge}>
            <Bar 
                data={data} 
                options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            ticks: { color: "#9ca3af" },
                            grid: { color: "rgba(115, 115, 115, 0.22)" }
                        },
                        y: {
                            ticks: { color: "#c5cbd3" },
                            grid: { display: false }
                        }
                    }
                }} 
            />
        </div>
    );
}

/**
 * Seasonal Trend — Multi-Line Chart
 */
export function SeasonalTrendChart({ seasonalData = [] }) {
    // Process data to group by year
    const years = [...new Set(seasonalData.map(d => d.year))];
    const datasets = years.map((year, i) => ({
        label: year.toString(),
        data: Array.from({ length: 12 }, (_, m) => {
            const entry = seasonalData.find(d => d.year === year && d.month === m + 1);
            return entry ? entry.avg_level : null;
        }),
        borderColor: Object.values(NEON)[i % 8],
        tension: 0.4,
        fill: false,
    }));

    const data = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets
    };

    return (
        <div className={styles.chartContainer}>
            <Line data={data} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: NEON.slate } } },
                scales: {
                    x: { ticks: { color: NEON.slate } },
                    y: { ticks: { color: NEON.slate } }
                }
            }} />
        </div>
    );
}
