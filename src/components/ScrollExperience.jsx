"use client";

import { useRef } from "react";
import { useScroll, Environment, Float, Preload, ContactShadows } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { IndiaModel, WaterWellModel, TerrainModel } from "./Models3D";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

export default function ScrollExperience() {
    const scroll = useScroll();
    const oceanTexture = useTexture("/oceanImage.jpg");

    const groupRef = useRef(null);
    const indiaRef = useRef(null);
    const wellRef = useRef(null);
    const terrainRef = useRef(null);
    const pulseRingRef = useRef(null);

    oceanTexture.wrapS = oceanTexture.wrapT = THREE.RepeatWrapping;
    oceanTexture.repeat.set(2, 1.25);

    useFrame((state) => {
        const offset = scroll.offset;
        const time = state.clock.getElapsedTime();

        if (groupRef.current) {
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, offset * 26, 0.08);
        }

        if (indiaRef.current) {
            let targetIndiaScale = 0;
            if (offset > 0.5 && offset < 0.94) {
                const progress = Math.min(1, Math.max(0, (offset - 0.5) * 3));
                targetIndiaScale = THREE.MathUtils.lerp(0, 0.56, progress);
            }

            indiaRef.current.scale.setScalar(THREE.MathUtils.lerp(indiaRef.current.scale.x, targetIndiaScale, 0.1));
            indiaRef.current.position.y = -offset * 26 + 0.25;
            indiaRef.current.position.x = THREE.MathUtils.lerp(indiaRef.current.position.x, 2.3, 0.06);
            indiaRef.current.rotation.y = time * 0.16 + offset * Math.PI * 0.35;
        }

        if (wellRef.current && terrainRef.current) {
            let targetWellScale = 0;
            if (offset > 0.08 && offset < 0.78) {
                const progress = Math.min(1, Math.max(0, (offset - 0.08) * 2.2));
                targetWellScale = THREE.MathUtils.lerp(0.2, 0.92, progress);
            }

            wellRef.current.scale.setScalar(THREE.MathUtils.lerp(wellRef.current.scale.x, targetWellScale, 0.1));
            terrainRef.current.scale.setScalar(THREE.MathUtils.lerp(terrainRef.current.scale.x, targetWellScale * 0.45, 0.1));

            const wellY = -offset * 26 - 1.6;
            wellRef.current.position.y = wellY;
            terrainRef.current.position.y = wellY - 1.2;

            wellRef.current.position.x = -2.4 + Math.sin(time * 0.25) * 0.15;
            terrainRef.current.position.x = -2.4;

            wellRef.current.rotation.y = time * 0.2;
            terrainRef.current.rotation.y = time * 0.05;
        }

        if (pulseRingRef.current) {
            const pulseScale = 1 + Math.sin(time * 1.6) * 0.18;
            pulseRingRef.current.scale.setScalar(pulseScale);
            pulseRingRef.current.material.opacity = 0.26 + Math.sin(time * 1.6) * 0.12;
        }
    });

    return (
        <>
            <ambientLight intensity={0.48} />
            <directionalLight position={[10, 10, 5]} intensity={1.25} castShadow />
            <pointLight position={[-10, -5, -6]} intensity={1.2} color="#0891b2" />

            <Environment files="/hdri/sunny_rose_garden_4k.exr" blur={0.8} />

            <mesh position={[0, 0, -20]} scale={[42, 22, 1]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial map={oceanTexture} transparent opacity={0.28} toneMapped={false} />
            </mesh>

            <group ref={groupRef}>
                <group ref={wellRef} position={[-3, -5, -8]} scale={0}>
                    <Float speed={2} rotationIntensity={0.22} floatIntensity={0.55}>
                        <WaterWellModel />
                    </Float>
                </group>

                <group ref={terrainRef} position={[-3, -6, -8]} scale={0}>
                    <TerrainModel />
                </group>

                <mesh ref={pulseRingRef} position={[-2.3, -3.5, -8.4]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1.2, 1.4, 64]} />
                    <meshBasicMaterial color="#67e8f9" transparent opacity={0.2} />
                </mesh>

                <group ref={indiaRef} position={[2, -10, -6]} scale={0}>
                    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
                        <IndiaModel />
                    </Float>
                </group>

                <Float speed={3} rotationIntensity={1} floatIntensity={2.2}>
                    <mesh position={[1.8, 0.1, -4.8]}>
                        <sphereGeometry args={[1, 64, 64]} />
                        <meshStandardMaterial
                            color="#38bdf8"
                            roughness={0}
                            metalness={0.8}
                            envMapIntensity={2}
                            transmission={0.9}
                            thickness={0.5}
                        />
                    </mesh>
                </Float>
            </group>

            <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.46} far={10} color="#000000" position={[0, -3, 0]} />
            <Preload all />
        </>
    );
}
