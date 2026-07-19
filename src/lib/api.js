import axios from "axios";

const RAW_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Normalize so we never end up with double /api or missing /api
function normalizeApiUrl(url) {
    let base = String(url || "").trim().replace(/\/+$/, "");
    if (!base) base = "http://localhost:5000/api";
    if (!/\/api$/i.test(base)) {
        base = `${base}/api`;
    }
    return base;
}

export const API_URL = normalizeApiUrl(RAW_URL);

export const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        Accept: "application/json",
    },
});

export function authHeaders(token) {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

export function getAdminToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("admin_token");
}

export default api;
