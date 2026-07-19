"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import styles from "./GlobeIntro.module.css";

// Target India (approx center)
const INDIA_LAT = 22.5;
const INDIA_LON = 79.0;

function latLonToRotation(lat, lon) {
    // Point (lat,lon) toward camera +Z by rotating the globe
    const latRad = THREE.MathUtils.degToRad(lat);
    const lonRad = THREE.MathUtils.degToRad(lon);
    return {
        x: latRad,
        y: -lonRad - Math.PI / 2,
    };
}

function createEarthTexture() {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Ocean base
    const ocean = ctx.createLinearGradient(0, 0, size, size);
    ocean.addColorStop(0, "#0b3d91");
    ocean.addColorStop(0.45, "#0e7490");
    ocean.addColorStop(1, "#082f49");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, size, size);

    // Soft land masses (stylized, not geographic accuracy)
    const landPatches = [
        [0.52, 0.42, 0.08, 0.12], // India-ish
        [0.48, 0.38, 0.16, 0.10], // Asia band
        [0.20, 0.35, 0.12, 0.18], // Americas-ish
        [0.55, 0.55, 0.10, 0.16], // Africa-ish
        [0.78, 0.62, 0.10, 0.08], // Australia-ish
        [0.58, 0.28, 0.20, 0.08], // Europe/Russia band
    ];

    for (const [x, y, w, h] of landPatches) {
        const grd = ctx.createRadialGradient(
            x * size,
            y * size,
            4,
            x * size,
            y * size,
            Math.max(w, h) * size
        );
        grd.addColorStop(0, "rgba(52, 211, 153, 0.95)");
        grd.addColorStop(0.45, "rgba(16, 185, 129, 0.75)");
        grd.addColorStop(1, "rgba(14, 116, 144, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(x * size, y * size, w * size, h * size, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Atmosphere haze lines
    ctx.strokeStyle = "rgba(125, 211, 252, 0.08)";
    for (let i = 0; i < 24; i++) {
        const y = (i / 24) * size;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
    }

    // Specular sparkles
    ctx.fillStyle = "rgba(224, 242, 254, 0.25)";
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillRect(x, y, 1.5, 1.5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
}

function Earth({ progressRef, reducedMotion }) {
    const group = useRef(null);
    const cloudRef = useRef(null);
    const india = useMemo(() => latLonToRotation(INDIA_LAT, INDIA_LON), []);
    const earthMap = useMemo(() => createEarthTexture(), []);

    useFrame((_, delta) => {
        if (!group.current) return;
        const p = progressRef.current; // 0..1

        // Fast spin early, settle later
        const spinSpeed = reducedMotion
            ? 0.15
            : THREE.MathUtils.lerp(4.8, 0.15, THREE.MathUtils.smoothstep(p, 0.15, 0.72));

        // Keep spinning on Y while also easing toward India orientation
        group.current.rotation.y += delta * spinSpeed;

        // Blend toward India framing
        const settle = THREE.MathUtils.smoothstep(p, 0.35, 0.88);
        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, india.x * settle, 0.08);
        // Soft lock longitude bias near end
        const targetY = india.y + (1 - settle) * group.current.rotation.y * 0.02;
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, settle * 0.045);

        if (cloudRef.current) {
            cloudRef.current.rotation.y -= delta * (spinSpeed * 0.35 + 0.05);
        }
    });

    return (
        <group ref={group}>
            <mesh>
                <sphereGeometry args={[1.35, 64, 64]} />
                <meshStandardMaterial
                    map={earthMap}
                    roughness={0.62}
                    metalness={0.12}
                    emissive="#022c3a"
                    emissiveIntensity={0.15}
                />
            </mesh>

            {/* Atmosphere shell */}
            <mesh scale={1.045}>
                <sphereGeometry args={[1.35, 48, 48]} />
                <meshBasicMaterial
                    color="#7dd3fc"
                    transparent
                    opacity={0.12}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Thin cloud shell */}
            <mesh ref={cloudRef} scale={1.02}>
                <sphereGeometry args={[1.35, 48, 48]} />
                <meshStandardMaterial
                    color="#e0f2fe"
                    transparent
                    opacity={0.08}
                    roughness={1}
                    metalness={0}
                />
            </mesh>

            {/* India marker */}
            <mesh
                position={[
                    1.38 * Math.cos(THREE.MathUtils.degToRad(INDIA_LAT)) * Math.sin(THREE.MathUtils.degToRad(INDIA_LON)),
                    1.38 * Math.sin(THREE.MathUtils.degToRad(INDIA_LAT)),
                    1.38 * Math.cos(THREE.MathUtils.degToRad(INDIA_LAT)) * Math.cos(THREE.MathUtils.degToRad(INDIA_LON)),
                ]}
            >
                <sphereGeometry args={[0.035, 16, 16]} />
                <meshBasicMaterial color="#fbbf24" />
            </mesh>
        </group>
    );
}

function CameraRig({ progressRef, reducedMotion }) {
    useFrame((state) => {
        const p = progressRef.current;
        // Start far, fast zoom in toward end
        const z = reducedMotion
            ? THREE.MathUtils.lerp(5.2, 2.55, p)
            : THREE.MathUtils.lerp(6.2, 2.35, THREE.MathUtils.smoothstep(p, 0.2, 0.95));
        state.camera.position.z = z;
        state.camera.position.y = THREE.MathUtils.lerp(0.35, 0.12, p);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
}

function Scene({ progressRef, reducedMotion }) {
    return (
        <>
            <color attach="background" args={["#020617"]} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[5, 3, 4]} intensity={1.6} color="#e0f2fe" />
            <pointLight position={[-4, -2, -3]} intensity={0.8} color="#0284c7" />
            <Earth progressRef={progressRef} reducedMotion={reducedMotion} />
            <CameraRig progressRef={progressRef} reducedMotion={reducedMotion} />
        </>
    );
}

export default function GlobeIntro({ onComplete, durationMs = 4200 }) {
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState("spin"); // spin | india | exit
    const progressRef = useRef(0);
    const startRef = useRef(null);
    const doneRef = useRef(false);
    const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    useEffect(() => {
        let raf = 0;
        const tick = (now) => {
            if (!startRef.current) startRef.current = now;
            const elapsed = now - startRef.current;
            const p = Math.min(1, elapsed / durationMs);
            progressRef.current = p;
            setProgress(p);

            if (p < 0.45) setPhase("spin");
            else if (p < 0.82) setPhase("india");
            else setPhase("exit");

            if (p >= 1) {
                if (!doneRef.current) {
                    doneRef.current = true;
                    onComplete?.();
                }
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [durationMs, onComplete]);

    const skip = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        progressRef.current = 1;
        setProgress(1);
        onComplete?.();
    };

    const label =
        phase === "spin"
            ? "Scanning Earth..."
            : phase === "india"
              ? "Focusing on India"
              : "Entering water surface...";

    return (
        <div className={`${styles.wrap} ${progress > 0.9 ? styles.fadeOut : ""}`}>
            <div className={styles.canvasWrap}>
                <Canvas camera={{ position: [0, 0.2, 5.5], fov: 42 }} dpr={[1, 1.75]}>
                    <Scene progressRef={progressRef} reducedMotion={!!reducedMotion} />
                </Canvas>
            </div>

            <div className={styles.ui}>
                <div className={styles.badge}>DWLR · Global to Local</div>
                <h2>{label}</h2>
                <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <button type="button" className={styles.skip} onClick={skip}>
                    Skip intro
                </button>
            </div>
        </div>
    );
}
