'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { motion } from 'framer-motion';
import { Users, Mail, Shield, Calendar, MapPin } from 'lucide-react';

export default function UsersManagementPage() {
    const users = useQuery(api.users.listUsers);

    if (!users) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="pulse-dot" style={{ width: 20, height: 20 }} />
            <span style={{ marginLeft: 10, color: 'var(--text-muted)' }}>Loading users...</span>
        </div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
                    User Management
                </h2>
                <div className="glass-card" style={{ padding: '8px 16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Total Users: {users.length}
                </div>
            </div>

            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--glass-border)', textAlign: 'left' }}>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600 }}>User</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600 }}>Role</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600 }}>Location</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600 }}>Joined</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600 }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user: any, i: number) => (
                            <motion.tr 
                                key={user._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                style={{ borderBottom: '1px solid var(--glass-border)' }}
                            >
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                            width: 36, height: 36, borderRadius: '50%', 
                                            background: 'var(--gradient-primary)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.9rem', fontWeight: 700, color: 'white'
                                        }}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Mail size={12} /> {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ 
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '4px 10px', borderRadius: '100px',
                                        background: user.role === 'admin' ? 'var(--accent-purple-glow)' : 'var(--accent-blue-glow)',
                                        border: `1px solid ${user.role === 'admin' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                                        fontSize: '0.75rem', fontWeight: 600, color: user.role === 'admin' ? 'var(--accent-purple)' : 'var(--accent-blue)',
                                        textTransform: 'capitalize'
                                    }}>
                                        <Shield size={12} /> {user.role}
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={14} /> {user.city || 'Not set'}, {user.state || 'IN'}
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={14} /> {new Date(user.createdAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ 
                                            width: 8, height: 8, borderRadius: '50%', 
                                            background: user.isVerified ? 'var(--accent-green)' : 'var(--accent-orange)' 
                                        }} />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {user.isVerified ? 'Verified' : 'Pending'}
                                        </span>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
