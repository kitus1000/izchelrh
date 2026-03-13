import React, { useState } from 'react';
import { View, StyleSheet, Text, Modal, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClockCard from '../components/ClockCard';
import ActionButton from '../components/ActionButton';
import ScannerModal from '../components/ScannerModal';
import PinPad from '../components/PinPad';
import MethodSelectorModal from '../components/MethodSelectorModal';

type TipoChecada = {
    tipo: string;
    label: string;
    requiere_codigo: boolean;
    color: string;
};

const TIPOS_CHECADA: TipoChecada[] = [
    { tipo: 'ENTRADA', label: 'ENTRADA', requiere_codigo: false, color: '#16a34a' },
    { tipo: 'SALIDA', label: 'SALIDA', requiere_codigo: false, color: '#dc2626' },
    { tipo: 'COMIDA_SALIDA', label: 'COMIDA – SALIDA', requiere_codigo: false, color: '#f59e0b' },
    { tipo: 'COMIDA_REGRESO', label: 'COMIDA – REGRESO', requiere_codigo: false, color: '#d97706' },
    { tipo: 'PERMISO_PERSONAL', label: 'PERMISO PERSONAL', requiere_codigo: true, color: '#2563eb' },
    { tipo: 'REGRESO_PERMISO_PERSONAL', label: 'REGRESO PERMISO', requiere_codigo: false, color: '#3b82f6' },
    { tipo: 'SALIDA_OPERACIONES', label: 'SALIDA OPERACIONES', requiere_codigo: true, color: '#4f46e5' },
    { tipo: 'REGRESO_OPERACIONES', label: 'REGRESO OPERACIONES', requiere_codigo: false, color: '#6366f1' },
];

// URL base del backend web (Vercel)
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://rh-system.vercel.app';

type ResultState = {
    type: 'success' | 'error';
    title: string;
    message: string;
    estatus_puntualidad?: string;
};

export default function HomeScreen() {
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const [activeAction, setActiveAction] = useState<TipoChecada | null>(null);
    const [pendingNumeroEmpleado, setPendingNumeroEmpleado] = useState<string | null>(null);

    const [showMethodSelector, setShowMethodSelector] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showPermisoPad, setShowPermisoPad] = useState(false);   // Gafete perdido
    const [showManualPad, setShowManualPad] = useState(false);      // Número de empleado manual
    const [showCodigoPad, setShowCodigoPad] = useState(false);      // Código de salida

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState | null>(null);

    // ─── Helpers UI ───────────────────────────────────────────────────
    const closeAll = () => {
        setShowMethodSelector(false);
        setShowScanner(false);
        setShowPermisoPad(false);
        setShowManualPad(false);
        setShowCodigoPad(false);
        setLoading(false);
    };

    const showError = (msg: string) => {
        setResult({ type: 'error', title: '✖ ERROR', message: msg });
        closeAll();
    };

    const showSuccess = (nombre: string, tipo: string, estatus: string) => {
        const emojiPuntualidad: Record<string, string> = {
            PUNTUAL: '🟢 Puntual',
            RETARDO: '🟡 Retardo',
            FALTA: '🔴 Falta',
            SIN_TURNO: '⚪ Sin Turno',
        };

        // Buscar el label legible
        const label = TIPOS_CHECADA.find(t => t.tipo === tipo)?.label || tipo;

        setResult({
            type: 'success',
            title: `¡${label} OK!`,
            message: `${nombre}`,
            estatus_puntualidad: emojiPuntualidad[estatus] ?? estatus,
        });
        closeAll();
    };

    // ─── Llamada API ──────────────────────────────────────────────────
    const callChecadaAPI = async (
        numeroEmpleado: string,
        tipoChecada: string,
        codigoAutorizacion?: string,
    ) => {
        setLoading(true);
        try {
            console.log("Calling API:", `${API_BASE}/api/checadas`, "with ID:", numeroEmpleado);
            const response = await fetch(`${API_BASE}/api/checadas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_empleado_token: numeroEmpleado,
                    tipo_checada: tipoChecada,
                    codigo_autorizacion: codigoAutorizacion ?? null,
                    metodo: codigoAutorizacion ? 'CODIGO_PERMISO' : 'NUMERO_EMPLEADO',
                    timestamp_local: new Date().toISOString(),
                }),
            });

            // Leer como texto primero para diagnosticar qué diablos manda Vercel
            const textData = await response.text();
            let data: any;

            try {
                data = JSON.parse(textData);
            } catch (jsonErr) {
                console.error("RAW VERCEL RESPONSE (Not JSON):", response.status, textData.substring(0, 500));
                showError(`Error del servidor (${response.status}):\nNo regresó un formato válido.`);
                return;
            }

            if (!response.ok || !data.ok) {
                console.error("API Error Response:", data);
                showError(data.mensaje ?? `Error HTTP: ${response.status}`);
                return;
            }

            showSuccess(data.empleado?.nombre ?? 'Empleado', tipoChecada, data.estatus_puntualidad ?? 'PUNTUAL');

        } catch (err: any) {
            console.error("Network Error:", err.message);
            showError(`Error de red: ${err.message}\nAsegúrate de tener conexión a Internet.`);
        }
    };

    // ─── Flujo Botón Principal ────────────────────────────────────────
    const handleActionPress = (action: TipoChecada) => {
        setActiveAction(action);
        setShowMethodSelector(true); // Siempre preguntar cómo se quiere identificar
    };

    const handleSelectQR = () => {
        setShowMethodSelector(false);
        setShowScanner(true);
    };

    const handleSelectManual = () => {
        setShowMethodSelector(false);
        setShowManualPad(true);
    };

    // ─── Flujo QR ─────────────────────────────────────────────────────
    const handleScan = (data: string) => {
        setShowScanner(false);
        if (!activeAction) return;

        if (activeAction.requiere_codigo) {
            setPendingNumeroEmpleado(data);
            setShowCodigoPad(true);
        } else {
            callChecadaAPI(data, activeAction.tipo);
        }
    };

    // ─── Flujo ID Manual ──────────────────────────────────────────────
    const handleManualPadSubmit = (pin: string) => {
        setShowManualPad(false);
        if (!activeAction) return;

        if (activeAction.requiere_codigo) {
            setPendingNumeroEmpleado(pin);
            setShowCodigoPad(true);
        } else {
            callChecadaAPI(pin, activeAction.tipo);
        }
    };

    // ─── Flujo PIN Autorización ───────────────────────────────────────
    const handleCodigoPadSubmit = (codigo: string) => {
        setShowCodigoPad(false);
        if (!activeAction || !pendingNumeroEmpleado) return;
        callChecadaAPI(pendingNumeroEmpleado, activeAction.tipo, codigo);
        setPendingNumeroEmpleado(null);
    };

    // ─── Flujo Gafete Extraviado ──────────────────────────────────────
    const handleGafetePerdidoManual = (pin: string) => {
        setShowPermisoPad(false);
        callChecadaAPI(pin, 'ENTRADA');
    };

    const closeResult = () => {
        setResult(null);
        setActiveAction(null);
        setPendingNumeroEmpleado(null);
    };

    // ─── Render ───────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.mainLayout, isLandscape && styles.mainLayoutLandscape]}>

                {/* Reloj */}
                <View style={[styles.timeSection, isLandscape && styles.timeSectionLandscape]}>
                    <ClockCard />
                    <Text style={styles.subtitle}>CHECADOR DE ASISTENCIA</Text>
                </View>

                {/* Acciones */}
                <View style={[styles.actionSection, isLandscape && styles.actionSectionLandscape]}>
                    <View style={styles.actionsGrid}>
                        {TIPOS_CHECADA.map((item) => (
                            <View key={item.tipo} style={[styles.buttonWrapper, { width: isLandscape ? '31%' : '47%' }]}>
                                <ActionButton title={item.label} color={item.color} onPress={() => handleActionPress(item)} />
                            </View>
                        ))}
                    </View>

                    <Pressable
                        style={({ pressed }) => [styles.manualEntryButton, pressed && styles.manualEntryButtonPressed]}
                        onPress={() => {
                            setActiveAction(null);
                            setShowPermisoPad(true);
                        }}
                    >
                        <Text style={styles.manualEntryText}>🔑 ¿Gafete extraviado? Ingresa tu Número de Empleado aquí</Text>
                    </Pressable>
                </View>
            </View>

            {/* Modales */}
            <MethodSelectorModal
                visible={showMethodSelector}
                onClose={() => setShowMethodSelector(false)}
                onSelectQR={handleSelectQR}
                onSelectManual={handleSelectManual}
                title={activeAction?.label ?? 'Identificación'}
            />

            <ScannerModal
                visible={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScan}
                title={activeAction?.label ?? 'Escanear QR'}
            />

            <Modal visible={showManualPad} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <PinPad
                        title={`Número de Empleado (${activeAction?.label})`}
                        onSubmit={handleManualPadSubmit}
                        onCancel={() => setShowManualPad(false)}
                    />
                </View>
            </Modal>

            <Modal visible={showCodigoPad} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <PinPad
                        title={`Código Autorizado (${activeAction?.label})`}
                        onSubmit={handleCodigoPadSubmit}
                        onCancel={() => { setShowCodigoPad(false); setPendingNumeroEmpleado(null); }}
                    />
                </View>
            </Modal>

            <Modal visible={showPermisoPad} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <PinPad
                        title="Tu Número de Empleado Oficial"
                        onSubmit={handleGafetePerdidoManual}
                        onCancel={() => setShowPermisoPad(false)}
                    />
                </View>
            </Modal>

            <Modal visible={loading} transparent>
                <View style={styles.modalOverlay}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Registrando...</Text>
                </View>
            </Modal>

            <Modal visible={!!result} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.resultBox, result?.type === 'error' ? styles.resultBoxError : styles.resultBoxSuccess]}>
                        <Text style={[styles.resultTitle, result?.type === 'error' ? styles.textError : styles.textSuccess]}>
                            {result?.title}
                        </Text>
                        <Text style={styles.resultMessage}>{result?.message}</Text>
                        {result?.estatus_puntualidad && (
                            <Text style={styles.puntualidadText}>{result.estatus_puntualidad}</Text>
                        )}
                        <View style={{ width: 220, height: 60, marginTop: 16 }}>
                            <ActionButton title="Cerrar" color="#334155" onPress={closeResult} />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    mainLayout: { flex: 1, flexDirection: 'column', padding: 12 },
    mainLayoutLandscape: { flexDirection: 'row', alignItems: 'center' },
    timeSection: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    timeSectionLandscape: { flex: 1, paddingHorizontal: 20 },
    subtitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 3, marginTop: 4 },
    actionSection: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
    actionSectionLandscape: { flex: 2, paddingLeft: 20, borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%', maxWidth: 820 },
    buttonWrapper: { minWidth: 130, height: 106, marginBottom: 6 },
    manualEntryButton: { marginTop: 20, paddingVertical: 16, paddingHorizontal: 28, backgroundColor: '#cbd5e1', borderRadius: 18, width: '100%', maxWidth: 600, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
    manualEntryButtonPressed: { backgroundColor: '#94a3b8' },
    manualEntryText: { color: '#334155', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#fff', marginTop: 16, fontSize: 20, fontWeight: 'bold' },
    resultBox: { padding: 32, borderRadius: 28, width: '88%', maxWidth: 420, alignItems: 'center', elevation: 12 },
    resultBoxSuccess: { backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: '#86efac' },
    resultBoxError: { backgroundColor: '#fff1f2', borderWidth: 2, borderColor: '#fca5a5' },
    resultTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
    textSuccess: { color: '#16a34a' },
    textError: { color: '#dc2626' },
    resultMessage: { fontSize: 22, textAlign: 'center', color: '#1e293b', lineHeight: 32, fontWeight: '600' },
    puntualidadText: { marginTop: 12, fontSize: 18, color: '#475569', fontWeight: '500' },
});
