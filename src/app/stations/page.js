"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { api, API_URL } from "@/lib/api";

export default function StationsPage() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [filterState, setFilterState] = useState("");
    const [filterDistrict, setFilterDistrict] = useState("");
    const [search, setSearch] = useState("");
    const [availableStates, setAvailableStates] = useState([]);
    const [availableDistricts, setAvailableDistricts] = useState([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [limit] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // Sorting
    const [sortField, setSortField] = useState("station_name");
    const [sortDir, setSortDir] = useState("asc");

    const fetchStations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                page,
                limit,
            };
            if (filterState) params.state = filterState;
            if (filterDistrict) params.district = filterDistrict;
            if (search.trim()) params.search = search.trim();

            const res = await api.get("/stations", { params });
            let data = res.data.data || [];

            // Client-side sorting (server returns name ASC)
            data = [...data].sort((a, b) => {
                let valA = a[sortField];
                let valB = b[sortField];
                if (valA == null) valA = "";
                if (valB == null) valB = "";
                if (typeof valA === "string") valA = valA.toLowerCase();
                if (typeof valB === "string") valB = valB.toLowerCase();
                if (valA < valB) return sortDir === "asc" ? -1 : 1;
                if (valA > valB) return sortDir === "asc" ? 1 : -1;
                return 0;
            });

            setStations(data);
            setTotalCount(res.data.total || res.data.count || data.length);

            // Build state/district options from current page + known values
            setAvailableStates((prev) => {
                const next = new Set(prev);
                data.forEach((s) => s.state && next.add(s.state));
                return Array.from(next).sort();
            });
            setAvailableDistricts((prev) => {
                const next = new Set(prev);
                data.forEach((s) => {
                    if (s.district && (!filterState || s.state === filterState)) next.add(s.district);
                });
                return Array.from(next).sort();
            });
        } catch (err) {
            console.error("Failed to fetch stations:", err);
            setError("Failed to load station data. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    }, [page, limit, filterState, filterDistrict, search, sortField, sortDir]);

    // Load distinct filters once
    useEffect(() => {
        const loadMeta = async () => {
            try {
                const res = await api.get("/stations", { params: { limit: 2000, page: 0 } });
                const rows = res.data.data || [];
                const states = Array.from(new Set(rows.map((s) => s.state).filter(Boolean))).sort();
                setAvailableStates(states);
            } catch {
                // ignore meta load failure
            }
        };
        loadMeta();
    }, []);

    useEffect(() => {
        fetchStations();
    }, [fetchStations]);

    useEffect(() => {
        // refresh districts when state changes
        const loadDistricts = async () => {
            if (!filterState) {
                setAvailableDistricts([]);
                return;
            }
            try {
                const res = await api.get("/stations", {
                    params: { state: filterState, limit: 2000, page: 0 },
                });
                const rows = res.data.data || [];
                setAvailableDistricts(
                    Array.from(new Set(rows.map((s) => s.district).filter(Boolean))).sort()
                );
            } catch {
                // ignore
            }
        };
        loadDistricts();
    }, [filterState]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    const sortIcon = (field) => {
        if (sortField !== field) return "↕";
        return sortDir === "asc" ? "↑" : "↓";
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const getStatusClass = (status) => {
        const s = (status || "active").toLowerCase();
        if (s === "active") return styles.statusActive;
        if (s === "inactive") return styles.statusInactive;
        return styles.statusUnknown;
    };

    const formatLevel = (value) => {
        if (value == null || value === "") return "—";
        const n = Number(value);
        if (!Number.isFinite(n)) return "—";
        if (Math.abs(n) >= 500) return "Invalid";
        // Always show depth-to-water magnitude (m bgl) for consistency across pages
        return `${Math.abs(n).toFixed(2)} m`;
    };

    const formatFreshness = (iso) => {
        if (!iso) return { label: "No data", tone: "muted" };
        const ts = new Date(iso).getTime();
        if (!Number.isFinite(ts)) return { label: "No data", tone: "muted" };
        const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
        if (days <= 7) return { label: "Fresh", tone: "good" };
        if (days <= 30) return { label: "Stale", tone: "warn" };
        return { label: "Old", tone: "bad" };
    };

    const exportCsv = () => {
        const headers = [
            "station_id",
            "station_code",
            "station_name",
            "state",
            "district",
            "latest_water_level",
            "well_depth",
            "station_status",
            "latest_reading_date",
        ];
        const rows = stations.map((s) =>
            headers
                .map((h) => {
                    const v = s[h] ?? "";
                    const str = String(v).replaceAll('"', '""');
                    return `"${str}"`;
                })
                .join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dwlr-stations-page-${page + 1}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <main className={styles.main}>
            <div className="container">
                <div className={styles.header}>
                    <h1 className={styles.title}>Stations</h1>
                    <p className={styles.subtitle}>
                        Search, filter, and export DWLR stations. Open a station on the dashboard for trends and forecast.
                    </p>
                </div>

                <div className={`glass ${styles.filterBar}`}>
                    <div className={styles.filterGroup}>
                        <label>State</label>
                        <select
                            className={styles.select}
                            value={filterState}
                            onChange={(e) => {
                                setFilterState(e.target.value);
                                setFilterDistrict("");
                                setPage(0);
                            }}
                        >
                            <option value="">All States</option>
                            {availableStates.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label>District</label>
                        <select
                            className={styles.select}
                            value={filterDistrict}
                            onChange={(e) => {
                                setFilterDistrict(e.target.value);
                                setPage(0);
                            }}
                            disabled={!filterState}
                        >
                            <option value="">All Districts</option>
                            {availableDistricts.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Search</label>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Station name or code..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                        />
                    </div>

                    <div className={styles.filterStats}>
                        <span className={styles.resultCount}>
                            {totalCount} stations found
                        </span>
                        <button type="button" className={styles.exportBtn} onClick={exportCsv} disabled={!stations.length}>
                            Export CSV
                        </button>
                        <span className={styles.apiHint} title={API_URL}>
                            API ready
                        </span>
                    </div>
                </div>

                {error && (
                    <div className={styles.errorBox}>
                        <span>⚠️</span> {error}
                        <button type="button" className={styles.retryInline} onClick={fetchStations}>
                            Retry
                        </button>
                    </div>
                )}

                {loading && !error && (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>Loading stations...</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort("station_name")} className={styles.sortable}>
                                            Station {sortIcon("station_name")}
                                        </th>
                                        <th onClick={() => handleSort("state")} className={styles.sortable}>
                                            State {sortIcon("state")}
                                        </th>
                                        <th onClick={() => handleSort("district")} className={styles.sortable}>
                                            District {sortIcon("district")}
                                        </th>
                                        <th onClick={() => handleSort("latest_water_level")} className={styles.sortable}>
                                            Depth to water (m bgl) {sortIcon("latest_water_level")}
                                        </th>
                                        <th onClick={() => handleSort("well_depth")} className={styles.sortable}>
                                            Well Depth {sortIcon("well_depth")}
                                        </th>
                                        <th onClick={() => handleSort("station_status")} className={styles.sortable}>
                                            Status {sortIcon("station_status")}
                                        </th>
                                        <th>Data Age</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stations.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className={styles.emptyRow}>
                                                No stations match your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        stations.map((s) => (
                                            <tr key={s.station_id}>
                                                <td>
                                                    <div className={styles.stationCell}>
                                                        <strong>{s.station_name}</strong>
                                                        <span>{s.station_code}</span>
                                                    </div>
                                                </td>
                                                <td>{s.state || "—"}</td>
                                                <td>{s.district || "—"}</td>
                                                <td>{formatLevel(s.latest_water_level)}</td>
                                                <td>
                                                    {s.well_depth != null
                                                        ? `${Number(s.well_depth).toFixed(1)} m`
                                                        : "—"}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`${styles.statusBadge} ${getStatusClass(
                                                            s.station_status
                                                        )}`}
                                                    >
                                                        {s.station_status || "active"}
                                                    </span>
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const f = formatFreshness(s.latest_reading_date);
                                                        return (
                                                            <span className={`${styles.freshBadge} ${styles["fresh_" + f.tone] || ""}`}>
                                                                {f.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td>
                                                    <div className={styles.actionLinks}>
                                                        <Link
                                                            href={`/dashboard?station_id=${s.station_id}`}
                                                            className={styles.viewLink}
                                                        >
                                                            Dashboard
                                                        </Link>
                                                        <Link
                                                            href={`/map`}
                                                            className={styles.mapLink}
                                                        >
                                                            Map
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.pagination}>
                            <button
                                type="button"
                                className={styles.pageBtn}
                                disabled={page <= 0}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                            >
                                Previous
                            </button>
                            <span className={styles.pageInfo}>
                                Page {page + 1} of {totalPages}
                            </span>
                            <button
                                type="button"
                                className={styles.pageBtn}
                                disabled={page + 1 >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
