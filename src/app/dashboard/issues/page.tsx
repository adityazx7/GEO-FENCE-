'use client';

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { MapPin, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

export default function IssuesPage() {
    const issues = useQuery(api.issues.getIssues) || [];
    const updateStatus = useMutation(api.issues.updateIssueStatus);
    const [selectedIssue, setSelectedIssue] = useState<any>(null);

    const handleStatusChange = async (id: Id<"issues">, status: "open" | "in-progress" | "resolved" | "rejected") => {
        await updateStatus({ issueId: id, status });
    };

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'open': return <AlertCircle size={16} color="#ef4444" />;
            case 'in-progress': return <Clock size={16} color="#eab308" />;
            case 'resolved': return <CheckCircle size={16} color="#22c55e" />;
            case 'rejected': return <XCircle size={16} color="#a8a29e" />;
            default: return null;
        }
    };

    return (
        <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
            {/* List View */}
            <div style={{ flex: 1, background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '20px', overflowY: 'auto' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-primary)' }}>Reported Issues ({issues.length})</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {issues.map(issue => (
                        <div 
                            key={issue._id}
                            onClick={() => setSelectedIssue(issue)}
                            style={{
                                padding: '16px',
                                background: selectedIssue?._id === issue._id ? 'var(--accent-cyan-glow)' : 'rgba(255, 255, 255, 0.02)',
                                border: `1px solid ${selectedIssue?._id === issue._id ? 'var(--accent-cyan)' : 'var(--glass-border)'}`,
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {getStatusIcon(issue.status)}
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                        {issue.category.replace('_', ' ')}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {new Date(issue.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {issue.description}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <MapPin size={12} />
                                <span>{issue.location?.address || (issue.location ? `${issue.location.lat.toFixed(4)}, ${issue.location.lng.toFixed(4)}` : 'No location')}</span>
                            </div>
                        </div>
                    ))}
                    {issues.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No issues reported yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Details & Map View */}
            <div style={{ flex: 1, background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedIssue ? (
                    <>
                        {/* Map Placeholder */}
                        <div style={{ height: '250px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <MapPin size={32} color="#ef4444" fill="rgba(239, 68, 68, 0.2)" />
                                {selectedIssue.location && (
                                    <div style={{ background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', color: 'white', fontSize: '0.75rem', marginTop: '4px' }}>
                                        {selectedIssue.location.lat.toFixed(4)}, {selectedIssue.location.lng.toFixed(4)}
                                    </div>
                                )}
                            </div>
                            {/* You can drop Google Maps or Leaflet here later */}
                        </div>

                        {/* Details */}
                        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                    {selectedIssue.category.replace('_', ' ')}
                                </h3>
                                
                                <select 
                                    value={selectedIssue.status}
                                    onChange={(e) => handleStatusChange(selectedIssue._id, e.target.value as any)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="open">Open</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
                                {selectedIssue.description}
                            </p>

                            {selectedIssue.images && selectedIssue.images.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attached Images</h4>
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                        {selectedIssue.images.map((img: string, i: number) => (
                                            <img key={i} src={img} alt="Issue evidence" style={{ height: '120px', width: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</h4>
                                <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{selectedIssue.location.address || 'Address not provided'}</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Coordinates: {selectedIssue.location.lat}, {selectedIssue.location.lng}</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '12px' }}>
                        <AlertCircle size={48} opacity={0.5} />
                        <p>Select an issue from the list to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
}
