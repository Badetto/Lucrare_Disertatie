import React from 'react';
import styles from './MetricsDashboard.module.css';
import type { MetricsDashboardProps } from './MetricsDashboard.props';

const StatRow: React.FC<{ label: string; oldVal: number; newVal: number; lowerIsBetter?: boolean }> = ({ label, oldVal, newVal, lowerIsBetter = true }) => {
  const diff = newVal - oldVal;
  const isBetter = lowerIsBetter ? diff < 0 : diff > 0;
  const isNeutral = diff === 0;
  
  // Visuals
  const colorClass = isNeutral ? styles.neutral : (isBetter ? styles.positive : styles.negative);
  const arrow = isNeutral ? '—' : (diff > 0 ? '↑' : '↓');
  
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statValues}>
        <span className={styles.valOld}>{oldVal}</span>
        <span className={styles.arrow}>➔</span>
        <span className={styles.valNew}>{newVal}</span>
      </div>
      <span className={`${styles.diffTag} ${colorClass}`}>
        {arrow} {Math.abs(diff)}
      </span>
    </div>
  );
};

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ metrics }) => {
  if (!metrics) return null;

  const { oldMetrics, newMetrics } = metrics;
  
  // Calculate health percentage for the progress bar (0-100)
  const healthPercent = Math.min(100, Math.max(0, newMetrics.maintainabilityIndex));
  const healthColor = healthPercent > 80 ? '#10b981' : (healthPercent > 50 ? '#f59e0b' : '#ef4444');

  return (
    <div className={styles.dashboardContainer}>
      
      <div className={styles.healthSection}>
        <h3>Maintainability Index</h3>
        <div className={styles.progressBarContainer}>
           <div 
             className={styles.progressBarFill} 
             style={{ width: `${healthPercent}%`, backgroundColor: healthColor }}
           ></div>
        </div>
        <div className={styles.healthStats}>
           <span>Before: {oldMetrics.maintainabilityIndex}</span>
           <span style={{ fontWeight: 'bold', color: healthColor, fontSize: '1.2rem' }}>
             Now: {newMetrics.maintainabilityIndex}
           </span>
        </div>
      </div>

      <div className={styles.gridSection}>
        
        <div className={styles.card}>
          <h4>Complexity & Size</h4>
          <StatRow label="Cyclomatic Complexity" oldVal={oldMetrics.cyclomaticComplexity} newVal={newMetrics.cyclomaticComplexity} />
          <StatRow label="Lines of Code" oldVal={oldMetrics.linesOfCode} newVal={newMetrics.linesOfCode} />
        </div>

        <div className={styles.card}>
           <h4>Structure Analysis</h4>
           <StatRow label="Max Nesting Depth" oldVal={oldMetrics.maxNestingDepth} newVal={newMetrics.maxNestingDepth} />
           <StatRow label="Method Count" oldVal={oldMetrics.methodCount} newVal={newMetrics.methodCount} lowerIsBetter={false} />
           <StatRow label="Max Parameters" oldVal={oldMetrics.maxParameters} newVal={newMetrics.maxParameters} />
        </div>

      </div>
    </div>
  );
};