import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated } from 'react-native';

type MethodSelectorModalProps = {
    visible: boolean;
    onClose: () => void;
    onSelectQR: () => void;
    onSelectManual: () => void;
    title: string;
};

export default function MethodSelectorModal({ visible, onClose, onSelectQR, onSelectManual, title }: MethodSelectorModalProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <Pressable onPress={onClose} style={styles.closeIcon}>
                            <Text style={styles.closeIconText}>X</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.instruction}>¿Cómo deseas identificarte?</Text>

                    <View style={styles.buttonsContainer}>
                        <MethodButton
                            title="📷 Escanear QR"
                            subtitle="Usa la cámara para escanear tu gafete"
                            color="#3b82f6"
                            onPress={onSelectQR}
                        />
                        <MethodButton
                            title="🔢 ID Manual"
                            subtitle="Escribe tu número de empleado oficial"
                            color="#64748b"
                            onPress={onSelectManual}
                        />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

function MethodButton({ title, subtitle, color, onPress }: { title: string, subtitle: string, color: string, onPress: () => void }) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start(() => onPress());
    };

    return (
        <Animated.View style={[styles.methodButton, { backgroundColor: color, transform: [{ scale }] }]}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={StyleSheet.absoluteFill}
            />
            <Text style={styles.methodButtonTitle}>{title}</Text>
            <Text style={styles.methodButtonSubtitle}>{subtitle}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        width: '100%',
        maxWidth: 500,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    closeIcon: {
        padding: 8,
    },
    closeIconText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#64748b',
    },
    instruction: {
        textAlign: 'center',
        padding: 24,
        paddingBottom: 12,
        fontSize: 18,
        color: '#475569',
        fontWeight: '500',
    },
    buttonsContainer: {
        padding: 24,
        paddingTop: 12,
        gap: 16,
    },
    methodButton: {
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
    },
    methodButtonTitle: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    methodButtonSubtitle: {
        color: '#f1f5f9',
        fontSize: 16,
        textAlign: 'center',
    },
});
