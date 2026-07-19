"use client";

import { useEffect, useState } from "react";
import styles from "./WellIllustration.module.css";
import { depthToWater, visualWellDepth, wellFillPercent } from "@/lib/waterLevel";

/**
 * Animated well: water rises from empty (0 fill) to current level.
 * waterLevel = depth to water below ground (m)
 * maxDepth = well total depth (m)
 */
export function WellIllustration({ waterLevel = 0, maxDepth = 100 }) {
    const level = depthToWater(waterLevel) ?? 0;
    const depth = visualWellDepth(waterLevel, maxDepth);
    const targetFill =
        wellFillPercent(waterLevel, maxDepth, { allowVisualFallback: true }) ?? 0;

    const [fill, setFill] = useState(0);
    const [displayLevel, setDisplayLevel] = useState(0);

    useEffect(() => {
        // Restart animation from 0 whenever station/level changes
        setFill(0);
        setDisplayLevel(0);

        const start = performance.now();
        const duration = 1400;
        let raf = 0;

        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            // easeOutCubic
            const e = 1 - Math.pow(1 - t, 3);
            setFill(targetFill * e);
            setDisplayLevel(level * e);
            if (t < 1) raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [level, depth, targetFill]);

    return (
        <div className={styles.container}>
            <div className={styles.wellFrame}>
                <div className={styles.groundLine} />
                <div className={styles.shaft}>
                    <div className={styles.water} style={{ height: `${fill}%` }}>
                        <div className={styles.ripples} />
                        <div className={styles.levelLabel}>{displayLevel.toFixed(2)}m</div>
                    </div>
                    <div className={styles.markers}>
                        <span>0m</span>
                        <span>{(depth / 2).toFixed(0)}m</span>
                        <span>{depth.toFixed(0)}m</span>
                    </div>
                </div>
            </div>
            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <span className={styles.groundDot} />
                    <span>Ground Surface (0 m)</span>
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.waterDot} />
                    <span>Current water level</span>
                </div>
            </div>
        </div>
    );
}
