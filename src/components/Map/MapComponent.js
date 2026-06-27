"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import Link from "next/link";
import styles from "./MapComponent.module.css";

const METER_RADIUS = 17;
const METER_CIRCUMFERENCE = 2 * Math.PI * METER_RADIUS;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function formatTimestamp(station) {
    const raw = station.latest_reading_timestamp || station.last_reading_time || station.updated_at || station.created_at;
    if (!raw) return "N/A";

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleString();
}

function getStationPercentage(station) {
    const waterLevel = Number(station.latest_water_level);
    const wellDepth = Number(station.well_depth);

    if (!Number.isFinite(waterLevel) || !Number.isFinite(wellDepth) || wellDepth <= 0) {
        return 0;
    }

    const percentage = (Math.abs(waterLevel) / wellDepth) * 100;
    return clamp(Math.round(percentage), 0, 100);
}

function getMeterTier(percentage) {
    if (percentage <= 33) {
        return { name: "critical", color: "#ef4444", score: 3, label: "Low" };
    }

    if (percentage <= 66) {
        return { name: "warning", color: "#f59e0b", score: 2, label: "Medium" };
    }

    return { name: "safe", color: "#22c55e", score: 1, label: "High" };
}

function createMeterIcon(station, isActive) {
    const percentage = getStationPercentage(station);
    const tier = getMeterTier(percentage);
    const dashOffset = METER_CIRCUMFERENCE * (1 - percentage / 100);

    const markerClasses = [
        styles.meterMarker,
        styles[tier.name],
        tier.name === "critical" ? styles.criticalPulse : "",
        isActive ? styles.activeMarker : ""
    ].filter(Boolean).join(" ");

    const html = `
        <div class="${markerClasses}" style="--meter-color:${tier.color};" role="img" aria-label="${station.station_name}: ${percentage}%">
            <svg class="${styles.meterSvg}" viewBox="0 0 48 48" aria-hidden="true">
                <circle class="${styles.meterTrack}" cx="24" cy="24" r="${METER_RADIUS}" />
                <circle class="${styles.meterProgress}" cx="24" cy="24" r="${METER_RADIUS}" style="stroke-dasharray:${METER_CIRCUMFERENCE};stroke-dashoffset:${METER_CIRCUMFERENCE};--dash-offset:${dashOffset};" />
            </svg>
            <span class="${styles.meterValue}">${percentage}%</span>
        </div>
    `;

    return L.divIcon({
        html,
        className: styles.meterIconWrapper,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
        popupAnchor: [0, -22]
    });
}

function createClusterIcon(cluster) {
    const childMarkers = cluster.getAllChildMarkers();
    const count = cluster.getChildCount();
    const maxScore = childMarkers.reduce((highest, marker) => {
        const markerScore = Number(marker?.options?.dangerScore) || 1;
        return Math.max(highest, markerScore);
    }, 1);

    const clusterTierClass = maxScore >= 3
        ? styles.clusterCritical
        : maxScore === 2
            ? styles.clusterWarning
            : styles.clusterSafe;

    return L.divIcon({
        html: `<div class="${styles.clusterIcon} ${clusterTierClass}"><span>${count}</span></div>`,
        className: styles.clusterIconContainer,
        iconSize: [46, 46]
    });
}

// Custom hook/component to recenter map when bounds change
function MapUpdater({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, Math.max(map.getZoom(), zoom));
    }, [center, zoom, map]);
    return null;
}

export default function MapComponent({ stations = [], selectedStation, onStationSelect }) {
    // Default center to central India
    const [center, setCenter] = useState([22.5937, 78.9629]);
    const [zoom, setZoom] = useState(5);

    // If we have stations, calculate rough bounds center
    useEffect(() => {
        if (stations.length > 0) {
            const validStations = stations.filter(s => s.latitude && s.longitude);
            if (validStations.length > 0) {
                const latSum = validStations.reduce((sum, s) => sum + Number(s.latitude), 0);
                const lngSum = validStations.reduce((sum, s) => sum + Number(s.longitude), 0);
                setCenter([latSum / validStations.length, lngSum / validStations.length]);
                setZoom(validStations.length === 1 ? 10 : 6);
            }
        }
    }, [stations]);

    // Recenter map if a specific station is selected from the Right Panel
    useEffect(() => {
        if (selectedStation && selectedStation.latitude && selectedStation.longitude) {
            setCenter([Number(selectedStation.latitude), Number(selectedStation.longitude)]);
            setZoom(12);
        }
    }, [selectedStation]);

    return (
        <div className={styles.mapWrapper}>
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                className={styles.mapContainer}
            >
                <MapUpdater center={center} zoom={zoom} />

                {/* Dark theme styled map tiles */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <MarkerClusterGroup
                    chunkedLoading
                    showCoverageOnHover={false}
                    spiderfyOnMaxZoom
                    maxClusterRadius={46}
                    iconCreateFunction={createClusterIcon}
                >
                    {stations
                        .filter((station) => Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude)))
                        .map((station) => {
                            const percentage = getStationPercentage(station);
                            const tier = getMeterTier(percentage);
                            const isActive = selectedStation?.station_id === station.station_id;

                            return (
                                <Marker
                                    key={station.station_id || station.station_code}
                                    position={[Number(station.latitude), Number(station.longitude)]}
                                    icon={createMeterIcon(station, isActive)}
                                    riseOnHover
                                    zIndexOffset={isActive ? 1200 : 0}
                                    dangerScore={tier.score}
                                    eventHandlers={{
                                        click: () => {
                                            if (onStationSelect) onStationSelect(station);
                                        }
                                    }}
                                >
                                    <Tooltip direction="top" offset={[0, -18]} opacity={0.95} className="quickTooltip">
                                        <div className={styles.tooltipBody}>
                                            <strong>{station.station_name}</strong>
                                            <span>{percentage}% • {tier.label}</span>
                                        </div>
                                    </Tooltip>

                                    <Popup className={styles.customPopup}>
                                        <div className={styles.popupContent}>
                                            <h3>{station.station_name}</h3>
                                            <p><strong>Value:</strong> {percentage}% ({tier.label})</p>
                                            <p><strong>Code:</strong> {station.station_code || "N/A"}</p>
                                            <p><strong>Location:</strong> {station.district}, {station.state}</p>
                                            <p><strong>Timestamp:</strong> {formatTimestamp(station)}</p>
                                            {station.well_depth && <p><strong>Depth:</strong> {station.well_depth}m</p>}
                                            {station.aquifer_type && <p><strong>Aquifer:</strong> {station.aquifer_type}</p>}
                                            <span className={`${styles.statusBadge} ${styles[station.station_status?.toLowerCase()] || styles.active}`}>
                                                {station.station_status || "Active"}
                                            </span>
                                            <div className={styles.popupAction}>
                                                <Link href={`/dashboard?station_id=${station.station_id}`}>View Details</Link>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}
