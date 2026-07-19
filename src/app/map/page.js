"use client";

import { useState, useEffect, useMemo, useRef, useDeferredValue } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import Map from "@/components/Map";
import {
    formatDepthToWater,
    stationWaterMetrics,
    wellFillPercent,
} from "@/lib/waterLevel";
import { fetchStationsCached } from "@/lib/stationsCache";

function getPercent(station) {
    const fill = wellFillPercent(station.latest_water_level, station.well_depth, {
        allowVisualFallback: true,
    });
    return fill == null ? null : Math.round(fill);
}

function getRisk(station) {
    const status = stationWaterMetrics(station);
    if (status.key === "unknown") return { key: "unknown", label: "NO DATA", tone: "muted" };
    if (status.key === "critical") return { key: "critical", label: "CRITICAL", tone: "critical" };
    if (status.key === "warning") return { key: "warning", label: "WATCH", tone: "warning" };
    return { key: "stable", label: "STABLE", tone: "stable" };
}

export default function MapPage() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMode, setFilterMode] = useState("all"); // all | active | critical | warning
    const [sortBy, setSortBy] = useState("risk");
    const [selectedMapStation, setSelectedMapStation] = useState(null);
    const [filterState, setFilterState] = useState("");
    const stationRefs = useRef({});
    const deferredQuery = useDeferredValue(searchQuery);

    const fetchStations = async () => {
        try {
            setLoading(true);
            setError(null);
            // force on explicit Refresh so user can bypass cache
            const rows = await fetchStationsCached({ limit: 2000, force: true });
            setStations(rows);
        } catch (err) {
            console.error(err);
            setError("Failed to load stations. Check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                // Use cache when available so revisiting map doesn't re-hit API
                const rows = await fetchStationsCached({ limit: 2000 });
                if (!cancelled) setStations(rows);
            } catch (err) {
                console.error(err);
                if (!cancelled) setError("Failed to load stations. Check backend connection.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const states = useMemo(
        () => Array.from(new Set(stations.map((s) => s.state).filter(Boolean))).sort(),
        [stations]
    );

    const filteredStations = useMemo(() => {
        let list = [...stations];

        if (filterState) list = list.filter((s) => s.state === filterState);

        if (filterMode === "active") {
            list = list.filter((s) => String(s.station_status || "").toLowerCase() === "active");
        } else if (filterMode === "critical") {
            list = list.filter((s) => getRisk(s).key === "critical");
        } else if (filterMode === "warning") {
            list = list.filter((s) => getRisk(s).key === "warning");
        }

        if (deferredQuery.trim()) {
            const q = deferredQuery.trim().toLowerCase();
            list = list.filter((s) => {
                const hay = `${s.station_name || ""} ${s.station_code || ""} ${s.district || ""} ${s.state || ""}`.toLowerCase();
                return hay.includes(q);
            });
        }

        list.sort((a, b) => {
            if (sortBy === "name") return (a.station_name || "").localeCompare(b.station_name || "");
            if (sortBy === "level") {
                return Math.abs(Number(b.latest_water_level) || 0) - Math.abs(Number(a.latest_water_level) || 0);
            }
            // risk first
            const order = { critical: 0, warning: 1, stable: 2, unknown: 3 };
            return (order[getRisk(a).key] ?? 9) - (order[getRisk(b).key] ?? 9);
        });

        return list;
    }, [stations, filterState, filterMode, deferredQuery, sortBy]);

    const counts = useMemo(() => {
        const base = filterState ? stations.filter((s) => s.state === filterState) : stations;
        return {
            all: base.length,
            active: base.filter((s) => String(s.station_status || "").toLowerCase() === "active").length,
            critical: base.filter((s) => getRisk(s).key === "critical").length,
            warning: base.filter((s) => getRisk(s).key === "warning").length,
        };
    }, [stations, filterState]);

    const handleStationSelect = (station) => {
        setSelectedMapStation(station);
        const el = stationRefs.current[station.station_id];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    return (
        <div className={styles.shell}>
            <div className={styles.mapPane}>
                <div className={styles.mapFrame}>
                    {error ? (
                        <div className={styles.errorBox}>
                            <p>{error}</p>
                            <button type="button" onClick={fetchStations}>Retry</button>
                        </div>
                    ) : (
                        <Map
                            stations={filteredStations}
                            selectedStation={selectedMapStation}
                            onStationSelect={handleStationSelect}
                        />
                    )}

                    <div className={styles.mapChips}>
                        <button
                            type="button"
                            className={`${styles.chip} ${filterMode === "all" ? styles.chipActive : ""}`}
                            onClick={() => setFilterMode("all")}
                        >
                            ALL <span>{counts.all}</span>
                        </button>
                        <button
                            type="button"
                            className={`${styles.chip} ${filterMode === "active" ? styles.chipActive : ""}`}
                            onClick={() => setFilterMode("active")}
                        >
                            Active <span>{counts.active}</span>
                        </button>
                        <button
                            type="button"
                            className={`${styles.chip} ${styles.chipWarn} ${filterMode === "warning" ? styles.chipActive : ""}`}
                            onClick={() => setFilterMode("warning")}
                        >
                            Medium <span>{counts.warning}</span>
                        </button>
                        <button
                            type="button"
                            className={`${styles.chip} ${styles.chipDanger} ${filterMode === "critical" ? styles.chipActive : ""}`}
                            onClick={() => setFilterMode("critical")}
                        >
                            Critical <span>{counts.critical}</span>
                        </button>
                    </div>

                    {loading && <div className={styles.mapLoading}>Loading stations...</div>}
                </div>
            </div>

            <aside className={styles.sidebar}>
                <div className={styles.sideHead}>
                    <div>
                        <h1>DWLR Station Map</h1>
                        <p>Live network locations with well-fill markers (same formula as dashboard)</p>
                    </div>
                    <button type="button" className={styles.refreshBtn} onClick={fetchStations} disabled={loading}>
                        Refresh
                    </button>
                </div>

                <div className={styles.controls}>
                    <input
                        className={styles.search}
                        type="search"
                        placeholder="Search stations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select
                        className={styles.select}
                        value={filterState}
                        onChange={(e) => setFilterState(e.target.value)}
                    >
                        <option value="">All states</option>
                        {states.map((st) => (
                            <option key={st} value={st}>{st}</option>
                        ))}
                    </select>
                    <select
                        className={styles.select}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="risk">Sort: Risk</option>
                        <option value="name">Sort: Name</option>
                        <option value="level">Sort: Level</option>
                    </select>
                </div>

                <div className={styles.listMeta}>
                    Showing <strong>{filteredStations.length}</strong> stations
                </div>

                <div className={styles.list}>
                    {filteredStations.length === 0 && !loading ? (
                        <div className={styles.empty}>No stations match filters.</div>
                    ) : (
                        filteredStations.map((station) => {
                            const risk = getRisk(station);
                            const pct = getPercent(station);
                            const selected = selectedMapStation?.station_id === station.station_id;
                            return (
                                <article
                                    key={station.station_id}
                                    ref={(el) => {
                                        stationRefs.current[station.station_id] = el;
                                    }}
                                    className={`${styles.card} ${styles[`card_${risk.tone}`] || ""} ${selected ? styles.cardSelected : ""}`}
                                    onClick={() => handleStationSelect(station)}
                                >
                                    <div className={styles.cardTop}>
                                        <span className={`${styles.badge} ${styles[`badge_${risk.tone}`] || ""}`}>
                                            {risk.label}
                                        </span>
                                        <span className={styles.statusPill}>
                                            {String(station.station_status || "active").toLowerCase()}
                                        </span>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div>
                                            <h3>{station.station_name}</h3>
                                            <p>
                                                {station.district || "District"}, {station.state || "State"}
                                            </p>
                                            <p className={styles.code}>{station.station_code}</p>
                                        </div>
                                        <div className={styles.cardMetric}>
                                            <strong>{pct == null ? "—" : `${pct}%`}</strong>
                                            <span>well fill</span>
                                            <em>
                                                {formatDepthToWater(station.latest_water_level)} bgl
                                            </em>
                                        </div>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <Link
                                            href={`/dashboard?station_id=${station.station_id}`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Dashboard
                                        </Link>
                                        <Link
                                            href={`/analytics?station_id=${station.station_id}`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Graphs
                                        </Link>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </aside>
        </div>
    );
}
