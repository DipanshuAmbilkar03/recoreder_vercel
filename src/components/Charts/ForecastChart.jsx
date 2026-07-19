"use client";

import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from "chart.js";
import styles from "./ForecastChart.module.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const COLORS = {
    actual: "#38bdf8",
    forecast: "#34d399",
    band: "rgba(52, 211, 153, 0.12)",
    bandStroke: "rgba(52, 211, 153, 0.22)",
    slate: "#94a3b8",
    grid: "rgba(255, 255, 255, 0.04)",
};

export default function ForecastChart({ historicalData = [], forecastData = [], stationName = "" }) {
    if (!historicalData.length && !forecastData.length) {
        return (
            <div className={styles.emptyChart}>
                <p>Select a station to generate groundwater forecasts</p>
            </div>
        );
    }

    const histSorted = [...historicalData].reverse();
    const lastHistReading = histSorted[histSorted.length - 1];

    const histLabels = histSorted.map(d => d.period || d.date);
    const forecastLabels = forecastData.map(d => d.date);
    const labels = [...histLabels, ...forecastLabels];

    const histValues = histSorted.map(d => Number(d.avg_level || d.water_level));
    const padding = Array(histValues.length).fill(null);
    const lastHistVal = lastHistReading ? Number(lastHistReading.avg_level || lastHistReading.water_level) : null;

    const predValues = [...padding.slice(0, -1), lastHistVal, ...forecastData.map(d => d.predicted)];
    const lowerValues = [...padding.slice(0, -1), lastHistVal, ...forecastData.map(d => d.lower_bound)];
    const upperValues = [...padding.slice(0, -1), lastHistVal, ...forecastData.map(d => d.upper_bound)];
    const actualValues = [...histValues, ...Array(forecastData.length).fill(null)];

    const data = {
        labels,
        datasets: [
            {
                label: "Actual",
                data: actualValues,
                borderColor: COLORS.actual,
                backgroundColor: (ctx) => {
                    const chart = ctx.chart;
                    const { ctx: c, chartArea } = chart;
                    if (!chartArea) return "rgba(56, 189, 248, 0.08)";
                    const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, "rgba(56, 189, 248, 0.22)");
                    gradient.addColorStop(1, "rgba(56, 189, 248, 0.01)");
                    return gradient;
                },
                fill: true,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2.5,
                order: 2,
            },
            {
                label: "AI Forecast",
                data: predValues,
                borderColor: COLORS.forecast,
                backgroundColor: "transparent",
                borderDash: [7, 5],
                fill: false,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2.4,
                order: 1,
            },
            {
                label: "Confidence Band (Upper)",
                data: upperValues,
                borderColor: COLORS.bandStroke,
                backgroundColor: "transparent",
                fill: false,
                pointRadius: 0,
                tension: 0.35,
                borderWidth: 1,
                order: 3,
            },
            {
                label: "Confidence Band (Lower)",
                data: lowerValues,
                borderColor: COLORS.bandStroke,
                backgroundColor: COLORS.band,
                fill: 2,
                pointRadius: 0,
                tension: 0.35,
                borderWidth: 1,
                order: 4,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            legend: {
                position: "top",
                align: "end",
                labels: {
                    color: COLORS.slate,
                    font: { size: 11, weight: "600" },
                    usePointStyle: true,
                    pointStyle: "circle",
                    boxWidth: 8,
                    padding: 16,
                    filter: (legendItem) => !legendItem.text.includes("Confidence Band"),
                },
            },
            tooltip: {
                backgroundColor: "rgba(8, 8, 10, 0.96)",
                titleColor: "#f8fafc",
                bodyColor: "#cbd5e1",
                titleFont: { size: 12, weight: "bold" },
                padding: 12,
                borderColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        const datasetLabel = context.dataset.label || "";
                        const index = context.dataIndex;
                        const val = context.raw;

                        if (val === null || val === undefined) return null;

                        if (datasetLabel.includes("AI Forecast")) {
                            const low = lowerValues[index];
                            const high = upperValues[index];
                            return [
                                `${datasetLabel}: ${Number(val).toFixed(2)} m`,
                                `95% range: ${Number(low).toFixed(2)} – ${Number(high).toFixed(2)} m`
                            ];
                        }
                        return `${datasetLabel}: ${Number(val).toFixed(2)} m`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { color: COLORS.grid, drawBorder: false },
                ticks: {
                    color: COLORS.slate,
                    maxTicksLimit: 8,
                    font: { size: 10 },
                    maxRotation: 0,
                },
                border: { display: false },
            },
            y: {
                grid: { color: COLORS.grid, drawBorder: false },
                ticks: {
                    color: COLORS.slate,
                    font: { size: 10 },
                    callback: (value) => `${value}m`,
                },
                border: { display: false },
                title: {
                    display: true,
                    text: "Depth to water (m)",
                    color: COLORS.slate,
                    font: { size: 11, weight: "600" },
                }
            }
        }
    };

    return (
        <div className={styles.chartContainer}>
            <div className={styles.chartTitleRow}>
                <span className={styles.stationLabel}>{stationName || "Station forecast"}</span>
                <span className={styles.aiBadge}>
                    <span className={styles.ping}></span>
                    Live forecast
                </span>
            </div>
            <div className={styles.canvasWrapper}>
                <Line data={data} options={options} />
            </div>
        </div>
    );
}
