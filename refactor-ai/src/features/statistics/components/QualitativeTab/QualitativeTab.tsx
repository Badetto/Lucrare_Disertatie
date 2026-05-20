import React, { useMemo } from 'react';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import styles from './QualitativeTab.module.css';
import type { QualitativeTabProps } from './QualitativeTab.props';

const PROVIDER_COLORS: Record<string, string> = {
    Gemini: '#10b981',      
    Groq: '#f59e0b',        
    HuggingFace: '#8b5cf6', 
    OpenAi: '#3b82f6'       
};

export const QualitativeTab: React.FC<QualitativeTabProps> = ({ history }) => {
    
    const { techniquesData, smellsData, activeProviders } = useMemo(() => {
        const techCounts: Record<string, Record<string, number>> = {};
        const smellCounts: Record<string, Record<string, number>> = {};
        const providers = new Set<string>();

        history.forEach(run => {
            run.results.forEach(res => {
                if (!res.isSuccess) return;
                
                providers.add(res.providerName);

                const techniques = res.appliedTechniques || [];
                techniques.forEach(tech => {
                    const cleanTech = tech.trim();
                    if (!techCounts[cleanTech]) techCounts[cleanTech] = {};
                    techCounts[cleanTech][res.providerName] = (techCounts[cleanTech][res.providerName] || 0) + 1;
                });

                const smells = res.identifiedCodeSmells || [];
                smells.forEach(smell => {
                    const cleanSmell = smell.trim();
                    if (!smellCounts[cleanSmell]) smellCounts[cleanSmell] = {};
                    smellCounts[cleanSmell][res.providerName] = (smellCounts[cleanSmell][res.providerName] || 0) + 1;
                });
            });
        });

        const formattedTechniques = Object.keys(techCounts).map(tech => {
            const totalUses = Array.from(providers).reduce((sum, p) => sum + (techCounts[tech][p] || 0), 0);
            return { subject: tech, totalUses, ...techCounts[tech] };
        })
        .sort((a, b) => b.totalUses - a.totalUses)
        .slice(0, 15);

        const formattedSmells = Object.keys(smellCounts).map(smell => {
            const totalUses = Array.from(providers).reduce((sum, p) => sum + (smellCounts[smell][p] || 0), 0);
            return { smell: smell, totalUses, ...smellCounts[smell] };
        })
        .sort((a, b) => b.totalUses - a.totalUses);

        return { 
            techniquesData: formattedTechniques, 
            smellsData: formattedSmells,
            activeProviders: Array.from(providers)
        };
    }, [history]);

    if (techniquesData.length === 0 && smellsData.length === 0) {
        return <div>No qualitative data available. Ensure your AI models are returning the string arrays.</div>;
    }

    // Dynamic height based on data length (minimum 300px to fill space)
    const dynamicBarHeight = Math.max(300, smellsData.length * 40);

    // Reusable Custom Legend Component to keep code DRY
    const CustomLegend = () => (
        <div className={styles.customLegend}>
            {activeProviders.map(provider => (
                <div key={provider} className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ backgroundColor: PROVIDER_COLORS[provider] || '#94a3b8' }} />
                    {provider}
                </div>
            ))}
        </div>
    );

    return (
        <div className={styles.tabContainer}>
            <div className={styles.chartsGrid}>
                
                {/* CHART 3: Refactoring Fingerprint (Radar) */}
                <div className={styles.chartCard}>
                    <h3>The Refactoring Fingerprint</h3>
                    <div className={styles.chartSubtitle}>Top 15 most favored techniques</div>
                    <CustomLegend />
                    
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={techniquesData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                {/* Internal Legend Removed! */}
                                
                                {activeProviders.map((provider) => (
                                    <Radar 
                                        key={provider}
                                        name={provider} 
                                        dataKey={provider} 
                                        stroke={PROVIDER_COLORS[provider] || '#94a3b8'} 
                                        fill={PROVIDER_COLORS[provider] || '#94a3b8'} 
                                        fillOpacity={0.3} 
                                    />
                                ))}
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CHART 4: Code Smell Eradication (Bar) */}
                <div className={styles.chartCard}>
                    <h3>Code Smell Identification</h3>
                    <div className={styles.chartSubtitle}>Frequency of specific smells successfully targeted</div>
                    <CustomLegend />
                    
                    {/* The Scrollable Inner Container */}
                    <div className={styles.scrollArea}>
                        <div style={{ width: '100%', height: `${dynamicBarHeight}px` }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={smellsData} margin={{ top: 0, right: 30, left: 10, bottom: 5 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                    <XAxis type="number" tick={{fill: '#64748b'}} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="smell" type="category" width={180} tick={{fill: '#475569', fontSize: 11}} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                    {/* Internal Legend Removed! */}
                                    
                                    {activeProviders.map((provider) => (
                                        <Bar 
                                            key={provider}
                                            dataKey={provider} 
                                            name={provider} 
                                            fill={PROVIDER_COLORS[provider] || '#94a3b8'} 
                                            radius={[0, 4, 4, 0]}
                                            barSize={15}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};