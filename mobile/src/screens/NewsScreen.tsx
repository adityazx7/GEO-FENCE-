import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, MapPin, ArrowRight, CheckCircle2, Hammer, ClipboardList, AlertTriangle, Search, TrendingUp, Filter, BarChart3, ChevronDown, ChevronUp } from 'lucide-react-native';

export default function NewsScreen({ onViewWork }: { onViewWork?: (projectId: string) => void }) {
    const { user } = useAuth();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sectorFilter, setSectorFilter] = useState('all');
    const [budgetSort, setBudgetSort] = useState('none'); // 'none', 'high-low', 'low-high'

    const projects = useQuery(api.projects.list) || [];
    const notifications = useQuery(api.notifications.listAll) || [];

    // Trending: Top 3 High Budget Projects from the last 3 days (Static to search)
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const topProjects = [...projects]
        .filter((p: any) => (p.createdAt || 0) >= threeDaysAgo)
        .sort((a: any, b: any) => (b.budget || 0) - (a.budget || 0))
        .slice(0, 3);

    const topProjectIds = topProjects.map(p => p._id);

    // Searchable Feed: Filtered by search query and sorted by budget (User preference)
    const feedInitiatives = [...projects]
        .filter((p: any) => {
            // Exclude already shown in trending
            if (topProjectIds.includes(p._id)) return false;

            if (searchQuery.trim() !== '') {
                const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
                const searchFields = [
                    p.name, 
                    p.description, 
                    p.location?.address, 
                    p.city, 
                    p.state, 
                    p.type
                ].join(' ').toLowerCase();
                
                return words.every(word => searchFields.includes(word));
            }
            return true;
        })
        .sort((a: any, b: any) => {
            if (budgetSort === 'high-low') return (b.budget || 0) - (a.budget || 0);
            if (budgetSort === 'low-high') return (a.budget || 0) - (b.budget || 0);
            return (b.budget || 0) - (a.budget || 0); // Default to high-low if budget order is requested
        });

    const StatusIcon = ({ status }: { status: string }) => {
        switch(status) {
            case 'completed': return <CheckCircle2 color={colors.success} size={20} />;
            case 'in_progress': return <Hammer color={colors.warning} size={20} />;
            case 'planned': return <ClipboardList color={colors.primary} size={20} />;
            default: return <AlertTriangle color={colors.iconDefault} size={20} />;
        }
    };

    const timeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text style={styles.pageTitle}>Government Initiatives</Text>
                <Text style={styles.pageSub}>Latest work in {user?.state || 'your area'} • Updates in real-time</Text>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search color={colors.textMuted} size={18} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search initiatives, locations..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                
                {/* Filters Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={{ paddingRight: 20 }}>
                    <TouchableOpacity 
                        style={[styles.filterChip, statusFilter !== 'all' && styles.filterChipActive]}
                        onPress={() => setStatusFilter(statusFilter === 'all' ? 'in_progress' : statusFilter === 'in_progress' ? 'completed' : statusFilter === 'completed' ? 'planned' : 'all')}
                    >
                        <Filter size={14} color={statusFilter !== 'all' ? '#fff' : colors.textMuted} />
                        <Text style={[styles.filterChipText, statusFilter !== 'all' && styles.filterChipTextActive]}>
                            {statusFilter === 'all' ? 'Status' : statusFilter.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.filterChip, sectorFilter !== 'all' && styles.filterChipActive]}
                        onPress={() => {
                            const sectors = ['all', 'hospital', 'bridge', 'road', 'school', 'metro', 'college', 'government_office', 'other'];
                            const nextIdx = (sectors.indexOf(sectorFilter) + 1) % sectors.length;
                            setSectorFilter(sectors[nextIdx]);
                        }}
                    >
                        <BarChart3 size={14} color={sectorFilter !== 'all' ? '#fff' : colors.textMuted} />
                        <Text style={[styles.filterChipText, sectorFilter !== 'all' && styles.filterChipTextActive]}>
                            {sectorFilter === 'all' ? 'Sector' : sectorFilter.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.filterChip, budgetSort !== 'none' && styles.filterChipActive]}
                        onPress={() => setBudgetSort(budgetSort === 'none' ? 'high-low' : budgetSort === 'high-low' ? 'low-high' : 'none')}
                    >
                        {budgetSort === 'low-high' ? <ChevronUp size={14} color="#fff" /> : budgetSort === 'high-low' ? <ChevronDown size={14} color="#fff" /> : <TrendingUp size={14} color={colors.textMuted} />}
                        <Text style={[styles.filterChipText, budgetSort !== 'none' && styles.filterChipTextActive]}>
                            Budget {budgetSort === 'high-low' ? '(H-L)' : budgetSort === 'low-high' ? '(L-H)' : ''}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Top Projects Highlight Reel */}
                {topProjects.length > 0 && (
                    <View style={styles.trendingSection}>
                        <View style={styles.trendingHeader}>
                            <TrendingUp color={colors.primary} size={18} />
                            <Text style={styles.trendingTitle}>Top High-Budget Works</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScrollUrl}>
                            {topProjects.map((project: any) => (
                                <TouchableOpacity 
                                    key={project._id} 
                                    style={styles.highlightCard}
                                    onPress={() => onViewWork?.(project._id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.highlightBudgetBox}>
                                        <Text style={styles.highlightBudgetText}>₹{(project.budget / 10000000).toFixed(1)} Cr</Text>
                                    </View>
                                    <Text style={styles.highlightTitle} numberOfLines={2}>{project.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                        <MapPin color={colors.textMuted} size={12} />
                                        <Text style={styles.highlightLoc} numberOfLines={1}> {project.location?.address?.split(',')[0] || 'N/A'}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}



                <Text style={styles.feedHeader}>Recent Activity</Text>

                {feedInitiatives.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.muted}>No initiatives found.</Text>
                    </View>
                ) : (
                    feedInitiatives.map((project: any) => (
                        <TouchableOpacity
                            key={project._id}
                            style={styles.newsCard}
                            onPress={() => onViewWork?.(project._id)}
                            activeOpacity={0.75}
                        >
                            <View style={styles.newsHeader}>
                                <StatusIcon status={project.status} />
                                <View style={{ flex: 1, marginHorizontal: 10 }}>
                                    <Text style={styles.newsType}>{project.type.toUpperCase()}</Text>
                                    <Text style={styles.newsTime}>{timeAgo(project.createdAt)}</Text>
                                </View>
                                <Text style={styles.newsBudget}>₹{(project.budget / 10000000).toFixed(1)} Cr</Text>
                            </View>
                            <Text style={styles.newsTitle}>{project.name}</Text>
                            
                            {project.status === 'in_progress' && project.progress !== undefined && (
                                <View style={styles.progressSection}>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${project.progress}%` }]} />
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                        <Text style={styles.progressLabel}>Status: In Progress</Text>
                                        <Text style={styles.progressPercent}>{project.progress}%</Text>
                                    </View>
                                </View>
                            )}

                            <Text style={styles.newsDesc} numberOfLines={2}>{project.description}</Text>
                            <View style={styles.newsFooter}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MapPin color={colors.textMuted} size={14} />
                                    <Text style={styles.newsLocation}> {project.location?.address || 'N/A'}</Text>
                                </View>
                                <ArrowRight color={colors.primary} size={18} />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 50 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    pageSub: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 20, borderWidth: 1, borderColor: colors.transparentBorder },
    searchInput: { flex: 1, marginLeft: 10, color: colors.text, fontSize: 15, padding: 0 },
    
    filtersRow: { flexDirection: 'row', marginBottom: 20 },
    filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg + '40', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.transparentBorder },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginLeft: 6 },
    filterChipTextActive: { color: '#fff' },

    trendingSection: { marginBottom: 24 },
    trendingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    trendingTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    trendingScrollUrl: { paddingRight: 16 },
    highlightCard: { width: 160, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginRight: 12, borderWidth: 1, borderColor: colors.transparentBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    highlightBudgetBox: { backgroundColor: colors.primary + '20', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
    highlightBudgetText: { color: colors.primary, fontWeight: 'bold', fontSize: 12 },
    highlightTitle: { color: colors.text, fontSize: 14, fontWeight: 'bold', lineHeight: 20, height: 40 },
    highlightLoc: { color: colors.textMuted, fontSize: 11, flex: 1 },

    feedHeader: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },

    notifBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.transparentPrimary, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.transparentBorder },
    notifBannerText: { color: colors.primary, fontSize: 13, fontWeight: '600', marginLeft: 8 },
    emptyCard: { backgroundColor: colors.card, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.transparentBorder },
    muted: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
    newsCard: { backgroundColor: colors.card, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.transparentBorder },
    newsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    newsType: { fontSize: 10, color: colors.textMuted, letterSpacing: 1, fontWeight: '600' },
    newsTime: { fontSize: 10, color: colors.iconDefault, marginTop: 2 },
    newsBudget: { fontSize: 13, fontWeight: 'bold', color: colors.primary },
    newsTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
    newsDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
    newsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.transparentBorder, paddingTop: 12 },
    newsLocation: { fontSize: 12, color: colors.textMuted },

    progressSection: { marginBottom: 12, marginTop: 4 },
    progressBarBg: { height: 6, backgroundColor: colors.inputBg, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: colors.primary },
    progressLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
    progressPercent: { fontSize: 10, color: colors.primary, fontWeight: 'bold' },
});
