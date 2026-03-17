"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Float, Preload, ContactShadows } from "@react-three/drei";
import { WaterWellModel, TerrainModel } from "./Models3D";

export default function HeroScene() {
    const groupRef = useRef(null);

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.getElapsedTime();

        // Keep motion subtle so text remains readable over the 3D scene.
        groupRef.current.rotation.y = Math.sin(time * 0.22) * 0.18;
        groupRef.current.position.y = -4 + Math.sin(time * 0.8) * 0.12;
    });

    return (
        <>
            <ambientLight intensity={0.6} color="#ffffff" />
            <directionalLight
                position={[10, 20, 5]}
                intensity={1.5}
                color="#e0f2fe"
                castShadow
            />
            <pointLight position={[-10, -5, -10]} intensity={2} color="#0284c7" />

            <Environment files="/hdri/studio_garden_4k.exr" blur={0.8} />

            <group ref={groupRef} position={[2, -4, -6]}>
                <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.5}>
                    <group position={[0, -1, 0]} scale={0.8}>
                        <WaterWellModel />
                    </group>

                    <group position={[0, -2.5, 0]} scale={0.4}>
                        <TerrainModel />
                    </group>
                </Float>
            </group>

            <ContactShadows resolution={1024} scale={20} blur={2.5} opacity={0.6} far={10} color="#001a33" position={[0, -6, 0]} />
            <Preload all />
        </>
    );
}
