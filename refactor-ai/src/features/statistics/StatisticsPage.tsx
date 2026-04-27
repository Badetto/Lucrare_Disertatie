import React, { useState, useEffect, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell 
} from 'recharts';
import styles from './StatisticsPage.module.css';
import { getBenchmarkHistory } from '../../services/refactorService';
import type { StatisticsPageProps } from './StatisticsPage.props';
import type { BenchmarkRunDb } from '../../types/api.types';

// Distinct colors for the AI providers
const PROVIDER_COLORS: Record<string, string> = {
    Gemini: '#10b981',      // Green
    Groq: '#f59e0b',        // Yellow/Orange
    HuggingFace: '#8b5cf6', // Purple
    OpenAi: '#3b82f6'       // Blue
};

export const StatisticsPage: React.FC<StatisticsPageProps> = ({ title = "Dissertation Analytics" }) => {
    const [history, setHistory] = useState<BenchmarkRunDb[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getBenchmarkHistory();
                setHistory(data);
            } catch (error) {
                console.error("Failed to load statistics");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- DATA AGGREGATION ENGINE ---
    // We memoize this so it only recalculates when 'history' changes
    const aggregatedData = useMemo(() => {
        if (!history || history.length === 0) return null;

        const stats: Record<string, { totalRuns: number, successRuns: number, totalTime: number, totalComplexityReduction: number }> = {};
        
        let totalExperiments = history.length;

        history.forEach(run => {
            run.results.forEach(result => {
                if (!stats[result.providerName]) {
                    stats[result.providerName] = { totalRuns: 0, successRuns: 0, totalTime: 0, totalComplexityReduction: 0 };
                }

                stats[result.providerName].totalRuns += 1;

                // Only calculate averages for SUCCESSFUL runs
                if (result.isSuccess) {
                    stats[result.providerName].successRuns += 1;
                    stats[result.providerName].totalTime += result.durationSeconds;
                    
                    // Reduction = Original - New (Higher is better)
                    const reduction = run.originalComplexity - result.newComplexity;
                    stats[result.providerName].totalComplexityReduction += reduction;
                }
            });
        });

        // Format data for Recharts
        const chartData = Object.keys(stats).map(provider => {
            const s = stats[provider];
            return {
                provider,
                avgTime: s.successRuns > 0 ? Number((s.totalTime / s.successRuns).toFixed(2)) : 0,
                avgReduction: s.successRuns > 0 ? Number((s.totalComplexityReduction / s.successRuns).toFixed(2)) : 0,
                successRate: s.totalRuns > 0 ? Number(((s.successRuns / s.totalRuns) * 100).toFixed(0)) : 0,
                totalRuns: s.totalRuns
            };
        });

        return { totalExperiments, chartData };
    }, [history]);


    // --- RENDERERS ---

    if (isLoading) {
        return <div className={styles.loadingState}><h2>Loading thesis data... 🧪</h2></div>;
    }

    if (!aggregatedData || aggregatedData.totalExperiments === 0) {
        return (
            <div className={styles.emptyState}>
                <span>📊</span>
                <h2>No Data Available</h2>
                <p>Run some benchmarks on the Repository or Snippet page first!</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1>{title}</h1>
                <p>Aggregated benchmark results from {aggregatedData.totalExperiments} experiments.</p>
            </div>

            {/* 1. High-Level Summary Cards */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <span className={styles.cardTitle}>Total Experiments Run</span>
                    <span className={styles.cardValue}>{aggregatedData.totalExperiments}</span>
                </div>
                <div className={styles.summaryCard}>
                    <span className={styles.cardTitle}>Fastest AI (Avg)</span>
                    <span className={styles.cardValue} style={{ color: '#10b981' }}>
                        {aggregatedData.chartData.reduce((prev, curr) => (prev.avgTime < curr.avgTime && prev.avgTime > 0) ? prev : curr).provider}
                    </span>
                </div>
                <div className={styles.summaryCard}>
                    <span className={styles.cardTitle}>Best Refactorer (Avg Complexity Drop)</span>
                    <span className={styles.cardValue} style={{ color: '#8b5cf6' }}>
                         {aggregatedData.chartData.reduce((prev, curr) => prev.avgReduction > curr.avgReduction ? prev : curr).provider}
                    </span>
                </div>
            </div>

            {/* 2. Charts Grid */}
            <div className={styles.chartsGrid}>
                
                {/* CHART A: Average Processing Time */}
                <div className={styles.chartContainer}>
                    <h3>Average Execution Time (Seconds)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aggregatedData.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="provider" />
                            <YAxis />
                            <Tooltip cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="avgTime" name="Avg Time (s)" radius={[4, 4, 0, 0]}>
                                {aggregatedData.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PROVIDER_COLORS[entry.provider] || '#94a3b8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* CHART B: Cyclomatic Complexity Reduction */}
                <div className={styles.chartContainer}>
                    <h3>Avg Cyclomatic Complexity Reduction</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aggregatedData.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="provider" />
                            <YAxis />
                            <Tooltip cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="avgReduction" name="Avg Complexity Drop" radius={[4, 4, 0, 0]}>
                                {aggregatedData.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PROVIDER_COLORS[entry.provider] || '#94a3b8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* CHART C: Success Rate (Robustness) */}
                <div className={styles.chartContainer}>
                    <h3>API Success Rate (%)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aggregatedData.chartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="provider" type="category" />
                            <Tooltip cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="successRate" name="Success Rate %" radius={[0, 4, 4, 0]}>
                                {aggregatedData.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.successRate > 80 ? '#10b981' : (entry.successRate > 50 ? '#f59e0b' : '#ef4444')} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
};