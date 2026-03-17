import styles from "./WellIllustration.module.css";

export function WellIllustration({ waterLevel = 0, maxDepth = 100 }) {
    // Ensure numeric values
    const level = Number(waterLevel) || 0;
    const depth = Number(maxDepth) > 0 ? Number(maxDepth) : 100;

    // Calculate percentage (inverse because water level is depth from surface)
    // 0m means full to the surface (100% height), maxDepth means empty (0% height)
    const fillPercentage = Math.max(0, Math.min(100, ((depth - level) / depth) * 100));

    return (
        <div className={styles.container}>
            <div className={styles.wellFrame}>
                {/* Surface Ground */}
                <div className={styles.groundLine}></div>
                
                {/* Well Shaft */}
                <div className={styles.shaft}>
                    {/* Water Level */}
                    <div 
                        className={styles.water} 
                        style={{ height: `${fillPercentage}%` }}
                    >
                        <div className={styles.ripples}></div>
                        <div className={styles.levelLabel}>{level.toFixed(2)}m</div>
                    </div>
                    
                    {/* Depth Markers */}
                    <div className={styles.markers}>
                        <span>0m</span>
                        <span>{(depth/2).toFixed(0)}m</span>
                        <span>{depth.toFixed(0)}m</span>
                    </div>
                </div>
            </div>
            {/* ... legend remains same ... */}
            
            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <span className={styles.groundDot}></span>
                    <span>Ground Surface</span>
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.waterDot}></span>
                    <span>Groundwater Table</span>
                </div>
            </div>
        </div>
    );
}
