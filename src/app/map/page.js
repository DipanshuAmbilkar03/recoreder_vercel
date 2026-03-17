"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Select from "react-select";
import axios from "axios";
import styles from "./page.module.css";
import Map from "@/components/Map";

// Helper to determine the alert status based on water level and well depth
function getAlertStatus(waterLevel, wellDepth) {
    if (waterLevel === null || waterLevel === undefined || wellDepth === null || wellDepth === undefined) {
        return { style: styles.cardWarning, badgeStyle: styles.badgeWarning, label: "UNKNOWN" };
    }
    
    const effectiveDepth = Math.abs(Number(waterLevel));
    const depth = Number(wellDepth);
    
    if (depth === 0) return { style: styles.cardWarning, badgeStyle: styles.badgeWarning, label: "UNKNOWN" };

    const percentage = (effectiveDepth / depth) * 100;

    if (percentage <= 33) {
        return { style: styles.cardCritical, badgeStyle: styles.badgeCritical, label: "LOW" };
    } else if (percentage <= 66) {
        return { style: styles.cardWarning, badgeStyle: styles.badgeWarning, label: "MEDIUM" };
    } else {
        return { style: styles.cardNormal, badgeStyle: styles.badgeNormal, label: "HIGH" };
    }
}

export default function MapPage() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterState, setFilterState] = useState("");
    const [filterDistrict, setFilterDistrict] = useState("");
    const [isMounted, setIsMounted] = useState(false);

    // New State for Right Panel
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("alert");
    const [selectedMapStation, setSelectedMapStation] = useState(null);
    const stationRefs = useRef({});

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    // Derived filtering data for dynamic dropdowns
    const availableMapStates = Array.from(new Set(stations.map(s => s.state))).filter(Boolean).sort();
    const availableMapDistricts = filterState
        ? Array.from(new Set(stations.filter(s => s.state === filterState).map(s => s.district))).filter(Boolean).sort()
        : Array.from(new Set(stations.map(s => s.district))).filter(Boolean).sort();

    // Format options for react-select
    const stateOptions = availableMapStates.map(st => ({ value: st, label: st }));
    const districtOptions = availableMapDistricts.map(dt => ({ value: dt, label: dt }));

    // Custom styles for react-select to match dark theme
    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: 'rgba(15, 15, 15, 0.9)',
            borderColor: state.isFocused ? 'rgba(163, 163, 163, 0.9)' : 'rgba(115, 115, 115, 0.35)',
            boxShadow: state.isFocused ? '0 0 0 1px rgba(163, 163, 163, 0.7)' : 'none',
            '&:hover': {
                borderColor: 'rgba(163, 163, 163, 0.9)'
            },
            minHeight: '36px',
            color: '#d1d5db',
            fontSize: '0.8rem',
            borderRadius: 'var(--radius-sm)'
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: 'rgba(8, 8, 8, 0.98)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(115,115,115,0.3)'
        }),
        menuPortal: (provided) => ({
            ...provided,
            zIndex: 9999
        }),
        menuList: (provided) => ({
            ...provided,
            backgroundColor: 'transparent'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected 
                ? 'rgba(64, 64, 64, 0.85)' 
                : state.isFocused 
                    ? 'rgba(82, 82, 82, 0.6)' 
                    : 'transparent',
            color: '#d1d5db',
            fontSize: '0.8rem',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: 'rgba(64, 64, 64, 0.95)'
            }
        }),
        singleValue: (provided) => ({
            ...provided,
            color: '#d1d5db',
            fontSize: '0.8rem'
        }),
        input: (provided) => ({
            ...provided,
            color: '#d1d5db',
            fontSize: '0.8rem'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: 'rgba(156,163,175,0.8)',
            fontSize: '0.78rem'
        })
    };

    const fetchStations = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/stations?per_page=1000`);
            setStations(res.data.data || []);
        } catch (err) {
            console.error("Failed to load stations:", err);
            setError("Failed to load station data from the server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStations();
    }, []);



    // Keep map markers filterable by state/district without limiting sidebar data.
    const mapStations = stations.filter(s => {
        if (filterState && s.state !== filterState) return false;
        if (filterDistrict && s.district !== filterDistrict) return false;
        return true;
    });

    const getAlertRank = (station) => {
        const { label } = getAlertStatus(station.latest_water_level, station.well_depth);
        if (label === "LOW") return 0;
        if (label === "MEDIUM") return 1;
        if (label === "HIGH") return 2;
        return 3;
    };

    // Sidebar always shows all stations, ordered with alert stations first.
    const filteredAndSortedStations = stations.filter(s => {
        if (searchQuery && !s.station_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    }).sort((a, b) => {
        const alertOrder = getAlertRank(a) - getAlertRank(b);
        if (alertOrder !== 0) return alertOrder;
        if (sortBy === 'alert') return (a.station_name || "").localeCompare(b.station_name || "");
        if (sortBy === 'name') return (a.station_name || "").localeCompare(b.station_name || "");
        if (sortBy === 'level') return (Number(a.latest_water_level) || 0) - (Number(b.latest_water_level) || 0);
        if (sortBy === 'depth') return (Number(b.well_depth) || 0) - (Number(a.well_depth) || 0);
        return 0;
    });

    const handleStationSelect = (station) => {
        setSelectedMapStation(station);
        if (stationRefs.current[station.station_id]) {
            stationRefs.current[station.station_id].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    };

    return (
        <div className="container">
            <div className={styles.header}>
                <h1 className="section-title">Mapped Coverage</h1>
                <p className="section-subtitle">Interactive visualization of all actively monitored DWLR stations.</p>
            </div>

            <div className={styles.mapContainer}>
                {/* Top Filter Bar */}
                <div className={styles.topFilterBar}>
                    <div className={styles.filterGroup}>
                        <label>State</label>
                        <Select
                            options={stateOptions}
                            value={stateOptions.find(opt => opt.value === filterState) || null}
                            onChange={(selectedOption) => {
                                setFilterState(selectedOption ? selectedOption.value : "");
                                setFilterDistrict(""); // reset district on state change
                            }}
                            styles={customStyles}
                            placeholder="All States"
                            isClearable
                            classNamePrefix="react-select"
                            menuPortalTarget={isMounted ? document.body : null}
                        />
                    </div>

                    <div className={styles.filterGroup}>
                        <label>District</label>
                        <Select
                            options={districtOptions}
                            value={districtOptions.find(opt => opt.value === filterDistrict) || null}
                            onChange={(selectedOption) => setFilterDistrict(selectedOption ? selectedOption.value : "")}
                            styles={customStyles}
                            placeholder="All Districts"
                            isDisabled={!filterState}
                            isClearable
                            classNamePrefix="react-select"
                            menuPortalTarget={isMounted ? document.body : null}
                        />
                    </div>

                    <div className={styles.statsInline}>
                        {loading && <div className={styles.spinnerSmall}></div>}
                        {!error && (
                            <>
                                <h4>Showing:</h4>
                                <span className={styles.statBadge}>{stations.length} Stations</span>
                            </>
                        )}
                    </div>
                </div>

                {/* 70/30 Split Layout */}
                <div className={styles.contentWrapper}>
                    {/* Left: Map Section */}
                    <div className={styles.mapSection}>
                        {error ? (
                            <div className={styles.errorBox}>{error}</div>
                        ) : (
                            <Map 
                                stations={mapStations} 
                                selectedStation={selectedMapStation} 
                                onStationSelect={handleStationSelect} 
                            />
                        )}
                    </div>

                    {/* Right: Stations Panel */}
                    <div className={styles.stationsPanel}>
                        <div className={styles.panelHeader}>
                            <h2 className={styles.panelTitle}>Stations Overview ({filteredAndSortedStations.length})</h2>
                            <div className={styles.panelControls}>
                                <input 
                                    type="text" 
                                    className={styles.searchInput} 
                                    placeholder="Search by name..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <select 
                                    className={styles.sortSelect} 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="alert">Sort by Alert Priority</option>
                                    <option value="name">Sort by Name</option>
                                    <option value="level">Sort by Water Level</option>
                                    <option value="depth">Sort by Well Depth</option>
                                </select>
                            </div>
                        </div>
                        <div className={styles.stationsList}>
                            {filteredAndSortedStations.length > 0 ? (
                                filteredAndSortedStations.map(station => {
                                    const alert = getAlertStatus(station.latest_water_level, station.well_depth);
                                    
                                    return (
                                        <div 
                                            key={station.station_id} 
                                            ref={(el) => (stationRefs.current[station.station_id] = el)}
                                            className={`${styles.stationCard} ${alert.style} ${selectedMapStation?.station_id === station.station_id ? styles.selected : ''}`}
                                            onClick={() => handleStationSelect(station)}
                                        >
                                            <div className={styles.cardTopLeft}>
                                                <div className={`${styles.alertBadge} ${alert.badgeStyle}`}>
                                                    {alert.label}
                                                </div>
                                            </div>
                                            <div className={styles.cardHeader}>
                                                <div className={styles.cardTitle}>{station.station_name}</div>
                                                <div className={styles.cardSubtitle}>{station.district}, {station.state}</div>
                                            </div>
                                            <div className={styles.cardMetrics}>
                                                <div className={styles.metric}>
                                                    <label>Water Level</label>
                                                    <span>{station.latest_water_level !== null && station.latest_water_level !== undefined ? `${station.latest_water_level} m` : 'N/A'}</span>
                                                </div>
                                                <div className={styles.metric}>
                                                    <label>Well Depth</label>
                                                    <span>{station.well_depth || 'N/A'} m</span>
                                                </div>
                                            </div>
                                            <div className={styles.cardFooter}>
                                                <div className={styles.metric}>
                                                    <label>Aquifer</label>
                                                    <span>{station.aquifer_type || 'Unknown'}</span>
                                                </div>
                                                <div className={`${styles.statusIndicator} ${station.station_status === 'Active' ? styles.active : styles.inactive}`}>
                                                    {station.station_status || 'Active'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className={styles.emptyState}>No stations found matching filters.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
