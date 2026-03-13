import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

type PinPadProps = {
    onSubmit: (pin: string) => void;
    onCancel: () => void;
    title: string;
};

export default function PinPad({ onSubmit, onCancel, title }: PinPadProps) {
    const [pin, setPin] = useState('');

    const handlePress = (num: string) => {
        if (pin.length < 6) {
            setPin((prev) => prev + num);
        }
    };

    const handleDelete = () => {
        setPin((prev) => prev.slice(0, -1));
    };

    const handleSubmit = () => {
        if (pin.length > 0) {
            onSubmit(pin);
            setPin('');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.pinDisplay}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotActive]} />
                ))}
            </View>

            <Text style={styles.pinText}>{pin}</Text>

            <View style={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <Pressable key={num} style={styles.key} onPress={() => handlePress(num)}>
                        <Text style={styles.keyText}>{num}</Text>
                    </Pressable>
                ))}
                <Pressable style={styles.key} onPress={handleDelete}>
                    <Text style={styles.keyTextAction}>DEL</Text>
                </Pressable>
                <Pressable style={styles.key} onPress={() => handlePress('0')}>
                    <Text style={styles.keyText}>0</Text>
                </Pressable>
                <Pressable style={[styles.key, styles.keySubmit]} onPress={handleSubmit}>
                    <Text style={styles.keyTextSubmit}>OK</Text>
                </Pressable>
            </View>

            <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        padding: 32,
        borderRadius: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 24,
    },
    pinDisplay: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    pinDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        backgroundColor: 'transparent',
    },
    pinDotActive: {
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
    },
    pinText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        letterSpacing: 8,
        height: 36,
        marginBottom: 24,
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        width: 280,
    },
    key: {
        width: 75,
        height: 75,
        borderRadius: 38,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keySubmit: {
        backgroundColor: '#3b82f6',
    },
    keyText: {
        fontSize: 32,
        fontWeight: '500',
        color: '#0f172a',
    },
    keyTextAction: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#64748b',
    },
    keyTextSubmit: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    cancelButton: {
        marginTop: 32,
        padding: 16,
    },
    cancelText: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
