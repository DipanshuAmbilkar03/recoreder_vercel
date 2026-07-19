"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import dynamic from "next/dynamic";
import { API_URL } from "@/lib/api";
import styles from "./page.module.css";

const WaterLevelTrendChart = dynamic(
    () => import("@/components/Charts/ChartComponents").then((m) => m.WaterLevelTrendChart),
    { ssr: false }
);
const ForecastChart = dynamic(() => import("@/components/Charts/ForecastChart"), { ssr: false });
const AquiferProfileLineChart = dynamic(
    () => import("@/components/Charts/ChartComponents").then((m) => m.AquiferProfileLineChart),
    { ssr: false }
);
const InfrastructureStatusLineChart = dynamic(
    () => import("@/components/Charts/ChartComponents").then((m) => m.InfrastructureStatusLineChart),
    { ssr: false }
);
const DepthBandLineChart = dynamic(
    () => import("@/components/Charts/ChartComponents").then((m) => m.DepthBandLineChart),
    { ssr: false }
);
const SeasonalMomentumLineChart = dynamic(
    () => import("@/components/Charts/ChartComponents").then((m) => m.SeasonalMomentumLineChart),
    { ssr: false }
);
const StationInsightPanel = dynamic(
    () => import("@/components/Charts/StationInsightPanel").then((m) => m.StationInsightPanel),
    { ssr: false }
);

