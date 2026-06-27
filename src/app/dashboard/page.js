"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import dynamic from "next/dynamic";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Dynamic imports
const WaterLevelTrendChart = dynamic(() => import("@/components/Charts/ChartComponents").then(m => m.WaterLevelTrendChart), { ssr: false });
const DistrictComparisonChart = dynamic(() => import("@/components/Charts/ChartComponents").then(m => m.DistrictComparisonChart), { ssr: false });
const AquiferProfileLineChart = dynamic(() => import("@/components/Charts/ChartComponents").then(m => m.AquiferProfileLineChart), { ssr: false });
const InfrastructureStatusLineChart = dynamic(() => import("@/components/Charts/ChartComponents").then(m => m.InfrastructureStatusLineChart), { ssr: false });
const DepthBandLineChart = dynamic(() => import("@/components/Charts/ChartComponents").then(m => m.DepthBandLineChart), { ssr: false });
const SeasonalMomentumLineChart = dynamic(() => import("@/components/Charts/ChartComponents").then(m => m.SeasonalMomentumLineChart), { ssr: false });
const StationInsightPanel = dynamic(() => import("@/components/Charts/StationInsightPanel").then(m => m.StationInsightPanel), { ssr: false });
const ForecastChart = dynamic(() => import("@/components/Charts/ForecastChart"), { ssr: false });

