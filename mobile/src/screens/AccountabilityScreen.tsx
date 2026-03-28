import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import { ArrowLeft, Shield, ExternalLink, MapPin, User, Search, Filter } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';

export default function AccountabilityScreen({ onBack }: { onBack: () => void }) {
    const { colors, isDark } = useTheme();
    const records = useQuery(api.accountability.listAll) || [];
    const [searchQuery, setSearchQuery] = useState('');

    const filteredRecords = records.filter((r: any) => 
        r.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.officialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.district.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: any }) => (
        <GlassCard intensity={8} style={styles.recordCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.badge, item.txHash ? styles.badgeActive : styles.badgePending]}>
                    <Shield color={item.txHash ? '#10b981' : '#f59e0b'} size={12} />
                    <Text style={[styles.badgeText, { color: item.txHash ? '#10b981' : '#f59e0b' }]}>
                        {item.txHash ? 'On-Chain Verified' : 'Awaiting Proof'}
                    </Text>
                </View>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>

            <Text style={styles.zoneName}>{item.zoneName}</Text>
            
            <View style={styles.officialBox}>
                <User color={colors.primary} size={16} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.officialName}>{item.officialName}</Text>
                    <Text style={styles.officialPost}>{item.officialPost} • {item.partyName}</Text>
                </View>
            </View>

            <View style={styles.claimBox}>
                <Text style={styles.claimTitle}>OFFICIAL PROMISE</Text>
                <Text style={styles.claimText}>"{item.projectClaim}"</Text>
            </View>

            <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>DEADLINE</Text>
                    <Text style={styles.statusValue}>{item.claimedCompletionDate}</Text>
                </View>
                <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>CURRENT STATUS</Text>
                    <Text style={[styles.statusValue, { color: '#10b981' }]}>{item.actualStatus}</Text>
                </View>
            </View>

            {item.txHash && (
                <TouchableOpacity 
                    style={styles.blockchainBtn} 
                    onPress={() => item.explorerUrl && Linking.openURL(item.explorerUrl)}
                >
                    <ExternalLink color="#fff" size={14} />
                    <Text style={styles.blockchainBtnText}>View Polygon Transaction</Text>
                </TouchableOpacity>
            )}
        </GlassCard>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ArrowLeft color={colors.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Governance Audit</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
                <Search color={colors.textMuted} size={18} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text, backgroundColor: colors.inputBg }]}
                    placeholder="Search Official, Area or Project..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {records.length === 0 ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.textMuted, marginTop: 16 }}>Connecting to Polygon Network...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredRecords}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ color: colors.textMuted }}>No matching records found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: 'bold' },
    searchBox: { paddingHorizontal: 20, marginBottom: 16, position: 'relative' },
    searchIcon: { position: 'absolute', left: 34, top: 14, zIndex: 1 },
    searchInput: { height: 46, borderRadius: 12, paddingLeft: 44, paddingRight: 16, fontSize: 14 },
    listContent: { padding: 20, paddingBottom: 40 },
    recordCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    badgePending: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    date: { fontSize: 11, color: '#6b7280' },
    zoneName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
    officialBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 10, borderRadius: 12 },
    officialName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
    officialPost: { fontSize: 12, color: '#9ca3af' },
    claimBox: { marginBottom: 16 },
    claimTitle: { fontSize: 10, fontWeight: '900', color: '#3b82f6', letterSpacing: 1, marginBottom: 6 },
    claimText: { fontSize: 14, color: '#e5e7eb', fontStyle: 'italic', lineHeight: 20 },
    statusRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
    statusItem: { flex: 1 },
    statusLabel: { fontSize: 10, color: '#6b7280', marginBottom: 4 },
    statusValue: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
    blockchainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 12 },
    blockchainBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
