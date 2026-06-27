"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SyncPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // States and Districts Data
    const [stations, setStations] = useState([]);
    const [loadingStations, setLoadingStations] = useState(false);

    // Sync State and Form
    const [syncState, setSyncState] = useState("idle");
    const [syncMessage, setSyncMessage] = useState("");

    const today = new Date().toISOString().split("T")[0];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const defaultStart = oneYearAgo.toISOString().split("T")[0];

    const [syncParams, setSyncParams] = useState({
        stateName: "",
        districtName: "",
        startdate: defaultStart,
        enddate: today
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    // ── Secure Session Check ──
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("admin_token");
            if (!token) {
                setIsAdmin(false);
                setCheckingAuth(false);
                return;
            }

            try {
                const res = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.user && res.data.user.role === "admin") {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                    localStorage.removeItem("admin_token");
                }
            } catch (err) {
                console.error("Auth check failed:", err);
                setIsAdmin(false);
                localStorage.removeItem("admin_token");
            } finally {
                setCheckingAuth(false);
            }
        };
        checkAuth();
    }, [API_URL]);

    // ── Load Stations for Dropdowns ──
    useEffect(() => {
        if (!isAdmin) return;

        const fetchStations = async () => {
            try {
                setLoadingStations(true);
                const res = await axios.get(`${API_URL}/stations?limit=2000`);
                setStations(res.data.data || []);
            } catch (err) {
                console.error("Failed to load stations for sync:", err);
            } finally {
                setLoadingStations(false);
            }
        };
        fetchStations();
    }, [isAdmin, API_URL]);

    const availableStates = Array.from(new Set(stations.map(s => s.state))).filter(Boolean).sort();
    const availableDistricts = syncParams.stateName
        ? Array.from(new Set(stations.filter(s => s.state === syncParams.stateName).map(s => s.district))).filter(Boolean).sort()
        : [];

    const handleSync = async () => {
        if (!syncParams.stateName || !syncParams.districtName) {
            setSyncState("error");
            setSyncMessage("Please select State and District to sync.");
            return;
        }

        const token = localStorage.getItem("admin_token");
        if (!token) {
            setSyncState("error");
            setSyncMessage("Session expired. Please log in again.");
            setIsAdmin(false);
            return;
        }

        try {
            setSyncState("syncing");
            setSyncMessage("");
            
            const res = await axios.post(`${API_URL}/sync`, {
                stateName: syncParams.stateName,
                districtName: syncParams.districtName,
                startdate: syncParams.startdate,
                enddate: syncParams.enddate,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSyncState("success");
            setSyncMessage(`Success: ${res.data.stationsUpserted || 0} stations updated, ${res.data.readingsInserted || 0} readings added.`);

            // Redirect to map after 2 seconds
            setTimeout(() => {
                router.push("/map");
            }, 2000);

        } catch (err) {
            console.error("Sync failed:", err);
            setSyncState("error");
            setSyncMessage(err.response?.data?.error || err.response?.data?.message || "Failed to fetch data from WRIS.");
        }
    };

    if (checkingAuth) {
        return (
            <main className="container" style={{ marginTop: "120px", display: "flex", justifyContent: "center" }}>
                <div className={styles.spinnerSmall} style={{ width: "40px", height: "40px" }}></div>
            </main>
        );
    }

    return (
        <main className="container" style={{ marginTop: "120px", display: "flex", justifyContent: "center" }}>
            <div className={styles.syncCard}>
                <div className={styles.header}>
                    <h2>Administration: Fetch Live Data</h2>
                </div>

                {!isAdmin ? (
                    <div className={styles.restrictedView}>
                        <div className={styles.lockIcon}>🔒</div>
                        <h3>Access Restricted</h3>
                        <p style={{ marginBottom: "20px" }}>Only authenticated administrators can sync live data from the India WRIS API.</p>
                        <Link href="/admin" className="btn-primary" style={{ padding: "10px 20px", textDecoration: "none", borderRadius: "8px", fontWeight: "bold" }}>
                            Go to Login
                        </Link>
                    </div>
                ) : (
                    <div className={styles.formContainer}>
                        <p className={styles.description}>
                            Select a target jurisdiction and timeframe to download fresh groundwater measurements. This process may take a minute depending on the amount of data.
                        </p>

                        <div className={styles.inputGroup}>
                            <label>Target State</label>
                            <select
                                className="form-select"
                                value={syncParams.stateName}
                                onChange={(e) => setSyncParams({ ...syncParams, stateName: e.target.value, districtName: "" })}
                                disabled={loadingStations || syncState === "syncing"}
                            >
                                <option value="">Select State...</option>
                                {availableStates.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Target District</label>
                            <select
                                className="form-select"
                                value={syncParams.districtName}
                                onChange={(e) => setSyncParams({ ...syncParams, districtName: e.target.value })}
                                disabled={!syncParams.stateName || syncState === "syncing"}
                            >
                                <option value="">Select District...</option>
                                {availableDistricts.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                            </select>
                        </div>

                        <div className={styles.dateGrid}>
                            <div className={styles.inputGroup}>
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    className="form-select"
                                    value={syncParams.startdate}
                                    onChange={(e) => setSyncParams({ ...syncParams, startdate: e.target.value })}
                                    disabled={syncState === "syncing"}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>End Date</label>
                                <input
                                    type="date"
                                    className="form-select"
                                    value={syncParams.enddate}
                                    onChange={(e) => setSyncParams({ ...syncParams, enddate: e.target.value })}
                                    disabled={syncState === "syncing"}
                                />
                            </div>
                        </div>

                        <button
                            className={`btn-primary ${styles.syncBtn}`}
                            onClick={handleSync}
                            disabled={syncState === "syncing"}
                        >
                            {syncState === "syncing" ? (
                                <>
                                    <div className={styles.spinnerSmall}></div>
                                    Downloading Data...
                                </>
                            ) : "⬇️ Execute Sync"}
                        </button>

                        {syncMessage && (
                            <div className={`${styles.statusBox} ${syncState === "error" ? styles.errorBox : styles.successBox}`}>
                                {syncState === "error" ? "⚠️ " : "✅ "}
                                {syncMessage}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
