/**
 * Shared stations loader with in-memory cache + in-flight de-dupe.
 * Prevents Map/Terrain/Dashboard from re-hitting /stations on every mount
 * or accidental re-render cycle.
 */
import { api } from "./api";

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_LIMIT = 2000;

let cache = {
    key: null,
    data: null,
    fetchedAt: 0,
    promise: null,
};

function cacheKey(limit) {
    return `stations:limit=${limit}`;
}

/**
 * @param {{ limit?: number, force?: boolean, ttlMs?: number }} [options]
 * @returns {Promise<Array>}
 */
export async function fetchStationsCached(options = {}) {
    const limit = Number(options.limit) > 0 ? Number(options.limit) : DEFAULT_LIMIT;
    const ttlMs = Number(options.ttlMs) > 0 ? Number(options.ttlMs) : DEFAULT_TTL_MS;
    const force = Boolean(options.force);
    const key = cacheKey(limit);
    const now = Date.now();

    if (
        !force &&
        cache.key === key &&
        Array.isArray(cache.data) &&
        now - cache.fetchedAt < ttlMs
    ) {
        return cache.data;
    }

    if (!force && cache.key === key && cache.promise) {
        return cache.promise;
    }

    const request = api
        .get("/stations", { params: { limit } })
        .then((res) => {
            const rows = res.data?.data || res.data || [];
            const list = Array.isArray(rows) ? rows : [];
            cache = {
                key,
                data: list,
                fetchedAt: Date.now(),
                promise: null,
            };
            return list;
        })
        .catch((err) => {
            if (cache.key === key) cache.promise = null;
            throw err;
        });

    cache = {
        ...cache,
        key,
        promise: request,
    };

    return request;
}

export function clearStationsCache() {
    cache = { key: null, data: null, fetchedAt: 0, promise: null };
}

export function getStationsCacheAgeMs() {
    if (!cache.fetchedAt) return null;
    return Date.now() - cache.fetchedAt;
}
