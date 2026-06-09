import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API_URL from "../backend/api";
import PasswordModal from "../components/PasswordModal";
 
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
 
// ─── Catalogue des services ────────────────────────────────────────────────────
type Service = {
    key: string;
    label: string;
    icon: string;
    color: string;
    bg: string;
    placeholder: string;
    hint: string;
    montants_fixes?: number[];
};
 
const SERVICES: Service[] = [
    {
        key: "SNDE",
        label: "SNDE",
        icon: "water-drop",
        color: "#2196F3",
        bg: "#2196F318",
        placeholder: "N° compteur (ex: 12345678)",
        hint: "Numéro de compteur SNDE à 8 chiffres",
        montants_fixes: [],
    },
    {
        key: "CANAL+",
        label: "Canal+",
        icon: "tv",
        color: "#9C27B0",
        bg: "#9C27B018",
        placeholder: "N° abonné Canal+ (ex: 7001234567)",
        hint: "Numéro d'abonné Canal+ à 10 chiffres",
        montants_fixes: [9500, 14500, 19900, 29900],
    },
    {
        key: "ENERGIE",
        label: "E2C Énergie",
        icon: "bolt",
        color: "#FF9800",
        bg: "#FF980018",
        placeholder: "N° compteur énergie",
        hint: "Numéro de compteur électrique",
        montants_fixes: [],
    },
    {
        key: "AIRTEL",
        label: "Airtel Money",
        icon: "phone-android",
        color: "#F44336",
        bg: "#F4433618",
        placeholder: "Numéro Airtel (ex: 05XXXXXXX)",
        hint: "Numéro de téléphone Airtel Congo",
        montants_fixes: [1000, 2000, 5000, 10000],
    },
    {
        key: "SCHOOL",
        label: "Scolarité",
        icon: "school",
        color: "#00BCD4",
        bg: "#00BCD418",
        placeholder: "N° dossier étudiant",
        hint: "Numéro de dossier de l'établissement",
        montants_fixes: [],
    },
    {
        key: "TAX",
        label: "Taxes & Impôts",
        icon: "account-balance",
        color: "#607D8B",
        bg: "#607D8B18",
        placeholder: "Référence avis d'imposition",
        hint: "Référence figurant sur votre avis d'imposition",
        montants_fixes: [],
    },
];
 
// ─── Canal+ montant labels ─────────────────────────────────────────────────────
const CANAL_LABELS: Record<number, string> = {
    9500:  "Evasion",
    14500: "Tout Canal+",
    19900: "Canal+ Sport",
    29900: "Max",
};
 
type Step = "select" | "form" | "confirm" | "success";
 
