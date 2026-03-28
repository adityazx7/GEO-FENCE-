'use client';

import { motion } from 'framer-motion';
import { Shield, CheckCircle, Clock, ExternalLink, Hash, FileText } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

export default function TransparencyPage() {
    const accountabilityRecords = useQuery(api.accountability.listAll) || [];
    const verified = accountabilityRecords.filter((e: any) => e.txHash).length;

    return (
        <div>
            {/* Header stats */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px', marginBottom: '28px',
            }}>
                {[
                    { label: 'Total Claims', value: accountabilityRecords.length, icon: FileText, color: 'var(--accent-cyan)' },
                    { label: 'Blockchain Verified', value: verified, icon: CheckCircle, color: 'var(--accent-green)' },
                    { label: 'Pending Block', value: accountabilityRecords.length - verified, icon: Clock, color: 'var(--accent-orange)' },
                    { label: 'Network', value: 'Polygon Amoy', icon: Shield, color: 'var(--accent-purple)' },
                ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }} className="stat-card"
                        style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: `${stat.color}15`, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: stat.color,
                        }}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: stat.color }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.label}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Blockchain info banner */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }} className="glass-card"
                style={{
                    padding: '20px 24px', marginBottom: '24px',
                    borderLeft: '3px solid var(--accent-green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '12px',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Shield size={20} style={{ color: 'var(--accent-green)' }} />
                    <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Polygon Blockchain Integration</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            All verified entries are immutably recorded on Polygon PoS for complete transparency
                        </p>
                    </div>
                </div>
                <span className="badge badge-active">
                    <Hash size={12} /> Polygon Mainnet
                </span>
            </motion.div>

            {/* Audit log */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }} className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600 }}>
                        Immutable Audit Trail
                    </h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Zone / Project</th>
                            <th>Official</th>
                            <th>Claimed Promise</th>
                            <th>Tx Hash</th>
                            <th>Status</th>
                            <th>Sync Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accountabilityRecords.map((entry: any) => (
                            <tr key={entry._id}>
                                <td>
                                    <span style={{
                                        fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px',
                                        borderRadius: '100px', background: 'var(--accent-cyan-glow)',
                                        color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.2)',
                                    }}>
                                        {entry.zoneName}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{entry.officialName}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{entry.officialPost}</div>
                                </td>
                                <td style={{ maxWidth: '300px', fontSize: '0.8rem' }}>{entry.projectClaim}</td>
                                <td>
                                    {entry.txHash ? (
                                        <a href={entry.explorerUrl || '#'} target="_blank" rel="noopener noreferrer" style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            fontSize: '0.75rem', color: 'var(--accent-blue)', fontFamily: 'monospace',
                                            cursor: 'pointer', textDecoration: 'none'
                                        }}>
                                            {entry.txHash.slice(0, 12)}... <ExternalLink size={12} />
                                        </a>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                                    )}
                                </td>
                                <td>
                                    <span className={`badge ${entry.txHash ? 'badge-active' : 'badge-pending'}`}>
                                        {entry.txHash ? '✓ Anchored' : 'Syncing'}
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                    {new Date(entry.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </motion.div>
        </div>
    );
}
