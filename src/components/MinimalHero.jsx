"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import HeroScene from "./HeroScene";
import HeroOverlay from "./HeroOverlay";

export default function MinimalHero() {
    return (
        <section style={{ position: "relative", width: "100%", height: "100vh", backgroundColor: "#0f172a", overflow: "hidden" }}>
            {/* The 3D Canvas Background */}
            <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                <Canvas camera={{ position: [0, 2, 8], fov: 45 }} shadows>
                    <Suspense fallback={null}>
                        <HeroScene />
                    </Suspense>
                </Canvas>
            </div>

            {/* The HTML UI Overlay */}
            <HeroOverlay />
        </section>
    );
}
