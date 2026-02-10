import React from 'react';
import styles from './MetricsDashboard.module.css';
import type { MetricsDashboardProps } from './MetricsDashboard.props';

const StatRow: React.FC<{ label: string; oldVal?: number; newVal?: number; lowerIsBetter?: boolean }> = ({ 
  label, 
  oldVal = 0, 
  newVal = 0, 
  lowerIsBetter = true 
}) => {
  const diff = newVal - oldVal;
  const isBetter = lowerIsBetter ? diff < 0 : diff > 0;
  const isNeutral = diff === 0;
  
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

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ response }) => {
  // 1. Strict null checks
  if (!response) {
      console.warn("MetricsDashboard: response is null");
      return null;
  }
  
  if (!response.metrics || !response.metrics.oldMetrics || !response.metrics.newMetrics) {
      console.warn("MetricsDashboard: metrics object is incomplete", response);
      return <div className={styles.emptyState}>No metrics data available for this refactoring.</div>;
  }

  const { metrics, toolDetectedSmells = [], identifiedCodeSmells = [], appliedTechniques = [] } = response;
  const { oldMetrics, newMetrics } = metrics;
  
  const healthPercent = Math.min(100, Math.max(0, newMetrics.maintainabilityIndex || 0));
  const healthColor = healthPercent > 80 ? '#10b981' : (healthPercent > 50 ? '#f59e0b' : '#ef4444');

  const renderList = (items: string[], emptyMessage: string, itemClass: string) => {
    if (items.length === 0) {
      return <div className={styles.emptyState}>{emptyMessage}</div>;
    }
    return (
      <ul className={styles.tagList}>
        {items.map((item, index) => (
          <li key={index} className={`${styles.tagItem} ${itemClass}`}>{item}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      
      {/* SECTION 1: Health Bar */}
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

      {/* SECTION 2: Quantitative Grid */}
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

      {/* SECTION 3: Qualitative Lists */}
      <div className={styles.qualitativeSection}>
          
          <div className={styles.smellsCard}>
              <h4 className={styles.cardTitle}>Identified Code Smells</h4>
              <div className={styles.smellsGrid}>
                  <div className={styles.smellColumn}>
                      <div className={styles.columnHeader}>Roslyn Analysis (Tool)</div>
                      {renderList(toolDetectedSmells, "No objective smells detected.", styles.smellItemTool)}
                  </div>
                  
                  <div className={styles.smellColumn}>
                      <div className={styles.columnHeader}>AI Analysis</div>
                      {renderList(identifiedCodeSmells, "No specific smells reported.", styles.smellItemAI)}
                  </div>
              </div>
          </div>

          <div className={styles.techniquesCard}>
              <h4 className={styles.cardTitle}>Applied Techniques (AI)</h4>
              {renderList(appliedTechniques, "No specific techniques reported.", styles.techniqueItem)}
          </div>

      </div>
    </div>
  );
};