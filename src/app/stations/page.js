"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const STATES = ["Maharashtra", "Gujarat", "Rajasthan"];
const DISTRICTS_MAP = {
    Maharashtra: ["Pune", "Nagpur", "Nashik", "Thane"],
    Gujarat: ["Ahmedabad", "Surat", "Rajkot", "Vadodara"],
    Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Bikaner"],
};

export default function StationsPage() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [filterState, setFilterState] = useState("");
    const [filterDistrict, setFilterDistrict] = useState("");
    const [search, setSearch] = useState("");

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

            let url = `${API_URL}/stations?page=${page}&limit=${limit}`;
            if (filterState) url += `&state=${encodeURIComponent(filterState)}`;
            if (filterDistrict) url += `&district=${encodeURIComponent(filterDistrict)}`;

            const res = await axios.get(url);
            let data = res.data.data || [];

            // Client-side search filter
            if (search.trim()) {
                const q = search.toLowerCase();
                data = data.filter(
                    (s) =>
                        s.station_name?.toLowerCase().includes(q) ||
                        s.station_code?.toLowerCase().includes(q)
                );
            }

            // Client-side sorting
            data.sort((a, b) => {
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
            setTotalCount(res.data.count || data.length);
        } catch (err) {
            console.error("Failed to fetch stations:", err);
            setError("Failed to load station data. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    }, [page, limit, filterState, filterDistrict, search, sortField, sortDir]);

    useEffect(() => {
        fetchStations();
    }, [fetchStations]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    const sortIcon = (field) => {
        if (sortField !== field) return "⇅";
        return sortDir === "asc" ? "↑" : "↓";
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const getStatusClass = (status) => {
        const s = (status || "active").toLowerCase();
        if (s === "active") return styles.statusActive;
        if (s === "inactive") return styles.statusInactive;
        return styles.statusUnknown;
    };

    return (
        <main className={styles.main}>
            <div className="container">
                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.title}>Monitoring Stations</h1>
                    <p className={styles.subtitle}>
                        Browse, search, and filter DWLR groundwater monitoring stations across India.
                    </p>
                </div>

                {/* Filter Bar */}
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
                            {STATES.map((s) => (
                                <option key={s} value={s}>{s}</option>
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
                            {filterState &&
                                (DISTRICTS_MAP[filterState] || []).map((d) => (
                                    <option key={d} value={d}>{d}</option>
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
                            {stations.length} stations found
                        </span>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className={styles.errorBox}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* Loading State */}
                {loading && !error && (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>Loading stations...</p>
                    </div>
                )}

                {/* Data Table */}
                {!loading && !error && (
                    <>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort("station_name")} className={styles.sortable}>
                                            Station Name {sortIcon("station_name")}
                                        </th>
                                        <th onClick={() => handleSort("station_code")} className={styles.sortable}>
                                            Code {sortIcon("station_code")}
                                        </th>
                                        <th onClick={() => handleSort("state")} className={styles.sortable}>
                                            State {sortIcon("state")}
                                        </th>
                                        <th onClick={() => handleSort("district")} className={styles.sortable}>
                                            District {sortIcon("district")}
                                        </th>
                                        <th onClick={() => handleSort("latest_water_level")} className={styles.sortable}>
                                            Water Level (m) {sortIcon("latest_water_level")}
                                        </th>
                                        <th onClick={() => handleSort("aquifer_type")} className={styles.sortable}>
                                            Aquifer {sortIcon("aquifer_type")}
                                        </th>
                                        <th onClick={() => handleSort("station_status")} className={styles.sortable}>
                                            Status {sortIcon("station_status")}
                                        </th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stations.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className={styles.emptyRow}>
                                                No stations found. Try adjusting your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        stations.map((s) => (
                                            <tr key={s.station_id}>
                                                <td className={styles.stationName}>{s.station_name}</td>
                                                <td className={styles.code}>{s.station_code}</td>
                                                <td>{s.state}</td>
                                                <td>{s.district}</td>
                                                <td className={styles.waterLevel}>
                                                    {s.latest_water_level != null
                                                        ? Number(s.latest_water_level).toFixed(2)
                                                        : "—"}
                                                </td>
                                                <td>{s.aquifer_type || "—"}</td>
                                                <td>
                                                    <span className={`${styles.statusBadge} ${getStatusClass(s.station_status)}`}>
                                                        {s.station_status || "Active"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <Link
                                                        href={`/stations/${s.station_id}`}
                                                        className={styles.viewBtn}
                                                    >
                                                        View →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className={styles.pagination}>
                            <button
                                className={styles.pageBtn}
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                            >
                                ← Previous
                            </button>
                            <span className={styles.pageInfo}>
                                Page {page + 1} of {totalPages}
                            </span>
                            <button
                                className={styles.pageBtn}
                                onClick={() => setPage(page + 1)}
                                disabled={page + 1 >= totalPages}
                            >
                                Next →
                            </button>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
