import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
    return (
        <main className={styles.dynamicShell}>
            <section className={styles.dynamicHero}>
                <video
                    className={styles.heroVideo}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster="/waterFalling.jpg"
                    aria-hidden="true"
                >
                    <source src="/video/71122-537102350.mp4" type="video/mp4" />
                </video>
                <div className={styles.videoOverlay} aria-hidden="true" />

                <div className={styles.heroContent}>
                    <span className={styles.heroBadge}>National Groundwater Command Center</span>
                    <h1>DWLR Groundwater Monitoring</h1>
                    <p>
                        A unified control surface for station health, regional groundwater behavior, and early-warning
                        trend signals.
                    </p>

                    <div className={styles.heroActions}>
                        <Link href="/dashboard" className={styles.primaryAction}>Go to Dashboard</Link>
                        <Link href="/map" className={styles.secondaryAction}>Open Map</Link>
                    </div>

                    <div className={styles.heroStats}>
                        <article>
                            <strong>Live Monitoring</strong>
                            <span>Real-time station visibility</span>
                        </article>
                        <article>
                            <strong>Smart Alerts</strong>
                            <span>Priority based low-medium-high</span>
                        </article>
                        <article>
                            <strong>Regional Insights</strong>
                            <span>District and seasonal intelligence</span>
                        </article>
                    </div>
                </div>

                <footer className={styles.heroFooter}>
                    <span className={styles.creatorText}>Created by Dipanshu • Data from WRAIS</span>
                    <a
                        href="https://github.com/dipanshuAmbilkar03"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.footerGithub}
                    >
                        <svg className={styles.githubIcon} viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.25.82-.57v-2.2c-3.34.73-4.04-1.6-4.04-1.6a3.16 3.16 0 0 0-1.33-1.75c-1.09-.74.09-.73.09-.73a2.5 2.5 0 0 1 1.83 1.23 2.53 2.53 0 0 0 3.45.99 2.53 2.53 0 0 1 .75-1.59c-2.67-.3-5.47-1.34-5.47-5.94a4.66 4.66 0 0 1 1.24-3.24 4.33 4.33 0 0 1 .12-3.19s1.01-.32 3.3 1.24a11.45 11.45 0 0 1 6 0c2.28-1.56 3.3-1.24 3.3-1.24a4.33 4.33 0 0 1 .12 3.19 4.66 4.66 0 0 1 1.24 3.24c0 4.61-2.8 5.64-5.48 5.94a2.84 2.84 0 0 1 .81 2.2v3.26c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z"
                                fill="currentColor"
                            />
                        </svg>
                        GitHub
                    </a>
                </footer>
            </section>
        </main>
    );
}
