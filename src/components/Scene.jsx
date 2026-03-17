"use client";

import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll } from "@react-three/drei";
import ScrollExperience from "./ScrollExperience";
import styles from "../app/page.module.css";
import Link from "next/link";
import { Suspense } from "react";

export default function Scene() {
    return (
        <div className={styles.storyShell}>
            <Canvas camera={{ position: [0, 0, 6], fov: 56 }} shadows>
                <Suspense fallback={null}>
                    <ScrollControls pages={7} damping={0.18}>
                        <ScrollExperience />

                        <Scroll html style={{ width: "100%" }}>
                            <section className={styles.storySection} style={{ top: "0vh" }}>
                                <div className={`container ${styles.heroPanel}`}>
                                    <span className={styles.storyBadge}>Jal Shakti Digital Mission</span>
                                    <h1>
                                        Understand groundwater like a story, not a spreadsheet.
                                    </h1>
                                    <p>
                                        This platform explains where water is stable, where it is dropping,
                                        and how people and government can respond before wells run dry.
                                    </p>
                                    <div className={styles.heroCtas}>
                                        <Link href="/map" className={styles.primaryCta}>See Live India Map</Link>
                                        <Link href="/dashboard" className={styles.secondaryCta}>View Daily Trends</Link>
                                    </div>
                                </div>
                            </section>

                            <section className={`${styles.storySection} ${styles.rightAlign}`} style={{ top: "100vh" }}>
                                <div className={styles.glassStoryCard}>
                                    <h2>What the DWLR machine does</h2>
                                    <p>
                                        A Digital Water Level Recorder sits inside a monitoring well.
                                        It checks water depth automatically and sends the reading to the system.
                                    </p>
                                    <ul className={styles.readableList}>
                                        <li>Measures water level regularly without manual visits</li>
                                        <li>Shows if groundwater is improving or falling</li>
                                        <li>Helps local teams act faster during stress periods</li>
                                    </ul>
                                </div>
                            </section>

                            <section className={`${styles.storySection} ${styles.leftAlign}`} style={{ top: "200vh" }}>
                                <div className={styles.panelWrap}>
                                    <article className={styles.metricStoryCard}>
                                        <span>Across India</span>
                                        <h3>Stations give a real picture</h3>
                                        <p>People can see water behavior region by region, not guess from old reports.</p>
                                    </article>
                                    <article className={styles.metricStoryCard}>
                                        <span>For Citizens</span>
                                        <h3>Simple alerts and visual trends</h3>
                                        <p>Color indicators quickly show safe, watch, and critical groundwater zones.</p>
                                    </article>
                                    <article className={styles.metricStoryCard}>
                                        <span>For Planning</span>
                                        <h3>Better decisions, less delay</h3>
                                        <p>Officials and communities can focus on places needing immediate support.</p>
                                    </article>
                                </div>
                            </section>

                            <section className={`${styles.storySection} ${styles.rightAlign}`} style={{ top: "300vh" }}>
                                <div className={styles.glassStoryCard}>
                                    <h2>Government action becomes targeted</h2>
                                    <p>
                                        Reliable readings help programs prioritize recharge work,
                                        regulate extraction, and support villages where decline is persistent.
                                    </p>
                                    <div className={styles.actionChips}>
                                        <span>Recharge structures</span>
                                        <span>Critical block monitoring</span>
                                        <span>Seasonal review meetings</span>
                                        <span>Community awareness drives</span>
                                    </div>
                                </div>
                            </section>

                            <section className={`${styles.storySection} ${styles.leftAlign}`} style={{ top: "400vh" }}>
                                <div className={styles.waterStressPanel}>
                                    <h2>Where water stress is rising</h2>
                                    <p>
                                        This animation style block explains how some areas face low groundwater,
                                        while others remain stable after rainfall and conservation efforts.
                                    </p>
                                    <div className={styles.stressBars}>
                                        <div>
                                            <strong>North-West belt</strong>
                                            <span className={styles.bar}><i style={{ width: "82%" }}></i></span>
                                        </div>
                                        <div>
                                            <strong>Central dry pockets</strong>
                                            <span className={styles.bar}><i style={{ width: "67%" }}></i></span>
                                        </div>
                                        <div>
                                            <strong>Eastern mixed zones</strong>
                                            <span className={styles.bar}><i style={{ width: "44%" }}></i></span>
                                        </div>
                                        <div>
                                            <strong>High recharge regions</strong>
                                            <span className={styles.bar}><i style={{ width: "29%" }}></i></span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className={`${styles.storySection} ${styles.rightAlign}`} style={{ top: "500vh" }}>
                                <div className={styles.glassStoryCard}>
                                    <h2>Explore the map to understand your area</h2>
                                    <p>
                                        Open the map and zoom to your district to check how local groundwater is
                                        moving over time.
                                    </p>
                                    <Link href="/map" className={styles.primaryCta}>Open Interactive Map</Link>
                                </div>
                            </section>

                            <section className={styles.storySection} style={{ top: "600vh" }}>
                                <div className={`container ${styles.learnPanel}`}>
                                    <h2>How each of us can save water</h2>
                                    <p>
                                        Data helps us understand the problem. Daily habits help us solve it.
                                    </p>
                                    <div className={styles.learnGrid}>
                                        <article>
                                            <h3>At home</h3>
                                            <p>Fix leaks quickly, reuse washing water for plants, and avoid overflow from tanks.</p>
                                        </article>
                                        <article>
                                            <h3>In communities</h3>
                                            <p>Support rainwater harvesting, recharge pits, and local water-body cleaning drives.</p>
                                        </article>
                                        <article>
                                            <h3>In farming areas</h3>
                                            <p>Use efficient irrigation timing and crop planning based on local groundwater signals.</p>
                                        </article>
                                    </div>
                                </div>
                            </section>
                        </Scroll>
                    </ScrollControls>
                </Suspense>
            </Canvas>
        </div>
    );
}
