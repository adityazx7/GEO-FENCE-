import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ProgressSliderProps {
    progress: number;
    onChange: (progress: number) => void;
    label?: string;
    showIncrement?: boolean;
}

const STEPS = [0, 20, 40, 60, 80, 100];

export default function ProgressSlider({ progress, onChange, label = "EXECUTION PROGRESS", showIncrement = true }: ProgressSliderProps) {
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const handleStepPress = (val: number) => {
        onChange(val);
    };

    const handleIncrement = () => {
        onChange(Math.min(100, progress + 5));
    };

    // Simple drag logic
    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (evt, gestureState) => {
            const width = Dimensions.get('window').width - 32; // Container padding
            const newProgress = Math.round((gestureState.moveX - 16) / width * 100);
            const clamped = Math.max(0, Math.min(100, newProgress));
            // Optional: Snap to 5% increments for "scrolling" feel
            const snapped = Math.round(clamped / 5) * 5;
            onChange(snapped);
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.label}>{label}: {progress}%</Text>
                {showIncrement && (
                    <TouchableOpacity onPress={handleIncrement} style={styles.incrementBtn}>
                        <Text style={styles.incrementText}>+ 5%</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.sliderWrapper} {...panResponder.panHandlers}>
                <View style={styles.track}>
                    <View style={[styles.fill, { width: `${progress}%` }]} />
                </View>
                <View style={styles.dotsRow}>
                    {STEPS.map((step) => (
                        <TouchableOpacity 
                            key={step} 
                            onPress={() => handleStepPress(step)}
                            style={[
                                styles.dot, 
                                progress >= step ? styles.dotActive : styles.dotInactive
                            ]}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 11,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: 'bold',
    },
    incrementBtn: {
        backgroundColor: colors.transparentPrimary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    incrementText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '900',
    },
    sliderWrapper: {
        height: 30,
        justifyContent: 'center',
        position: 'relative',
    },
    track: {
        height: 6,
        backgroundColor: colors.inputBg,
        borderRadius: 3,
        width: '100%',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.transparentBorder,
    },
    fill: {
        height: '100%',
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    dotsRow: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: -2, // Align with track ends
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.card,
    },
    dotActive: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
    },
    dotInactive: {
        backgroundColor: colors.transparentBorder,
    },
});
