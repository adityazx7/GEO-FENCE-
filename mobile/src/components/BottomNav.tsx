import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';

type Tab = 'home' | 'budget' | 'news' | 'addWork' | 'profile';

const CITIZEN_TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: 'home', label: 'Home', emoji: '🏠' },
    { key: 'budget', label: 'Budget', emoji: '💰' },
    { key: 'news', label: 'News', emoji: '📰' },
    { key: 'profile', label: 'Profile', emoji: '👤' },
];

export default function BottomNav({ activeTab, onTabChange, userType }: {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    userType: 'citizen' | 'organization';
}) {
    const isOrg = userType === 'organization';

    return (
        <View style={styles.container}>
            {/* Home */}
            <TabButton tab="home" label="Home" emoji="🏠" active={activeTab} onPress={onTabChange} />
            {/* Budget */}
            <TabButton tab="budget" label="Budget" emoji="💰" active={activeTab} onPress={onTabChange} />

            {/* Center: + button for org / News for citizen */}
            {isOrg ? (
                <TouchableOpacity
                    style={styles.fabContainer}
                    onPress={() => onTabChange('addWork')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.fab, activeTab === 'addWork' && styles.fabActive]}>
                        <Text style={styles.fabText}>+</Text>
                    </View>
                    <Text style={[styles.label, activeTab === 'addWork' && styles.labelActive]}>Add Work</Text>
                </TouchableOpacity>
            ) : (
                <TabButton tab="news" label="News" emoji="📰" active={activeTab} onPress={onTabChange} />
            )}

            {/* News for org (shifted) */}
            {isOrg && (
                <TabButton tab="news" label="News" emoji="📰" active={activeTab} onPress={onTabChange} />
            )}

            {/* Profile */}
            <TabButton tab="profile" label="Profile" emoji="👤" active={activeTab} onPress={onTabChange} />
        </View>
    );
}

function TabButton({ tab, label, emoji, active, onPress }: {
    tab: Tab; label: string; emoji: string; active: Tab; onPress: (t: Tab) => void
}) {
    const isActive = active === tab;
    return (
        <TouchableOpacity style={styles.tab} onPress={() => onPress(tab)} activeOpacity={0.7}>
            <Text style={[styles.emoji, isActive && styles.emojiActive]}>{emoji}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
            {isActive && <View style={styles.indicator} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#111827',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        paddingBottom: 20,
        paddingTop: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
        position: 'relative',
    },
    emoji: { fontSize: 20, marginBottom: 2, opacity: 0.5 },
    emojiActive: { opacity: 1 },
    label: { fontSize: 10, color: '#4b5563', fontWeight: '500' },
    labelActive: { color: '#00d4ff', fontWeight: '700' },
    indicator: {
        position: 'absolute',
        top: -10,
        width: 20,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#00d4ff',
    },
    fabContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -20,
    },
    fab: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#00d4ff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00d4ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    fabActive: {
        backgroundColor: '#00aadd',
    },
    fabText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#080d18',
        marginTop: -2,
    },
});
