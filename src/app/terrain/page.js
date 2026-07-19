"use client";

import { useEffect, useMemo, useState, useDeferredValue } from "react";
import Link from "next/link";
import Terrain3DMap from "@/components/Terrain";
import styles from "./page.module.css";
import { formatDepthToWater } from "@/lib/waterLevel";
import { fetchStationsCached } from "@/lib/stationsCache";

function formatDepth(v) {
    const text = formatDepthToWater(v, 1);
    if (text === "—") return "No data";
    if (text === "Invalid") return "Invalid reading";
    return `${text} deep`;
}

export default function TerrainPage() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);
    const [query, setQuery] = useState("");
    const [stateFilter, setStateFilter] = useState("");
    const [exaggeration, setExaggeration] = useState(1.8);
    const [pitch, setPitch] = useState(62);
    const deferredQuery = useDeferredValue(query);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const rows = await fetchStationsCached({ limit: 2000 });
                if (!cancelled) setStations(rows);
            } catch (err) {
                console.error(err);
                if (!cancelled) setError("Could not load stations for 3D terrain.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const states = useMemo(
        () => Array.from(new Set(stations.map((s) => s.state).filter(Boolean))).sort(),
        [stations]
    );

    const filtered = useMemo(() => {
        let rows = stations;
        if (stateFilter) rows = rows.filter((s) => s.state === stateFilter);
        if (deferredQuery.trim()) {
            const q = deferredQuery.trim().toLowerCase();
            rows = rows.filter((s) => {
                const hay = `${s.station_name || ""} ${s.district || ""} ${s.station_code || ""} ${s.state || ""}`.toLowerCase();
                return hay.includes(q);
            });
        }
        return rows;
    }, [stations, stateFilter, deferredQuery]);

    return (
        <div className={styles.shell}>
            {/* BIG 3D terrain section */}
            <section className={styles.mapPane}>
                <div className={styles.mapChrome}>
                    <div className={styles.mapTitle}>
                        <span className={styles.kicker}>3D Terrain</span>
                        <h1>India landform + DWLR wells</h1>
                    </div>
                    <div className={styles.mapControls}>
                        <label>
                            Height
                            <input
                                type="range"
                                min="0.6"
                                max="3.2"
                                step="0.1"
                                value={exaggeration}
                                onChange={(e) => setExaggeration(Number(e.target.value))}
                            />
                        </label>
                        <label>
                            Tilt
                            <input
                                type="range"
                                min="30"
                                max="75"
                                step="1"
                                value={pitch}
                                onChange={(e) => setPitch(Number(e.target.value))}
                            />
                        </label>
                    </div>
                </div>

                <div className={styles.mapStage}>
                    {error ? (
                        <div className={styles.errorBox}>{error}</div>
                    ) : (
                        <Terrain3DMap
                            // Keep full station set on the map so search/filter
                            // only updates the sidebar list (no GeoJSON thrash).
                            stations={stations}
                            selectedId={selected?.station_id ?? null}
                            exaggeration={exaggeration}
                            pitch={pitch}
                            onSelect={setSelected}
                        />
                    )}
                    {loading && <div className={styles.loadingPill}>Loading stations...</div>}
                </div>

                <p className={styles.hint}>
                    Drag to rotate · Scroll to zoom · Click a cyan pin for details
                </p>
            </section>

            {/* SMALL sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sideHead}>
                    <h2>Details</h2>
                    <span>{filtered.length} wells</span>
                </div>

                <div className={styles.filters}>
                    <input
                        type="search"
                        placeholder="Search station..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className={styles.input}
                    />
                    <select
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className={styles.input}
                    >
                        <option value="">All states</option>
                        {states.map((st) => (
                            <option key={st} value={st}>
                                {st}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.detailCard}>
                    {selected ? (
                        <>
                            <div className={styles.detailHead}>
                                <h3>{selected.station_name}</h3>
                                <button
                                    type="button"
                                    className={styles.closeBtn}
                                    onClick={() => setSelected(null)}
                                    aria-label="Close station details"
                                    title="Close"
                                >
                                    ×
                                </button>
                            </div>
                            <p className={styles.place}>
                                {selected.district || "District"}, {selected.state || "State"}
                            </p>
                            <ul className={styles.kv}>
                                <li>
                                    <span>Code</span>
                                    <strong>{selected.station_code || "—"}</strong>
                                </li>
                                <li>
                                    <span>Water</span>
                                    <strong>{formatDepth(selected.latest_water_level)}</strong>
                                </li>
                                <li>
                                    <span>Well depth</span>
                                    <strong>
                                        {selected.well_depth != null
                                            ? `${Number(selected.well_depth).toFixed(1)} m`
                                            : "—"}
                                    </strong>
                                </li>
                                <li>
                                    <span>Lat / Lng</span>
                                    <strong>
                                        {Number(selected.latitude).toFixed(3)},{" "}
                                        {Number(selected.longitude).toFixed(3)}
                                    </strong>
                                </li>
                            </ul>
                            <div className={styles.links}>
                                <Link href={`/dashboard?station_id=${selected.station_id}`}>
                                    Graphs + well animation
                                </Link>
                                <Link href="/map">2D risk map</Link>
                            </div>
                        </>
                    ) : (
                        <p className={styles.empty}>
                            Click a station pin on the 3D terrain to see details here.
                        </p>
                    )}
                </div>

                <div className={styles.list}>
                    {filtered.slice(0, 40).map((s) => (
                        <button
                            key={s.station_id}
                            type="button"
                            className={`${styles.listItem} ${
                                selected?.station_id === s.station_id ? styles.listActive : ""
                            }`}
                            onClick={() => setSelected(s)}
                        >
                            <strong>{s.station_name}</strong>
                            <span>
                                {s.district || "—"} ·{" "}
                                {s.latest_water_level != null
                                    ? `${Number(s.latest_water_level).toFixed(1)}m`
                                    : "n/a"}
                            </span>
                        </button>
                    ))}
                    {filtered.length > 40 && (
                        <p className={styles.more}>Showing first 40. Use search to narrow.</p>
                    )}
                </div>
            </aside>
        </div>
    );
}
