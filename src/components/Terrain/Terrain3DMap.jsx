"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./Terrain3DMap.module.css";

const INDIA_CENTER = [79.0, 22.5];

function toGeoJSON(stations) {
    return {
        type: "FeatureCollection",
        features: (stations || [])
            .filter(
                (s) =>
                    Number.isFinite(Number(s.latitude)) &&
                    Number.isFinite(Number(s.longitude))
            )
            .map((s) => ({
                type: "Feature",
                properties: {
                    id: s.station_id,
                    name: s.station_name || "Station",
                    district: s.district || "",
                    state: s.state || "",
                    level:
                        s.latest_water_level != null
                            ? Math.abs(Number(s.latest_water_level))
                            : null,
                    status: String(s.station_status || "active").toLowerCase(),
                },
                geometry: {
                    type: "Point",
                    coordinates: [Number(s.longitude), Number(s.latitude)],
                },
            })),
    };
}

function stationsSignature(stations) {
    // Cheap content signature so we only push GeoJSON when data really changes.
    if (!stations?.length) return "0";
    let sig = String(stations.length);
    // Sample ends + a few mid points + level/id changes matter most
    const step = Math.max(1, Math.floor(stations.length / 12));
    for (let i = 0; i < stations.length; i += step) {
        const s = stations[i];
        sig += `|${s.station_id}:${s.latest_water_level ?? ""}:${s.latitude}:${s.longitude}`;
    }
    const last = stations[stations.length - 1];
    if (last) {
        sig += `|L${last.station_id}:${last.latest_water_level ?? ""}`;
    }
    return sig;
}

