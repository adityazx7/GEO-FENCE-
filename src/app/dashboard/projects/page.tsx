'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Box, Plus, Search, Filter, Edit2, 
    Trash2, Eye, X, MapPin, Calendar, 
    IndianRupee, Activity, CheckCircle2, Clock
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '../../../../convex/_generated/api';

export default function ProjectsPage() {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);

    const { user } = useUser();
    const isAdmin = useQuery(api.users.isAdmin, user?.id ? { clerkId: user.id } : "skip");

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'hospital' as any,
        status: 'planned' as any,
        budget: 0,
        impact: '',
        areaImpact: '',
        lat: 19.0760,
        lng: 72.8777,
        address: '',
    });

    // Mutations/Queries
    const projects = useQuery(api.projects.list) || [];
    const createProject = useMutation(api.projects.createWork);
    const updateProject = useMutation(api.projects.updateWork);
    const deleteProject = useMutation(api.projects.deleteWork);

    const filtered = projects.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: 'hospital',
            status: 'planned',
            budget: 0,
            impact: '',
            areaImpact: '',
            lat: 19.0760,
            lng: 72.8777,
            address: '',
        });
        setEditingProject(null);
    };

    const handleEdit = (project: any) => {
        setEditingProject(project);
        setFormData({
            name: project.name,
            description: project.description,
            type: project.type,
            status: project.status,
            budget: project.budget,
            impact: project.impact,
            areaImpact: project.areaImpact || '',
            lat: project.location?.lat || 19.0760,
            lng: project.location?.lng || 72.8777,
            address: project.location?.address || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const projectData = {
                name: formData.name,
                description: formData.description,
                type: formData.type,
                status: formData.status,
                budget: Number(formData.budget),
                impact: formData.impact,
                areaImpact: formData.areaImpact,
                location: {
                    lat: Number(formData.lat),
                    lng: Number(formData.lng),
                    address: formData.address,
                },
            };

            if (editingProject) {
                await updateProject({
                    id: editingProject._id,
                    ...projectData
                });
            } else {
                await createProject(projectData as any);
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
            alert("Failed to save project");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this project? This will also remove related notifications and analytics.")) {
            const result = await deleteProject({ id });
            if (!result.success) {
                alert(result.error);
            }
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={14} className="text-green-500" />;
            case 'in_progress': return <Activity size={14} className="text-blue-500" />;
            case 'planned': return <Clock size={14} className="text-amber-500" />;
            case 'delayed': return <Activity size={14} className="text-red-500" />;
            default: return <Clock size={14} />;
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
            }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="glass-input-wrapper" style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', borderRadius: 'var(--radius-md)',
                        background: 'var(--surface)', border: '1px solid var(--glass-border)',
                    }}>
                        <Search size={16} style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search projects..."
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
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="delayed">Delayed</option>
                        </select>
                    </div>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="btn-primary"
                        style={{ fontSize: '0.85rem', padding: '10px 20px' }}
                    >
                        <Plus size={16} /> Add New Project
                    </button>
                )}
            </div>

            {/* Modal */}
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
                                width: '100%', maxWidth: '600px', zIndex: 101,
                                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--glass-border)', padding: '32px',
                                boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
                                    {editingProject ? 'Edit Project' : 'Add Infrastructure Project'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Project Name</label>
                                    <input
                                        required
                                        className="glass-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Navghar Skywalk Extension"
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
                                            <option value="hospital">Hospital/Clinic</option>
                                            <option value="bridge">Bridge/Skywalk</option>
                                            <option value="road">Road/Expressway</option>
                                            <option value="school">School/Education</option>
                                            <option value="metro">Metro/Rail</option>
                                            <option value="college">College/University</option>
                                            <option value="government_office">Govt Office</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Status</label>
                                        <select
                                            className="glass-input"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                        >
                                            <option value="planned">Planned</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="delayed">Delayed</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Budget (INR)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                                        <input
                                            type="number"
                                            required
                                            className="glass-input"
                                            value={formData.budget}
                                            onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '12px 12px 12px 30px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Impact (Short Summary)</label>
                                    <textarea
                                        required
                                        className="glass-input"
                                        value={formData.impact}
                                        onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                                        placeholder="e.g. Reduces travel time by 20 mins for 50k daily commuters"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white', minHeight: '80px' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Latitude</label>
                                        <input
                                            type="number" step="any" required className="glass-input"
                                            value={formData.lat}
                                            onChange={(e) => setFormData({ ...formData, lat: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Longitude</label>
                                        <input
                                            type="number" step="any" required className="glass-input"
                                            value={formData.lng}
                                            onChange={(e) => setFormData({ ...formData, lng: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Address</label>
                                    <input
                                        required className="glass-input"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Full site address"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'white' }}
                                    />
                                </div>

                                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                                    {editingProject ? 'Update Project' : 'Create Project'}
                                </button>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* List Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card"
                style={{ overflow: 'hidden' }}
            >
                <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Projects Registry</h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Project Details</th>
                            <th>Status</th>
                            <th>Budget</th>
                            <th>Location</th>
                            <th>Engagement</th>
                            {isAdmin && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    <Box size={32} style={{ marginBottom: '12px', opacity: 0.2 }} />
                                    <p>No projects matched your criteria.</p>
                                </td>
                            </tr>
                        )}
                        {filtered.map((p) => (
                            <tr key={p._id}>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>{p.type}</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className={`badge ${p.status === 'completed' ? 'badge-active' : p.status === 'in_progress' ? 'badge-pending' : 'badge-inactive'}`}>
                                            {getStatusIcon(p.status)}
                                            <span style={{ marginLeft: '4px' }}>{p.status.replace('_', ' ')}</span>
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                        <IndianRupee size={12} style={{ color: 'var(--accent-cyan)' }} />
                                        {p.budget >= 10000000 ? `${(p.budget / 10000000).toFixed(1)} Cr` : `${(p.budget / 100000).toFixed(1)} L`}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        <MapPin size={12} />
                                        <span>{p.location?.address.split(',')[0] || 'Mumbai'}</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Activity size={12} style={{ color: 'var(--accent-cyan)' }} />
                                            {p.likes || 0}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} style={{ color: 'var(--accent-blue)' }} />
                                            {new Date(p.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </td>
                                {isAdmin && (
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                onClick={() => handleEdit(p)}
                                                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', transition: 'transform 0.2s' }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(p._id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', transition: 'transform 0.2s' }}
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
