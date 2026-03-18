import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
    const { user, logout } = useAuth();

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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Avatar Card */}
                <View style={styles.avatarCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(user?.name || 'U')}</Text>
                    </View>
                    <Text style={styles.name}>{user?.name}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{user?.userType === 'organization' ? '🏛️ Organization' : '🧑‍💼 Citizen'}</Text>
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

                {/* Organization Info */}
                {user?.userType === 'organization' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Organization Info</Text>
                        <InfoRow label="Org Name" value={user?.orgName} />
                        <InfoRow label="Type" value={user?.orgType?.toUpperCase()} />
                    </View>
                )}

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e', paddingHorizontal: 16, paddingTop: 50 },
    avatarCard: { backgroundColor: '#111827', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,212,255,0.1)' },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    avatarText: { color: '#00d4ff', fontWeight: 'bold', fontSize: 24 },
    name: { fontSize: 22, fontWeight: 'bold', color: '#f3f4f6', marginBottom: 4 },
    email: { fontSize: 13, color: '#6b7280' },
    typeBadge: { marginTop: 12, backgroundColor: 'rgba(0,212,255,0.08)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)' },
    typeText: { color: '#00d4ff', fontSize: 12, fontWeight: '600' },
    card: { backgroundColor: '#111827', borderRadius: 14, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#e5e7eb', marginBottom: 16 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    infoLabel: { fontSize: 13, color: '#6b7280' },
    infoValue: { fontSize: 13, color: '#e5e7eb', fontWeight: '500' },
    logoutBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
    logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 },
});
