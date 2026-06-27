"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function AdminPortal() {
    const router = useRouter();

    // Authentication States
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginSubmitting, setLoginSubmitting] = useState(false);
    const [adminUser, setAdminUser] = useState(null);

    // Sync States (available after login)
    const [stations, setStations] = useState([]);
    const [loadingStations, setLoadingStations] = useState(false);
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

    // ── Check Login Status on Mount ──
    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem("admin_token");
            if (!token) {
                setAuthLoading(false);
                return;
            }

            try {
                const res = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.user) {
                    setIsAuthenticated(true);
                    setAdminUser(res.data.user);
                } else {
                    localStorage.removeItem("admin_token");
                }
            } catch (err) {
                console.error("Session verification failed:", err);
                localStorage.removeItem("admin_token");
            } finally {
                setAuthLoading(false);
            }
        };

        verifySession();
    }, [API_URL]);

    // ── Fetch Station Data (Only when logged in) ──
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchStations = async () => {
            try {
                setLoadingStations(true);
                const res = await axios.get(`${API_URL}/stations?limit=2000`);
                setStations(res.data.data || []);
            } catch (err) {
                console.error("Failed to load stations:", err);
            } finally {
                setLoadingStations(false);
            }
        };
        fetchStations();
    }, [isAuthenticated, API_URL]);

    // Available States and Districts computed from fetched stations
    const availableStates = Array.from(new Set(stations.map(s => s.state))).filter(Boolean).sort();
    const availableDistricts = syncParams.stateName
        ? Array.from(new Set(stations.filter(s => s.state === syncParams.stateName).map(s => s.district))).filter(Boolean).sort()
        : [];

    // ── Handle Admin Login ──
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        setLoginSubmitting(true);

        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, password });
            if (res.data?.token) {
                localStorage.setItem("admin_token", res.data.token);
                setAdminUser(res.data.user);
                setIsAuthenticated(true);
                // Dispatch event so navbar updates state
                window.dispatchEvent(new Event("admin-login"));
            }
        } catch (err) {
            console.error("Login failed:", err);
            setLoginError(err.response?.data?.error || "Invalid email or password. Please try again.");
        } finally {
            setLoginSubmitting(false);
        }
    };

    // ── Handle Admin Logout ──
    const handleLogout = () => {
        localStorage.removeItem("admin_token");
        setAdminUser(null);
        setIsAuthenticated(false);
        // Clear forms
        setEmail("");
        setPassword("");
        window.dispatchEvent(new Event("admin-logout"));
    };

    // ── Handle Database Synchronization ──
    const handleSync = async () => {
        if (!syncParams.stateName || !syncParams.districtName) {
            setSyncState("error");
            setSyncMessage("Please select a State and a District to sync.");
            return;
        }

        const token = localStorage.getItem("admin_token");
        if (!token) {
            setSyncState("error");
            setSyncMessage("Your session has expired. Please log in again.");
            setIsAuthenticated(false);
            return;
        }

        try {
            setSyncState("syncing");
            setSyncMessage("");

            const res = await axios.post(
                `${API_URL}/sync`,
                {
                    stateName: syncParams.stateName,
                    districtName: syncParams.districtName,
                    startdate: syncParams.startdate,
                    enddate: syncParams.enddate,
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setSyncState("success");
            setSyncMessage(`Success: ${res.data.stationsUpserted || 0} stations updated, ${res.data.readingsInserted || 0} readings added.`);
            
            // Refresh local station options
            const updateRes = await axios.get(`${API_URL}/stations?limit=2000`);
            setStations(updateRes.data.data || []);
        } catch (err) {
            console.error("Sync execution failed:", err);
            setSyncState("error");
            setSyncMessage(err.response?.data?.error || err.response?.data?.message || "Failed to fetch data from India WRIS.");
        }
    };

    if (authLoading) {
        return (
            <main className={styles.container}>
                <div className={styles.spinnerSmall} style={{ width: "40px", height: "40px" }}></div>
            </main>
        );
    }

    // ── RENDER LOGIN CARD (If not logged in) ──
    if (!isAuthenticated) {
        return (
            <main className={styles.container}>
                <div className={styles.loginCard}>
                    <div className={styles.header}>
                        <h2>Admin Portal</h2>
                        <p>Sign in to sync groundwater data and configure DWLR stations. General users can view dashboards without credentials.</p>
                    </div>

                    <form onSubmit={handleLogin} className={styles.form}>
                        {loginError && <div className={styles.errorBox}>{loginError}</div>}

                        <div className={styles.inputGroup}>
                            <label htmlFor="email">Admin Email</label>
                            <input
                                id="email"
                                type="email"
                                className={styles.input}
                                placeholder="email@dwlr.gov.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                className={styles.input}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={loginSubmitting}>
                            {loginSubmitting ? (
                                <>
                                    <div className={styles.spinnerSmall}></div>
                                    Signing In...
                                </>
                            ) : (
                                "Secure Login 🔒"
                            )}
                        </button>
                    </form>

                    <Link href="/dashboard" className={styles.secondaryAction}>
                        ← Back to Viewer Dashboard
                    </Link>
                </div>
            </main>
        );
    }

    // ── RENDER ADMIN CONSOLE (If logged in) ──
    return (
        <main className={styles.container}>
            <div className={styles.adminWrapper}>
                
                {/* Admin Ribbon Header */}
                <div className={styles.adminHeader}>
                    <div className={styles.adminHeaderLeft}>
                        <h2>Administrative Control Surface</h2>
                        <p>Logged in as: <strong>{adminUser?.email}</strong> (Role: {adminUser?.role})</p>
                    </div>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        Logout Session 🔓
                    </button>
                </div>

                <div className={styles.adminGrid}>
                    
                    {/* Sync Console */}
                    <div className={styles.adminCard}>
                        <div className={styles.cardHeader}>
                            <h3>Fetch Live Data from WRIS</h3>
                            <p>Download latest Digital Water Level Recorder (DWLR) readings into the PostgreSQL database.</p>
                        </div>

                        <div className={styles.formContainer}>
                            <div className={styles.inputGroup}>
                                <label>Target State</label>
                                <select
                                    className={styles.formSelect}
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
                                    className={styles.formSelect}
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
                                        className={styles.formSelect}
                                        value={syncParams.startdate}
                                        onChange={(e) => setSyncParams({ ...syncParams, startdate: e.target.value })}
                                        disabled={syncState === "syncing"}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        className={styles.formSelect}
                                        value={syncParams.enddate}
                                        onChange={(e) => setSyncParams({ ...syncParams, enddate: e.target.value })}
                                        disabled={syncState === "syncing"}
                                    />
                                </div>
                            </div>

                            <button
                                className={styles.submitBtn}
                                onClick={handleSync}
                                disabled={syncState === "syncing" || !syncParams.stateName || !syncParams.districtName}
                            >
                                {syncState === "syncing" ? (
                                    <>
                                        <div className={styles.spinnerSmall}></div>
                                        Fetching India WRIS API...
                                    </>
                                ) : "⬇️ Execute Data Sync"}
                            </button>

                            {syncMessage && (
                                <div className={`${styles.statusBox} ${syncState === "error" ? styles.errorBox : styles.successBox}`}>
                                    {syncState === "error" ? "⚠️ " : "✅ "}
                                    {syncMessage}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick System Summary */}
                    <div className={styles.adminCard}>
                        <div className={styles.cardHeader}>
                            <h3>System Health & Operations</h3>
                            <p>Overview of the current centralized monitoring parameters.</p>
                        </div>

                        <ul className={styles.infoList}>
                            <li className={styles.infoItem}>
                                <span className={styles.infoLabel}>Database Type</span>
                                <span className={styles.infoVal}>Supabase Postgres</span>
                            </li>
                            <li className={styles.infoItem}>
                                <span className={styles.infoLabel}>Active Station Count</span>
                                <span className={styles.infoVal}>{loadingStations ? "Counting..." : stations.length}</span>
                            </li>
                            <li className={styles.infoItem}>
                                <span className={styles.infoLabel}>Target Regions</span>
                                <span className={styles.infoVal}>3 States / 12 Districts</span>
                            </li>
                            <li className={styles.infoItem}>
                                <span className={styles.infoLabel}>Backend Base URL</span>
                                <span className={styles.infoVal}>{API_URL.replace("/api", "")}</span>
                            </li>
                            <li className={styles.infoItem}>
                                <span className={styles.infoLabel}>Sync Status</span>
                                <span className={styles.infoVal} style={{ color: syncState === "syncing" ? "#f59e0b" : "#10b981" }}>
                                    {syncState === "syncing" ? "Syncing..." : "Idle"}
                                </span>
                            </li>
                        </ul>
                    </div>

                </div>

            </div>
        </main>
    );
}
