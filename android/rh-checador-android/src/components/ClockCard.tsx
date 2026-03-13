import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

export default function ClockCard() {
    const [time, setTime] = useState(moment());
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(moment());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <View style={styles.container}>
            <Text
                style={[styles.timeText, { fontSize: isLandscape ? 72 : 56 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
            >
                {time.format('HH:mm:ss')}
            </Text>
            <Text
                style={[styles.dateText, { fontSize: isLandscape ? 16 : 14 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
            >
                {time.format('dddd, D [de] MMMM [de] YYYY').toUpperCase()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 16,
        width: '100%',
    },
    timeText: {
        fontWeight: 'bold',
        color: '#0f172a',
        letterSpacing: -1,
    },
    dateText: {
        color: '#64748b',
        fontWeight: '600',
        marginTop: 4,
    },
});