export default function PaymentScreen() {
    const insets = useSafeAreaInsets();
 
    const [step, setStep]                 = useState<Step>("select");
    const [service, setService]           = useState<Service | null>(null);
    const [refFacture, setRefFacture]     = useState("");
    const [montant, setMontant]           = useState("");
    const [refFocused, setRefFocused]     = useState(false);
    const [montantFocused, setMontantFocused] = useState(false);
    const [verifying, setVerifying]       = useState(false);
    const [verifyData, setVerifyData]     = useState<any>(null);
    const [verifyError, setVerifyError]   = useState("");
    const [loading, setLoading]           = useState(false);
    const [sendError, setSendError]       = useState("");
    const [successData, setSuccessData]   = useState<any>(null);
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [currentUser, setCurrentUser]   = useState<any>(null);
 
    const shakeAnim     = useRef(new Animated.Value(0)).current;
    const successScale  = useRef(new Animated.Value(0)).current;
    const fadeAnim      = useRef(new Animated.Value(1)).current;
 
    // Charger l'utilisateur
    React.useEffect(() => {
        AsyncStorage.getItem("user").then((v) => { if (v) setCurrentUser(JSON.parse(v)); });
    }, []);
 
    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 7, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]).start();
    };
 
    const animateTransition = (cb: () => void) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            cb();
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        });
    };
 
    // ─── Sélectionner un service ───────────────────────────────────────────
    const handleSelectService = (s: Service) => {
        animateTransition(() => {
            setService(s);
            setRefFacture("");
            setMontant("");
            setVerifyData(null);
            setVerifyError("");
            setStep("form");
        });
    };
 
    // ─── Vérifier la facture ───────────────────────────────────────────────
    const handleVerify = async () => {
        if (!refFacture.trim() || refFacture.trim().length < 4) {
            setVerifyError("Référence invalide.");
            shake(); return;
        }
        if (!service) return;
        setVerifying(true); setVerifyError("");
        try {
            const res = await fetch(
                `${API_URL}/api/paiements/verifier?service=${service.key}&ref_facture=${encodeURIComponent(refFacture.trim())}`
            );
            const data = await res.json();
            if (res.ok) {
                setVerifyData(data);
                if (data.montants_fixes?.length > 0) setMontant(String(data.montants_fixes[0]));
            } else {
                setVerifyError(data.error ?? "Référence introuvable.");
                shake();
            }
        } catch {
            setVerifyError("Impossible de vérifier. Vérifiez votre connexion.");
            shake();
        } finally {
            setVerifying(false);
        }
    };
 
    // ─── Aller à la confirmation ───────────────────────────────────────────
    const handleNext = () => {
        if (!verifyData) { setVerifyError("Vérifiez d'abord la référence."); shake(); return; }
        if (!montant || parseInt(montant) < 100) { shake(); return; }
        setSendError("");
        animateTransition(() => setStep("confirm"));
    };
 
    // ─── Payer (appelé après validation mot de passe) ──────────────────────
    const handlePay = async () => {
        if (!currentUser || !service) return;
        setSendError(""); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/paiements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    numero: currentUser.numero,
                    service: service.key,
                    ref_facture: refFacture.trim(),
                    montant: parseFloat(montant),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setSendError(data.error ?? "Erreur paiement."); shake(); return; }
 
            // Mettre à jour le solde local
            const updated = { ...currentUser, solde: data.nouveau_solde };
            await AsyncStorage.setItem("user", JSON.stringify(updated));
            setCurrentUser(updated);
 
            setSuccessData(data);
            animateTransition(() => setStep("success"));
            Animated.spring(successScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
        } catch {
            setSendError("Impossible de contacter le serveur.");
            shake();
        } finally {
            setLoading(false);
        }
    };
 
    const resetAll = () => {
        animateTransition(() => {
            setStep("select"); setService(null); setRefFacture(""); setMontant("");
            setVerifyData(null); setVerifyError(""); setSendError(""); setSuccessData(null);
            successScale.setValue(0);
        });
    };
 
    // ══════════════════════════════════════════════════════════════════════
    // ─── RENDER ───────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════
    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.black} />
 
            
 
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }}>
 
                        {/* ══ ÉTAPE 1 : Sélection service ══════════════════ */}
                        {step === "select" && (
                            <>
                                <Text style={styles.sectionLabel}>Choisissez un service</Text>
                                <View style={styles.serviceGrid}>
                                    {SERVICES.map((s) => (
                                        <TouchableOpacity
                                            key={s.key}
                                            style={styles.serviceCard}
                                            onPress={() => handleSelectService(s)}
                                            activeOpacity={0.78}
                                        >
                                            <View style={[styles.serviceIcon, { backgroundColor: s.bg }]}>
                                                <MaterialIcons name={s.icon as any} size={28} color={s.color} />
                                            </View>
                                            <Text style={styles.serviceLabel}>{s.label}</Text>
                                            <MaterialIcons name="chevron-right" size={16} color={MTN.lightGray} style={{ marginTop: 2 }} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}
 
                        {/* ══ ÉTAPE 2 : Formulaire ══════════════════════════ */}
                        {step === "form" && service && (
                            <>
                                {/* Carte service sélectionné */}
                                <View style={[styles.selectedServiceCard, { borderColor: service.color + "50" }]}>
                                    <View style={[styles.selectedServiceIcon, { backgroundColor: service.bg }]}>
                                        <MaterialIcons name={service.icon as any} size={26} color={service.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.selectedServiceLabel}>{service.label}</Text>
                                        <Text style={styles.selectedServiceHint}>{service.hint}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => animateTransition(() => setStep("select"))} style={styles.changeBtn}>
                                        <Text style={[styles.changeBtnTxt, { color: service.color }]}>Changer</Text>
                                    </TouchableOpacity>
                                </View>
 
                                {/* Référence facture */}
                                <Text style={styles.fieldLabel}>Référence / N° de compte</Text>
                                <View style={[styles.inputRow, refFocused && styles.inputRowFocused, verifyError && styles.inputRowError]}>
                                    <MaterialIcons name="tag" size={18} color={refFocused ? service.color : MTN.lightGray} style={{ marginLeft: 14 }} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={service.placeholder}
                                        placeholderTextColor={MTN.lightGray}
                                        value={refFacture}
                                        onChangeText={(t) => { setRefFacture(t); setVerifyData(null); setVerifyError(""); }}
                                        autoCapitalize="none"
                                        keyboardType="default"
                                        onFocus={() => setRefFocused(true)}
                                        onBlur={() => setRefFocused(false)}
                                        returnKeyType="search"
                                        onSubmitEditing={handleVerify}
                                    />
                                    {refFacture.length >= 4 && !verifyData && (
                                        <TouchableOpacity
                                            onPress={handleVerify}
                                            style={[styles.verifyBtn, { backgroundColor: service.color }]}
                                            disabled={verifying}
                                        >
                                            <Text style={styles.verifyBtnTxt}>{verifying ? "..." : "Vérifier"}</Text>
                                        </TouchableOpacity>
                                    )}
                                    {verifyData && (
                                        <MaterialIcons name="check-circle" size={20} color={MTN.success} style={{ marginRight: 12 }} />
                                    )}
                                </View>
 
                                {/* Erreur vérification */}
                                {verifyError ? (
                                    <View style={styles.errorRow}>
                                        <MaterialIcons name="error-outline" size={13} color={MTN.error} />
                                        <Text style={styles.errorTxt}>{verifyError}</Text>
                                    </View>
                                ) : null}
 
                                {/* Résultat vérification */}
                                {verifyData && (
                                    <View style={[styles.verifyResult, { borderColor: service.color + "40" }]}>
                                        <MaterialIcons name="verified" size={16} color={MTN.success} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.verifyResultTitle}>{verifyData.client}</Text>
                                            <Text style={styles.verifyResultSub}>Ref: {verifyData.ref_facture}</Text>
                                        </View>
                                        <View style={styles.verifiedBadge}>
                                            <Text style={styles.verifiedBadgeTxt}>Vérifié</Text>
                                        </View>
                                    </View>
                                )}
 
                                {/* Montant */}
                                {verifyData && (
                                    <>
                                        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Montant à payer (FCFA)</Text>
 
                                        {/* Montants fixes (Canal+, Airtel…) */}
                                        {service.montants_fixes && service.montants_fixes.length > 0 ? (
                                            <View style={styles.montantsGrid}>
                                                {service.montants_fixes.map((m) => (
                                                    <TouchableOpacity
                                                        key={m}
                                                        style={[styles.montantChip, montant === String(m) && [styles.montantChipActive, { borderColor: service.color }]]}
                                                        onPress={() => setMontant(String(m))}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Text style={[styles.montantChipTxt, montant === String(m) && { color: service.color }]}>
                                                            {m.toLocaleString("fr-FR")} F
                                                        </Text>
                                                        {CANAL_LABELS[m] && (
                                                            <Text style={[styles.montantChipSub, montant === String(m) && { color: service.color + "BB" }]}>
                                                                {CANAL_LABELS[m]}
                                                            </Text>
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        ) : (
                                            /* Montant libre */
                                            <View style={[styles.inputRow, montantFocused && styles.inputRowFocused]}>
                                                <MaterialIcons name="account-balance-wallet" size={18}
                                                    color={montantFocused ? service.color : MTN.lightGray}
                                                    style={{ marginLeft: 14 }} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Montant"
                                                    placeholderTextColor={MTN.lightGray}
                                                    keyboardType="number-pad"
                                                    value={montant}
                                                    onChangeText={setMontant}
                                                    onFocus={() => setMontantFocused(true)}
                                                    onBlur={() => setMontantFocused(false)}
                                                    returnKeyType="done"
                                                />
                                                <Text style={styles.currency}>FCFA</Text>
                                            </View>
                                        )}
 
                                        <TouchableOpacity
                                            style={[styles.primaryBtn, { backgroundColor: service.color }, (!montant || parseInt(montant) < 100) && styles.primaryBtnDisabled]}
                                            onPress={handleNext}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.primaryBtnTxt}>CONTINUER</Text>
                                            <MaterialIcons name="arrow-forward" size={20} color={MTN.white} />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </>
                        )}
 
                        {/* ══ ÉTAPE 3 : Confirmation ════════════════════════ */}
                        {step === "confirm" && service && verifyData && (
                            <>
                                {/* Récap */}
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryTitle}>Récapitulatif</Text>
 
                                    <View style={[styles.summaryServiceRow, { backgroundColor: service.bg }]}>
                                        <MaterialIcons name={service.icon as any} size={22} color={service.color} />
                                        <Text style={[styles.summaryServiceLabel, { color: service.color }]}>{service.label}</Text>
                                    </View>
 
                                    {[
                                        { label: "Référence", value: refFacture.trim() },
                                        { label: "Client",    value: verifyData.client },
                                        { label: "Montant",   value: `${parseInt(montant).toLocaleString("fr-FR")} FCFA`, accent: true },
                                        { label: "Frais",     value: "Gratuit", green: true },
                                    ].map((row) => (
                                        <View key={row.label} style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>{row.label}</Text>
                                            <Text style={[
                                                styles.summaryValue,
                                                row.accent && { color: MTN.yellow, fontSize: 16, fontWeight: "900" },
                                                row.green  && { color: MTN.success },
                                            ]}>{row.value}</Text>
                                        </View>
                                    ))}
 
                                    <View style={styles.divider} />
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { fontWeight: "800", color: MTN.white }]}>Total débité</Text>
                                        <Text style={[styles.summaryValue, { color: MTN.yellow, fontSize: 18, fontWeight: "900" }]}>
                                            {parseInt(montant).toLocaleString("fr-FR")} FCFA
                                        </Text>
                                    </View>
 
                                    {currentUser?.solde !== undefined && (
                                        <>
                                            <View style={styles.divider} />
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Solde après</Text>
                                                <Text style={[
                                                    styles.summaryValue,
                                                    (parseFloat(currentUser.solde) - parseInt(montant)) < 0 && { color: MTN.error }
                                                ]}>
                                                    {(parseFloat(currentUser.solde) - parseInt(montant)).toLocaleString("fr-FR")} FCFA
                                                </Text>
                                            </View>
                                        </>
                                    )}
                                </View>
 
                                {sendError ? (
                                    <View style={styles.errorRow}>
                                        <MaterialIcons name="error-outline" size={13} color={MTN.error} />
                                        <Text style={styles.errorTxt}>{sendError}</Text>
                                    </View>
                                ) : null}
 
                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: service.color }, loading && styles.primaryBtnDisabled]}
                                    onPress={() => setShowPwdModal(true)}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    <MaterialIcons name="lock" size={18} color={MTN.white} />
                                    <Text style={styles.primaryBtnTxt}>
                                        {loading ? "Paiement en cours..." : "PAYER MAINTENANT"}
                                    </Text>
                                </TouchableOpacity>
 
                                <TouchableOpacity style={styles.modifyBtn} onPress={() => animateTransition(() => setStep("form"))}>
                                    <Text style={styles.modifyBtnTxt}>← Modifier</Text>
                                </TouchableOpacity>
                            </>
                        )}
 
                        {/* ══ SUCCÈS ════════════════════════════════════════ */}
                        {step === "success" && successData && service && (
                            <View style={styles.successContainer}>
                                <Animated.View style={[styles.successCircle, { backgroundColor: service.color, transform: [{ scale: successScale }] }]}>
                                    <MaterialIcons name="check" size={56} color={MTN.white} />
                                </Animated.View>
 
                                <Text style={styles.successTitle}>Paiement réussi !</Text>
                                <Text style={styles.successSub}>
                                    {parseInt(montant).toLocaleString("fr-FR")} FCFA payés à{" "}
                                    <Text style={{ color: service.color, fontWeight: "900" }}>{service.label}</Text>
                                </Text>
 
                                {/* Référence */}
                                <View style={styles.refBox}>
                                    <Text style={styles.refLbl}>Référence paiement</Text>
                                    <Text style={styles.refVal}>{successData.reference}</Text>
                                </View>
 
                                {/* Nouveau solde */}
                                <View style={styles.newSoldeBox}>
                                    <MaterialIcons name="account-balance-wallet" size={15} color={MTN.lightGray} />
                                    <Text style={styles.newSoldeTxt}>
                                        Nouveau solde :{" "}
                                        <Text style={{ color: MTN.yellow, fontWeight: "900" }}>
                                            {parseFloat(successData.nouveau_solde ?? 0).toLocaleString("fr-FR")} FCFA
                                        </Text>
                                    </Text>
                                </View>
 
                                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: service.color, marginTop: 0 }]} onPress={resetAll}>
                                    <Text style={styles.primaryBtnTxt}>Nouveau paiement</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modifyBtn} onPress={() => router.back()}>
                                    <Text style={styles.modifyBtnTxt}>Retour à MoMo</Text>
                                </TouchableOpacity>
                            </View>
                        )}
 
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
 
            {/* ── MODAL MOT DE PASSE ────────────────────────────────────── */}
            <PasswordModal
                visible={showPwdModal}
                title="Confirmer le paiement"
                subtitle={`Saisissez votre mot de passe pour payer ${parseInt(montant || "0").toLocaleString("fr-FR")} FCFA à ${service?.label}`}
                confirmLabel="Payer"
                onConfirm={() => { setShowPwdModal(false); handlePay(); }}
                onCancel={() => setShowPwdModal(false)}
            />
        </View>
    );
}
 
// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: MTN.black },
 
    // Header
    header: {
        backgroundColor: MTN.yellow,
        paddingHorizontal: 16,
        paddingBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    headerTopAccent: {
        height: 3,
        backgroundColor: "rgba(0,0,0,0.15)",
        width: "35%",
        borderBottomRightRadius: 4,
        marginBottom: 10,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    backBtn: {
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.12)",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
    },
    backBtnCorner: {
        position: "absolute", top: 0, right: 0,
        width: 10, height: 10,
        backgroundColor: "rgba(0,0,0,0.18)",
        borderBottomLeftRadius: 6,
    },
    headerTitle: { fontSize: 17, fontWeight: "900", color: MTN.black },
    headerSub: { fontSize: 12, color: "rgba(0,0,0,0.5)", fontWeight: "600" },
    mtnBadge: {
        backgroundColor: MTN.black, borderRadius: 8,
        paddingHorizontal: 9, paddingVertical: 4,
    },
    mtnBadgeText: { fontSize: 11, fontWeight: "900", color: MTN.yellow, letterSpacing: 1.5 },
    stepper: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 },
    stepDot: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: "rgba(0,0,0,0.2)",
        alignItems: "center", justifyContent: "center",
    },
    stepDotActive: { backgroundColor: MTN.black },
    stepNum: { fontSize: 11, fontWeight: "900", color: MTN.yellow },
    stepLine: { flex: 1, height: 2, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 1 },
    stepLineActive: { backgroundColor: MTN.black },
    stepLabel: { fontSize: 11, fontWeight: "700", color: "rgba(0,0,0,0.55)", marginLeft: 4 },
    soldeChip: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: "rgba(0,0,0,0.1)", borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        alignSelf: "flex-start",
    },
    soldeChipTxt: { fontSize: 11, fontWeight: "800", color: "rgba(0,0,0,0.65)" },
 
    scroll: { padding: 18, paddingBottom: 60 },
 
    sectionLabel: {
        fontSize: 11, fontWeight: "700", color: MTN.lightGray,
        letterSpacing: 1, textTransform: "uppercase", marginBottom: 14,
    },
 
    // Service grid
    serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    serviceCard: {
        width: "47%",
        backgroundColor: MTN.darkGray,
        borderRadius: 16, padding: 18,
        borderWidth: 1, borderColor: MTN.mediumGray,
        alignItems: "center", gap: 10,
    },
    serviceIcon: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    serviceLabel: { fontSize: 13, fontWeight: "800", color: MTN.white, textAlign: "center" },
 
    // Selected service card
    selectedServiceCard: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: MTN.darkGray, borderRadius: 16,
        borderWidth: 1.5, padding: 14, marginBottom: 22,
    },
    selectedServiceIcon: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    selectedServiceLabel: { fontSize: 15, fontWeight: "800", color: MTN.white, marginBottom: 2 },
    selectedServiceHint: { fontSize: 11, color: MTN.lightGray, lineHeight: 15 },
    changeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
    changeBtnTxt: { fontSize: 12, fontWeight: "800" },
 
    // Input
    fieldLabel: {
        fontSize: 11, fontWeight: "700", color: MTN.lightGray,
        letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8,
    },
    inputRow: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: MTN.darkGray, borderRadius: 14,
        borderWidth: 1.5, borderColor: MTN.mediumGray, minHeight: 52,
        marginBottom: 6,
    },
    inputRowFocused: { borderColor: MTN.yellow },
    inputRowError:  { borderColor: MTN.error, backgroundColor: "rgba(255,68,68,0.04)" },
    input: { flex: 1, color: MTN.white, fontSize: 15, paddingHorizontal: 10, paddingVertical: 13 },
    currency: { color: MTN.lightGray, fontSize: 13, fontWeight: "700", marginRight: 14 },
    verifyBtn: {
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8,
    },
    verifyBtnTxt: { color: MTN.white, fontWeight: "800", fontSize: 12 },
 
    errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
    errorTxt:  { color: MTN.error, fontSize: 12, fontWeight: "600", flex: 1 },
 
    verifyResult: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: "rgba(0,200,83,0.07)", borderRadius: 12,
        borderWidth: 1.5, padding: 12, marginBottom: 4,
    },
    verifyResultTitle: { fontSize: 14, color: MTN.white, fontWeight: "700" },
    verifyResultSub:   { fontSize: 11, color: MTN.lightGray, marginTop: 1 },
    verifiedBadge: {
        backgroundColor: "rgba(0,200,83,0.15)", borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    verifiedBadgeTxt: { fontSize: 10, fontWeight: "800", color: MTN.success },
 
    // Montants
    montantsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
    montantChip: {
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 12, borderWidth: 1.5, borderColor: MTN.mediumGray,
        backgroundColor: MTN.darkGray, alignItems: "center", minWidth: "45%",
    },
    montantChipActive: { backgroundColor: "rgba(255,204,0,0.07)" },
    montantChipTxt:    { fontSize: 14, color: MTN.lightGray, fontWeight: "800" },
    montantChipSub:    { fontSize: 10, color: MTN.lightGray, marginTop: 2, fontWeight: "600" },
 
    // Primary button
    primaryBtn: {
        height: 56, borderRadius: 14, marginTop: 20,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnTxt: { color: MTN.white, fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
    modifyBtn: { alignItems: "center", marginTop: 16 },
    modifyBtnTxt: { color: MTN.lightGray, fontSize: 14, fontWeight: "600" },
 
    // Summary
    summaryCard: {
        backgroundColor: MTN.darkGray, borderRadius: 18,
        borderWidth: 1, borderColor: MTN.mediumGray,
        overflow: "hidden", marginBottom: 4,
    },
    summaryTitle: {
        fontSize: 15, fontWeight: "800", color: MTN.white,
        paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    },
    summaryServiceRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: 18, paddingVertical: 10, marginBottom: 4,
    },
    summaryServiceLabel: { fontSize: 15, fontWeight: "900" },
    summaryRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 18, paddingVertical: 11,
        borderTopWidth: 1, borderTopColor: MTN.mediumGray,
    },
    summaryLabel: { fontSize: 13, color: MTN.lightGray },
    summaryValue: { fontSize: 13, fontWeight: "700", color: MTN.white },
    divider: { height: 1, backgroundColor: MTN.mediumGray, marginHorizontal: 18 },
 
    // Succès
    successContainer: { alignItems: "center", paddingTop: 20, paddingBottom: 20 },
    successCircle: {
        width: 110, height: 110, borderRadius: 55,
        alignItems: "center", justifyContent: "center",
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35, shadowRadius: 18, elevation: 10,
    },
    successTitle: { fontSize: 24, fontWeight: "900", color: MTN.white, marginBottom: 8 },
    successSub: { fontSize: 14, color: MTN.lightGray, textAlign: "center", lineHeight: 22, marginBottom: 24 },
    refBox: {
        backgroundColor: MTN.darkGray, borderRadius: 12,
        borderWidth: 1, borderColor: MTN.mediumGray,
        paddingHorizontal: 20, paddingVertical: 12,
        alignItems: "center", width: "100%", marginBottom: 12,
    },
    refLbl:  { fontSize: 10, color: MTN.lightGray, fontWeight: "700", letterSpacing: 0.8, marginBottom: 4 },
    refVal:  { fontSize: 15, color: MTN.white, fontWeight: "900", letterSpacing: 1 },
    newSoldeBox: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "rgba(255,204,0,0.07)", borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
        marginBottom: 28, width: "100%",
        borderWidth: 1, borderColor: "rgba(255,204,0,0.2)",
    },
    newSoldeTxt: { fontSize: 13, color: MTN.lightGray },
});