function MetricIcon({ type }) {
    if (type === "stations") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 20h16M6 20V9l6-4 6 4v11M9 12h6M9 15h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (type === "depth") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v18M8 15l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (type === "active") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M9.5 12.5l1.8 1.8 3.7-4.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 9v4M12 17h.01M10.3 4.8 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function deriveAiInsights(forecastData, forecastMetadata, currentLevel) {
    if (!forecastData?.length) {
        return {
            risk: "Awaiting data",
            riskTone: "muted",
            riskDetail: "Select a station with history to generate risk assessment.",
            confidence: "—",
            confidenceDetail: "Model confidence appears after a successful forecast run.",
            recommendation: "Choose a DWLR station and forecast horizon.",
            endLevel: null,
            delta: null,
        };
    }

    const end = Number(forecastData[forecastData.length - 1]?.predicted);
    // Compare depth-to-water magnitudes so sign differences never invert risk.
    const endAbs = Number.isFinite(end) ? Math.abs(end) : NaN;
    const startRaw = Number.isFinite(currentLevel) ? currentLevel : Number(forecastData[0]?.predicted);
    const startAbs = Number.isFinite(startRaw) ? Math.abs(startRaw) : NaN;
    const delta = Number.isFinite(endAbs) && Number.isFinite(startAbs) ? endAbs - startAbs : null;
    const mae = Number(forecastMetadata?.mae);
    const confidence = Number.isFinite(mae)
        ? Math.max(55, Math.min(96, Math.round(100 - mae * 12)))
        : 78;

    let risk = "Stable";
    let riskTone = "safe";
    let riskDetail = "Projected water-level path stays within a manageable band.";
    let recommendation = "Maintain current monitoring cadence and continue weekly review.";

    if (delta != null && delta > 1.5) {
        risk = "Rising stress";
        riskTone = "warn";
        riskDetail = `Depth-to-water may increase by ~${delta.toFixed(2)} m over the selected horizon.`;
        recommendation = "Prioritize high-stress districts and raise alert attention.";
    } else if (delta != null && delta < -1.0) {
        risk = "Recovery likely";
        riskTone = "safe";
        riskDetail = `Model expects improvement of ~${Math.abs(delta).toFixed(2)} m.`;
        recommendation = "Use the recovery window for recharge planning.";
    }

    return {
        risk,
        riskTone,
        riskDetail,
        confidence: `${confidence}%`,
        confidenceDetail: Number.isFinite(mae)
            ? `Based on model MAE ${mae.toFixed(2)} m.`
            : "Estimated from available forecast quality.",
        recommendation,
        endLevel: Number.isFinite(endAbs) ? endAbs : null,
        delta,
    };
}

function DashboardPageContent() {
    const searchParams = useSearchParams();
    const stationIdParam = searchParams.get("station_id");

    const [stats, setStats] = useState(null);
    const [stations, setStations] = useState([]);
    const [selectedState, setSelectedState] = useState("");
    const [selectedStation, setSelectedStation] = useState(null);
    const [trendPeriod, setTrendPeriod] = useState("daily");
    const [trendData, setTrendData] = useState([]);
    const [forecastDays, setForecastDays] = useState(30);
    const [forecastData, setForecastData] = useState([]);
    const [forecastLoading, setForecastLoading] = useState(false);
    const [forecastMetadata, setForecastMetadata] = useState(null);
    const [aquiferData, setAquiferData] = useState([]);
    const [statusData, setStatusData] = useState([]);
    const [correlationData, setCorrelationData] = useState([]);
    const [seasonalData, setSeasonalData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [
                    overview,
                    stationList,
                    aquifers,
                    status,
                    correlation,
                    seasonal,
                ] = await Promise.all([
                    axios.get(`${API_URL}/analytics/overview`),
                    axios.get(`${API_URL}/stations?limit=2000`),
                    axios.get(`${API_URL}/analytics/aquifers`),
                    axios.get(`${API_URL}/analytics/status-distribution`),
                    axios.get(`${API_URL}/analytics/depth-correlation`),
                    axios.get(`${API_URL}/analytics/seasonal-trends`),
                ]);

                setStats(overview.data);
                const st = stationList.data.data || [];
                setStations(st);
                setAquiferData(aquifers.data || []);
                setStatusData(status.data || []);
                setCorrelationData(correlation.data || []);
                setSeasonalData(seasonal.data || []);

                let target = null;
                if (stationIdParam) {
                    target = st.find((s) => s.station_id === parseInt(stationIdParam, 10));
                }
                const initial = target || st[0] || null;
                if (initial) {
                    setSelectedStation(initial);
                    if (initial.state) setSelectedState(initial.state);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load dashboard data. Is the backend running?");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [stationIdParam, refreshKey]);

    useEffect(() => {
        if (!selectedStation) return;
        const run = async () => {
            try {
                const res = await axios.get(
                    `${API_URL}/analytics/trends?station_id=${selectedStation.station_id}&period=${trendPeriod}`
                );
                setTrendData(res.data || []);
            } catch (err) {
                console.error(err);
                setTrendData([]);
            }
        };
        run();
    }, [selectedStation?.station_id, trendPeriod]);

    useEffect(() => {
        if (!selectedStation) return;
        const run = async () => {
            try {
                setForecastLoading(true);
                const res = await axios.get(
                    `${API_URL}/forecast/${selectedStation.station_id}?days=${forecastDays}`
                );
                setForecastData(res.data.forecast || []);
                setForecastMetadata(res.data.metadata || null);
            } catch (err) {
                console.error(err);
                setForecastData([]);
                setForecastMetadata(null);
            } finally {
                setForecastLoading(false);
            }
        };
        run();
    }, [selectedStation?.station_id, forecastDays]);

    const availableStates = useMemo(
        () => Array.from(new Set(stations.map((s) => s.state).filter(Boolean))).sort(),
        [stations]
    );
    const filteredStations = useMemo(
        () => (selectedState ? stations.filter((s) => s.state === selectedState) : stations),
        [stations, selectedState]
    );

    const currentWaterLevel = useMemo(() => {
        // Prefer the station's latest real reading so dashboard matches map/stations.
        if (selectedStation?.latest_water_level != null) {
            const n = Number(selectedStation.latest_water_level);
            return Number.isFinite(n) ? n : null;
        }
        if (trendData.length > 0 && trendData[0].avg_level != null) {
            const n = Number(trendData[0].avg_level);
            return Number.isFinite(n) ? n : null;
        }
        return null;
    }, [trendData, selectedStation]);

    const wellDepth =
        selectedStation?.well_depth != null && Number.isFinite(Number(selectedStation.well_depth))
            ? Number(selectedStation.well_depth)
            : null;

    const insights = useMemo(
        () => deriveAiInsights(forecastData, forecastMetadata, currentWaterLevel),
        [forecastData, forecastMetadata, currentWaterLevel]
    );

    const metrics = [
        {
            label: "Total Stations",
            value: stats?.total_stations ?? "—",
            icon: "stations",
            color: "#38bdf8",
            hint: "Network coverage",
        },
        {
            label: "Active Nodes",
            value: stats?.active_stations ?? "—",
            icon: "active",
            color: "#34d399",
            hint: "Live telemetry",
        },
        {
            label: "Avg Depth",
            value: stats?.avg_water_level != null ? `${stats.avg_water_level}m` : "—",
            icon: "depth",
            color: "#22d3ee",
            hint: "Depth to water",
        },
        {
            label: "Open Alerts",
            value: stats?.open_alerts ?? "—",
            icon: "critical",
            color: "#f87171",
            hint: "Unresolved",
        },
    ];

    return (
        <main className={styles.main}>
            <div className="container">
                <header className={styles.header}>
                    <div className={styles.headerCopy}>
                        <div className={styles.kicker}>Dashboard</div>
                        <h1 className={styles.title}>Station graphs & insight</h1>
                        <p className={styles.subtitle}>
                            Station water level animation, trends, AI forecast, and network diagnostic charts.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.horizonGroup} role="group" aria-label="Forecast horizon">
                            {[7, 30, 90].map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    className={`${styles.horizonBtn} ${forecastDays === d ? styles.horizonBtnActive : ""}`}
                                    onClick={() => setForecastDays(d)}
                                >
                                    {d}d
                                </button>
                            ))}
                        </div>
                        <div className={styles.headerFilters}>
                            <select
                                className={styles.select}
                                value={selectedState}
                                onChange={(e) => {
                                    const newState = e.target.value;
                                    setSelectedState(newState);
                                    const fs = newState
                                        ? stations.filter((s) => s.state === newState)
                                        : stations;
                                    if (fs[0]) setSelectedStation(fs[0]);
                                }}
                            >
                                <option value="">All States</option>
                                {availableStates.map((st) => (
                                    <option key={st} value={st}>
                                        {st}
                                    </option>
                                ))}
                            </select>
                            <select
                                className={styles.select}
                                value={selectedStation?.station_id || ""}
                                onChange={(e) => {
                                    const id = parseInt(e.target.value, 10);
                                    const st = filteredStations.find((s) => s.station_id === id);
                                    setSelectedStation(st || null);
                                }}
                            >
                                {filteredStations.map((s) => (
                                    <option key={s.station_id} value={s.station_id}>
                                        {s.station_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className={styles.errorBanner} role="alert">
                        <strong>Connection issue</strong>
                        <span>{error}</span>
                        <button
                            type="button"
                            className={styles.retryBtn}
                            onClick={() => setRefreshKey((k) => k + 1)}
                        >
                            Retry
                        </button>
                    </div>
                )}

                <section className={styles.metricsRow} aria-label="Network overview metrics">
                    {metrics.map((m, i) => (
                        <div key={i} className={styles.metricCard} style={{ "--accent": m.color }}>
                            <div className={styles.metricIconWrap} style={{ color: m.color }}>
                                <MetricIcon type={m.icon} />
                            </div>
                            <div className={styles.metricInfo}>
                                <div className={styles.metricLabel}>{m.label}</div>
                                <div className={styles.metricValue}>{loading ? "..." : m.value}</div>
                                <div className={styles.metricHint}>{m.hint}</div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Station water-level insight */}
                <section className={styles.secondaryGrid} aria-label="Station insight">
                    <article className={`${styles.panel} ${styles.insightCard}`}>
                        <div className={styles.panelHeader}>
                            <h2 className={styles.panelTitle}>Station insight</h2>
                            {selectedStation && (
                                <span className={styles.metaChip}>
                                    {selectedStation.district || "District"} · {selectedStation.state || "State"}
                                </span>
                            )}
                        </div>
                        {selectedStation ? (
                            <StationInsightPanel
                                stationData={selectedStation}
                                wellDepth={wellDepth}
                                waterLevel={currentWaterLevel}
                            />
                        ) : (
                            <p className={styles.emptyMsg}>Select a station for deep insight</p>
                        )}
                    </article>
                </section>

                {/* Station graphs */}
                <section className={styles.forecastSection} aria-label="Station graphs and AI forecast">
                    <div className={styles.sectionBar}>
                        <div>
                            <h2 className={styles.sectionTitle}>
                                {selectedStation?.station_name || "Station"} graphs
                            </h2>
                            <p className={styles.sectionNote}>
                                Historical trend + AI forecast for selected DWLR station
                            </p>
                        </div>
                        <div className={styles.sectionMeta}>
                            <span className={styles.livePill}>
                                <span className={styles.liveDot} />
                                AI Forecast
                            </span>
                            {forecastMetadata?.model_type && (
                                <span className={styles.metaChip}>{forecastMetadata.model_type}</span>
                            )}
                        </div>
                    </div>

                    <div className={styles.dualChartGrid}>
                        <article className={styles.chartCard}>
                            <div className={styles.chartCardHeader}>
                                <div>
                                    <h3 className={styles.chartCardTitle}>Water Level Trend</h3>
                                    <p className={styles.chartCardSub}>Observed depth-to-water over time</p>
                                </div>
                                <select
                                    className={styles.selectCompact}
                                    value={trendPeriod}
                                    onChange={(e) => setTrendPeriod(e.target.value)}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <div className={styles.chartBox}>
                                <WaterLevelTrendChart
                                    trendData={trendData}
                                    stationName={selectedStation?.station_name}
                                />
                            </div>
                        </article>

                        <article className={styles.chartCard}>
                            <div className={styles.chartCardHeader}>
                                <div>
                                    <h3 className={styles.chartCardTitle}>AI Level Forecast</h3>
                                    <p className={styles.chartCardSub}>
                                        {forecastDays}-day projection with confidence band
                                    </p>
                                </div>
                                {insights.endLevel != null && (
                                    <div className={styles.endpointBadge}>
                                        <span>End level</span>
                                        <strong>{insights.endLevel.toFixed(2)} m</strong>
                                    </div>
                                )}
                            </div>
                            <div className={styles.chartBox}>
                                {forecastLoading ? (
                                    <div className={styles.loadingShimmer}>
                                        <div className={styles.spinner} />
                                        Generating forecast...
                                    </div>
                                ) : (
                                    <ForecastChart
                                        historicalData={trendData}
                                        forecastData={forecastData}
                                        stationName={selectedStation?.station_name}
                                    />
                                )}
                            </div>
                            {forecastMetadata && (
                                <div className={styles.forecastMeta}>
                                    <span className={styles.metaItem}>
                                        Engine: <strong>{forecastMetadata.model_type}</strong>
                                    </span>
                                    {forecastMetadata.mae > 0 && (
                                        <span className={styles.metaItem}>
                                            MAE: <strong>{forecastMetadata.mae}m</strong>
                                        </span>
                                    )}
                                    <span className={styles.metaItem}>
                                        Points: <strong>{forecastMetadata.data_points_used}</strong>
                                    </span>
                                    {forecastMetadata.warning && (
                                        <span className={styles.warningText}>
                                            {forecastMetadata.warning}
                                        </span>
                                    )}
                                </div>
                            )}
                        </article>
                    </div>
                </section>

                <section className={styles.insightsSection}>
                    <div className={styles.sectionBar}>
                        <div>
                            <h2 className={styles.sectionTitle}>AI Insights</h2>
                            <p className={styles.sectionNote}>
                                Operational readouts derived from the active forecast
                            </p>
                        </div>
                    </div>
                    <div className={styles.insightsGrid}>
                        <article className={`${styles.insightTile} ${styles[`tone_${insights.riskTone}`] || ""}`}>
                            <div className={styles.insightLabel}>Risk Assessment</div>
                            <div className={styles.insightValue}>{insights.risk}</div>
                            <p className={styles.insightDetail}>{insights.riskDetail}</p>
                        </article>
                        <article className={styles.insightTile}>
                            <div className={styles.insightLabel}>Confidence Level</div>
                            <div className={styles.insightValue}>{insights.confidence}</div>
                            <p className={styles.insightDetail}>{insights.confidenceDetail}</p>
                        </article>
                        <article className={styles.insightTile}>
                            <div className={styles.insightLabel}>Recommendations</div>
                            <div className={styles.insightValueSmall}>Next actions</div>
                            <p className={styles.insightDetail}>{insights.recommendation}</p>
                            {insights.delta != null && (
                                <div className={styles.deltaChip}>
                                    Delta {insights.delta > 0 ? "+" : ""}
                                    {insights.delta.toFixed(2)} m
                                </div>
                            )}
                        </article>
                    </div>
                </section>

                {/* Previous network diagnostic graphs */}
                <h3 className={styles.sectionHeading}>Network diagnostic graphs</h3>
                <div className={styles.diagnosticsGrid}>
                    <div className={styles.miniPanel}>
                        <h4 className={styles.miniTitle}>Aquifer Profile</h4>
                        <AquiferProfileLineChart aquiferData={aquiferData} />
                    </div>
                    <div className={styles.miniPanel}>
                        <h4 className={styles.miniTitle}>Infrastructure Status</h4>
                        <InfrastructureStatusLineChart statusData={statusData} />
                    </div>
                    <div className={styles.miniPanel}>
                        <h4 className={styles.miniTitle}>Depth Band Response</h4>
                        <DepthBandLineChart correlationData={correlationData} />
                    </div>
                    <div className={styles.miniPanel}>
                        <h4 className={styles.miniTitle}>Seasonal Momentum</h4>
                        <SeasonalMomentumLineChart seasonalData={seasonalData} />
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function DashboardPage() {
    return (
        <Suspense
            fallback={
                <main className="container" style={{ marginTop: "120px", display: "flex", justifyContent: "center" }}>
                    <div style={{ color: "rgba(255, 255, 255, 0.6)" }}>Loading Dashboard...</div>
                </main>
            }
        >
            <DashboardPageContent />
        </Suspense>
    );
}
