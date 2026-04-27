import React, { useMemo } from 'react';
import { 
    ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import styles from './EnterpriseTab.module.css';
import type { EnterpriseTabProps } from './EnterpriseTab.props';

const PROVIDER_COLORS: Record<string, string> = {
    Gemini: '#10b981',      
    Groq: '#f59e0b',        
    HuggingFace: '#8b5cf6', 
    OpenAi: '#3b82f6'       
};

export const EnterpriseTab: React.FC<EnterpriseTabProps> = ({ history }) => {
    
    const { scatterData, failureData, activeProviders } = useMemo(() => {
        const scatterPoints: Record<string, { loc: number, time: number }[]> = {};
        const failureCounts: Record<string, { provider: string, Success: number, ParseError: number, ApiError: number }> = {};
        const providers = new Set<string>();

        history.forEach(run => {
            run.results.forEach(res => {
                providers.add(res.providerName);

                // --- 1. Aggregation for Scatter Plot (Scalability) ---
                if (res.isSuccess) {
                    if (!scatterPoints[res.providerName]) scatterPoints[res.providerName] = [];
                    scatterPoints[res.providerName].push({
                        loc: run.originalLinesOfCode,
                        time: Number(res.durationSeconds.toFixed(2))
                    });
                }

                // --- 2. Aggregation for Stacked Bar (Reliability) ---
                if (!failureCounts[res.providerName]) {
                    failureCounts[res.providerName] = { provider: res.providerName, Success: 0, ParseError: 0, ApiError: 0 };
                }

                if (res.isSuccess) {
                    failureCounts[res.providerName].Success += 1;
                } else {
                    // Check if it's a JSON formatting error vs a total crash/timeout
                    const msg = (res.errorMessage || "").toLowerCase();
                    if (msg.includes('json') || msg.includes('regex') || msg.includes('parse')) {
                        failureCounts[res.providerName].ParseError += 1;
                    } else {
                        failureCounts[res.providerName].ApiError += 1;
                    }
                }
            });
        });

        return { 
            scatterData: scatterPoints, 
            failureData: Object.values(failureCounts),
            activeProviders: Array.from(providers)
        };
    }, [history]);

    return (
        <div className={styles.tabContainer}>
            <div className={styles.chartsGrid}>
                
                {/* CHART 5: Scalability Scatter Plot */}
                <div className={styles.chartCard}>
                    <h3>Enterprise Scalability</h3>
                    <div className={styles.chartSubtitle}>Execution Time vs. Original Lines of Code</div>
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" dataKey="loc" name="Lines of Code" unit=" lines" tick={{fill: '#64748b'}} />
                            <YAxis type="number" dataKey="time" name="Execution Time" unit="s" tick={{fill: '#64748b'}} />
                            <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            
                            {activeProviders.map(provider => (
                                scatterData[provider] && (
                                    <Scatter 
                                        key={provider} 
                                        name={provider} 
                                        data={scatterData[provider]} 
                                        fill={PROVIDER_COLORS[provider] || '#94a3b8'} 
                                        opacity={0.8}
                                    />
                                )
                            ))}
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* CHART 6: Failure Breakdown (Stacked Bar) */}
                <div className={styles.chartCard}>
                    <h3>Reliability & Failure Analysis</h3>
                    <div className={styles.chartSubtitle}>Breakdown of successful runs vs. error types</div>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={failureData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" tick={{fill: '#64748b'}} />
                            <YAxis dataKey="provider" type="category" tick={{fill: '#475569', fontSize: 12}} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            
                            {/* Stack ID 'a' forces them into a single bar per provider */}
                            <Bar dataKey="Success" name="Success" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="ParseError" name="JSON/Formatting Error" stackId="a" fill="#f59e0b" />
                            <Bar dataKey="ApiError" name="API/System Error" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
};