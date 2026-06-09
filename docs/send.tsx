import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useRef, useState } from "react";
import {
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
 
const MTN = {
    yellow: "#FFCC00",
    black: "#0A0A0A",
    darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray: "#B0B0B0",
    white: "#FFFFFF",
    error: "#FF4444",
    success: "#00C853",
};
 
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 25000, 50000];
 
// ─── SCANNER QR ───────────────────────────────────────────────────────────────
function QRScanner({
    onScanned,
    onClose,
}: {
    onScanned: (data: { numero: string; nom: string; username: string }) => void;
    onClose: () => void;
}) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
 
    const handleBarcode = ({ data }: { data: string }) => {
        if (scanned) return;
        try {
            // Format attendu : JSON { numero, nom, username }
            const parsed = JSON.parse(data);
            if (!parsed.numero || !/^06\d{7}$/.test(parsed.numero)) {
                setErrorMsg("QR invalide — ce code ne contient pas un numéro MTN valide.");
                return;
            }
            setScanned(true);
            Vibration.vibrate(120);
            onScanned({
                numero: parsed.numero,
                nom: parsed.nom || "",
                username: parsed.username || "",
            });
        } catch {
            setErrorMsg("QR invalide — ce code ne vient pas de MTN MoMo Gramm.");
        }
    };
 
    if (!permission) {
        return (
            <View style={qrStyles.center}>
                <Text style={qrStyles.txt}>Vérification des permissions...</Text>
            </View>
        );
    }
 
    if (!permission.granted) {
        return (
            <View style={qrStyles.center}>
                <MaterialIcons name="camera-alt" size={54} color={MTN.yellow} />
                <Text style={qrStyles.permTitle}>Accès caméra requis</Text>
                <Text style={qrStyles.permSub}>
                    Pour scanner le QR code du destinataire, autorisez l'accès à la caméra.
                </Text>
                <TouchableOpacity style={qrStyles.permBtn} onPress={requestPermission}>
                    <Text style={qrStyles.permBtnText}>Autoriser la caméra</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
                    <Text style={{ color: MTN.lightGray, fontSize: 14 }}>Annuler</Text>
                </TouchableOpacity>
            </View>
        );
    }
 
    return (
        <View style={{ flex: 1, backgroundColor: MTN.black }}>
            {/* Header scanner */}
            <View style={qrStyles.scanHeader}>
                <TouchableOpacity onPress={onClose} style={qrStyles.closeBtn}>
                    <MaterialIcons name="close" size={24} color={MTN.black} />
                </TouchableOpacity>
                <Text style={qrStyles.scanTitle}>Scanner le QR du destinataire</Text>
            </View>
 
            {/* Caméra */}
            <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={scanned ? undefined : handleBarcode}
            />
 
            {/* Viseur */}
            <View style={qrStyles.overlay} pointerEvents="none">
                <View style={qrStyles.viewfinder}>
                    {/* Coins du viseur */}
                    <View style={[qrStyles.corner, qrStyles.cornerTL]} />
                    <View style={[qrStyles.corner, qrStyles.cornerTR]} />
                    <View style={[qrStyles.corner, qrStyles.cornerBL]} />
                    <View style={[qrStyles.corner, qrStyles.cornerBR]} />
                </View>
                <Text style={qrStyles.scanHint}>
                    Placez le QR code MTN dans le cadre
                </Text>
            </View>
 
            {/* Erreur */}
            {errorMsg ? (
                <View style={qrStyles.errorBanner}>
                    <MaterialIcons name="error-outline" size={18} color={MTN.error} />
                    <Text style={qrStyles.errorTxt}>{errorMsg}</Text>
                    <TouchableOpacity onPress={() => { setErrorMsg(""); setScanned(false); }}>
                        <Text style={{ color: MTN.yellow, fontWeight: "700", fontSize: 13 }}>Réessayer</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
}
 
// ─── ÉCRAN PRINCIPAL ──────────────────────────────────────────────────────────
export default function SendScreen() {
    const [numero, setNumero] = useState("");
    const [nomDestinataire, setNomDestinataire] = useState("");
    const [usernameDestinataire, setUsernameDestinataire] = useState("");
    const [montant, setMontant] = useState("");
    const [note, setNote] = useState("");
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
 
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const successScale = useRef(new Animated.Value(0)).current;
 
    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };
 
    const handleQRScanned = (data: { numero: string; nom: string; username: string }) => {
        setShowScanner(false);
        setNumero(data.numero);
        setNomDestinataire(data.nom);
        setUsernameDestinataire(data.username);
    };
 
    const resetDestinataire = () => {
        setNumero("");
        setNomDestinataire("");
        setUsernameDestinataire("");
    };
 
    const handleNext = () => {
        if (numero.length !== 9) { triggerShake(); return; }
        if (!montant || parseInt(montant) < 100) { triggerShake(); return; }
        setStep(2);
    };
 
    const handleSend = async () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
            Animated.spring(successScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
        }, 1500);
    };
 
    const resetAll = () => {
        setSuccess(false); setStep(1);
        setNumero(""); setMontant(""); setNote("");
        setNomDestinataire(""); setUsernameDestinataire("");
    };
 
    // ── Succès ────────────────────────────────────────────────────────────────
    if (success) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content" backgroundColor={MTN.black} />
                <View style={styles.successContainer}>
                    <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
                        <MaterialIcons name="check" size={60} color={MTN.black} />
                    </Animated.View>
                    <Text style={styles.successTitle}>Transfert réussi !</Text>
                    <Text style={styles.successSub}>
                        {parseInt(montant).toLocaleString("fr-FR")} FCFA envoyés à{"\n"}
                        {nomDestinataire ? `${nomDestinataire} · ` : ""}+242 {numero}
                    </Text>
                    <TouchableOpacity style={styles.newTransferBtn} onPress={resetAll}>
                        <Text style={styles.newTransferText}>Nouveau transfert</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
 
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.black} />
 
            {/* Scanner Modal */}
            <Modal visible={showScanner} animationType="slide" statusBarTranslucent>
                <SafeAreaView style={{ flex: 1, backgroundColor: MTN.black }}>
                    <QRScanner
                        onScanned={handleQRScanned}
                        onClose={() => setShowScanner(false)}
                    />
                </SafeAreaView>
            </Modal>
 
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Envoyer de l'argent</Text>
                <View style={styles.stepIndicator}>
                    <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                    <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                    <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                </View>
            </View>
 
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
 
                        {step === 1 ? (
                            <>
                                {/* ── DESTINATAIRE ─────────────────────────── */}
                                <Text style={styles.sectionLabel}>Destinataire</Text>
 
                                {/* Carte destinataire scanné */}
                                {nomDestinataire ? (
                                    <View style={styles.scannedCard}>
                                        <View style={styles.scannedAvatar}>
                                            <Text style={styles.scannedAvatarTxt}>
                                                {nomDestinataire.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.scannedName}>{nomDestinataire}</Text>
                                            <Text style={styles.scannedSub}>
                                                {usernameDestinataire ? `@${usernameDestinataire} · ` : ""}+242 {numero}
                                            </Text>
                                        </View>
                                        <View style={styles.scannedBadge}>
                                            <MaterialIcons name="qr-code-scanner" size={13} color={MTN.success} />
                                            <Text style={styles.scannedBadgeTxt}>Scanné</Text>
                                        </View>
                                        <TouchableOpacity onPress={resetDestinataire} style={{ padding: 6 }}>
                                            <MaterialIcons name="close" size={20} color={MTN.lightGray} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        {/* Champ numéro manuel */}
                                        <View style={[styles.inputRow, focusedField === "num" && styles.inputFocused]}>
                                            <View style={styles.prefixBadge}>
                                                <Text style={styles.prefixText}>🇨🇬 +242</Text>
                                            </View>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="06 XXXXXXX"
                                                placeholderTextColor={MTN.lightGray}
                                                keyboardType="phone-pad"
                                                value={numero}
                                                onChangeText={setNumero}
                                                maxLength={9}
                                                onFocus={() => setFocusedField("num")}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                            {numero.length === 9 && (
                                                <MaterialIcons name="check-circle" size={20} color={MTN.success} style={{ marginRight: 12 }} />
                                            )}
                                        </View>
 
                                        {/* Séparateur OU */}
                                        <View style={styles.orRow}>
                                            <View style={styles.orLine} />
                                            <Text style={styles.orText}>ou</Text>
                                            <View style={styles.orLine} />
                                        </View>
 
                                        {/* Bouton scanner QR */}
                                        <TouchableOpacity
                                            style={styles.qrBtn}
                                            onPress={() => setShowScanner(true)}
                                            activeOpacity={0.85}
                                        >
                                            <View style={styles.qrBtnIcon}>
                                                <MaterialIcons name="qr-code-scanner" size={28} color={MTN.yellow} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.qrBtnTitle}>Scanner le QR code</Text>
                                                <Text style={styles.qrBtnSub}>
                                                    Scannez le code du destinataire pour remplir automatiquement
                                                </Text>
                                            </View>
                                            <MaterialIcons name="chevron-right" size={22} color={MTN.lightGray} />
                                        </TouchableOpacity>
                                    </>
                                )}
 
                                {/* ── MONTANT ──────────────────────────────── */}
                                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Montant (FCFA)</Text>
                                <View style={[styles.inputRow, focusedField === "amt" && styles.inputFocused]}>
                                    <MaterialIcons name="account-balance-wallet" size={20} color={focusedField === "amt" ? MTN.yellow : MTN.lightGray} style={{ marginLeft: 14 }} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        placeholderTextColor={MTN.lightGray}
                                        keyboardType="number-pad"
                                        value={montant}
                                        onChangeText={setMontant}
                                        onFocus={() => setFocusedField("amt")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    <Text style={styles.currency}>FCFA</Text>
                                </View>
 
                                <View style={styles.quickAmountsGrid}>
                                    {QUICK_AMOUNTS.map((a) => (
                                        <TouchableOpacity
                                            key={a}
                                            style={[styles.quickAmt, montant === String(a) && styles.quickAmtActive]}
                                            onPress={() => setMontant(String(a))}
                                        >
                                            <Text style={[styles.quickAmtText, montant === String(a) && styles.quickAmtTextActive]}>
                                                {a.toLocaleString("fr-FR")}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
 
                                <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                                    <Text style={styles.primaryBtnText}>CONTINUER</Text>
                                    <MaterialIcons name="arrow-forward" size={20} color={MTN.black} />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {/* ── RÉCAPITULATIF ────────────────────────── */}
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryTitle}>Récapitulatif</Text>
 
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Destinataire</Text>
                                        <View style={{ alignItems: "flex-end" }}>
                                            {nomDestinataire ? (
                                                <>
                                                    <Text style={styles.summaryValue}>{nomDestinataire}</Text>
                                                    <Text style={{ color: MTN.lightGray, fontSize: 12 }}>+242 {numero}</Text>
                                                </>
                                            ) : (
                                                <Text style={styles.summaryValue}>+242 {numero}</Text>
                                            )}
                                        </View>
                                    </View>
 
                                    {/* Badge QR si scanné */}
                                    {nomDestinataire ? (
                                        <View style={styles.qrVerifiedBadge}>
                                            <MaterialIcons name="qr-code-scanner" size={14} color={MTN.success} />
                                            <Text style={styles.qrVerifiedTxt}>Identité vérifiée par QR code</Text>
                                        </View>
                                    ) : null}
 
                                    <View style={styles.divider} />
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Montant</Text>
                                        <Text style={styles.summaryValue}>{parseInt(montant).toLocaleString("fr-FR")} FCFA</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Frais</Text>
                                        <Text style={[styles.summaryValue, { color: MTN.success }]}>Gratuit</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { fontWeight: "800", color: MTN.white }]}>Total débité</Text>
                                        <Text style={[styles.summaryValue, { color: MTN.yellow, fontWeight: "900", fontSize: 18 }]}>
                                            {parseInt(montant).toLocaleString("fr-FR")} FCFA
                                        </Text>
                                    </View>
                                </View>
 
                                <View style={[styles.inputRow, focusedField === "note" && styles.inputFocused, { marginTop: 12 }]}>
                                    <MaterialIcons name="edit-note" size={20} color={MTN.lightGray} style={{ marginLeft: 14 }} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Note (optionnel)"
                                        placeholderTextColor={MTN.lightGray}
                                        value={note}
                                        onChangeText={setNote}
                                        onFocus={() => setFocusedField("note")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
 
                                <TouchableOpacity style={styles.primaryBtn} onPress={handleSend} disabled={loading}>
                                    {loading ? (
                                        <Text style={styles.primaryBtnText}>Envoi en cours...</Text>
                                    ) : (
                                        <>
                                            <MaterialIcons name="send" size={20} color={MTN.black} />
                                            <Text style={styles.primaryBtnText}>CONFIRMER L'ENVOI</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                                    <Text style={styles.backBtnText}>← Modifier</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
 
// ─── STYLES PRINCIPAUX ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: MTN.black },
    header: { backgroundColor: MTN.yellow, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
    headerTitle: { fontSize: 22, fontWeight: "900", color: MTN.black, marginBottom: 12 },
    stepIndicator: { flexDirection: "row", alignItems: "center" },
    stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.3)" },
    stepDotActive: { backgroundColor: MTN.black },
    stepLine: { flex: 1, height: 2, backgroundColor: "rgba(0,0,0,0.2)", marginHorizontal: 6 },
    stepLineActive: { backgroundColor: MTN.black },
    content: { padding: 20 },
    sectionLabel: { fontSize: 12, fontWeight: "700", color: MTN.lightGray, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
    inputRow: {
        flexDirection: "row", alignItems: "center", backgroundColor: MTN.darkGray,
        borderRadius: 14, borderWidth: 1.5, borderColor: MTN.mediumGray, minHeight: 54,
    },
    inputFocused: { borderColor: MTN.yellow },
    prefixBadge: { paddingHorizontal: 12, paddingVertical: 6, marginLeft: 6, backgroundColor: "rgba(255,204,0,0.12)", borderRadius: 8 },
    prefixText: { fontSize: 13, color: MTN.yellow, fontWeight: "700" },
    input: { flex: 1, color: MTN.white, fontSize: 16, paddingHorizontal: 10, paddingVertical: 14 },
    currency: { color: MTN.lightGray, fontSize: 14, fontWeight: "700", marginRight: 14 },
 
    // OU séparateur
    orRow: { flexDirection: "row", alignItems: "center", marginVertical: 14, gap: 10 },
    orLine: { flex: 1, height: 1, backgroundColor: MTN.mediumGray },
    orText: { color: MTN.lightGray, fontSize: 13, fontWeight: "600" },
 
    // Bouton QR
    qrBtn: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: MTN.darkGray, borderRadius: 14,
        borderWidth: 1.5, borderColor: "rgba(255,204,0,0.35)",
        padding: 16,
    },
    qrBtnIcon: {
        width: 52, height: 52, borderRadius: 14,
        backgroundColor: "rgba(255,204,0,0.1)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(255,204,0,0.25)",
    },
    qrBtnTitle: { fontSize: 15, fontWeight: "800", color: MTN.white, marginBottom: 3 },
    qrBtnSub: { fontSize: 12, color: MTN.lightGray, lineHeight: 17 },
 
    // Carte destinataire scanné
    scannedCard: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: "rgba(0,200,83,0.07)", borderRadius: 14,
        borderWidth: 1.5, borderColor: "rgba(0,200,83,0.35)",
        padding: 14,
    },
    scannedAvatar: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
    },
    scannedAvatarTxt: { fontSize: 16, fontWeight: "900", color: MTN.black },
    scannedName: { fontSize: 15, fontWeight: "800", color: MTN.white },
    scannedSub: { fontSize: 12, color: MTN.lightGray, marginTop: 2 },
    scannedBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: "rgba(0,200,83,0.15)", borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    scannedBadgeTxt: { fontSize: 11, fontWeight: "700", color: MTN.success },
 
    // Badge QR vérifié dans récap
    qrVerifiedBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "rgba(0,200,83,0.08)", borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
        borderWidth: 1, borderColor: "rgba(0,200,83,0.2)",
    },
    qrVerifiedTxt: { fontSize: 12, color: MTN.success, fontWeight: "600" },
 
    // Montants rapides
    quickAmountsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16, marginBottom: 28 },
    quickAmt: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: MTN.mediumGray, backgroundColor: MTN.darkGray },
    quickAmtActive: { borderColor: MTN.yellow, backgroundColor: "rgba(255,204,0,0.12)" },
    quickAmtText: { color: MTN.lightGray, fontWeight: "700", fontSize: 13 },
    quickAmtTextActive: { color: MTN.yellow },
 
    // Boutons
    primaryBtn: {
        backgroundColor: MTN.yellow, borderRadius: 14, height: 56,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        shadowColor: MTN.yellow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
    },
    primaryBtnText: { color: MTN.black, fontSize: 16, fontWeight: "900", letterSpacing: 0.8 },
    backBtn: { alignItems: "center", marginTop: 16 },
    backBtnText: { color: MTN.lightGray, fontSize: 14, fontWeight: "600" },
 
    // Récapitulatif
    summaryCard: { backgroundColor: MTN.darkGray, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: MTN.mediumGray, marginBottom: 16 },
    summaryTitle: { fontSize: 16, fontWeight: "800", color: MTN.white, marginBottom: 16 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
    summaryLabel: { fontSize: 14, color: MTN.lightGray },
    summaryValue: { fontSize: 14, fontWeight: "700", color: MTN.white },
    divider: { height: 1, backgroundColor: MTN.mediumGray },
 
    // Succès
    successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    successCircle: {
        width: 120, height: 120, borderRadius: 60, backgroundColor: MTN.yellow,
        alignItems: "center", justifyContent: "center",
        shadowColor: MTN.yellow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, marginBottom: 28,
    },
    successTitle: { fontSize: 26, fontWeight: "900", color: MTN.white, marginBottom: 10 },
    successSub: { fontSize: 15, color: MTN.lightGray, textAlign: "center", lineHeight: 22, marginBottom: 36 },
    newTransferBtn: { backgroundColor: MTN.yellow, borderRadius: 14, height: 56, paddingHorizontal: 32, alignItems: "center", justifyContent: "center" },
    newTransferText: { color: MTN.black, fontWeight: "900", fontSize: 16 },
});
 
