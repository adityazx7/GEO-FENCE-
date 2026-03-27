import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Map, IndianRupee, Newspaper, User as UserIcon, Plus, ShieldAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'home' | 'budget' | 'initiatives' | 'addWork' | 'reportIssue' | 'profile';

export default function BottomNav({ activeTab, onTabChange, userType }: {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    userType: 'citizen' | 'organization';
}) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = createStyles(colors, insets);
    const isOrg = userType === 'organization';

    return (
        <View style={styles.container}>
            <TabButton tab="home" label="Map" Icon={Map} active={activeTab} onPress={onTabChange} colors={colors} />
            <TabButton tab="initiatives" label="Initiatives" Icon={Newspaper} active={activeTab} onPress={onTabChange} colors={colors} />

            <TabButton tab="budget" label="Budget" Icon={IndianRupee} active={activeTab} onPress={onTabChange} colors={colors} />
            
            {/* Center: + button for org */}
            {isOrg && (
                <TouchableOpacity style={styles.fabContainer} onPress={() => onTabChange('addWork')} activeOpacity={0.8}>
                    <View style={[styles.fab, activeTab === 'addWork' && styles.fabActive]}>
                        <Plus color={activeTab === 'addWork' ? colors.background : colors.primary} size={18} />
                    </View>
                    <Text style={[styles.label, activeTab === 'addWork' && styles.labelActive, { fontSize: 9 }]}>Add</Text>
                </TouchableOpacity>
            )}

            <TabButton tab="reportIssue" label="Report" Icon={ShieldAlert} active={activeTab} onPress={onTabChange} colors={colors} />

            <TabButton tab="profile" label="Profile" Icon={UserIcon} active={activeTab} onPress={onTabChange} colors={colors} />
        </View>
    );
}

function TabButton({ tab, label, Icon, active, onPress, colors }: any) {
    const isActive = active === tab;
    return (
        <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 6, position: 'relative' }} onPress={() => onPress(tab)} activeOpacity={0.7}>
            <Icon color={isActive ? colors.primary : colors.iconDefault} size={22} style={{ marginBottom: 4 }} />
            <Text style={{ fontSize: 10, color: isActive ? colors.primary : colors.textMuted, fontWeight: isActive ? '700' : '500' }}>{label}</Text>
            {isActive && <View style={{ position: 'absolute', top: -10, width: 20, height: 3, borderRadius: 2, backgroundColor: colors.primary }} />}
        </TouchableOpacity>
    );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 15), // Dynamic padding
        paddingTop: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    fabContainer: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 2,
    },
    fab: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.transparentPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        marginTop: -16,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    fabActive: {
        backgroundColor: colors.primary,
    },
    label: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
    labelActive: { color: colors.primary, fontWeight: '700' },
});
