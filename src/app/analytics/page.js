"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import styles from "./page.module.css";
import { formatDepthToWater, getWaterStatus as sharedWaterStatus } from "@/lib/waterLevel";

const DistrictComparisonChart = dynamic(
    () => import("@/components/Charts/ChartComponents").then((m) => m.DistrictComparisonChart),
    { ssr: false }
);

function formatDepth(value) {
    const text = formatDepthToWater(value, 1);
    if (text === "—") return "No data";
    if (text === "Invalid") return "Invalid reading";
    return `${text} deep`;
}

function getWaterStatus(value, wellDepth = null) {
    const status = sharedWaterStatus(value, wellDepth);
    // Keep farmer-friendly labels while using shared thresholds.
    if (status.key === "unknown") {
        return {
            key: "unknown",
            label: "No data",
            labelHi: status.labelHi,
            tip: status.tip,
            color: "#94a3b8",
        };
    }
    if (status.key === "critical") {
        return {
            key: "urgent",
            label: "Needs care",
            labelHi: status.labelHi,
            tip: status.tip,
            color: "#f87171",
        };
    }
    if (status.key === "warning") {
        return {
            key: "watch",
            label: "Watch closely",
            labelHi: status.labelHi,
            tip: status.tip,
            color: "#fbbf24",
        };
    }
    return {
        key: "ok",
        label: "Doing okay",
        labelHi: status.labelHi,
        tip: status.tip,
        color: "#34d399",
    };
}

