"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";

function Ocean() {
    const meshRef = useRef(null);
    const texture = useLoader(TextureLoader, "/oceanImage.jpg");

    // Create a base geometry we can modify without recreating each frame
    const geom = useMemo(() => new THREE.PlaneGeometry(50, 50, 64, 64), []);

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.getElapsedTime();
        const position = meshRef.current.geometry.attributes.position;

        // Animate vertices for a wave effect
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            // Simple wavy math combining sine waves and time
            const waveX = Math.sin(x * 0.2 + time * 0.5) * 0.5;
            const waveY = Math.cos(y * 0.2 + time * 0.5) * 0.5;
            position.setZ(i, waveX + waveY);
        }
        // Need this to tell Three.js to re-render the vertices
        position.needsUpdate = true;
    });

    return (
        <mesh ref={meshRef} geometry={geom} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -2, -8]}>
            <meshStandardMaterial
                map={texture}
                color="#aaddff"
                roughness={0.1}
                metalness={0.6}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

export default function OceanBackground() {
    return (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: -1, background: "#001a33" }}>
            <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
                <ambientLight intensity={0.4} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
                <pointLight position={[-10, 5, -10]} intensity={1} color="#0088ff" />
                <Ocean />
            </Canvas>
        </div>
    );
}
