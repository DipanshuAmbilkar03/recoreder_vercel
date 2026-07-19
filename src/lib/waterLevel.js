/**
 * Shared groundwater level math for the whole frontend.
 *
 * WRIS / DWLR values are treated as depth-to-water (DTW) below ground level.
 * Values may be negative (e.g. -12.5) or positive; we always use magnitude.
 *
 * well fill %  = remaining water column in the shaft
 *   100% = water at surface (DTW ~ 0)
 *     0% = water at / below well bottom (DTW >= well depth)
 */

export const MAX_SANE_DEPTH_M = 500;
export const DEFAULT_VISUAL_WELL_DEPTH_M = 100;

/** Absolute depth-to-water thresholds (meters below ground). */
export const DTW_WATCH_M = 8;
export const DTW_CRITICAL_M = 15;

/** Remaining water-column fill thresholds (percent). */
export const FILL_CRITICAL_PCT = 30;
export const FILL_WATCH_PCT = 55;

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function toFiniteNumber(value) {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/**
 * Positive depth-to-water in meters. Returns null for missing/outlier values.
 */
export function depthToWater(waterLevel) {
    const n = toFiniteNumber(waterLevel);
    if (n == null) return null;
    const dtw = Math.abs(n);
    if (dtw >= MAX_SANE_DEPTH_M) return null;
    return dtw;
}

/**
 * Resolve a usable well depth. When unknown, returns null (do not invent 100m for math).
 */
export function resolveWellDepth(wellDepth) {
    const n = toFiniteNumber(wellDepth);
    if (n == null || n <= 0) return null;
    return n;
}

/**
 * Visual-only well depth when metadata is missing.
 * Never used for risk alerts if the real well depth is unknown.
 */
export function visualWellDepth(waterLevel, wellDepth) {
    const known = resolveWellDepth(wellDepth);
    if (known != null) return known;
    const dtw = depthToWater(waterLevel);
    if (dtw == null) return DEFAULT_VISUAL_WELL_DEPTH_M;
    return Math.max(DEFAULT_VISUAL_WELL_DEPTH_M, Math.ceil(dtw * 1.35));
}

/**
 * Water-column fill percent inside the well (0 empty … 100 full at surface).
 */
export function wellFillPercent(waterLevel, wellDepth, { allowVisualFallback = false } = {}) {
    const dtw = depthToWater(waterLevel);
    if (dtw == null) return null;

    let depth = resolveWellDepth(wellDepth);
    if (depth == null) {
        if (!allowVisualFallback) return null;
        depth = visualWellDepth(waterLevel, wellDepth);
    }
    if (depth <= 0) return null;

    const usable = Math.min(dtw, depth);
    const fill = ((depth - usable) / depth) * 100;
    return clamp(fill, 0, 100);
}

/**
 * Depth stress percent (inverse of fill when both are valid).
 * Higher = deeper water table relative to well depth.
 */
export function depthStressPercent(waterLevel, wellDepth, options = {}) {
    const fill = wellFillPercent(waterLevel, wellDepth, options);
    if (fill == null) return null;
    return clamp(100 - fill, 0, 100);
}

/**
 * Unified status used by dashboard, map, analytics, terrain.
 */
export function getWaterStatus(waterLevel, wellDepth) {
    const dtw = depthToWater(waterLevel);
    const depth = resolveWellDepth(wellDepth);
    const fill = wellFillPercent(waterLevel, wellDepth, { allowVisualFallback: false });
    const visualFill = wellFillPercent(waterLevel, wellDepth, { allowVisualFallback: true });

    if (dtw == null) {
        return {
            key: "unknown",
            label: "No data",
            labelHi: "जानकारी नहीं",
            tip: "We do not have enough recent water readings for this place.",
            tone: "muted",
            color: "#94a3b8",
            depthToWater: null,
            wellDepth: depth,
            fillPercent: null,
            visualFillPercent: null,
        };
    }

    // Prefer well-fill when well depth is known (correct for deep piezometers).
    // Fall back to absolute DTW only when well depth metadata is missing.
    const dryWell = depth != null && dtw >= depth;
    const criticalByFill = fill != null && fill < FILL_CRITICAL_PCT;
    const watchByFill = fill != null && fill < FILL_WATCH_PCT;
    const criticalByDepth = depth == null && dtw >= DTW_CRITICAL_M;
    const watchByDepth = depth == null && dtw >= DTW_WATCH_M;

    if (dryWell || criticalByFill || criticalByDepth) {
        return {
            key: "critical",
            label: "Critical",
            labelHi: "ध्यान दें",
            tip: "Water column is low or the water table is very deep. Use water carefully and check nearby wells.",
            tone: "critical",
            color: "#dc2626",
            depthToWater: dtw,
            wellDepth: depth,
            fillPercent: fill == null ? null : Math.round(fill),
            visualFillPercent: visualFill == null ? null : Math.round(visualFill),
        };
    }

    if (watchByFill || watchByDepth) {
        return {
            key: "warning",
            label: "Watch",
            labelHi: "निगरानी रखें",
            tip: "Water table is deeper than ideal for this well. Avoid wastage and monitor weekly.",
            tone: "warning",
            color: "#d97706",
            depthToWater: dtw,
            wellDepth: depth,
            fillPercent: fill == null ? null : Math.round(fill),
            visualFillPercent: visualFill == null ? null : Math.round(visualFill),
        };
    }

    return {
        key: "stable",
        label: "Stable",
        labelHi: "ठीक है",
        tip: "Water depth looks better than stressed areas. Keep regular checks.",
        tone: "stable",
        color: "#16a34a",
        depthToWater: dtw,
        wellDepth: depth,
        fillPercent: fill == null ? null : Math.round(fill),
        visualFillPercent: visualFill == null ? null : Math.round(visualFill),
    };
}

export function stationWaterMetrics(station) {
    const waterLevel = station?.latest_water_level ?? station?.water_level ?? null;
    const wellDepth = station?.well_depth ?? null;
    return {
        waterLevel,
        ...getWaterStatus(waterLevel, wellDepth),
    };
}

/** Format DTW for UI tables/cards. */
export function formatDepthToWater(waterLevel, digits = 2) {
    const raw = toFiniteNumber(waterLevel);
    if (raw == null) return "—";
    if (Math.abs(raw) >= MAX_SANE_DEPTH_M) return "Invalid";
    return `${Math.abs(raw).toFixed(digits)} m`;
}

export function formatFillPercent(waterLevel, wellDepth) {
    const fill = wellFillPercent(waterLevel, wellDepth, { allowVisualFallback: false });
    if (fill == null) return "—";
    return `${Math.round(fill)}%`;
}
