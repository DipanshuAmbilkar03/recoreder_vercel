"use client";

import dynamic from "next/dynamic";

// Dynamically import the Scene component with SSR disabled
// This must be a client component itself to use next/dynamic with ssr: false in Next 15+
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function SceneWrapper() {
    return <Scene />;
}
