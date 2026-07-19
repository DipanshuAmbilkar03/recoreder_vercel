"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Globe from "react-globe.gl";
import styles from "./GlobeBackground.module.css";

const INDIA = { lat: 20.5937, lng: 78.9629, altitude: 1.85 };

// Real Earth textures (NASA blue marble via reliable CDN)
const EARTH_IMG =
    "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg";
const BUMP_IMG =
    "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png";
const BG_IMG =
    "https://unpkg.com/three-globe@2.31.1/example/img/night-sky.png";

export default function GlobeBackground() {
    const globeEl = useRef(null);
    const [ready, setReady] = useState(false);
    const [size, setSize] = useState({ w: 800, h: 600 });
    const [reducedMotion, setReducedMotion] = useState(false);
    const [focused, setFocused] = useState(false);
    const [useTextures, setUseTextures] = useState(true);

    // Responsive canvas size
    useEffect(() => {
        const measure = () => {
            setSize({
                w: window.innerWidth,
                h: window.innerHeight,
            });
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReducedMotion(mq.matches);
        const onChange = () => setReducedMotion(mq.matches);
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    // Preflight texture
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => setUseTextures(true);
        img.onerror = () => setUseTextures(false);
        img.src = EARTH_IMG;
    }, []);

    const onGlobeReady = useCallback(() => {
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready || !globeEl.current) return;

        const globe = globeEl.current;
        const controls = globe.controls?.();
        if (!controls) return;

        // Start view (slightly elevated global)
        globe.pointOfView({ lat: 10, lng: -20, altitude: 2.6 }, 0);

        if (reducedMotion) {
            // Static India focus
            controls.autoRotate = false;
            globe.pointOfView({ ...INDIA }, 0);
            setFocused(true);
            return;
        }

        // Idle spin first
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.85;
        controls.enableZoom = false;
        controls.enablePan = false;

        const t = window.setTimeout(() => {
            // Ease to India
            controls.autoRotate = false;
            globe.pointOfView({ ...INDIA }, 1800);
            setFocused(true);

            // Gentle idle after lock so it stays alive but India stays readable
            window.setTimeout(() => {
                if (!globeEl.current) return;
                const c = globeEl.current.controls?.();
                if (!c) return;
                c.autoRotate = true;
                c.autoRotateSpeed = 0.12; // ~7x slower
            }, 1900);
        }, 2500);

        return () => window.clearTimeout(t);
    }, [ready, reducedMotion]);

    const markers = focused
        ? [
              {
                  lat: INDIA.lat,
                  lng: INDIA.lng,
                  size: 0.45,
                  color: "#22d3ee",
                  label: "India",
              },
          ]
        : [];

    return (
        <div className={styles.wrap} aria-hidden="true">
            <div className={styles.globeLayer}>
                <Globe
                    ref={globeEl}
                    width={size.w}
                    height={size.h}
                    backgroundColor="rgba(2,6,23,0)"
                    backgroundImageUrl={useTextures ? BG_IMG : null}
                    globeImageUrl={useTextures ? EARTH_IMG : "https://unpkg.com/three-globe@2.31.1/example/img/earth-dark.jpg"}
                    bumpImageUrl={useTextures ? BUMP_IMG : null}
                    showAtmosphere
                    atmosphereColor="#38bdf8"
                    atmosphereAltitude={0.18}
                    animateIn={false}
                    onGlobeReady={onGlobeReady}
                    pointsData={markers}
                    pointAltitude={0.01}
                    pointRadius={(d) => d.size}
                    pointColor={(d) => d.color}
                    pointsMerge={false}
                    ringsData={
                        focused
                            ? [
                                  {
                                      lat: INDIA.lat,
                                      lng: INDIA.lng,
                                      maxR: 3.5,
                                      propagationSpeed: 2.2,
                                      repeatPeriod: 1400,
                                  },
                              ]
                            : []
                    }
                    ringColor={() => (t) => `rgba(34, 211, 238, ${1 - t})`}
                    ringMaxRadius={(d) => d.maxR}
                    ringPropagationSpeed={(d) => d.propagationSpeed}
                    ringRepeatPeriod={(d) => d.repeatPeriod}
                />
            </div>

            {/* Scrim so text is always readable */}
            <div className={styles.scrim} />
            {!focused && !reducedMotion && (
                <div className={styles.caption}>Revolving Earth · locking onto India</div>
            )}
            {focused && !reducedMotion && (
                <div className={`${styles.caption} ${styles.captionDone}`}>India in focus</div>
            )}
        </div>
    );
}
