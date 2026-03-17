import Link from "next/link";
import styles from "./HeroOverlay.module.css";

export default function HeroOverlay() {
    return (
        <div className={styles.overlayContainer}>
            <div className={styles.contentWrapper}>
                <div className={styles.badgeWrapper}>
                    <span className={styles.badge}>
                        <span className={styles.badgeDot}></span>
                        Live Sensors Active
                    </span>
                </div>

                <h1 className={styles.title}>
                    Groundwater intelligence,
                    <br />
                    <span className={styles.gradientText}>designed for action</span>
                </h1>

                <p className={styles.subtitle}>
                    Monitor dynamic water levels across DWLR stations with a visual system built
                    for quick field awareness and confident planning.
                </p>

                <div className={styles.insightRow}>
                    <div className={styles.insightPill}>Live station feeds</div>
                    <div className={styles.insightPill}>Historical trends</div>
                    <div className={styles.insightPill}>Map-driven analysis</div>
                </div>

                <div className={styles.buttonGroup}>
                    <Link href="/map" className={styles.primaryButton}>
                        Explore Map
                    </Link>
                    <Link href="/dashboard" className={styles.secondaryButton}>
                        View Dashboard
                    </Link>
                </div>

                <p className={styles.helperText}>Scroll to see platform capabilities</p>

            </div>

            <div className={styles.bottomFade}></div>
        </div>
    );
}
