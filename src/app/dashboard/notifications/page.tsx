'use client';

import { motion } from 'framer-motion';
import { Bell, CheckCircle, Clock, MapPin, AlertTriangle, Filter, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

const typeLabels: Record<string, string> = {
    governance_update: 'Governance',
    project_milestone: 'Milestone',
    proximity_alert: 'Proximity',
    system: 'System',
};

const aiColors = ['var(--accent-green)', 'var(--accent-blue)', 'var(--accent-purple)', 'var(--accent-orange)', 'var(--accent-cyan)'];

export default function NotificationsPage() {
    const [filter, setFilter] = useState('all');

    // Fetch live notifications and projects from Convex
    const liveNotifications = useQuery(api.notifications.listAll) || [];
    const stats = useQuery(api.notifications.getStats) || { total: 0, sent: 0, delivered: 0, read: 0 };
    const projects = useQuery(api.projects.list) || [];

    const filtered = filter === 'all' ? liveNotifications : liveNotifications.filter(n => n.type === filter);

    return (
        <div>
            {/* Stats */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px', marginBottom: '24px',
            }}>
                {[
                    { label: 'Total Sent', value: stats.total.toString(), icon: Bell, color: 'var(--accent-cyan)' },
                    { label: 'Delivered', value: stats.delivered.toString(), icon: CheckCircle, color: 'var(--accent-green)' },
                    { label: 'Read', value: stats.read.toString(), icon: Clock, color: 'var(--accent-orange)' },
                    { label: 'Geo-Triggers', value: '19.7K', icon: MapPin, color: 'var(--accent-purple)' }, // Mock stat for triggers
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
                    >
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: `${stat.color}15`, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: stat.color,
                        }}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.label}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {['all', 'governance_update', 'project_milestone', 'proximity_alert'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        style={{
                            padding: '6px 16px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600,
                            background: filter === type ? 'var(--accent-cyan-glow)' : 'var(--glass)',
                            color: filter === type ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                            border: `1px solid ${filter === type ? 'rgba(0,212,255,0.3)' : 'var(--glass-border)'}`,
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        {type === 'all' ? 'All' : typeLabels[type] || type}
                    </button>
                ))}
            </div>

            {/* Notification list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filtered.length === 0 ? (
                    <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No notifications found.
                    </div>
                ) : filtered.map((notif, i) => {
                    const color = aiColors[i % aiColors.length];
                    return (
                        <motion.div
                            key={notif._id}
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                            className="glass-card"
                            style={{ padding: '20px 24px', borderLeft: `3px solid ${color}`, cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{notif.title}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className={`badge ${notif.status === 'delivered' ? 'badge-active' : 'badge-pending'}`}>
                                        {notif.status}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(notif.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                {notif.content}
                            </p>
                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                <span style={{
                                    fontSize: '0.7rem', padding: '2px 10px', borderRadius: '100px',
                                    background: `${color}15`, color: color, fontWeight: 600,
                                }}>
                                    {typeLabels[notif.type] || notif.type}
                                </span>
                                {notif.language && (
                                    <span style={{
                                        fontSize: '0.7rem', padding: '2px 10px', borderRadius: '100px',
                                        background: 'var(--glass)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)'
                                    }}>
                                        {notif.language}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
