import React, { useState, useEffect, useMemo } from 'react';
import styles from './StatisticsPage.module.css';
import { getBenchmarkHistory } from '../../services/refactorService';
import type { StatisticsPageProps } from './StatisticsPage.props';
import type { BenchmarkRunDb } from '../../types/api.types';
import { CoreMetricsTab } from './components/CoreMetricsTab/CoreMetricsTab';
import { QualitativeTab } from './components/QualitativeTab/QualitativeTab';
import { EnterpriseTab } from './components/EnterpriseTab/EnterpriseTab';

export const StatisticsPage: React.FC<StatisticsPageProps> = ({ title = "Dissertation Analytics" }) => {
    const [history, setHistory] = useState<BenchmarkRunDb[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'core' | 'qualitative' | 'enterprise'>('core');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getBenchmarkHistory();
                setHistory(data);
            } catch (error) {
                console.error("Failed to load statistics", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- NEW: CSV Data Exporter ---
    const handleDownloadCsv = () => {
        if (!history || history.length === 0) return;

        // 1. Define the CSV Column Headers
        const headers = [
            "Run ID", "Date", "Provider", "Success", "Duration (s)",
            "Original LOC", "New LOC", "Original Complexity", "New Complexity",
            "Original MI", "New MI", "Complexity Drop", "MI Increase",
            "Error Message", "Applied Techniques", "Identified Smells"
        ];

        const rows: string[] = [];
        rows.push(headers.join(","));

        // 2. Flatten the data into rows
        history.forEach(run => {
            run.results.forEach(res => {
                // Ensure dates and arrays don't contain commas that break the CSV formatting
                const cleanDate = new Date(run.createdAt).toLocaleString().replace(/,/g, '');
                const errorMsg = `"${(res.errorMessage || "").replace(/"/g, '""')}"`;
                const techniques = `"${(res.appliedTechniques || []).join(' | ')}"`;
                const smells = `"${(res.identifiedCodeSmells || []).join(' | ')}"`;

                const row = [
                    run.id,
                    cleanDate,
                    res.providerName,
                    res.isSuccess,
                    res.durationSeconds.toFixed(2),
                    run.originalLinesOfCode,
                    res.newLinesOfCode,
                    run.originalComplexity,
                    res.newComplexity,
                    run.originalMaintainabilityIndex.toFixed(2),
                    res.newMaintainabilityIndex.toFixed(2),
                    run.originalComplexity - res.newComplexity,
                    (res.newMaintainabilityIndex - run.originalMaintainabilityIndex).toFixed(2),
                    errorMsg,
                    techniques,
                    smells
                ];
                rows.push(row.join(","));
            });
        });

        // 3. Create a Blob and trigger the browser download
        const csvContent = rows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "RefactorAI_Benchmark_Data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const summary = useMemo(() => {
        if (!history || history.length === 0) return null;

        let totalRuns = 0;
        let successfulRuns = 0;
        let bestProviderCount: Record<string, number> = {};

        history.forEach(run => {
            // Find who won this specific run (biggest complexity drop)
            let maxDrop = -1;
            let winner = "None";

            run.results.forEach(res => {
                totalRuns++;
                if (res.isSuccess) successfulRuns++;

                const drop = run.originalComplexity - res.newComplexity;
                if (res.isSuccess && drop > maxDrop) {
                    maxDrop = drop;
                    winner = res.providerName;
                }
            });

            if (winner !== "None") {
                bestProviderCount[winner] = (bestProviderCount[winner] || 0) + 1;
            }
        });

        // Determine Overall Champion based on who won the most races
        const champion = Object.keys(bestProviderCount).reduce((a, b) => bestProviderCount[a] > bestProviderCount[b] ? a : b, "N/A");

        return { totalExperiments: history.length, totalRuns, successfulRuns, champion };
    }, [history]);

    if (isLoading) {
        return <div className={styles.loadingState}><h2>Loading thesis data... 🧪</h2></div>;
    }

    if (!summary || history.length === 0) {
        return (
            <div className={styles.emptyState}>
                <span>📊</span>
                <h2>No Data Available</h2>
                <p>Run some benchmarks on the Snippet or Repository page to generate data!</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <div className={styles.headerText}>
                    <h1>{title}</h1>
                    <p>Aggregated results from {summary.totalExperiments} code benchmarks.</p>
                </div>
                
                {/* --- NEW EXPORT BUTTON --- */}
                <button className={styles.exportBtn} onClick={handleDownloadCsv}>
                    📥 Download CSV Data
                </button>
            </div>

            {/* HIGH-LEVEL SUMMARY CARDS */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <span className={styles.cardTitle}>Total AI Executions</span>
                    <span className={styles.cardValue}>{summary.totalRuns}</span>
                </div>
                <div className={styles.summaryCard}>
                    <span className={styles.cardTitle}>Overall Success Rate</span>
                    <span className={styles.cardValue}>
                        {Math.round((summary.successfulRuns / summary.totalRuns) * 100)}%
                    </span>
                </div>
                <div className={styles.summaryCard}>
                    <span className={styles.cardTitle}>Champion (Most Wins)</span>
                    <span className={styles.cardValue} style={{ color: '#8b5cf6' }}>
                        🏆 {summary.champion}
                    </span>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className={styles.tabContainer}>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'core' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('core')}
                >
                    📈 Core Metrics
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'qualitative' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('qualitative')}
                >
                    🧠 Qualitative (Smells & Tech)
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'enterprise' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('enterprise')}
                >
                    🏢 Enterprise Scalability
                </button>
            </div>

            {/* TAB CONTENT AREA */}
            <div className={styles.tabContent}>
                {activeTab === 'core' && (
                    <CoreMetricsTab history={history} />
                )}
                
                {activeTab === 'qualitative' && (
                    <QualitativeTab history={history} />
                )}
                
                {activeTab === 'enterprise' && (
                    <EnterpriseTab history={history} />
                )}
            </div>
        </div>
    );
};