function AnalyticsContent() {
    const [districtInsights, setDistrictInsights] = useState([]);
    const [districtComparison, setDistrictComparison] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const [insights, comparison, ov] = await Promise.all([
                    axios.get(`${API_URL}/analytics/district-insights`),
                    axios.get(`${API_URL}/analytics/districts`),
                    axios.get(`${API_URL}/analytics/overview`),
                ]);
                setDistrictInsights(insights.data || []);
                setDistrictComparison(comparison.data || []);
                setOverview(ov.data || null);
                setUpdatedAt(new Date());
            } catch (err) {
                console.error(err);
                setError("Could not load latest district water info. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const ranked = useMemo(() => {
        const rows = Array.isArray(districtInsights) ? [...districtInsights] : [];
        // Deeper absolute water depth first (more stress)
        rows.sort((a, b) => Math.abs(Number(b.current_level) || 0) - Math.abs(Number(a.current_level) || 0));
        return rows;
    }, [districtInsights]);

    const summary = useMemo(() => {
        const total = ranked.length;
        let urgent = 0;
        let watch = 0;
        let ok = 0;
        ranked.forEach((d) => {
            const s = getWaterStatus(d.current_level);
            if (s.key === "urgent") urgent += 1;
            else if (s.key === "watch") watch += 1;
            else if (s.key === "ok") ok += 1;
        });
        return { total, urgent, watch, ok };
    }, [ranked]);

    const updatedText = updatedAt
        ? updatedAt.toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";

    return (
        <main className={styles.main}>
            <div className="container">
                <header className={styles.header}>
                    <div>
                        <p className={styles.kicker}>Simple water report</p>
                        <h1>Which areas need water care?</h1>
                        <p className={styles.sub}>
                            Easy district view for farmers, field staff, and officers.
                            Higher “deep” value usually means more water stress.
                        </p>
                        <p className={styles.updated}>
                            Latest update: <strong>{updatedText}</strong>
                        </p>
                    </div>
                    <div className={styles.actions}>
                        <Link href="/map" className={styles.linkBtnPrimary}>
                            See on Map
                        </Link>
                        <Link href="/dashboard" className={styles.linkBtn}>
                            Graphs & AI
                        </Link>
                    </div>
                </header>

                {error && <div className={styles.error}>{error}</div>}

                {/* Plain language summary cards */}
                <section className={styles.summaryGrid} aria-label="Simple summary">
                    <article className={styles.summaryCard}>
                        <span>Places listed</span>
                        <strong>{loading ? "..." : summary.total}</strong>
                        <p>Districts with recent water info</p>
                    </article>
                    <article className={`${styles.summaryCard} ${styles.urgentCard}`}>
                        <span>Needs care</span>
                        <strong>{loading ? "..." : summary.urgent}</strong>
                        <p>Water is deep — use carefully</p>
                    </article>
                    <article className={`${styles.summaryCard} ${styles.watchCard}`}>
                        <span>Watch closely</span>
                        <strong>{loading ? "..." : summary.watch}</strong>
                        <p>Getting deeper — check weekly</p>
                    </article>
                    <article className={`${styles.summaryCard} ${styles.okCard}`}>
                        <span>Doing okay</span>
                        <strong>{loading ? "..." : summary.ok}</strong>
                        <p>Better than stressed areas</p>
                    </article>
                </section>

                {/* Network snapshot in plain words */}
                <section className={styles.plainBox}>
                    <h2>Today’s network snapshot</h2>
                    <div className={styles.plainGrid}>
                        <div>
                            <span>Total wells/stations</span>
                            <strong>
                                {overview?.total_stations != null
                                    ? Number(overview.total_stations).toLocaleString("en-IN")
                                    : "—"}
                            </strong>
                        </div>
                        <div>
                            <span>Working now</span>
                            <strong>
                                {overview?.active_stations != null
                                    ? Number(overview.active_stations).toLocaleString("en-IN")
                                    : "—"}
                            </strong>
                        </div>
                        <div>
                            <span>Average water depth</span>
                            <strong>
                                {overview?.avg_water_level != null
                                    ? formatDepth(overview.avg_water_level)
                                    : "—"}
                            </strong>
                        </div>
                        <div>
                            <span>Open alerts</span>
                            <strong>
                                {overview?.open_alerts != null
                                    ? Number(overview.open_alerts).toLocaleString("en-IN")
                                    : "0"}
                            </strong>
                        </div>
                    </div>
                    <p className={styles.note}>
                        Tip: “Deep” means the water level is lower underground. In dry months this can
                        mean pumps work harder and wells need more care.
                    </p>
                </section>

                <div className={styles.split}>
                    <section className={styles.panel}>
                        <div className={styles.panelHead}>
                            <h2>Places needing attention</h2>
                            <p>Sorted by deeper water first (more stress)</p>
                        </div>

                        {loading && <p className={styles.muted}>Loading latest district info...</p>}

                        <div className={styles.leaderboard}>
                            {ranked.map((d, i) => {
                                const status = getWaterStatus(d.current_level);
                                const sensors = Number(d.reading_count) || 0;
                                return (
                                    <article
                                        key={`${d.district}-${i}`}
                                        className={`${styles.placeCard} ${styles[`tone_${status.key}`] || ""}`}
                                    >
                                        <div className={styles.placeTop}>
                                            <div className={styles.rank}>{i + 1}</div>
                                            <div className={styles.placeInfo}>
                                                <h3>{d.district || "Unknown place"}</h3>
                                                <p>
                                                    {sensors > 0
                                                        ? `${sensors.toLocaleString("en-IN")} sensor updates`
                                                        : "Few updates"}
                                                </p>
                                            </div>
                                            <span
                                                className={styles.statusPill}
                                                style={{ borderColor: status.color, color: status.color }}
                                            >
                                                {status.label}
                                            </span>
                                        </div>
                                        <div className={styles.placeBottom}>
                                            <div>
                                                <span>Water depth</span>
                                                <strong style={{ color: status.color }}>
                                                    {formatDepth(d.current_level)}
                                                </strong>
                                            </div>
                                            <p className={styles.placeTip}>{status.tip}</p>
                                        </div>
                                    </article>
                                );
                            })}

                            {!loading && !ranked.length && (
                                <p className={styles.muted}>
                                    No district water info is available right now. Please check again later.
                                </p>
                            )}
                        </div>
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHead}>
                            <h2>Simple meaning</h2>
                            <p>For farmers and field teams</p>
                        </div>
                        <ul className={styles.helpList}>
                            <li>
                                <strong>Needs care</strong>
                                <span>Water is deep. Reduce non-essential pumping if possible.</span>
                            </li>
                            <li>
                                <strong>Watch closely</strong>
                                <span>Depth is rising. Check wells every week.</span>
                            </li>
                            <li>
                                <strong>Doing okay</strong>
                                <span>Better condition than stressed districts.</span>
                            </li>
                            <li>
                                <strong>What to do next</strong>
                                <span>
                                    Open <Link href="/map">Map</Link> to find nearby stations, or{" "}
                                    <Link href="/dashboard">Graphs</Link> for one station’s trend.
                                </span>
                            </li>
                        </ul>

                        <div className={styles.legend}>
                            <div><i className={styles.dotUrgent} /> Needs care</div>
                            <div><i className={styles.dotWatch} /> Watch closely</div>
                            <div><i className={styles.dotOk} /> Doing okay</div>
                        </div>
                    </section>
                </div>

                <section className={styles.panelWide}>
                    <div className={styles.panelHead}>
                        <h2>District comparison (chart)</h2>
                        <p>Visual view of water depth by district — deeper bars usually mean more stress.</p>
                    </div>
                    <div className={styles.chartBoxTall}>
                        {loading ? (
                            <p className={styles.muted}>Loading chart...</p>
                        ) : (
                            <DistrictComparisonChart districtData={districtComparison} />
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense
            fallback={
                <main className="container" style={{ marginTop: 120, color: "#94a3b8" }}>
                    Loading simple water report...
                </main>
            }
        >
            <AnalyticsContent />
        </Suspense>
    );
}
