"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import styles from "./TerrainMap.module.css";
import { formatDepthToWater, getWaterStatus } from "@/lib/waterLevel";

function FitIndia({ stations }) {
    const map = useMap();
    const didFit = useRef(false);
    useEffect(() => {
        if (didFit.current) return;
        const pts = stations
            .filter((s) => Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude)))
            .map((s) => [Number(s.latitude), Number(s.longitude)]);
        if (pts.length === 0) return;
        didFit.current = true;
        if (pts.length >= 2) {
            map.fitBounds(pts, { padding: [40, 40], maxZoom: 8 });
        } else if (pts.length === 1) {
            map.setView(pts[0], 8);
        } else {
            map.setView([22.5, 79], 5);
        }
    }, [stations, map]);
    return null;
}

function makeIcon(status) {
    const color =
        status === "urgent" ? "#f87171" : status === "watch" ? "#fbbf24" : "#34d399";
    return L.divIcon({
        className: styles.markerWrap,
        html: `<div class="${styles.marker}" style="--c:${color}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
}

function waterStatus(level) {
    const status = getWaterStatus(level, null);
    if (status.key === "critical") return "urgent";
    if (status.key === "warning") return "watch";
    if (status.key === "stable") return "ok";
    return "unknown";
}

export default function TerrainMap({ stations = [], selectedId, onSelect }) {
    const valid = useMemo(
        () =>
            stations.filter(
                (s) => Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude))
            ),
        [stations]
    );

    return (
        <div className={styles.mapRoot}>
            <MapContainer
                center={[22.5, 79]}
                zoom={5}
                className={styles.map}
                scrollWheelZoom
            >
                <FitIndia stations={valid} />
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Terrain (Topo)">
                        <TileLayer
                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                            attribution='Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap'
                            maxZoom={17}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite">
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="Tiles &copy; Esri"
                            maxZoom={18}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Street">
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            attribution="&copy; OSM &copy; CARTO"
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {valid.map((s) => {
                    const st = waterStatus(s.latest_water_level);
                    return (
                        <Marker
                            key={s.station_id}
                            position={[Number(s.latitude), Number(s.longitude)]}
                            icon={makeIcon(st)}
                            eventHandlers={{
                                click: () => onSelect?.(s),
                            }}
                        >
                            <Popup>
                                <div className={styles.popup}>
                                    <strong>{s.station_name}</strong>
                                    <p>
                                        {s.district || "District"}, {s.state || "State"}
                                    </p>
                                    <p>
                                        Water:{" "}
                                        {formatDepthToWater(s.latest_water_level) === "—"
                                            ? "No data"
                                            : formatDepthToWater(s.latest_water_level)}
                                    </p>
                                    <Link href={`/dashboard?station_id=${s.station_id}`}>
                                        Open graphs
                                    </Link>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
