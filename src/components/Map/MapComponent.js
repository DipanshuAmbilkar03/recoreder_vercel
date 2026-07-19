"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import Link from "next/link";
import styles from "./MapComponent.module.css";
import {
    formatDepthToWater,
    resolveWellDepth,
    stationWaterMetrics,
} from "@/lib/waterLevel";

const METER_RADIUS = 13;
const METER_CIRCUMFERENCE = 2 * Math.PI * METER_RADIUS;
const DEFAULT_CENTER = [22.5937, 78.9629];
const DEFAULT_ZOOM = 5;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function formatTimestamp(station) {
    const raw =
        station.latest_reading_timestamp ||
        station.last_reading_time ||
        station.updated_at ||
        station.created_at;
    if (!raw) return "N/A";

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleString();
}

function getStationPercentage(station) {
    const metrics = stationWaterMetrics(station);
    if (metrics.visualFillPercent == null) return 0;
    return clamp(metrics.visualFillPercent, 0, 100);
}

function getMeterTier(percentage) {
    if (percentage < 30) {
        return { name: "critical", color: "#dc2626", score: 3, label: "Critical" };
    }
    if (percentage < 55) {
        return { name: "warning", color: "#d97706", score: 2, label: "Watch" };
    }
    return { name: "safe", color: "#16a34a", score: 1, label: "Stable" };
}

const iconCache = new Map();

function createMeterIcon(station, isActive) {
    const percentage = getStationPercentage(station);
    const tier = getMeterTier(percentage);
    const cacheKey = `${station.station_id || station.station_code}|${percentage}|${tier.name}|${isActive ? 1 : 0}`;
    const cached = iconCache.get(cacheKey);
    if (cached) return cached;

    const dashOffset = METER_CIRCUMFERENCE * (1 - percentage / 100);
    const markerClasses = [
        styles.meterMarker,
        styles[tier.name],
        tier.name === "critical" ? styles.criticalPulse : "",
        isActive ? styles.activeMarker : "",
    ]
        .filter(Boolean)
        .join(" ");

    const html = `
        <div class="${markerClasses}" style="--meter-color:${tier.color};" role="img" aria-label="${station.station_name}: ${percentage}%">
            <div class="${styles.meterCore}">
                <svg class="${styles.meterSvg}" viewBox="0 0 48 48" aria-hidden="true">
                    <circle class="${styles.meterTrack}" cx="24" cy="24" r="${METER_RADIUS}" />
                    <circle class="${styles.meterProgress}" cx="24" cy="24" r="${METER_RADIUS}"
                        style="stroke-dasharray:${METER_CIRCUMFERENCE};stroke-dashoffset:${dashOffset};" />
                </svg>
                <span class="${styles.meterValue}">${percentage}<small>%</small></span>
            </div>
            <span class="${styles.meterPin}"></span>
        </div>
    `;

    const icon = L.divIcon({
        html,
        className: styles.meterIconWrapper,
        iconSize: [34, 40],
        iconAnchor: [17, 38],
        popupAnchor: [0, -34],
    });

    // Keep cache bounded
    if (iconCache.size > 500) {
        const firstKey = iconCache.keys().next().value;
        iconCache.delete(firstKey);
    }
    iconCache.set(cacheKey, icon);
    return icon;
}

function createClusterIcon(cluster) {
    const childMarkers = cluster.getAllChildMarkers();
    const count = cluster.getChildCount();
    const maxScore = childMarkers.reduce((highest, marker) => {
        const markerScore = Number(marker?.options?.dangerScore) || 1;
        return Math.max(highest, markerScore);
    }, 1);

    const clusterTierClass =
        maxScore >= 3
            ? styles.clusterCritical
            : maxScore === 2
              ? styles.clusterWarning
              : styles.clusterSafe;

    return L.divIcon({
        html: `<div class="${styles.clusterIcon} ${clusterTierClass}"><span>${count}</span></div>`,
        className: styles.clusterIconContainer,
        iconSize: [46, 46],
    });
}

/** Move camera only when parent intentionally requests a focus target. */
function FocusController({ focus }) {
    const map = useMap();
    const lastFocusKey = useRef("");

    useEffect(() => {
        if (!focus) return;
        const key = `${focus.lat},${focus.lng},${focus.zoom}`;
        if (lastFocusKey.current === key) return;
        lastFocusKey.current = key;
        map.setView([focus.lat, focus.lng], focus.zoom, { animate: true });
    }, [focus, map]);

    return null;
}