export default function Terrain3DMap({
    stations = [],
    selectedId = null,
    exaggeration = 1.8,
    pitch = 62,
    onSelect,
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const popupRef = useRef(null);
    const stationsRef = useRef(stations);
    const onSelectRef = useRef(onSelect);
    const lastStationsSig = useRef("");
    const lastSelectedId = useRef(null);
    const lastExaggeration = useRef(null);
    const lastPitch = useRef(null);
    const userInteracting = useRef(false);

    stationsRef.current = stations;
    onSelectRef.current = onSelect;

    // Init map once
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: {
                version: 8,
                sources: {
                    satellite: {
                        type: "raster",
                        tiles: [
                            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                        ],
                        tileSize: 256,
                        attribution: "Tiles © Esri",
                        maxzoom: 18,
                    },
                    terrainSource: {
                        type: "raster-dem",
                        tiles: [
                            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
                        ],
                        encoding: "terrarium",
                        tileSize: 256,
                        maxzoom: 15,
                        attribution: "© Mapzen / AWS Terrain",
                    },
                    stations: {
                        type: "geojson",
                        data: toGeoJSON(stationsRef.current),
                    },
                },
                layers: [
                    {
                        id: "satellite",
                        type: "raster",
                        source: "satellite",
                    },
                    {
                        id: "hills",
                        type: "hillshade",
                        source: "terrainSource",
                        paint: {
                            "hillshade-exaggeration": 0.55,
                            "hillshade-shadow-color": "#0f172a",
                            "hillshade-highlight-color": "#e2e8f0",
                            "hillshade-accent-color": "#38bdf8",
                        },
                    },
                    {
                        id: "station-glow",
                        type: "circle",
                        source: "stations",
                        paint: {
                            "circle-radius": 10,
                            "circle-color": "#22d3ee",
                            "circle-opacity": 0.18,
                            "circle-blur": 0.6,
                        },
                    },
                    {
                        id: "station-points",
                        type: "circle",
                        source: "stations",
                        paint: {
                            "circle-radius": 5.5,
                            "circle-color": "#22d3ee",
                            "circle-stroke-width": 2,
                            "circle-stroke-color": "#ffffff",
                        },
                    },
                ],
            },
            center: INDIA_CENTER,
            zoom: 4.6,
            pitch,
            bearing: -18,
            maxPitch: 80,
            antialias: true,
            // Reduce thrash while user pans/zooms
            refreshExpiredTiles: false,
            fadeDuration: 0,
        });

        lastPitch.current = pitch;
        lastExaggeration.current = exaggeration;
        lastStationsSig.current = stationsSignature(stationsRef.current);

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
        map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), "bottom-left");

        const markInteracting = () => {
            userInteracting.current = true;
        };
        const clearInteracting = () => {
            // small delay so programmatic move checks can ignore late events
            window.setTimeout(() => {
                userInteracting.current = false;
            }, 120);
        };

        map.on("dragstart", markInteracting);
        map.on("zoomstart", markInteracting);
        map.on("rotatestart", markInteracting);
        map.on("pitchstart", markInteracting);
        map.on("moveend", clearInteracting);

        map.on("style.load", () => {
            try {
                map.setTerrain({
                    source: "terrainSource",
                    exaggeration: lastExaggeration.current ?? 1.8,
                });
            } catch (e) {
                console.warn("Terrain set failed:", e);
            }
        });

        map.on("click", "station-points", (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const id = f.properties.id;
            const station = stationsRef.current.find(
                (s) => String(s.station_id) === String(id)
            );
            if (station) onSelectRef.current?.(station);

            const coords = f.geometry.coordinates.slice();
            if (popupRef.current) popupRef.current.remove();
            popupRef.current = new maplibregl.Popup({
                closeButton: true,
                offset: 14,
                className: styles.popup,
            })
                .setLngLat(coords)
                .setHTML(
                    `<div class="${styles.popupInner}">
                        <strong>${f.properties.name}</strong>
                        <div>${f.properties.district || ""}${
                        f.properties.district ? ", " : ""
                    }${f.properties.state || ""}</div>
                        <div>Water: ${
                            f.properties.level != null && f.properties.level !== ""
                                ? `${Math.abs(Number(f.properties.level)).toFixed(2)} m bgl`
                                : "No data"
                        }</div>
                    </div>`
                )
                .addTo(map);
        });

        map.on("mouseenter", "station-points", () => {
            map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "station-points", () => {
            map.getCanvas().style.cursor = "";
        });

        mapRef.current = map;

        return () => {
            map.off("dragstart", markInteracting);
            map.off("zoomstart", markInteracting);
            map.off("rotatestart", markInteracting);
            map.off("pitchstart", markInteracting);
            map.off("moveend", clearInteracting);
            if (popupRef.current) popupRef.current.remove();
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Push station GeoJSON only when content actually changes (not every parent render).
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const sig = stationsSignature(stations);
        if (sig === lastStationsSig.current) return;
        lastStationsSig.current = sig;

        const src = map.getSource("stations");
        if (src) src.setData(toGeoJSON(stations));
    }, [stations]);

    // Highlight + fly only when selectedId changes.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const applyHighlight = () => {
            if (!map.getLayer("station-points")) return;
            map.setPaintProperty("station-points", "circle-radius", [
                "case",
                ["==", ["get", "id"], selectedId ?? -1],
                9,
                5.5,
            ]);
            map.setPaintProperty("station-points", "circle-color", [
                "case",
                ["==", ["get", "id"], selectedId ?? -1],
                "#fbbf24",
                "#22d3ee",
            ]);
        };

        if (map.isStyleLoaded()) applyHighlight();
        else map.once("load", applyHighlight);

        if (selectedId == null) {
            lastSelectedId.current = null;
            return;
        }
        if (lastSelectedId.current === selectedId) return;
        lastSelectedId.current = selectedId;

        const s = stationsRef.current.find((x) => x.station_id === selectedId);
        if (
            !s ||
            !Number.isFinite(Number(s.longitude)) ||
            !Number.isFinite(Number(s.latitude))
        ) {
            return;
        }

        // Don't fight the user if they are actively panning/zooming.
        if (userInteracting.current) return;

        map.flyTo({
            center: [Number(s.longitude), Number(s.latitude)],
            zoom: Math.max(map.getZoom(), 10.5),
            pitch: lastPitch.current ?? map.getPitch(),
            bearing: map.getBearing(),
            essential: true,
            duration: 1200,
        });
    }, [selectedId]);

    // Terrain exaggeration — only when slider value changes.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (lastExaggeration.current === exaggeration) return;
        lastExaggeration.current = exaggeration;

        const apply = () => {
            try {
                map.setTerrain({ source: "terrainSource", exaggeration });
            } catch {
                // ignore until style ready
            }
        };

        if (map.isStyleLoaded()) apply();
        else map.once("load", apply);
    }, [exaggeration]);

    // Pitch slider — only when value changes; skip if user is interacting.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (lastPitch.current === pitch) return;
        lastPitch.current = pitch;
        if (userInteracting.current) return;
        map.easeTo({ pitch, duration: 450 });
    }, [pitch]);

    return <div ref={containerRef} className={styles.mapRoot} />;
}
