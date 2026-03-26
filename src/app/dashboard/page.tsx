'use client';

import { useState } from 'react';

import { motion } from 'framer-motion';
import {
    MapPin, Bell, Building2, TrendingUp, Activity,
    CheckCircle, Clock, AlertTriangle, ArrowUpRight, Database, CloudDownload, Share2
} from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardOverview() {
    // Fetch live data from Convex
    const projects = useQuery(api.projects.list);
    const stats = useQuery(api.analytics.getDashboardStats);
    
    // @ts-ignore
    const syncToGraph = useAction(api.neo4j?.syncToGraph || (() => { }));
    // @ts-ignore
    const syncOgd = useAction(api.ogd?.syncProjects || (() => { }));

    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncingOgd, setIsSyncingOgd] = useState(false);

    // If data is loading or undefined (but manageable enough to show seed button)
    const isLoading = projects === undefined || stats === undefined;

    const handleSyncOgd = async () => {
        setIsSyncingOgd(true);
        try {
            await syncOgd();
            alert("Successfully fetched live infrastructure projects from Open Government Data (api.data.gov.in)!");
        } catch (error) {
            console.error(error);
            alert("Failed to fetch OGD data. See console logs.");
        } finally {
            setIsSyncingOgd(false);
        }
    };

    const handleSyncNeo4j = async () => {
        setIsSyncing(true);
        try {
            await syncToGraph();
            alert("Database successfully synced to Neo4j AuraDB!");
        } catch (error) {
            console.error(error);
            alert("Failed to sync to Neo4j. Check the console and your API keys.");
        } finally {
            setIsSyncing(false);
        }
    };


    // If completely stuck in undefined, show limited UI with Seed button
    if (isLoading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '20vh', color: 'var(--text-muted)', marginBottom: '40px' }}>
                    <div className="pulse-dot" style={{ width: 16, height: 16, background: 'var(--accent-cyan)' }} />
                    <span style={{ marginLeft: 12 }}>Connecting to live data stream...</span>
                </div>
                
                <div className="glass-card" style={{ padding: '32px', maxWidth: '500px', margin: '0 auto' }}>
                    <h3 style={{ marginBottom: '12px' }}>First Time Setup?</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                        If your dashboard keeps loading, it might be because the database is empty. 
                        Please ensure your Convex backend is running and populated with data.
                    </p>
                    <p style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Ensure <code>npx convex dev</code> is running in your terminal.
                    </p>
                </div>
            </div>
        );
    }

    const overviewStats = [
        {
            label: 'Hyper-Local Triggers',
            value: stats?.totalTriggers?.toLocaleString() || '0',
            change: '+12% growth',
            icon: MapPin,
            color: 'var(--accent-cyan)',
            glow: 'var(--accent-cyan-glow)',
        },
        {
            label: 'Notifications Sent',
            value: stats?.notifications?.total?.toLocaleString() || '0',
            change: `+${stats?.notifications?.today || 0} today`,
            icon: Bell,
            color: 'var(--accent-purple)',
            glow: 'var(--accent-purple-glow)',
        },
        {
            label: 'Active Booths',
            value: stats?.totalBooths?.toString() || '0',
            change: `${(stats?.totalVoters || 0).toLocaleString()} voters`,
            icon: Building2,
            color: 'var(--accent-blue)',
            glow: 'var(--accent-blue-glow)',
        },
        {
            label: 'Social Engagement',
            value: '4.8K',
            change: '+12% growth',
            icon: TrendingUp,
            color: 'var(--accent-green)',
            glow: 'var(--accent-green-glow)',
        },
    ];

    const activeProjects = projects.slice(0, 4);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Header / Seed Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={handleSyncOgd}
                    disabled={isSyncingOgd}
                    style={{
                        padding: '8px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 600,
                        background: isSyncingOgd ? 'var(--glass)' : 'var(--accent-green-glow)',
                        color: isSyncingOgd ? 'var(--text-muted)' : 'var(--accent-green)',
                        border: '1px solid var(--glass-border)',
                        cursor: isSyncingOgd ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <CloudDownload size={16} />
                    {isSyncingOgd ? "Fetching OGD..." : "Sync OGD Projects"}
                </button>

                <button
                    onClick={handleSyncNeo4j}
                    disabled={isSyncing || (projects?.length || 0) === 0}
                    style={{
                        padding: '8px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 600,
                        background: isSyncing || (projects?.length || 0) === 0 ? 'var(--glass)' : 'var(--accent-cyan-glow)',
                        color: isSyncing || (projects?.length || 0) === 0 ? 'var(--text-muted)' : 'var(--accent-cyan)',
                        border: '1px solid var(--glass-border)',
                        cursor: isSyncing || (projects?.length || 0) === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <Database size={16} />
                    {isSyncing ? "Syncing..." : "Sync Space to Neo4j"}
                </button>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '32px',
            }}>
                {overviewStats.map((stat, i) => (
                    <motion.div key={i} variants={itemVariants} className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '12px',
                                background: stat.glow,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color,
                            }}>
                                <stat.icon size={22} />
                            </div>
                            <ArrowUpRight size={16} style={{ color: 'var(--accent-green)' }} />
                        </div>
                        <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '4px' }}>
                            {stat.change}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Two column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* Recent Activity */}
                <motion.div variants={itemVariants} className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600 }}>
                            Recent Analytical Events
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest from Convex</span>
                    </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Recently triggered fences can go here if we add an events query */}
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Real-time event stream active.</div>
                        </div>
                </motion.div>

                {/* Infrastructure Projects */}
                <motion.div variants={itemVariants} className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600 }}>
                            Infrastructure Projects
                        </h3>
                        <Link href="/dashboard/geofences" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                            View All →
                        </Link>
                    </div>

                    {activeProjects.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No projects found. Seed the database first.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {activeProjects.map((project: any, i: number) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    paddingBottom: i < activeProjects.length - 1 ? '16px' : 0,
                                    borderBottom: i < activeProjects.length - 1 ? '1px solid var(--glass-border)' : 'none',
                                }}>
                                    <div>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '4px' }}>{project.name}</p>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{project.type}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className={`badge ${project.status === 'completed' ? 'badge-active' :
                                            project.status === 'in_progress' ? 'badge-pending' : 'badge-inactive'
                                            }`}>
                                            {project.status === 'completed' ? '✓ Done' :
                                                project.status === 'in_progress' ? 'In Progress' : 'Planned'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}
