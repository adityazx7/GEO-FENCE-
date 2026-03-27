'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Search, Filter, Edit2, Trash2, Eye, Activity, Zap, X } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '../../../../convex/_generated/api';

// Dynamically import InteractiveMap to avoid SSR issues with window/leaflet
const InteractiveMap = dynamic(() => import('@/components/dashboard/InteractiveMap'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="pulse-dot" style={{ width: 24, height: 24, background: 'var(--accent-cyan)' }} />
        </div>
    )
});

export default function GeoFencesPage() {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGeoFence, setEditingGeoFence] = useState<any>(null);
    const [visualMode, setVisualMode] = useState<'circle' | 'dots'>('circle');

    const { user } = useUser();
    const isAdmin = useQuery(api.users.isAdmin, user?.id ? { clerkId: user.id } : "skip");

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'hospital' as any,
        lat: 19.0760,
        lng: 72.8777,
        radius: 500,
    });

    // Mutations/Queries
    const liveGeoFences = useQuery(api.geoFences.list) || [];
    const createGeoFence = useMutation(api.geoFences.create);
    const updateGeoFence = useMutation(api.geoFences.update);
    const removeGeoFence = useMutation(api.geoFences.remove);
    const recentActivity = useQuery(api.geoFences.getRecentEntries, { limit: 10 }) || [];

    const filtered = liveGeoFences.filter((gf) => {
        const matchesSearch = gf.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filterStatus === 'all' || gf.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const handleEdit = (gf: any) => {
        setEditingGeoFence(gf);
        setFormData({
            name: gf.name,
            description: gf.description || '',
            type: gf.type,
            lat: gf.center.lat,
            lng: gf.center.lng,
            radius: gf.radius,
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', type: 'hospital', lat: 19.0760, lng: 72.8777, radius: 500 });
        setEditingGeoFence(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingGeoFence) {
                await updateGeoFence({
                    id: editingGeoFence._id,
                    name: formData.name,
                    description: formData.description,
                    radius: Number(formData.radius),
                    // Note: Update mutation in convex/geoFences.ts currently only handles name, description, status, radius
                });
            } else {
                await createGeoFence({
                    name: formData.name,
                    description: formData.description,
                    type: formData.type,
                    center: { lat: Number(formData.lat), lng: Number(formData.lng) },
                    radius: Number(formData.radius),
                });
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
            alert("Failed to save geo-fence");
        }
    };

    const handleDelete = async (id: any) => {
        if (confirm("Are you sure you want to delete this geo-fence?")) {
            await removeGeoFence({ id });
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Geo-Fence Management
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="pulse-dot" style={{ width: 8, height: 8 }} />
                    Monitoring {liveGeoFences.filter(f => f.status === 'active').length} active hyper-local zones in real-time
                </p>
            </div>

            {/* Toolbar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
            }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', borderRadius: 'var(--radius-md)',
                        background: 'var(--surface)', border: '1px solid var(--glass-border)',
                    }}>
                        <Search size={16} style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search geo-fences..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                background: 'none', border: 'none', outline: 'none',
                                color: 'var(--text-primary)', fontSize: '0.85rem', width: '200px',
                            }}
                        />
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', borderRadius: 'var(--radius-md)',
                        background: 'var(--surface)', border: '1px solid var(--glass-border)',
                    }}>
                        <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{
                                background: 'none', border: 'none', outline: 'none',
                                color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer',
                            }}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px', borderRadius: 'var(--radius-md)',
                        background: 'var(--surface)', border: '1px solid var(--glass-border)',
                    }}>
                        {(['circle', 'dots'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setVisualMode(mode)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    background: visualMode === mode ? 'var(--accent-cyan-glow)' : 'transparent',
                                    color: visualMode === mode ? 'var(--accent-cyan)' : 'var(--text-muted)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="btn-primary"
                        style={{ fontSize: '0.85rem', padding: '10px 20px' }}
                    >
                        <Plus size={16} /> Create Geo-Fence
                    </button>
                )}
            </div>

            {/* Modal Overlay */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                                zIndex: 100, backdropFilter: 'blur(4px)'
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                width: '100%', maxWidth: '500px', zIndex: 101,
                                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--glass-border)', padding: '32px',
                                boxShadow: 'var(--shadow-lg)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
                                    {editingGeoFence ? 'Edit Geo-Fence' : 'New Hyper-Local Geo-Fence'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Fence Name</label>
                                    <input
                                        required
                                        className="glass-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Tembhipada Hospital Wing A"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Category</label>
                                        <select
                                            className="glass-input"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                        >
                                            <option value="hospital">Hospital</option>
                                            <option value="bridge">Bridge</option>
                                            <option value="road">Road</option>
                                            <option value="school">School</option>
                                            <option value="metro">Metro</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Radius (meters)</label>
                                        <input
                                            type="number"
                                            required
                                            className="glass-input"
                                            value={formData.radius}
                                            onChange={(e) => setFormData({ ...formData, radius: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Latitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            required
                                            className="glass-input"
                                            value={formData.lat}
                                            onChange={(e) => setFormData({ ...formData, lat: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Longitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            required
                                            className="glass-input"
                                            value={formData.lng}
                                            onChange={(e) => setFormData({ ...formData, lng: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                                    {editingGeoFence ? 'Update Geo-Fence' : 'Deploy Geo-Fence'}
                                </button>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Map & Activity Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 3fr)', gap: '24px', marginBottom: '24px' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card"
                    style={{
                        height: '450px',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, display: 'flex', gap: '8px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '4px 12px', borderRadius: '100px', border: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="pulse-dot" style={{ width: 6, height: 6 }} />
                            Live Sync Active
                        </div>
                    </div>
                    <InteractiveMap geoFences={filtered} visualMode={visualMode} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card"
                    style={{ height: '450px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={18} color="var(--accent-orange)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Live Activity</h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {recentActivity.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <Activity size={32} opacity={0.2} style={{ marginBottom: '12px' }} />
                                <p style={{ fontSize: '0.8rem' }}>Waiting for triggers...</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {recentActivity.map((entry: any) => (
                                    <div 
                                        key={entry._id} 
                                        style={{ 
                                            padding: '12px', background: 'rgba(255,255,255,0.02)', 
                                            borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
                                            position: 'relative', overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{entry.geoFenceName}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(entry.enteredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            <Activity size={10} />
                                            <span>User {entry.userId.slice(-4)} triggered zone</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card"
                style={{ overflow: 'hidden' }}
            >
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Radius</th>
                            <th>Triggers</th>
                            <th>Linked Project ID</th>
                            {isAdmin && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                    No live geo-fences found. Please seed the mock data on the Overview page.
                                </td>
                            </tr>
                        )}
                        {filtered.map((gf) => (
                            <tr key={gf._id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin size={14} style={{ color: gf.status === 'active' ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{gf.name}</span>
                                    </div>
                                </td>
                                <td style={{ textTransform: 'capitalize' }}>{gf.type}</td>
                                <td>
                                    <span className={`badge ${gf.status === 'active' ? 'badge-active' : gf.status === 'pending' ? 'badge-pending' : 'badge-inactive'}`}>
                                        {gf.status}
                                    </span>
                                </td>
                                <td>{gf.radius >= 1000 ? `${gf.radius / 1000}km` : `${gf.radius}m`}</td>
                                <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{(gf.triggerCount || 0).toLocaleString()}</td>
                                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{gf.linkedProjectId?.slice(-6) || 'N/A'}</td>
                                {isAdmin && (
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}>
                                                <Eye size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleEdit(gf)}
                                                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(gf._id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </motion.div>
        </div>
    );
}
