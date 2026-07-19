"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const STATES = ["Maharashtra", "Gujarat", "Rajasthan"];
const DISTRICTS_MAP = {
    Maharashtra: ["Pune", "Nagpur", "Nashik", "Thane"],
    Gujarat: ["Ahmedabad", "Surat", "Rajkot", "Vadodara"],
    Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Bikaner"],
};

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

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | stations | sync | settings

    // Core Data States
    const [stations, setStations] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loadingStations, setLoadingStations] = useState(false);
    const [loadingAlerts, setLoadingAlerts] = useState(false);

    // Sync States
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

    // Station Management Search/Filter States
    const [stationSearch, setStationSearch] = useState("");
    const [stationStateFilter, setStationStateFilter] = useState("");
    const [stationDistrictFilter, setStationDistrictFilter] = useState("");
    const [stationPage, setStationPage] = useState(0);
    const stationLimit = 8;

    // Station Modals & Forms
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStation, setSelectedStation] = useState(null);
    const [crudError, setCrudError] = useState("");
    const [crudSubmitting, setCrudSubmitting] = useState(false);

    const initialFormState = {
        station_code: "",
        station_name: "",
        latitude: "",
        longitude: "",
        state: "Maharashtra",
        district: "Pune",
        aquifer_type: "Alluvium",
        well_depth: "",
        station_status: "active"
    };

    const [addForm, setAddForm] = useState(initialFormState);
    const [editForm, setEditForm] = useState(initialFormState);

    // System Settings States
    const [settings, setSettings] = useState({
        low_water_threshold: "15.0",
        rapid_depletion_threshold: "1.5",
        sync_batch_size: "500"
    });
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState("");
    const [settingsError, setSettingsError] = useState("");

    
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

    // ── Load All Data (Only when logged in) ──
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

    const fetchAlerts = async () => {
        try {
            setLoadingAlerts(true);
            const res = await axios.get(`${API_URL}/alerts`);
            setAlerts(res.data || []);
        } catch (err) {
            console.error("Failed to load alerts:", err);
        } finally {
            setLoadingAlerts(false);
        }
    };

    const fetchSystemSettings = async () => {
        const token = localStorage.getItem("admin_token");
        if (!token) return;

        try {
            setLoadingSettings(true);
            setSettingsError("");
            const res = await axios.get(`${API_URL}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.map) {
                const map = res.data.map;
                setSettings({
                    low_water_threshold: map.low_water_threshold?.value || "15.0",
                    rapid_depletion_threshold: map.rapid_depletion_threshold?.value || "1.5",
                    sync_batch_size: map.sync_batch_size?.value || "500"
                });
            }
        } catch (err) {
            console.error("Failed to load settings:", err);
            setSettingsError("Could not retrieve system configuration parameters.");
        } finally {
            setLoadingSettings(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchStations();
        fetchAlerts();
        fetchSystemSettings();
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
        setEmail("");
        setPassword("");
        window.dispatchEvent(new Event("admin-logout"));
    };

    // ── Resolve Alert ──
    const handleResolveAlert = async (alertId) => {
        const token = localStorage.getItem("admin_token");
        if (!token) return;

        try {
            // Using placeholder resolution or PUT endpoint if configured, else simulate local resolution
            await axios.put(`${API_URL}/alerts/${alertId}/resolve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAlerts();
        } catch (err) {
            console.error("Failed to resolve alert:", err);
            // Fallback: reload alerts in case it was actually resolved
            fetchAlerts();
        }
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
            fetchStations();
        } catch (err) {
            console.error("Sync execution failed:", err);
            setSyncState("error");
            setSyncMessage(err.response?.data?.error || err.response?.data?.message || "Failed to fetch data from India WRIS.");
        }
    };

    // ── Manage Station CRUD Actions ──

    // 1. Create Station
    const handleAddStation = async (e) => {
        e.preventDefault();
        setCrudError("");
        setCrudSubmitting(true);
        const token = localStorage.getItem("admin_token");

        try {
            await axios.post(
                `${API_URL}/stations`,
                {
                    ...addForm,
                    latitude: parseFloat(addForm.latitude),
                    longitude: parseFloat(addForm.longitude),
                    well_depth: addForm.well_depth ? parseFloat(addForm.well_depth) : null
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setShowAddModal(false);
            setAddForm(initialFormState);
            fetchStations();
        } catch (err) {
            console.error("Failed to create station:", err);
            setCrudError(err.response?.data?.error || "Failed to save station.");
        } finally {
            setCrudSubmitting(false);
        }
    };

    // 2. Open Edit Form
    const openEditModal = (station) => {
        setSelectedStation(station);
        setEditForm({
            station_code: station.station_code,
            station_name: station.station_name,
            latitude: station.latitude,
            longitude: station.longitude,
            state: station.state || "Maharashtra",
            district: station.district || "Pune",
            aquifer_type: station.aquifer_type || "Alluvium",
            well_depth: station.well_depth || "",
            station_status: station.station_status || "active"
        });
        setCrudError("");
        setShowEditModal(true);
    };

    // 3. Update Station Info
    const handleEditStation = async (e) => {
        e.preventDefault();
        setCrudError("");
        setCrudSubmitting(true);
        const token = localStorage.getItem("admin_token");

        try {
            await axios.put(
                `${API_URL}/stations/${selectedStation.station_id}`,
                {
                    ...editForm,
                    latitude: parseFloat(editForm.latitude),
                    longitude: parseFloat(editForm.longitude),
                    well_depth: editForm.well_depth ? parseFloat(editForm.well_depth) : null
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setShowEditModal(false);
            setSelectedStation(null);
            fetchStations();
        } catch (err) {
            console.error("Failed to update station:", err);
            setCrudError(err.response?.data?.error || "Failed to save station.");
        } finally {
            setCrudSubmitting(false);
        }
    };

    // 4. Quick Toggle Status
    const toggleStationStatus = async (station) => {
        const token = localStorage.getItem("admin_token");
        const nextStatus = String(station.station_status || "").toLowerCase() === "active" ? "inactive" : "active";

        try {
            await axios.put(
                `${API_URL}/stations/${station.station_id}`,
                { station_status: nextStatus },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            // Optimistic UI updates
            setStations(prev => prev.map(s => s.station_id === station.station_id ? { ...s, station_status: nextStatus } : s));
        } catch (err) {
            console.error("Failed to toggle status:", err);
            fetchStations();
        }
    };

    // 5. Delete Station
    const handleDeleteStation = async (stationId) => {
        if (!confirm("⚠️ Danger: Are you sure you want to delete this station? This will permanently delete all associated historical water readings and alert logs!")) {
            return;
        }

        const token = localStorage.getItem("admin_token");
        try {
            await axios.delete(`${API_URL}/stations/${stationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchStations();
        } catch (err) {
            console.error("Failed to delete station:", err);
            alert(err.response?.data?.error || "Failed to delete station.");
        }
    };

    // ── Save Configuration Settings ──
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSettingsMessage("");
        setSettingsError("");
        setSavingSettings(true);
        const token = localStorage.getItem("admin_token");

        try {
            const res = await axios.put(
                `${API_URL}/settings`,
                settings,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setSettingsMessage("System configuration updated successfully!");
            if (res.data?.map) {
                const map = res.data.map;
                setSettings({
                    low_water_threshold: map.low_water_threshold?.value || "15.0",
                    rapid_depletion_threshold: map.rapid_depletion_threshold?.value || "1.5",
                    sync_batch_size: map.sync_batch_size?.value || "500"
                });
            }
        } catch (err) {
            console.error("Failed to save settings:", err);
            setSettingsError(err.response?.data?.error || "Failed to update configuration settings.");
        } finally {
            setSavingSettings(false);
        }
    };

    // ── Station Pagination & Filter Computations ──
    const filteredStations = stations.filter(s => {
        const matchesSearch = stationSearch.trim() === "" ||
            s.station_name?.toLowerCase().includes(stationSearch.toLowerCase()) ||
            s.station_code?.toLowerCase().includes(stationSearch.toLowerCase());
        
        const matchesState = stationStateFilter === "" || s.state === stationStateFilter;
        const matchesDistrict = stationDistrictFilter === "" || s.district === stationDistrictFilter;

        return matchesSearch && matchesState && matchesDistrict;
    });

    const paginatedStations = filteredStations.slice(
        stationPage * stationLimit,
        (stationPage + 1) * stationLimit
    );

    const totalPages = Math.max(1, Math.ceil(filteredStations.length / stationLimit));

    // Helper: format dates nicely
    const formatDate = (isoString) => {
        if (!isoString) return "—";
        return new Date(isoString).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
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
                
                {/* Admin Header Ribbons */}
                <div className={styles.adminHeader}>
                    <div className={styles.adminHeaderLeft}>
                        <h2>Administrative Control Surface</h2>
                        <p>Logged in as: <strong>{adminUser?.email}</strong> (Role: {adminUser?.role})</p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/dashboard" className={styles.dashboardLink}>
                            📊 View Dashboard
                        </Link>
                        <button onClick={handleLogout} className={styles.logoutBtn}>
                            Logout Session 🔓
                        </button>
                    </div>
                </div>

                {/* Dashboard Tabs Navigation */}
                <div className={styles.tabsNav}>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === "dashboard" ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab("dashboard")}
                    >
                        ⚙️ System Status
                    </button>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === "stations" ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab("stations")}
                    >
                        📡 Manage Stations ({stations.length})
                    </button>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === "sync" ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab("sync")}
                    >
                        🔄 Fetch India WRIS
                    </button>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === "settings" ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab("settings")}
                    >
                        🔧 Configuration Settings
                    </button>
                </div>

                {/* TAB 1: SYSTEM STATUS */}
                {activeTab === "dashboard" && (
                    <div className={styles.adminGrid}>
                        {/* Stats Summary Panel */}
                        <div className={styles.adminCard}>
                            <div className={styles.cardHeader}>
                                <h3>Operational Health</h3>
                                <p>High-level system parameters and database connectivity.</p>
                            </div>
                            
                            <ul className={styles.infoList}>
                                <li className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Database Type</span>
                                    <span className={styles.infoVal}>Supabase PostgreSQL</span>
                                </li>
                                <li className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Active Station Count</span>
                                    <span className={styles.infoVal}>
                                        {loadingStations ? "Counting..." : stations.filter(s => s.station_status === "active").length} / {stations.length} Total
                                    </span>
                                </li>
                                <li className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Target Regions</span>
                                    <span className={styles.infoVal}>
                                        {availableStates.length} States / {Array.from(new Set(stations.map(s => s.district))).filter(Boolean).length} Districts
                                    </span>
                                </li>
                                <li className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Low Water Threshold</span>
                                    <span className={styles.infoVal}>{settings.low_water_threshold} m</span>
                                </li>
                                <li className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Rapid Depletion Threshold</span>
                                    <span className={styles.infoVal}>{settings.rapid_depletion_threshold} m/month</span>
                                </li>
                            </ul>
                        </div>

                        {/* Recent Unresolved System Alerts */}
                        <div className={styles.adminCard}>
                            <div className={styles.cardHeader}>
                                <h3>Active Alerts & Breaches</h3>
                                <p>Unresolved groundwater depletion triggers ({alerts.length} active).</p>
                            </div>

                            {loadingAlerts ? (
                                <div className={styles.loadingSpinner}>
                                    <div className={styles.spinnerSmall}></div>
                                    <p>Retrieving alert logs...</p>
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className={styles.emptyBox}>
                                    🟢 No active threshold breaches. All systems normal.
                                </div>
                            ) : (
                                <div className={styles.alertList}>
                                    {alerts.map(alert => (
                                        <div key={alert.alert_id} className={styles.alertItem}>
                                            <div className={styles.alertDetails}>
                                                <span className={styles.alertTag}>
                                                    {alert.alert_type === "low_level" ? "⚠️ Critically Low" : "🚨 Depleting"}
                                                </span>
                                                <p className={styles.alertMessage}>{alert.message}</p>
                                                <small className={styles.alertTime}>Triggered: {formatDate(alert.created_at)}</small>
                                            </div>
                                            <button 
                                                onClick={() => handleResolveAlert(alert.alert_id)} 
                                                className={styles.resolveBtn}
                                            >
                                                Resolve ✓
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: MANAGE STATIONS */}
                {activeTab === "stations" && (
                    <div className={styles.adminCardFull}>
                        <div className={styles.tableToolbar}>
                            <div className={styles.toolbarLeft}>
                                <h3>Stations Administration Registry</h3>
                                <p>Add, edit, modify coordinates, or delete DWLR recording stations.</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setAddForm(initialFormState);
                                    setCrudError("");
                                    setShowAddModal(true);
                                }} 
                                className={styles.addBtn}
                            >
                                âž• Add New Station
                            </button>
                        </div>

                        {/* Filter surface */}
                        <div className={styles.filterRow}>
                            <input 
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search by station name or code..."
                                value={stationSearch}
                                onChange={(e) => {
                                    setStationSearch(e.target.value);
                                    setStationPage(0);
                                }}
                            />
                            
                            <select
                                className={styles.filterSelect}
                                value={stationStateFilter}
                                onChange={(e) => {
                                    setStationStateFilter(e.target.value);
                                    setStationDistrictFilter("");
                                    setStationPage(0);
                                }}
                            >
                                <option value="">All States</option>
                                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>

                            <select
                                className={styles.filterSelect}
                                value={stationDistrictFilter}
                                onChange={(e) => {
                                    setStationDistrictFilter(e.target.value);
                                    setStationPage(0);
                                }}
                                disabled={!stationStateFilter}
                            >
                                <option value="">All Districts</option>
                                {stationStateFilter && DISTRICTS_MAP[stationStateFilter].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>

                            <span className={styles.counterLabel}>
                                Found: <strong>{filteredStations.length}</strong> stations
                            </span>
                        </div>

                        {/* Stations Grid Table */}
                        {loadingStations ? (
                            <div className={styles.loadingSpinner}>
                                <div className={styles.spinnerSmall}></div>
                                <p>Syncing stations registry...</p>
                            </div>
                        ) : filteredStations.length === 0 ? (
                            <div className={styles.emptyBox}>
                                No stations found matching active filters.
                            </div>
                        ) : (
                            <>
                                <div className={styles.tableWrapper}>
                                    <table className={styles.adminTable}>
                                        <thead>
                                            <tr>
                                                <th>Code</th>
                                                <th>Station Name</th>
                                                <th>State</th>
                                                <th>District</th>
                                                <th>Coordinates</th>
                                                <th>Aquifer Type</th>
                                                <th>Depth</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedStations.map(station => (
                                                <tr key={station.station_id}>
                                                    <td className={styles.codeCell}>{station.station_code}</td>
                                                    <td className={styles.nameCell}>{station.station_name}</td>
                                                    <td>{station.state}</td>
                                                    <td>{station.district}</td>
                                                    <td className={styles.coordCell}>
                                                        {Number(station.latitude).toFixed(4)}, {Number(station.longitude).toFixed(4)}
                                                    </td>
                                                    <td>{station.aquifer_type || "—"}</td>
                                                    <td>{station.well_depth ? `${station.well_depth}m` : "—"}</td>
                                                    <td>
                                                        <button 
                                                            onClick={() => toggleStationStatus(station)}
                                                            className={`${styles.statusToggle} ${station.station_status === "active" ? styles.statusActive : styles.statusInactive}`}
                                                            title="Click to toggle status"
                                                        >
                                                            {station.station_status === "active" ? "🟢 Active" : "🔴 Inactive"}
                                                        </button>
                                                    </td>
                                                    <td className={styles.actionsCell}>
                                                        <button 
                                                            onClick={() => openEditModal(station)}
                                                            className={styles.editBtn}
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteStation(station.station_id)}
                                                            className={styles.deleteBtn}
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className={styles.paginationRow}>
                                    <button 
                                        disabled={stationPage === 0}
                                        onClick={() => setStationPage(p => p - 1)}
                                        className={styles.pageBtn}
                                    >
                                        ← Previous Page
                                    </button>
                                    <span className={styles.pageInfo}>
                                        Page <strong>{stationPage + 1}</strong> of {totalPages}
                                    </span>
                                    <button 
                                        disabled={stationPage + 1 >= totalPages}
                                        onClick={() => setStationPage(p => p + 1)}
                                        className={styles.pageBtn}
                                    >
                                        Next Page →
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* TAB 3: FETCH DATA FROM WRIS */}
                {activeTab === "sync" && (
                    <div className={styles.adminGrid}>
                        <div className={styles.adminCard}>
                            <div className={styles.cardHeader}>
                                <h3>Download Digital Water Recorder (DWLR) Readings</h3>
                                <p>Fetch data from India WRIS API and sync it directly into the PostgreSQL database.</p>
                            </div>

                            <div className={styles.formContainer}>
                                <div className={styles.inputGroup}>
                                    <label>Target State</label>
                                    <select
                                        className={styles.formSelect}
                                        value={syncParams.stateName}
                                        onChange={(e) => setSyncParams({ ...syncParams, stateName: e.target.value, districtName: "" })}
                                        disabled={syncState === "syncing"}
                                    >
                                        <option value="">Select State...</option>
                                        {STATES.map(st => <option key={st} value={st}>{st}</option>)}
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
                                        {syncParams.stateName && DISTRICTS_MAP[syncParams.stateName].map(dt => (
                                            <option key={dt} value={dt}>{dt}</option>
                                        ))}
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
                                            Connecting to WRIS API Servers...
                                        </>
                                    ) : "â¬‡ï¸ Execute Data Sync"}
                                </button>

                                {syncMessage && (
                                    <div className={`${styles.statusBox} ${syncState === "error" ? styles.errorBox : styles.successBox}`}>
                                        {syncState === "error" ? "⚠️ " : "✅ "}
                                        {syncMessage}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Synchronization guide panel */}
                        <div className={styles.adminCard}>
                            <div className={styles.cardHeader}>
                                <h3>Synchronization Specifications</h3>
                                <p>System behavior parameters configured for external integrations.</p>
                            </div>
                            <ul className={styles.infoList}>
                                <li className={styles.infoItem}>
                                    <span className={styles.infoLabel}>External Source API</span>
                                    <span className={styles.infoVal}>indiawris.gov.in Dataset</span>
                                </li>
                                <li className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Default Batch Size</span>
                                    <span className={styles.infoVal}>{settings.sync_batch_size} readings</span>
                                </li>
                                <li className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Automated Cron Schedule</span>
                                    <span className={styles.infoVal}>Every 6 hours (0 */6 * * *)</span>
                                </li>
                                <li className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Integration Protocol</span>
                                    <span className={styles.infoVal}>REST / JSON Payload</span>
                                </li>
                            </ul>
                            <div className={styles.syncNoticeBox}>
                                <strong>Note:</strong> Automated fetches query only the last 7 days of data for performance stability, whereas manual fetches allow custom date queries spanning up to one year.
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: CONFIGURATION SETTINGS */}
                {activeTab === "settings" && (
                    <div className={styles.adminCardFull} style={{ maxWidth: "600px", margin: "0 auto" }}>
                        <div className={styles.cardHeader}>
                            <h3>System Parameters Configuration</h3>
                            <p>Manage alert triggers, detection thresholds, and background tasks configurations.</p>
                        </div>

                        {loadingSettings ? (
                            <div className={styles.loadingSpinner}>
                                <div className={styles.spinnerSmall}></div>
                                <p>Loading parameter configuration...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveSettings} className={styles.formContainer}>
                                {settingsMessage && <div className={styles.successBox} style={{ padding: "12px", borderRadius: "8px" }}>✅ {settingsMessage}</div>}
                                {settingsError && <div className={styles.errorBox} style={{ padding: "12px", borderRadius: "8px" }}>⚠️ {settingsError}</div>}

                                <div className={styles.inputGroup}>
                                    <label htmlFor="low_water_threshold">Low Water Level Threshold (meters)</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        id="low_water_threshold"
                                        className={styles.formSelect}
                                        value={settings.low_water_threshold}
                                        onChange={(e) => setSettings({ ...settings, low_water_threshold: e.target.value })}
                                        required
                                    />
                                    <small className={styles.inputHelp}>
                                        Used when well depth is unknown: alert if depth-to-water is deeper than this value (default 15.0 m). When well depth is known, alerts use remaining well-fill below 30%.
                                    </small>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="rapid_depletion_threshold">Rapid Depletion Threshold (meters/month)</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        id="rapid_depletion_threshold"
                                        className={styles.formSelect}
                                        value={settings.rapid_depletion_threshold}
                                        onChange={(e) => setSettings({ ...settings, rapid_depletion_threshold: e.target.value })}
                                        required
                                    />
                                    <small className={styles.inputHelp}>
                                        Flag stations experiencing rapid water depth increases greater than this threshold over a 30-day window (default: 1.5m).
                                    </small>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="sync_batch_size">WRIS Sync Batch Size (records)</label>
                                    <input 
                                        type="number"
                                        step="1"
                                        id="sync_batch_size"
                                        className={styles.formSelect}
                                        value={settings.sync_batch_size}
                                        onChange={(e) => setSettings({ ...settings, sync_batch_size: e.target.value })}
                                        required
                                    />
                                    <small className={styles.inputHelp}>
                                        Max records loaded in a single request from India WRIS API. Lower values prevent server limits (default: 500).
                                    </small>
                                </div>

                                <button 
                                    type="submit" 
                                    className={styles.submitBtn} 
                                    disabled={savingSettings}
                                    style={{ marginTop: "10px" }}
                                >
                                    {savingSettings ? "Saving Settings..." : "💾 Update Parameters"}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL: ADD STATION */}
            {showAddModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>âž• Add Monitoring Station</h3>
                            <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddStation} className={styles.modalForm}>
                            {crudError && <div className={styles.errorBox}>{crudError}</div>}
                            
                            <div className={styles.inputGroup}>
                                <label>Station Code *</label>
                                <input 
                                    type="text" 
                                    className={styles.modalInput} 
                                    placeholder="e.g. MH_PUN_02" 
                                    value={addForm.station_code} 
                                    onChange={(e) => setAddForm({ ...addForm, station_code: e.target.value })}
                                    required 
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Station Name *</label>
                                <input 
                                    type="text" 
                                    className={styles.modalInput} 
                                    placeholder="e.g. Pune City DWLR" 
                                    value={addForm.station_name} 
                                    onChange={(e) => setAddForm({ ...addForm, station_name: e.target.value })}
                                    required 
                                />
                            </div>

                            <div className={styles.modalGrid}>
                                <div className={styles.inputGroup}>
                                    <label>Latitude *</label>
                                    <input 
                                        type="number" 
                                        step="0.000001" 
                                        className={styles.modalInput} 
                                        placeholder="18.5204" 
                                        value={addForm.latitude} 
                                        onChange={(e) => setAddForm({ ...addForm, latitude: e.target.value })}
                                        required 
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Longitude *</label>
                                    <input 
                                        type="number" 
                                        step="0.000001" 
                                        className={styles.modalInput} 
                                        placeholder="73.8567" 
                                        value={addForm.longitude} 
                                        onChange={(e) => setAddForm({ ...addForm, longitude: e.target.value })}
                                        required 
                                    />
                                </div>
                            </div>

                            <div className={styles.modalGrid}>
                                <div className={styles.inputGroup}>
                                    <label>State *</label>
                                    <select 
                                        className={styles.modalInput}
                                        value={addForm.state}
                                        onChange={(e) => {
                                            const st = e.target.value;
                                            setAddForm({ ...addForm, state: st, district: DISTRICTS_MAP[st] ? DISTRICTS_MAP[st][0] : "" });
                                        }}
                                        required
                                    >
                                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>District *</label>
                                    <select 
                                        className={styles.modalInput}
                                        value={addForm.district}
                                        onChange={(e) => setAddForm({ ...addForm, district: e.target.value })}
                                        required
                                    >
                                        {addForm.state && DISTRICTS_MAP[addForm.state]?.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.modalGrid}>
                                <div className={styles.inputGroup}>
                                    <label>Aquifer Type</label>
                                    <input 
                                        type="text" 
                                        className={styles.modalInput} 
                                        placeholder="Alluvium / Basalt" 
                                        value={addForm.aquifer_type} 
                                        onChange={(e) => setAddForm({ ...addForm, aquifer_type: e.target.value })}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Well Depth (m)</label>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        className={styles.modalInput} 
                                        placeholder="120" 
                                        value={addForm.well_depth} 
                                        onChange={(e) => setAddForm({ ...addForm, well_depth: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.saveSubmitBtn} disabled={crudSubmitting}>
                                    {crudSubmitting ? "Creating..." : "Save Station"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT STATION */}
            {showEditModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>✏️ Edit Monitoring Station</h3>
                            <button className={styles.closeBtn} onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleEditStation} className={styles.modalForm}>
                            {crudError && <div className={styles.errorBox}>{crudError}</div>}
                            
                            <div className={styles.inputGroup}>
                                <label>Station Code *</label>
                                <input 
                                    type="text" 
                                    className={styles.modalInput} 
                                    value={editForm.station_code} 
                                    onChange={(e) => setEditForm({ ...editForm, station_code: e.target.value })}
                                    required 
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Station Name *</label>
                                <input 
                                    type="text" 
                                    className={styles.modalInput} 
                                    value={editForm.station_name} 
                                    onChange={(e) => setEditForm({ ...editForm, station_name: e.target.value })}
                                    required 
                                />
                            </div>

                            <div className={styles.modalGrid}>
                                <div className={styles.inputGroup}>
                                    <label>Latitude *</label>
                                    <input 
                                        type="number" 
                                        step="0.000001" 
                                        className={styles.modalInput} 
                                        value={editForm.latitude} 
                                        onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                                        required 
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Longitude *</label>
                                    <input 
                                        type="number" 
                                        step="0.000001" 
                                        className={styles.modalInput} 
                                        value={editForm.longitude} 
                                        onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                                        required 
                                    />
                                </div>
                            </div>

                            <div className={styles.modalGrid}>
                                <div className={styles.inputGroup}>
                                    <label>State *</label>
                                    <select 
                                        className={styles.modalInput}
                                        value={editForm.state}
                                        onChange={(e) => {
                                            const st = e.target.value;
                                            setEditForm({ ...editForm, state: st, district: DISTRICTS_MAP[st] ? DISTRICTS_MAP[st][0] : "" });
                                        }}
                                        required
                                    >
                                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>District *</label>
                                    <select 
                                        className={styles.modalInput}
                                        value={editForm.district}
                                        onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                                        required
                                    >
                                        {editForm.state && DISTRICTS_MAP[editForm.state]?.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.modalGrid}>
                                <div className={styles.inputGroup}>
                                    <label>Aquifer Type</label>
                                    <input 
                                        type="text" 
                                        className={styles.modalInput} 
                                        value={editForm.aquifer_type} 
                                        onChange={(e) => setEditForm({ ...editForm, aquifer_type: e.target.value })}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Well Depth (m)</label>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        className={styles.modalInput} 
                                        value={editForm.well_depth} 
                                        onChange={(e) => setEditForm({ ...editForm, well_depth: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Station Status</label>
                                <select
                                    className={styles.modalInput}
                                    value={editForm.station_status}
                                    onChange={(e) => setEditForm({ ...editForm, station_status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.saveSubmitBtn} disabled={crudSubmitting}>
                                    {crudSubmitting ? "Updating..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
