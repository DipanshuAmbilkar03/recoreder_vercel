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

// Register ChartJS modules
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

const NEON = {
    blue: "#3b82f6",
    green: "#10b981",
    emerald: "#059669",
    orange: "#f59e0b",
    red: "#ef4444",
    rose: "#f43f5e",
    slate: "#94a3b8",
    darkBorder: "rgba(115, 115, 115, 0.22)",
    darkBg: "linear-gradient(145deg, rgba(8, 8, 8, 0.88), rgba(16, 16, 16, 0.74))"
};

export default function ForecastChart({ historicalData = [], forecastData = [], stationName = "" }) {
    if (!historicalData.length && !forecastData.length) {
        return (
            <div className={styles.emptyChart}>
                <p>Select a station to generate groundwater forecasts</p>
            </div>
        );
    }

    // 1. Process data chronologically
    // Historical trends come in reverse (newest first). Let's sort chronological (oldest first).
    const histSorted = [...historicalData].reverse();
    const lastHistReading = histSorted[histSorted.length - 1];

    // Combine labels (dates)
    const histLabels = histSorted.map(d => d.period || d.date);
    const forecastLabels = forecastData.map(d => d.date);
    const labels = [...histLabels, ...forecastLabels];

    // Align datasets
    const histValues = histSorted.map(d => Number(d.avg_level || d.water_level));
    
    // Fill historical padding for forecast lines (null for historical, then forecast values)
    const padding = Array(histValues.length).fill(null);
    
    // Connect forecast with the last historical point if available
    const lastHistVal = lastHistReading ? Number(lastHistReading.avg_level || lastHistReading.water_level) : null;
    
    // Build forecast values arrays
    const predValues = [...padding.slice(0, -1), lastHistVal, ...forecastData.map(d => d.predicted)];
    const lowerValues = [...padding.slice(0, -1), lastHistVal, ...forecastData.map(d => d.lower_bound)];
    const upperValues = [...padding.slice(0, -1), lastHistVal, ...forecastData.map(d => d.upper_bound)];

    // Pad actual values so they stop where predictions begin
    const actualValues = [...histValues, ...Array(forecastData.length).fill(null)];

    const data = {
        labels,
        datasets: [
            {
                label: "Actual Water Level (m)",
                data: actualValues,
                borderColor: NEON.blue,
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                fill: true,
                tension: 0.3,
                pointRadius: 2,
                pointHoverRadius: 5,
                borderWidth: 3,
            },
            {
                label: "AI Forecasted Level (m)",
                data: predValues,
                borderColor: NEON.green,
                backgroundColor: "transparent",
                borderDash: [6, 4],
                fill: false,
                tension: 0.35,
                pointRadius: 1,
                pointHoverRadius: 4,
                borderWidth: 2.5,
            },
            {
                label: "Confidence Band (Upper)",
                data: upperValues,
                borderColor: "rgba(16, 185, 129, 0.15)",
                backgroundColor: "transparent",
                fill: false,
                pointRadius: 0,
                tension: 0.35,
                borderWidth: 1,
            },
            {
                label: "Confidence Band (Lower)",
                data: lowerValues,
                borderColor: "rgba(16, 185, 129, 0.15)",
                backgroundColor: "rgba(16, 185, 129, 0.06)",
                fill: 2, // Fill to dataset index 2 (Confidence Band Upper)
                pointRadius: 0,
                tension: 0.35,
                borderWidth: 1,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: NEON.slate,
                    font: { size: 11, weight: '600' },
                    usePointStyle: true,
                    padding: 15,
                    filter: (legendItem) => {
                        // Hide confidence bands from legend to keep it clean
                        return !legendItem.text.includes("Confidence Band");
                    }
                },
            },
            tooltip: {
                backgroundColor: "rgba(6, 6, 8, 0.96)",
                titleColor: "#fff",
                bodyColor: "#ccc",
                titleFont: { size: 13, weight: 'bold' },
                padding: 12,
                borderColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                callbacks: {
                    label: function(context) {
                        const datasetLabel = context.dataset.label || "";
                        const index = context.dataIndex;
                        const val = context.raw;
                        
                        if (val === null) return null;
                        
                        if (datasetLabel.includes("AI Forecasted")) {
                            const low = lowerValues[index];
                            const high = upperValues[index];
                            return [
                                `${datasetLabel}: ${val}m`,
                                `95% Range: [${low}m - ${high}m]`
                            ];
                        }
                        return `${datasetLabel}: ${val}m`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { color: "rgba(255,255,255,0.02)" },
                ticks: { 
                    color: NEON.slate,
                    maxTicksLimit: 12,
                    font: { size: 10 }
                }
            },
            y: {
                grid: { color: "rgba(255,255,255,0.03)" },
                ticks: { color: NEON.slate },
                title: { display: true, text: "Depth to Water (meters)", color: NEON.slate, font: { size: 11 } }
            }
        }
    };

    return (
        <div className={styles.chartContainer}>
            <div className={styles.chartTitleRow}>
                <span className={styles.stationLabel}>{stationName}</span>
                <span className={styles.aiBadge}>
                    <span className={styles.ping}></span>
                    PROPHET ML FORECAST
                </span>
            </div>
            <div className={styles.canvasWrapper}>
                <Line data={data} options={options} />
            </div>
        </div>
    );
}
