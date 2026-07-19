"use client";

import dynamic from "next/dynamic";

const Terrain3DMap = dynamic(() => import("./Terrain3DMap"), {
    ssr: false,
    loading: () => (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
                background: "#020617",
                color: "#7dd3fc",
                fontWeight: 700,
            }}
        >
            Loading 3D terrain...
        </div>
    ),
});

export default Terrain3DMap;