function DashboardPageContent() {
    const searchParams = useSearchParams();
    const stationIdParam = searchParams.get("station_id");

    const [stats, setStats] = useState(null);
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [selectedState, setSelectedState] = useState("Maharashtra");
    const [trendPeriod, setTrendPeriod] = useState("daily");
    const [trendData, setTrendData] = useState([]);
    
    // Advanced Analytics State
    const [aquiferData, setAquiferData] = useState([]);
    const [statusData, setStatusData] = useState([]);
    const [correlationData, setCorrelationData] = useState([]);
    const [seasonalData, setSeasonalData] = useState([]);
    const [districtInsights, setDistrictInsights] = useState([]);
    const [districtComparison, setDistrictComparison] = useState([]);

    // Forecasting State
    const [forecastData, setForecastData] = useState([]);
    const [forecastDays, setForecastDays] = useState(30);
    const [forecastLoading, setForecastLoading] = useState(false);
    const [forecastMetadata, setForecastMetadata] = useState(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [
                    overview, 
                    stationList, 
                    aquifers, 
                    status, 
                    correlation, 
                    seasonal, 
                    insights,
                    comparison
                ] = await Promise.all([
                    axios.get(`${API_URL}/analytics/overview`),
                    axios.get(`${API_URL}/stations?limit=200`),
                    axios.get(`${API_URL}/analytics/aquifers`),
                    axios.get(`${API_URL}/analytics/status-distribution`),
                    axios.get(`${API_URL}/analytics/depth-correlation`),
                    axios.get(`${API_URL}/analytics/seasonal-trends`),
                    axios.get(`${API_URL}/analytics/district-insights`),
                    axios.get(`${API_URL}/analytics/districts`)
                ]);

                setStats(overview.data);
                const st = stationList.data.data || [];
                setStations(st);
                
                let targetStation = null;
                if (stationIdParam) {
                    const id = parseInt(stationIdParam, 10);
                    targetStation = st.find(s => s.station_id === id);
                }
                const initialStation = targetStation || st.find(s => s.state === "Maharashtra") || st[0];
                if (initialStation) {
                    setSelectedStation(initialStation);
                    if (initialStation.state) {
                        setSelectedState(initialStation.state);
                    }
                }
                
                setAquiferData(aquifers.data);
                setStatusData(status.data);
                setCorrelationData(correlation.data);
                setSeasonalData(seasonal.data);
                setDistrictInsights(insights.data);
                setDistrictComparison(comparison.data);
            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [stationIdParam]);

    useEffect(() => {
        if (stationIdParam && stations.length > 0) {
            const id = parseInt(stationIdParam, 10);
            const target = stations.find(s => s.station_id === id);
            if (target) {
                setSelectedStation(target);
                if (target.state) {
                    setSelectedState(target.state);
                }
            }
        }
    }, [stationIdParam, stations]);

    useEffect(() => {
        if (!selectedStation) return;
        const fetchTrends = async () => {
            try {
                // Clear old trend data to let animation show "empty" or transition correctly
                // setTrendData([]); // Optional: could cause flash, better to just update prop
                const res = await axios.get(`${API_URL}/analytics/trends?station_id=${selectedStation.station_id}&period=${trendPeriod}`);
                setTrendData(res.data || []);
            } catch (err) {
                console.error("Trend Fetch Error:", err);
            }
        };
        fetchTrends();
    }, [selectedStation?.station_id, trendPeriod]); // Use station_id specifically

    useEffect(() => {
        if (!selectedStation) return;
        const fetchForecast = async () => {
            try {
                setForecastLoading(true);
                const res = await axios.get(`${API_URL}/forecast/${selectedStation.station_id}?days=${forecastDays}`);
                setForecastData(res.data.forecast || []);
                setForecastMetadata(res.data.metadata || null);
            } catch (err) {
                console.error("Forecast Fetch Error:", err);
                setForecastData([]);
                setForecastMetadata(null);
            } finally {
                setForecastLoading(false);
            }
        };
        fetchForecast();
    }, [selectedStation?.station_id, forecastDays]);

    const metrics = [
        { label: "Total Stations", value: stats?.total_stations || "—", icon: null, color: "#3b82f6" },
        { label: "Avg Depth", value: stats?.avg_water_level ? `${stats.avg_water_level}m` : "—", icon: null, color: "#06b6d4" },
        { label: "Active Nodes", value: stats?.active_stations || "—", icon: "🟢", color: "#10b981" },
        { label: "Critical Low", value: stats?.min_water_level ? `${stats.min_water_level}m` : "—", icon: "🔴", color: "#ef4444" },
        { label: "Peak Level", value: stats?.max_water_level ? `${stats.max_water_level}m` : "—", icon: "🟡", color: "#f59e0b" },
    ];

    // Helper to get current water level for illustration
    const currentWaterLevel = trendData.length > 0 
        ? Number(trendData[0].avg_level) 
        : (selectedStation?.water_level ? Number(selectedStation.water_level) : (stats?.avg_water_level ? Number(stats.avg_water_level) : null));

    // Derived filtering data
    const availableStates = Array.from(new Set(stations.map(s => s.state))).filter(Boolean).sort();
    const filteredStations = selectedState 
        ? stations.filter(s => s.state === selectedState) 
        : stations;

    return (
        <main className={styles.main}>
            <div className="container">
                {/* ... (Header stays same) ... */}
                <header className={styles.header}>
                    <h1 className={styles.title}>DWLR Intelligence Terminal</h1>
                    <p className={styles.subtitle}>Real-time groundwater monitoring & predictive diagnostics</p>
                </header>

                {/* ... (Metrics stay same) ... */}
                <section className={styles.metricsRow}>
                    {metrics.map((m, i) => (
                        <div key={i} className={styles.metricCard} style={{"--accent": m.color}}>
                            <span className={styles.metricIcon}>{m.icon}</span>
                            <div className={styles.metricInfo}>
                                <div className={styles.metricValue}>{m.value}</div>
                                <div className={styles.metricLabel}>{m.label}</div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* 3. Main Analytics Grid */}
                <div className={styles.mainGrid}>
                    <section className={`${styles.panel} ${styles.trendPanel}`}>
                        <div className={styles.panelHeader}>
                            <h2 className={styles.panelTitle}> Water Level Monitoring</h2>
                            <div className={styles.panelControls}>
                                <select 
                                    className={styles.select}
                                    value={selectedState}
                                    onChange={(e) => {
                                        const newState = e.target.value;
                                        setSelectedState(newState);
                                        // Reset selected station to the first one in the new filtered list
                                        const fs = newState ? stations.filter(s => s.state === newState) : stations;
                                        if (fs.length > 0) setSelectedStation(fs[0]);
                                    }}
                                >
                                    <option value="">All States</option>
                                    {availableStates.map(st => <option key={st} value={st}>{st}</option>)}
                                </select>
                                <select 
                                    className={styles.select}
                                    onChange={(e) => {
                                        const id = parseInt(e.target.value);
                                        const st = filteredStations.find(s => s.station_id === id);
                                        setSelectedStation(st); 
                                    }}
                                    value={selectedStation?.station_id || ""}
                                >
                                    {filteredStations.map(s => <option key={s.station_id} value={s.station_id}>{s.station_name} ({s.district})</option>)}
                                </select>
                                <select 
                                    className={styles.select}
                                    value={trendPeriod}
                                    onChange={(e) => setTrendPeriod(e.target.value)}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                        </div>
                        <div className={styles.chartBox}>
                            <WaterLevelTrendChart trendData={trendData} stationName={selectedStation?.station_name} />
                        </div>
                    </section>

                    {/* AI Forecasting Panel */}
                    <section className={`${styles.panel} ${styles.trendPanel}`}>
                        <div className={styles.panelHeader}>
                            <h2 className={styles.panelTitle}>AI Predictive Forecast</h2>
                            <div className={styles.panelControls}>
                                <select 
                                    className={styles.select}
                                    value={forecastDays}
                                    onChange={(e) => setForecastDays(parseInt(e.target.value))}
                                    disabled={forecastLoading}
                                >
                                    <option value={30}>30 Days Horizon</option>
                                    <option value={60}>60 Days Horizon</option>
                                    <option value={90}>90 Days Horizon</option>
                                </select>
                            </div>
                        </div>
                        <div className={styles.chartBox}>
                            {forecastLoading ? (
                                <div className={styles.loadingShimmer}>
                                    <div className={styles.spinner}></div>
                                    <p>Running time-series inference via Prophet ML model...</p>
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
                                <span className={styles.metaItem}>Model Engine: <strong>{forecastMetadata.model_type}</strong></span>
                                {forecastMetadata.mae > 0 && (
                                    <span className={styles.metaItem}>Model Precision (MAE): <strong>{forecastMetadata.mae}m</strong></span>
                                )}
                                <span className={styles.metaItem}>Datasets Analyzed: <strong>{forecastMetadata.data_points_used} points</strong></span>
                                {forecastMetadata.warning && (
                                    <span className={styles.warningText}>⚠️ {forecastMetadata.warning}</span>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                <div className={styles.secondaryGrid}>
                    <section className={`${styles.panel} ${styles.insightCard}`}>
                        <h2 className={styles.panelTitle}>Station Insight</h2>
                        {selectedStation ? (
                            <StationInsightPanel 
                                stationData={selectedStation} 
                                wellDepth={selectedStation.well_depth} 
                                waterLevel={currentWaterLevel} 
                            />
                        ) : (
                            <p className={styles.emptyMsg}>Select a station for deep insight</p>
                        )}
                    </section>
                </div>

                    {/* Quick Stats or small panel here to balance width if needed */}

                {/* 4. Advanced Diagnostics Section */}
                <h3 className={styles.sectionHeading}> Advanced Diagnostics</h3>
                <div className={styles.diagnosticsGrid}>
                    <div className={styles.miniPanel}>
                        <h4 className={styles.miniTitle}>Aquifer Profile Line</h4>
                        <AquiferProfileLineChart aquiferData={aquiferData} />
                    </div>
                    <div className={styles.miniPanel}>
                        <h4 className={styles.miniTitle}>Infrastructure Health Breakdown</h4>
                        <InfrastructureStatusLineChart statusData={statusData} />
                    </div>
                    <div className={styles.miniPanel}>
                        <h4 className={styles.miniTitle}>Depth Band Response</h4>
                        <DepthBandLineChart correlationData={correlationData} />
                    </div>
                    <div className={styles.miniPanel}>
                        <h4 className={styles.miniTitle}>Seasonal Momentum (Y-o-Y)</h4>
                        <SeasonalMomentumLineChart seasonalData={seasonalData} />
                    </div>
                </div>

                {/* 5. Regional Intelligence Section */}
                <h3 className={styles.sectionHeading}> Regional Intelligence</h3>
                <div className={styles.regionalGrid}>
                    <section className={styles.panel}>
                        <h2 className={styles.panelTitle}> District Comparison</h2>
                        <DistrictComparisonChart districtData={districtComparison} />
                    </section>
                    
                    <section className={styles.panel}>
                        <h2 className={styles.panelTitle}>Critical Leaderboard</h2>
                        <div className={styles.leaderboard}>
                            {districtInsights.map((d, i) => (
                                <div key={i} className={styles.leaderItem}>
                                    <div className={styles.rank}>{i+1}</div>
                                    <div className={styles.leaderInfo}>
                                        <div className={styles.leaderName}>{d.district}</div>
                                        <div className={styles.leaderMeta}>{d.reading_count} sensors reporting</div>
                                    </div>
                                    <div className={styles.leaderValue} style={{color: d.current_level > 10 ? '#ef4444' : '#10b981'}}>
                                        {d.current_level}m
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <main className="container" style={{ marginTop: "120px", display: "flex", justifyContent: "center" }}>
                <div style={{ color: "rgba(255, 255, 255, 0.6)" }}>Loading Dashboard Insights...</div>
            </main>
        }>
            <DashboardPageContent />
        </Suspense>
    );
}
