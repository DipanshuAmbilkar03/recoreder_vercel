"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "./page.module.css";
import { api } from "@/lib/api";

const GlobeBackground = dynamic(() => import("@/components/GlobeBackground"), {
    ssr: false,
    loading: () => <div className={styles.globeFallback} aria-hidden="true" />,
});

export default function Home() {
    const [stats, setStats] = useState(null);
    const [apiOnline, setApiOnline] = useState(null);
    const [clock, setClock] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setClock(new Date());
        const t = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [health, overview] = await Promise.all([
                    api.get("/health", { timeout: 5000 }),
                    api.get("/analytics/overview", { timeout: 8000 }),
                ]);
                if (cancelled) return;
                setApiOnline(health.data?.status === "ok");
                setStats(overview.data || null);
            } catch {
                if (!cancelled) {
                    setApiOnline(false);
                    setStats(null);
                }
            }
        };
        load();
        const poll = setInterval(load, 45000);
        return () => {
            cancelled = true;
            clearInterval(poll);
        };
    }, []);

    const formatNum = (v) => {
        if (v == null || v === "") return "—";
        const n = Number(v);
        return Number.isFinite(n) ? n.toLocaleString("en-IN") : String(v);
    };

    const timeLabel = useMemo(() => {
        if (!clock) return "--:--:--";
        return clock.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }, [clock]);

    const dateLabel = useMemo(() => {
        if (!clock) return "—";
        return clock.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
        });
    }, [clock]);

    const statusText =
        apiOnline === true ? "System online" : apiOnline === false ? "API offline" : "Connecting...";

    return (
        <section className={`${styles.hero} ${mounted ? styles.ready : ""}`}>
            <GlobeBackground />

            {/* Slim status strip under nav */}
            <div className={styles.statusStrip}>
                <span
                    className={`${styles.statusDot} ${
                        apiOnline === true
                            ? styles.online
                            : apiOnline === false
                              ? styles.offline
                              : styles.checking
                    }`}
                >
                    {statusText}
                </span>
                <span className={styles.clock} suppressHydrationWarning>
                    {mounted ? dateLabel : "—"}
                    <em suppressHydrationWarning>{mounted ? timeLabel : "--:--:--"}</em>
                </span>
            </div>

            {/* Centered content group */}
            <div className={styles.heroInner}>
                <div className={styles.contentGrid}>
                    <div className={styles.copyCol}>
                        <p className={`${styles.kicker} ${styles.anim} ${styles.d1}`}>
                            Jal Shakti · India focus
                        </p>
                        <h1 className={`${styles.title} ${styles.anim} ${styles.d2}`}>
                            Track groundwater
                            <span>across India</span>
                        </h1>
                        <p className={`${styles.lead} ${styles.anim} ${styles.d3}`}>
                            Live DWLR station map, depth trends, and AI forecast — built for faster
                            field and district decisions.
                        </p>

                        <div className={`${styles.actions} ${styles.anim} ${styles.d4}`}>
                            <Link href="/map" className={styles.primary}>
                                <span>Explore Map</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        d="M5 12h14M13 6l6 6-6 6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </Link>
                            <Link href="/dashboard" className={styles.secondary}>
                                View Graphs
                            </Link>
                            <Link href="/analytics" className={styles.ghost}>
                                District Risk
                            </Link>
                        </div>

                        <div className={`${styles.pathRow} ${styles.anim} ${styles.d5}`}>
                            <Link href="/map">Map</Link>
                            <i />
                            <Link href="/dashboard">Dashboard</Link>
                            <i />
                            <Link href="/analytics">Analytics</Link>
                            <i />
                            <Link href="/stations">Stations</Link>
                        </div>
                    </div>

                    <aside className={`${styles.statsCard} ${styles.anim} ${styles.d4}`}>
                        <div className={styles.statsHead}>
                            <span>Live network</span>
                            <strong>{apiOnline ? "Synced" : "Waiting"}</strong>
                        </div>
                        <ul className={styles.statsList}>
                            <li>
                                <span>Stations</span>
                                <strong>{stats ? formatNum(stats.total_stations) : "..."}</strong>
                            </li>
                            <li>
                                <span>Active</span>
                                <strong>{stats ? formatNum(stats.active_stations) : "..."}</strong>
                            </li>
                            <li>
                                <span>Avg depth</span>
                                <strong>
                                    {stats?.avg_water_level != null
                                        ? `${Number(stats.avg_water_level).toFixed(1)} m`
                                        : "..."}
                                </strong>
                            </li>
                            <li>
                                <span>Open alerts</span>
                                <strong className={styles.alertVal}>
                                    {stats ? formatNum(stats.open_alerts ?? 0) : "..."}
                                </strong>
                            </li>
                        </ul>
                        <Link href="/stations" className={styles.statsCta}>
                            Browse full station list
                        </Link>
                    </aside>
                </div>
            </div>
        </section>
    );
}
