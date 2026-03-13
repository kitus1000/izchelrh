import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';

type ScannerModalProps = {
    visible: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
    title: string;
};

export default function ScannerModal({ visible, onClose, onScan, title }: ScannerModalProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

    useEffect(() => {
        if (visible) {
            setScanned(false);
        }
    }, [visible]);

    if (!visible) return null;

    if (!permission) {
        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.container}>
                    <ActivityIndicator size="large" color="#ffffff" />
                </View>
            </Modal>
        );
    }

    if (!permission.granted) {
        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.container}>
                    <View style={styles.permissionBox}>
                        <Text style={styles.permissionText}>Se requiere acceso a la cámara para escanear el QR del empleado.</Text>
                        <Pressable style={styles.permissionButton} onPress={requestPermission}>
                            <Text style={styles.permissionButtonText}>Otorgar Permiso</Text>
                        </Pressable>
                        <Pressable style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        );
    }

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        if (!scanned) {
            setScanned(true);
            onScan(data);
        }
    };

    const toggleCamera = () => {
        setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.scannerWrapper}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <Pressable onPress={onClose} style={styles.closeIcon}>
                            <Text style={styles.closeIconText}>X</Text>
                        </Pressable>
                    </View>

                    <View style={styles.cameraContainer}>
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing={cameraFacing}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        />
                        {/* Scanner overlay graphic */}
                        <View style={styles.overlay}>
                            <View style={styles.scanTarget} />
                        </View>

                        {/* Toggle Camera Button */}
                        <View style={styles.toggleContainer}>
                            <Pressable style={styles.toggleButton} onPress={toggleCamera}>
                                <Text style={styles.toggleButtonText}>
                                    🔄 Cambiar Cámara
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    <Text style={styles.instruction}>Acerque el QR de su gafete a la cámara</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    scannerWrapper: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        width: '100%',
        maxWidth: 600,
        overflow: 'hidden',
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
        fontSize: 24,
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
    cameraContainer: {
        width: '100%',
        height: 400,
        position: 'relative',
        backgroundColor: '#000',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanTarget: {
        width: 250,
        height: 250,
        borderWidth: 4,
        borderColor: '#3b82f6',
        borderRadius: 24,
        backgroundColor: 'transparent',
    },
    toggleContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    toggleButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    toggleButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    instruction: {
        textAlign: 'center',
        padding: 20,
        fontSize: 18,
        color: '#64748b',
        fontWeight: '500',
    },
    permissionBox: {
        backgroundColor: '#fff',
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
    },
    permissionText: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 24,
        color: '#334155',
    },
    permissionButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        paddingVertical: 16,
        width: '100%',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
