"use client";

import dynamic from "next/dynamic";

// Leaflet makes direct references to the window object on import.
// This wrapper ensures the map component only loads on the client side,
// preventing Next.js specific "window is not defined" SSR errors.
const MapWithNoSSR = dynamic(
    () => import("./MapComponent"),
    {
        ssr: false,
        loading: () => (
            <div style={{
                width: '100%',
                height: '100%',
                minHeight: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <p style={{ color: 'var(--text-secondary)' }}>Loading interactive map...</p>
            </div>
        )
    }
);

export default MapWithNoSSR;
