import React from 'react';
import styles from './BenchmarkDashboard.module.css';
import type { BenchmarkDashboardProps } from './BenchmarkDashboard.props';

export const BenchmarkDashboard: React.FC<BenchmarkDashboardProps> = ({ result, isLoading }) => {
    if (isLoading) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <h3>🏎️ Running AI Benchmark Race...</h3>
                    <p>Testing Gemini vs. Groq vs. HuggingFace...</p>
                </div>
            </div>
        );
    }

    if (!result || !result.results || result.results.length === 0) return null;

    // CRITICAL FIX: Safe math that won't crash if an AI returns broken data
    const validResults = result.results.filter(r => r.isSuccess && r.metrics);
    
    const bestComplexity = validResults.length > 0 
        ? Math.min(...validResults.map(r => r.metrics?.cyclomaticComplexity || 999))
        : 0;
        
    const fastestTime = validResults.length > 0 
        ? Math.min(...validResults.map(r => r.durationSeconds || 999))
        : 0;

    return (
        <div className={styles.container}>
            <div className={styles.title}>
                🧪 Benchmark Results (Original Complexity: {result.originalMetrics?.cyclomaticComplexity || 'N/A'})
            </div>

            <div className={styles.grid}>
                {result.results.map((provider) => {
                    const metrics = provider.metrics || { cyclomaticComplexity: 0, linesOfCode: 0 };
                    const isWinner = provider.isSuccess && metrics.cyclomaticComplexity === bestComplexity && bestComplexity !== 999;
                    const isFastest = provider.isSuccess && provider.durationSeconds === fastestTime && fastestTime !== 999;

                    return (
                        <div 
                            key={provider.providerName} 
                            className={`${styles.card} ${isWinner ? styles.winnerCard : ''}`}
                        >
                            {isWinner && <span className={`${styles.badge} ${styles.winnerBadge}`}>Best Code</span>}
                            {isFastest && <span className={`${styles.badge} ${styles.fastestBadge}`} style={{ right: isWinner ? '85px' : '10px' }}>⚡ Fastest</span>}

                            <div className={styles.providerName}>{provider.providerName}</div>

                            {provider.isSuccess ? (
                                <>
                                    <div className={styles.statRow}>
                                        <span className={styles.statLabel}>Time</span>
                                        <span className={styles.statValue}>{provider.durationSeconds?.toFixed(2)}s</span>
                                    </div>
                                    <div className={styles.statRow}>
                                        <span className={styles.statLabel}>Complexity</span>
                                        <span className={styles.statValue} style={{ color: isWinner ? '#10b981' : '' }}>
                                            {metrics.cyclomaticComplexity} 
                                            <small style={{ fontWeight: 'normal', marginLeft: '5px' }}>
                                                ({metrics.cyclomaticComplexity - (result.originalMetrics?.cyclomaticComplexity || 0)})
                                            </small>
                                        </span>
                                    </div>
                                    <div className={styles.statRow}>
                                        <span className={styles.statLabel}>Lines of Code</span>
                                        <span className={styles.statValue}>{metrics.linesOfCode}</span>
                                    </div>
                                    <div className={styles.insightsSection}>
                                        {provider.explanation && (
                                            <div className={styles.explanationText}>
                                                "{provider.explanation}"
                                            </div>
                                        )}
                                        
                                        {provider.identifiedCodeSmells && provider.identifiedCodeSmells.length > 0 && (
                                            <div>
                                                <strong>Found Smells:</strong>
                                                <div className={styles.tagList}>
                                                    {provider.identifiedCodeSmells.map((smell, idx) => (
                                                        <span key={idx} className={`${styles.tag} ${styles.smellTag}`}>{smell}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {provider.appliedTechniques && provider.appliedTechniques.length > 0 && (
                                            <div>
                                                <strong>Applied Techniques:</strong>
                                                <div className={styles.tagList}>
                                                    {provider.appliedTechniques.map((tech, idx) => (
                                                        <span key={idx} className={`${styles.tag} ${styles.techniqueTag}`}>{tech}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className={styles.errorText}>
                                    ⚠️ Failed: {provider.errorMessage || "Unknown Error"}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};