// ─── STYLES SCANNER ───────────────────────────────────────────────────────────
const qrStyles = StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: MTN.black },
    txt: { color: MTN.lightGray, fontSize: 14 },
    permTitle: { fontSize: 20, fontWeight: "800", color: MTN.white, marginTop: 16, marginBottom: 8 },
    permSub: { fontSize: 14, color: MTN.lightGray, textAlign: "center", lineHeight: 21, marginBottom: 28 },
    permBtn: { backgroundColor: MTN.yellow, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
    permBtnText: { color: MTN.black, fontWeight: "900", fontSize: 15 },
 
    scanHeader: {
        backgroundColor: MTN.yellow, flexDirection: "row",
        alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center",
    },
    scanTitle: { fontSize: 16, fontWeight: "800", color: MTN.black, flex: 1 },
 
    // Viseur
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
    viewfinder: { width: 240, height: 240, position: "relative" },
    corner: { position: "absolute", width: 30, height: 30, borderColor: MTN.yellow, borderWidth: 3 },
    cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 6 },
    cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 6 },
    cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 6 },
    cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 6 },
    scanHint: { color: MTN.white, fontSize: 13, marginTop: 260, textAlign: "center", fontWeight: "600", textShadowColor: "#000", textShadowRadius: 4 },
 
    errorBanner: {
        position: "absolute", bottom: 40, left: 20, right: 20,
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: MTN.darkGray, borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: MTN.error,
    },
    errorTxt: { color: MTN.error, fontSize: 13, flex: 1 },
});
