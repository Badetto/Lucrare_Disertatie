import React, { useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    ComposedChart, Line
} from 'recharts';
import styles from './CoreMetricsTab.module.css';
import type { CoreMetricsTabProps } from './CoreMetricsTab.props';

const PROVIDER_COLORS: Record<string, string> = {
    Gemini: '#10b981',      // Green
    Groq: '#f59e0b',        // Yellow/Orange
    HuggingFace: '#8b5cf6', // Purple
    OpenAi: '#3b82f6'       // Blue
};

export const CoreMetricsTab: React.FC<CoreMetricsTabProps> = ({ history }) => {
    
    // --- Aggregation specific to Core Metrics ---
    const chartData = useMemo(() => {
        const stats: Record<string, { runs: number, totalTime: number, totalCmpDrop: number, totalMiRise: number }> = {};

        history.forEach(run => {
            run.results.forEach(res => {
                if (!res.isSuccess) return; // Only measure successful runs

                if (!stats[res.providerName]) {
                    stats[res.providerName] = { runs: 0, totalTime: 0, totalCmpDrop: 0, totalMiRise: 0 };
                }

                stats[res.providerName].runs += 1;
                stats[res.providerName].totalTime += res.durationSeconds;
                
                // Reductions and Increases (Higher is better for both in this context)
                stats[res.providerName].totalCmpDrop += (run.originalComplexity - res.newComplexity);
                stats[res.providerName].totalMiRise += (res.newMaintainabilityIndex - run.originalMaintainabilityIndex);
            });
        });

        // Map to array for Recharts
        return Object.keys(stats).map(provider => {
            const s = stats[provider];
            return {
                provider,
                avgTime: Number((s.totalTime / s.runs).toFixed(2)),
                avgCmpDrop: Number((s.totalCmpDrop / s.runs).toFixed(2)),
                avgMiRise: Number((s.totalMiRise / s.runs).toFixed(2))
            };
        });
    }, [history]);

    if (chartData.length === 0) return <div>No successful benchmark data available yet.</div>;

    return (
        <div className={styles.tabContainer}>
            <div className={styles.chartsGrid}>
                
                {/* CHART 1: Average Execution Time */}
                <div className={styles.chartCard}>
                    <h3>Processing Speed by Model</h3>
                    <div className={styles.chartSubtitle}>Average execution time in seconds</div>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="provider" tick={{fill: '#64748b'}} tickLine={false} />
                            <YAxis tick={{fill: '#64748b'}} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="avgTime" name="Avg Time (s)" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PROVIDER_COLORS[entry.provider] || '#94a3b8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* CHART 2: Complexity vs Maintainability */}
                <div className={styles.chartCard}>
                    <h3>Refactoring Efficacy</h3>
                    <div className={styles.chartSubtitle}>Complexity Reduction vs. Maintainability Increase</div>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="provider" tick={{fill: '#64748b'}} tickLine={false} />
                            {/* Left Y Axis for Complexity */}
                            <YAxis yAxisId="left" tick={{fill: '#64748b'}} tickLine={false} axisLine={false} />
                            {/* Right Y Axis for MI */}
                            <YAxis yAxisId="right" orientation="right" tick={{fill: '#64748b'}} tickLine={false} axisLine={false} />
                            
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                            <Legend wrapperStyle={{paddingTop: '20px'}}/>
                            
                            <Bar yAxisId="left" dataKey="avgCmpDrop" name="Avg Complexity Drop" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="avgMiRise" name="Avg MI Increase" stroke="#10b981" strokeWidth={3} dot={{r: 6, fill: '#10b981'}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
};