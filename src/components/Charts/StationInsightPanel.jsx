import React from 'react';
import styles from './StationInsightPanel.module.css';

function InsightIcon({ type }) {
    if (type === 'station') {
        return (
            <svg className={styles.iconSvg} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 20h16M6 20V9l6-4 6 4v11M9 12h6M9 15h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (type === 'district') {
        return (
            <svg className={styles.iconSvg} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
        );
    }

    if (type === 'aquifer') {
        return (
            <svg className={styles.iconSvg} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3c2.3 3 4.8 5.2 4.8 8.1A4.8 4.8 0 1 1 7.2 11C7.2 8.2 9.7 6 12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19c1.7-1.1 3.6-1.7 7-1.7s5.3.6 7 1.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    return (
        <svg className={styles.iconSvg} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v18M7 8.5h10M7 15.5h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

/**
 * StationInsightPanel
 * 
 * Visually represents groundwater level inside a well and dynamically animates
 * when the station data changes.
 * 
 * Props:
 * @param {Object} stationData - Data for the currently selected station (name, district, aquiferType)
 * @param {number} wellDepth - Total depth of the well in meters below ground
 * @param {number} waterLevel - Current water level in meters below ground
 */
export function StationInsightPanel({ stationData, wellDepth, waterLevel }) {
    
    // Safety checks / defaults
    const depth = wellDepth || 100; // default 100m if unknown
    
    // Ensure waterLevel is a valid number, otherwise default to full depth
    const level = (typeof waterLevel === 'number' && !isNaN(waterLevel)) ? Math.abs(waterLevel) : depth;
    
    // Calculate percentage (0% = empty/at bottom, 100% = full/at surface)
    // If level is 10, and depth is 100. Water is 10m below surface.
    // That means water fills 90m of the 100m shaft. (90%)
    let fillPercentage = 0;
    if (level <= depth) {
        fillPercentage = ((depth - level) / depth) * 100;
    }

    // Determine status color based on depth percentage
    // e.g. if water is in bottom 20% -> critical (red)
    // if water is in middle 50% -> moderate (orange)
    // if water is in top 30% -> safe (green)
    let statusClass = styles.statusSafe;
    let statusText = "Safe / Optimal";
    if (fillPercentage < 20) {
        statusClass = styles.statusCritical;
        statusText = "Critical Low";
    } else if (fillPercentage < 50) {
        statusClass = styles.statusModerate;
        statusText = "Moderate";
    }

    return (
        <div className={styles.container}>
            {/* LEFT SIDE: Animation / Visualization */}
            <div className={styles.visualColumn}>
                <div className={styles.wellLabelTop}>Ground Surface (0m)</div>
                <div className={styles.surfaceLine}></div>
                
                <div className={styles.wellEnvironment}>
                    <div className={styles.wellShaft}>
                        
                        {/* The Animated Water Fill */}
                        <div 
                            className={`${styles.waterFill} ${statusClass}`}
                            style={{ height: `${fillPercentage}%` }}
                        >
                            <div className={styles.waterSurface}></div>
                        </div>

                        {/* Depth Labels inside shaft overlay */}
                        <div className={styles.depthMarker} style={{ bottom: '0%' }}>{depth}m</div>
                        <div className={styles.depthMarker} style={{ bottom: '25%' }}>{Math.round(depth * 0.75)}m</div>
                        <div className={styles.depthMarker} style={{ bottom: '50%' }}>{Math.round(depth * 0.5)}m</div>
                        <div className={styles.depthMarker} style={{ bottom: '75%' }}>{Math.round(depth * 0.25)}m</div>

                        {/* Current Level Indicator Line */}
                        <div 
                            className={styles.currentLevelIndicator}
                            style={{ bottom: `${fillPercentage}%` }}
                        >
                            <span className={styles.currentLevelTag}>-{level.toFixed(2)}m</span>
                        </div>

                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Station Metadata Grid */}
            <div className={styles.infoColumn}>
                
                <div className={styles.infoGrid}>
                    <div className={styles.gridItem}>
                        <div className={styles.iconWrapper}><InsightIcon type="station" /></div>
                        <div className={styles.itemContent}>
                            <label>Station Name</label>
                            <strong>{stationData?.station_name || "Unknown"}</strong>
                        </div>
                    </div>

                    <div className={styles.gridItem}>
                        <div className={styles.iconWrapper}><InsightIcon type="district" /></div>
                        <div className={styles.itemContent}>
                            <label>District</label>
                            <strong>{stationData?.district || "—"}</strong>
                        </div>
                    </div>

                    <div className={styles.gridItem}>
                        <div className={styles.iconWrapper}><InsightIcon type="aquifer" /></div>
                        <div className={styles.itemContent}>
                            <label>Aquifer Type</label>
                            <strong>{stationData?.aquifer_type || "Alluvial"}</strong>
                        </div>
                    </div>

                    <div className={styles.gridItem}>
                        <div className={styles.iconWrapper}><InsightIcon type="depth" /></div>
                        <div className={styles.itemContent}>
                            <label>Well Depth</label>
                            <strong>{depth} meters</strong>
                        </div>
                    </div>
                </div>

                <div className={styles.highlightSection}>
                    <div className={styles.highlightItem}>
                        <label>Current Water Level</label>
                        <div className={styles.mainValue}>
                            {(typeof waterLevel === 'number' && !isNaN(waterLevel)) 
                                ? `-${Math.abs(waterLevel).toFixed(2)}m` 
                                : 'N/A'}
                        </div>
                        <div className={styles.trendSubtitle}>meters below ground level</div>
                    </div>
                    
                    <div className={styles.highlightItem}>
                        <label>Status</label>
                        <div className={`${styles.statusBadge} ${statusClass}`}>
                            {statusText}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