const StationMarker = memo(function StationMarker({
    station,
    isActive,
    onStationSelect,
}) {
    const percentage = getStationPercentage(station);
    const tier = getMeterTier(percentage);
    const wellDepth = resolveWellDepth(station.well_depth);
    const icon = useMemo(
        () => createMeterIcon(station, isActive),
        // station fields that affect icon
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            station.station_id,
            station.latest_water_level,
            station.well_depth,
            isActive,
        ]
    );

    return (
        <Marker
            position={[Number(station.latitude), Number(station.longitude)]}
            icon={icon}
            riseOnHover
            zIndexOffset={isActive ? 1200 : 0}
            dangerScore={tier.score}
            eventHandlers={{
                click: () => {
                    if (onStationSelect) onStationSelect(station);
                },
            }}
        >
            <Tooltip
                direction="top"
                permanent={false}
                offset={[0, -14]}
                opacity={1}
                className="quickTooltip"
            >
                <div className={styles.tooltipBody}>
                    <strong>{station.station_name}</strong>
                    <span>{`Fill ${percentage}% · ${tier.label}`}</span>
                </div>
            </Tooltip>

            <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                    <h3>{station.station_name}</h3>
                    <p>
                        <strong>Well fill:</strong> {percentage}% ({tier.label})
                    </p>
                    <p>
                        <strong>Depth to water:</strong>{" "}
                        {formatDepthToWater(station.latest_water_level)}
                    </p>
                    <p>
                        <strong>Code:</strong> {station.station_code || "N/A"}
                    </p>
                    <p>
                        <strong>Location:</strong> {station.district}, {station.state}
                    </p>
                    <p>
                        <strong>Timestamp:</strong> {formatTimestamp(station)}
                    </p>
                    {wellDepth != null && (
                        <p>
                            <strong>Well depth:</strong> {wellDepth} m
                        </p>
                    )}
                    {station.aquifer_type && (
                        <p>
                            <strong>Aquifer:</strong> {station.aquifer_type}
                        </p>
                    )}
                    <span
                        className={`${styles.statusBadge} ${
                            styles[station.station_status?.toLowerCase()] || styles.active
                        }`}
                    >
                        {station.station_status || "Active"}
                    </span>
                    <div className={styles.popupAction}>
                        <Link href={`/dashboard?station_id=${station.station_id}`}>
                            View Details
                        </Link>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
});

export default function MapComponent({
    stations = [],
    selectedStation,
    onStationSelect,
}) {
    const [focus, setFocus] = useState(null);
    const didInitialFit = useRef(false);
    const lastSelectedId = useRef(null);
    const onSelectRef = useRef(onStationSelect);
    onSelectRef.current = onStationSelect;

    const validStations = useMemo(
        () =>
            stations.filter(
                (s) =>
                    Number.isFinite(Number(s.latitude)) &&
                    Number.isFinite(Number(s.longitude))
            ),
        [stations]
    );

    // Initial fit once when first stations arrive — not on every filter/search change.
    useEffect(() => {
        if (didInitialFit.current || validStations.length === 0) return;
        didInitialFit.current = true;

        if (validStations.length === 1) {
            setFocus({
                lat: Number(validStations[0].latitude),
                lng: Number(validStations[0].longitude),
                zoom: 10,
            });
            return;
        }

        const latSum = validStations.reduce((sum, s) => sum + Number(s.latitude), 0);
        const lngSum = validStations.reduce((sum, s) => sum + Number(s.longitude), 0);
        setFocus({
            lat: latSum / validStations.length,
            lng: lngSum / validStations.length,
            zoom: 6,
        });
    }, [validStations]);

    // Fly only when selected station id changes (sidebar/marker click), not on list refresh.
    useEffect(() => {
        const id = selectedStation?.station_id ?? null;
        if (id == null) return;
        if (lastSelectedId.current === id) return;
        if (
            !Number.isFinite(Number(selectedStation.latitude)) ||
            !Number.isFinite(Number(selectedStation.longitude))
        ) {
            return;
        }
        lastSelectedId.current = id;
        setFocus({
            lat: Number(selectedStation.latitude),
            lng: Number(selectedStation.longitude),
            zoom: 12,
        });
    }, [selectedStation]);

    const handleSelect = useMemo(
        () => (station) => {
            onSelectRef.current?.(station);
        },
        []
    );

    return (
        <div className={styles.mapWrapper}>
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom
                className={styles.mapContainer}
                // Prefer smoother local pan/zoom without remount thrash
                preferCanvas={false}
            >
                <FocusController focus={focus} />

                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    // Browser HTTP cache helps when panning back over same area
                    keepBuffer={2}
                    updateWhenZooming={false}
                    updateWhenIdle
                />

                <MarkerClusterGroup
                    chunkedLoading
                    showCoverageOnHover={false}
                    spiderfyOnMaxZoom
                    maxClusterRadius={46}
                    iconCreateFunction={createClusterIcon}
                    // Avoid re-clustering work on tiny parent re-renders
                    removeOutsideVisibleBounds
                >
                    {validStations.map((station) => (
                        <StationMarker
                            key={station.station_id || station.station_code}
                            station={station}
                            isActive={selectedStation?.station_id === station.station_id}
                            onStationSelect={handleSelect}
                        />
                    ))}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}
