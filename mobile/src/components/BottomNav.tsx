import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { Map, IndianRupee, Newspaper, User as UserIcon, Plus, ShieldAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from './GlassCard';

type Tab = 'home' | 'budget' | 'initiatives' | 'addWork' | 'reportIssue' | 'profile' | 'chat' | 'accountability';

export default function BottomNav({ activeTab, onTabChange, userType }: {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    userType: 'citizen' | 'organization';
}) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const isOrg = userType === 'organization';

    return (
        <View style={[styles.outerContainer, { bottom: Math.max(insets.bottom + 10, 20) }]}>
            <GlassCard intensity={80} style={[styles.container, isOrg && styles.containerOrg] as any}>
                <TabButton tab="home" label="Map" Icon={Map} active={activeTab} onPress={onTabChange} colors={colors} isSixSlots={isOrg} />
                
                {isOrg && (
                    <TabButton tab="initiatives" label="Impact" Icon={Newspaper} active={activeTab} onPress={onTabChange} colors={colors} isSixSlots={isOrg} />
                )}

                <TabButton tab="budget" label="Budget" Icon={IndianRupee} active={activeTab} onPress={onTabChange} colors={colors} isSixSlots={isOrg} />
                
                {isOrg ? (
                    <TouchableOpacity style={styles.fabContainer} onPress={() => onTabChange('addWork')} activeOpacity={0.8}>
                        <View style={[styles.fab, activeTab === 'addWork' && styles.fabActive]}>
                            <Plus color={activeTab === 'addWork' ? colors.background : colors.primary} size={22} />
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TabButton tab="reportIssue" label="Report" Icon={ShieldAlert} active={activeTab} onPress={onTabChange} colors={colors} isSixSlots={isOrg} />
                )}

                {!isOrg && (
                    <TabButton tab="initiatives" label="Impact" Icon={Newspaper} active={activeTab} onPress={onTabChange} colors={colors} isSixSlots={isOrg} />
                )}

                {isOrg && (
                    <TabButton tab="reportIssue" label="Report" Icon={ShieldAlert} active={activeTab} onPress={onTabChange} colors={colors} isSixSlots={isOrg} />
                )}

                <TabButton tab="profile" label="Profile" Icon={UserIcon} active={activeTab} onPress={onTabChange} colors={colors} isSixSlots={isOrg} />
            </GlassCard>
        </View>
    );
}

function TabButton({ tab, label, Icon, active, onPress, colors, isSixSlots }: any) {
    const isActive = active === tab;
    return (
        <TouchableOpacity 
            style={[styles.tabButton, isSixSlots && { paddingHorizontal: 2 }]} 
            onPress={() => onPress(tab)} 
            activeOpacity={0.7}
        >
            <Icon 
                color={isActive ? colors.primary : colors.textMuted} 
                size={isSixSlots ? 20 : 24} 
                strokeWidth={isActive ? 2.5 : 2}
            />
            <Text 
                numberOfLines={1}
                style={[
                    styles.label, 
                    { color: isActive ? colors.primary : colors.textMuted, fontSize: isSixSlots ? 8 : 10 },
                    isActive && styles.labelActive
                ]}
            >
                {label}
            </Text>
            {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    container: {
        flexDirection: 'row',
        height: 70,
        borderRadius: 35,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    containerOrg: {
        paddingHorizontal: 4,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    label: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: '500',
    },
    labelActive: {
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        top: 0,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    fabContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(0,212,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,212,255,0.3)',
    },
    fabActive: {
        backgroundColor: '#00d4ff',
    },
});
