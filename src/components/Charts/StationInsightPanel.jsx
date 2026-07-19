import React from 'react';
import styles from './StationInsightPanel.module.css';
import {
    depthToWater,
    getWaterStatus,
    resolveWellDepth,
    visualWellDepth,
    wellFillPercent,
} from '@/lib/waterLevel';

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
    const knownDepth = resolveWellDepth(wellDepth);
    const level = depthToWater(waterLevel);
    const depth = visualWellDepth(waterLevel, wellDepth);
    const fillRaw = wellFillPercent(waterLevel, wellDepth, { allowVisualFallback: true });
    const fillPercentage = fillRaw == null ? 0 : fillRaw;
    const status = getWaterStatus(waterLevel, wellDepth);

    let statusClass = styles.statusSafe;
    if (status.key === "critical") statusClass = styles.statusCritical;
    else if (status.key === "warning") statusClass = styles.statusModerate;

    const statusText =
        status.key === "critical"
            ? "Critical Low"
            : status.key === "warning"
              ? "Moderate / Watch"
              : status.key === "unknown"
                ? "No data"
                : "Stable / Optimal";

    return (
        <div className={styles.container}>
            {/* LEFT SIDE: Animation / Visualization */}
            <div className={styles.visualColumn}>
                <div className={styles.wellLabelTop}>Ground Surface (0m)</div>
                <div className={styles.surfaceLine}></div>
                
                <div className={styles.wellEnvironment}>
                    {/* Depth Measurement Bracket (Surface to Water Level) */}
                    {fillPercentage < 100 && (
                        <div 
                            className={styles.depthBracket}
                            style={{
                                position: 'absolute',
                                top: 0,
                                height: `${100 - fillPercentage}%`,
                                left: 'calc(50% + 55px)', // Positioned to the right of the 80px shaft
                                width: '8px',
                                borderRight: '2px solid #38bdf8',
                                borderTop: '2px solid #38bdf8',
                                borderBottom: '2px solid #38bdf8',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                transition: 'height 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                zIndex: 10
                            }}
                        >
                            <span 
                                style={{
                                    color: '#38bdf8',
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    whiteSpace: 'nowrap',
                                    transform: 'translateX(12px)', // Push text to the right of the bracket line
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(56, 189, 248, 0.4)',
                                    alignSelf: 'flex-start',
                                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
                                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                                }}
                            >
                                {level != null ? `${level.toFixed(2)}m Depth` : "No data"}
                            </span>
                        </div>
                    )}

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
                            <span className={styles.currentLevelTag}>
                                {level != null ? `-${level.toFixed(2)}m` : "N/A"}
                            </span>
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
                            <strong>
                                {knownDepth != null
                                    ? `${knownDepth} meters`
                                    : `${depth} m (est.)`}
                            </strong>
                        </div>
                    </div>
                </div>

                <div className={styles.highlightSection}>
                    <div className={styles.highlightItem}>
                        <label>Current Water Level</label>
                        <div className={styles.mainValue}>
                            {level != null ? `${level.toFixed(2)} m bgl` : "N/A"}
                        </div>
                        <div className={styles.trendSubtitle}>meters below ground level</div>
                    </div>
                    
                    <div className={styles.highlightItem}>
                        <label>Status</label>
                        <div className={`${styles.statusBadge} ${statusClass}`}>
                            {statusText}
                        </div>
                        {status.fillPercent != null && (
                            <div className={styles.trendSubtitle}>
                                Well fill {status.fillPercent}%
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
