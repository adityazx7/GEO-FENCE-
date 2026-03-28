import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, User as UserIcon, Building, Moon, Sun, Monitor, List, ThumbsUp, MessageSquare, ChevronRight, Package, Bell, FileText, Link as LinkIcon } from 'lucide-react-native';
import MyPostsScreen from './MyPostsScreen';
import GovernmentWorkScreen from './GovernmentWorkScreen';
import PreferencesScreen from './PreferencesScreen';

export default function ProfileScreen({ 
    onViewAccountability 
}: { 
    onViewAccountability?: () => void 
}) {
    const { user, logout } = useAuth();
    const { colors, mode, setMode, isDark } = useTheme();
    const [activeView, setActiveView] = useState<'profile' | 'myPosts' | 'projectDetails' | 'preferences'>('profile');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const styles = createStyles(colors, isDark);

    const projects = useQuery(api.projects.list) || [];
    const myProjects = projects.filter((p: any) => 
        (user?._id && p.authorId === user._id) || 
        (user?.email && p.submittedBy === user.email) ||
        (p.authorId?.toString && user?._id && p.authorId.toString() === user._id) ||
        (user?.orgName && p.authorName === user.orgName)
    );

    const accountabilityRecords = useQuery(api.accountability.listAll) || [];

    if (activeView === 'myPosts') {
        return <MyPostsScreen onBack={() => setActiveView('profile')} onOpenProject={(id) => {
            setSelectedProjectId(id);
            setActiveView('projectDetails');
        }} />;
    }

    if (activeView === 'projectDetails' && selectedProjectId) {
        return <GovernmentWorkScreen projectId={selectedProjectId} onBack={() => setActiveView('myPosts')} />;
    }

    if (activeView === 'preferences') {
        return <PreferencesScreen onBack={() => setActiveView('profile')} />;
    }

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout }
        ]);
    };

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => {
        if (!value) return null;
        return (
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {/* Avatar Card */}
                <View style={styles.avatarCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(user?.name || 'U')}</Text>
                    </View>
                    <Text style={styles.name}>{user?.name}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                    <View style={styles.typeBadge}>
                        {user?.userType === 'organization' ? <Building color={colors.primary} size={14} /> : <UserIcon color={colors.primary} size={14} />}
                        <Text style={styles.typeText}>{user?.userType === 'organization' ? 'Organization' : 'Citizen'}</Text>
                    </View>
                </View>

                {/* Personal Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Personal Information</Text>
                    <InfoRow label="Full Name" value={user?.name} />
                    <InfoRow label="Email" value={user?.email} />
                    <InfoRow label="State" value={user?.state} />
                    <InfoRow label="City" value={user?.city} />
                    <InfoRow label="Age" value={user?.age} />
                    <InfoRow label="Role" value={user?.role} />
                </View>

                {/* Organization Hub */}
                {user?.userType === 'organization' && (
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Building color={colors.primary} size={18} />
                                <Text style={[styles.cardTitle, { marginBottom: 0, marginLeft: 8 }]}>Organization Hub</Text>
                            </View>
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                                onPress={() => setActiveView('myPosts')}
                            >
                                <Package color={colors.primary} size={14} />
                                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold', marginLeft: 6 }}>MANAGE</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.statGrid}>
                            <View style={styles.statCard}>
                                <Text style={styles.statNumber}>{myProjects.length}</Text>
                                <Text style={styles.statLabel}>Initiatives</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statNumber}>
                                    {myProjects.reduce((acc: number, p: any) => acc + (p.likes || 0), 0)}
                                </Text>
                                <Text style={styles.statLabel}>Total Likes</Text>
                            </View>
                        </View>

                        <Text style={[styles.cardTitle, { marginTop: 20, fontSize: 12, color: colors.textMuted }]}>RECENT LOGS</Text>
                        {myProjects.length === 0 ? (
                            <Text style={styles.emptyText}>No initiatives submitted yet.</Text>
                        ) : (
                            myProjects.slice(0, 3).map((p: any) => (
                                <TouchableOpacity key={p._id} style={styles.logItem} onPress={() => {
                                    setSelectedProjectId(p._id);
                                    setActiveView('projectDetails');
                                }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.logTitle} numberOfLines={1}>{p.name}</Text>
                                        <Text style={styles.logSub}>{p.status.toUpperCase()} • {new Date(p.createdAt).toLocaleDateString()}</Text>
                                    </View>
                                    <ChevronRight color={colors.transparentBorder} size={16} />
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                {/* Community Engagement (For Citizens) */}
                {user?.userType === 'citizen' && (
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <ThumbsUp color={colors.primary} size={18} />
                            <Text style={[styles.cardTitle, { marginBottom: 0, marginLeft: 8 }]}>Community Impact</Text>
                        </View>
                        <View style={styles.statGrid}>
                            <View style={styles.statCard}>
                                <MessageSquare color={colors.primary} size={16} />
                                <Text style={[styles.statLabel, { marginTop: 4 }]}>Active Voice</Text>
                            </View>
                            <View style={styles.statCard}>
                                <ThumbsUp color={colors.primary} size={16} />
                                <Text style={[styles.statLabel, { marginTop: 4 }]}>Supporter</Text>
                            </View>
                        </View>
                        <Text style={styles.emptyText}>Keep engaging with local projects to improve your civic score!</Text>
                    </View>
                )}

                {/* Accountability Proofs (Blockchain) */}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <FileText color={colors.primary} size={18} />
                        <Text style={[styles.cardTitle, { marginBottom: 0, marginLeft: 8 }]}>Accountability Proofs (Blockchain)</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
                        Official project claims are notarized on the Polygon blockchain to ensure tamper-proof civic transparency.
                    </Text>
                    {accountabilityRecords.slice(0, 3).map((r: any) => (
                        <TouchableOpacity
                            key={r._id}
                            style={[styles.infoRow, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.transparentBorder }]}
                            onPress={() => r.explorerUrl && Linking.openURL(r.explorerUrl)}
                        >
                            <Text style={[styles.infoLabel, { color: colors.text, fontWeight: 'bold' }]}>{r.zoneName}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                                {r.officialName} ({r.officialPost}) claimed completion by {r.claimedCompletionDate}.
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                <LinkIcon color="#8b5cf6" size={14} />
                                <Text style={{ color: '#8b5cf6', fontSize: 12, marginLeft: 6, fontWeight: 'bold' }}>View Polygon Tx</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    {accountabilityRecords.length === 0 && (
                        <Text style={styles.emptyText}>No blockchain records available yet.</Text>
                    )}
                    {accountabilityRecords.length > 0 && onViewAccountability && (
                        <TouchableOpacity 
                            style={{ 
                                marginTop: 16, 
                                alignItems: 'center', 
                                padding: 12, 
                                borderTopWidth: 1, 
                                borderTopColor: colors.transparentBorder,
                                backgroundColor: colors.primary + '08',
                                borderRadius: 12
                            }}
                            onPress={onViewAccountability}
                        >
                            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 }}>VIEW ALL AUDIT PROOFS</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Settings */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>App Settings</Text>
                    
                    <TouchableOpacity 
                        style={[styles.infoRow, { borderBottomWidth: 1 }]} 
                        onPress={() => setActiveView('preferences')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Bell color={colors.primary} size={18} />
                            <Text style={[styles.infoLabel, { marginLeft: 10, color: colors.text }]}>Preferences & Alerts</Text>
                        </View>
                        <ChevronRight color={colors.textMuted} size={16} />
                    </TouchableOpacity>

                    <View style={styles.infoRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {isDark ? <Moon color={colors.textMuted} size={18} /> : <Sun color={colors.textMuted} size={18} />}
                            <Text style={[styles.infoLabel, { marginLeft: 10 }]}>Appearance</Text>
                        </View>
                        <View style={styles.themeToggle}>
                            <TouchableOpacity 
                                style={[styles.themeBtn, mode === 'light' && styles.themeBtnActive]}
                                onPress={() => setMode('light')}>
                                <Sun color={mode === 'light' ? colors.primary : colors.textMuted} size={16} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.themeBtn, mode === 'dark' && styles.themeBtnActive]}
                                onPress={() => setMode('dark')}>
                                <Moon color={mode === 'dark' ? colors.primary : colors.textMuted} size={16} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.themeBtn, mode === 'system' && styles.themeBtnActive]}
                                onPress={() => setMode('system')}>
                                <Monitor color={mode === 'system' ? colors.primary : colors.textMuted} size={16} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut color={colors.danger} size={18} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 50 },
    avatarCard: { backgroundColor: colors.card, borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.transparentPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    avatarText: { color: colors.primary, fontWeight: 'bold', fontSize: 24 },
    name: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    email: { fontSize: 13, color: colors.textMuted },
    typeBadge: { marginTop: 12, backgroundColor: colors.transparentPrimary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: isDark ? 'rgba(0,212,255,0.15)' : 'rgba(2,132,199,0.15)', flexDirection: 'row', alignItems: 'center' },
    typeText: { color: colors.primary, fontSize: 13, fontWeight: '600', marginLeft: 6 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.transparentBorder },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 16 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.transparentBorder },
    infoLabel: { fontSize: 14, color: colors.textMuted },
    infoValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
    logoutBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', flexDirection: 'row', justifyContent: 'center' },
    logoutText: { color: colors.danger, fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    themeToggle: { flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 8, overflow: 'hidden' },
    themeBtn: { padding: 8, paddingHorizontal: 12 },
    themeBtnActive: { backgroundColor: colors.transparentPrimary },

    statGrid: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: colors.inputBg, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.transparentBorder },
    statNumber: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    statLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
    logItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.transparentBorder },
    logTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    logSub: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
    emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
});
