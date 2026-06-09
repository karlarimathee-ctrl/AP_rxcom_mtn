import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
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
import API_URL from "../backend/api";
 
const C = {
    yellow:  "#FFCC00",
    black:   "#0A0A0A",
    dark:    "#141414",
    card:    "#1A1A1A",
    surface: "#222222",
    border:  "#2E2E2E",
    gray:    "#777777",
    light:   "#CCCCCC",
    white:   "#F5F5F5",
    green:   "#00D97E",
    error:   "#FF4559",
    blue:    "#3B8BFF",
};
 
const MONTANTS_CARTE = [1000, 2000, 5000, 10000, 25000, 50000];
 
type Step = "choix" | "code" | "qr" | "confirmation" | "succes" | "banque" | "banque_form" | "banque_confirm" | "banque_succes";
type Carte = { code: string; montant: number; expires_at: string | null };
 
// ─── Banques du Congo ──────────────────────────────────────────────────────────
type Banque = {
    key: string;
    nom: string;
    abrev: string;
    color: string;
    swift: string;
    pays: string;
};
 
const BANQUES_CONGO: Banque[] = [
    { key: "UBA",     nom: "United Bank for Africa",          abrev: "UBA",     color: "#E30613", swift: "UNAFCGCG", pays: "Congo" },
    { key: "BGFI",    nom: "BGFI Bank Congo",                 abrev: "BGFI",    color: "#003F7F", swift: "BGFICGCG", pays: "Congo" },
    { key: "LCB",     nom: "La Congolaise de Banque",         abrev: "LCB",     color: "#006B3F", swift: "LCBKCGCG", pays: "Congo" },
    { key: "ECOBANK", nom: "Ecobank Congo",                   abrev: "ECO",     color: "#00AEEF", swift: "ECOCGCG1", pays: "Congo" },
    { key: "CREDIT_DU_CONGO", nom: "Crédit du Congo",        abrev: "CDC",     color: "#8B0000", swift: "CDCOCGCG", pays: "Congo" },
    { key: "SOCIETE_GENERALE", nom: "Société Générale Congo", abrev: "SG",     color: "#E60026", swift: "SOGEBRPR", pays: "Congo" },
    { key: "COFIPA",  nom: "COFIPA Investment Bank Congo",    abrev: "COFIPA",  color: "#FF6B00", swift: "COFICGCG", pays: "Congo" },
    { key: "MUCODEC", nom: "MUCODEC",                         abrev: "MUCODEC", color: "#2E7D32", swift: "MUCOCGCG", pays: "Congo" },
];
 
// ─── SCANNER QR ───────────────────────────────────────────────────────────────
function ScannerQR({ onScanned, onClose }: {
    onScanned: (code: string) => void;
    onClose: () => void;
}) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [errMsg, setErrMsg]   = useState("");
 
    const handleBarcode = ({ data }: { data: string }) => {
        if (scanned) return;
        // Le QR d'une carte contient soit le code brut, soit un JSON { code }
        try {
            let code = data.trim();
            try { const j = JSON.parse(data); code = j.code ?? data; } catch {}
            // Format attendu : XXXX-XXXX-XXXX-XXXX ou 16 chiffres
            const clean = code.replace(/[\s\-]/g, "");
            if (!/^\d{16}$/.test(clean)) {
                setErrMsg("QR invalide — ce n'est pas une carte MTN MoMo.");
                return;
            }
            setScanned(true);
            Vibration.vibrate(120);
            // Reformater avec tirets
            const fmt = clean.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, "$1-$2-$3-$4");
            onScanned(fmt);
        } catch {
            setErrMsg("Impossible de lire ce QR code.");
        }
    };
 
    if (!permission) return (
        <View style={qs.center}><Text style={qs.txt}>Vérification permissions…</Text></View>
    );
 
    if (!permission.granted) return (
        <View style={qs.center}>
            <MaterialIcons name="camera-alt" size={56} color={C.yellow} />
            <Text style={qs.title}>Accès caméra requis</Text>
            <Text style={qs.sub}>Pour scanner la carte, autorisez la caméra.</Text>
            <TouchableOpacity style={qs.btn} onPress={requestPermission}>
                <Text style={qs.btnTxt}>Autoriser</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
                <Text style={{ color: C.gray, fontSize: 14 }}>Annuler</Text>
            </TouchableOpacity>
        </View>
    );
 
    return (
        <View style={{ flex: 1, backgroundColor: C.black }}>
            {/* Header */}
            <View style={qs.header}>
                <TouchableOpacity onPress={onClose} style={qs.closeBtn}>
                    <MaterialIcons name="close" size={22} color={C.black} />
                </TouchableOpacity>
                <View>
                    <Text style={qs.headerTitle}>Scanner la carte</Text>
                    <Text style={qs.headerSub}>Pointez le QR code de votre carte MTN</Text>
                </View>
            </View>
 
            <CameraView style={{ flex: 1 }} facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={scanned ? undefined : handleBarcode}
            />
 
            {/* Viseur */}
            <View style={qs.overlay} pointerEvents="none">
                {/* Fond semi-transparent autour du viseur */}
                <View style={qs.overlayTop} />
                <View style={qs.overlayMiddle}>
                    <View style={qs.overlaySide} />
                    <View style={qs.viewfinder}>
                        <View style={[qs.corner, qs.TL]} />
                        <View style={[qs.corner, qs.TR]} />
                        <View style={[qs.corner, qs.BL]} />
                        <View style={[qs.corner, qs.BR]} />
                        {/* Ligne de scan animée */}
                        <View style={qs.scanLine} />
                    </View>
                    <View style={qs.overlaySide} />
                </View>
                <View style={qs.overlayBottom}>
                    <MaterialIcons name="credit-card" size={20} color={C.yellow} />
                    <Text style={qs.hint}>Placez le QR code de la carte dans le cadre</Text>
                </View>
            </View>
 
            {errMsg ? (
                <View style={qs.errBanner}>
                    <MaterialIcons name="error-outline" size={16} color={C.error} />
                    <Text style={qs.errTxt}>{errMsg}</Text>
                    <TouchableOpacity onPress={() => { setErrMsg(""); setScanned(false); }}>
                        <Text style={{ color: C.yellow, fontWeight: "700", fontSize: 13 }}>Réessayer</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
}
 
// ─── ÉCRAN PRINCIPAL ──────────────────────────────────────────────────────────
export default function RechargeScreen() {
    const [user, setUser]         = useState<any>(null);
    const [step, setStep]         = useState<Step>("choix");
    const [code, setCode]         = useState("");
    const [codeDisplay, setCodeDisplay] = useState(""); // avec tirets
    const [carte, setCarte]       = useState<Carte | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState("");
    const [successData, setSuccessData] = useState<any>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [historique, setHistorique]   = useState<any[]>([]);
    const [showHisto, setShowHisto]     = useState(false);
 
    // ── États virement bancaire ──────────────────────────────────────────
    const [selectedBanque, setSelectedBanque] = useState<Banque | null>(null);
    const [numCompte,   setNumCompte]   = useState("");
    const [titulaire,   setTitulaire]   = useState("");
    const [montantVir,  setMontantVir]  = useState("");
    const [virFocused,  setVirFocused]  = useState<string | null>(null);
    const [virSuccessData, setVirSuccessData] = useState<any>(null);
 
    const shakeAnim    = useRef(new Animated.Value(0)).current;
    const successScale = useRef(new Animated.Value(0)).current;
    const fadeAnim     = useRef(new Animated.Value(0)).current;
 
    useEffect(() => {
        AsyncStorage.getItem("user").then((v) => {
            if (v) { const u = JSON.parse(v); setUser(u); fetchHistorique(u.numero); }
        });
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);
 
    const fetchHistorique = async (numero: string) => {
        try {
            const res = await fetch(`${API_URL}/api/recharges?numero=${numero}&limit=5`);
            if (res.ok) setHistorique(await res.json());
        } catch {}
    };
 
    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };
 
    // ─── Formater le code avec tirets auto ────────────────────────────────
    const handleCodeChange = (val: string) => {
        // Supprimer tout sauf chiffres
        const digits = val.replace(/\D/g, "").slice(0, 16);
        // Grouper par 4 avec tirets
        const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1-");
        setCodeDisplay(formatted);
        setCode(digits);
        setError("");
    };
 
    // ─── QR scanné → pré-remplir le code ─────────────────────────────────
    const handleQRScanned = async (scannedCode: string) => {
        setShowScanner(false);
        const digits = scannedCode.replace(/\D/g, "");
        setCode(digits);
        setCodeDisplay(scannedCode);
        setStep("code");
        // Vérifier automatiquement
        await verifierCode(digits);
    };
 
    // ─── Vérifier le code ─────────────────────────────────────────────────
    const verifierCode = async (rawCode?: string) => {
        // c = chiffres bruts (sans tirets), toujours 16 chiffres
        const c = (rawCode ?? code).replace(/[^0-9]/g, "");
        if (c.length !== 16) {
            setError("Le code doit contenir 16 chiffres.");
            triggerShake();
            return;
        }
        // Reformater avec tirets pour correspondre au format en base
        const formatted = c.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, "$1-$2-$3-$4");
        setLoading(true);
        setError("");
        try {
            const res = await fetch(
                `${API_URL}/api/recharge/verifier?code=${encodeURIComponent(formatted)}`,
                { headers: { "Content-Type": "application/json" } }
            );
            // Sécuriser le parsing JSON (évite crash si réponse HTML/erreur réseau)
            const text = await res.text();
            let data: any = {};
            try { data = JSON.parse(text); } catch {
                setError("Réponse serveur invalide. Vérifiez votre connexion.");
                triggerShake();
                return;
            }
            if (!res.ok) {
                setError(data.error ?? "Code invalide ou déjà utilisé.");
                triggerShake();
                return;
            }
            setCarte(data);
            setStep("confirmation");
        } catch (e: any) {
            setError("Impossible de contacter le serveur. Vérifiez votre connexion et que le serveur est démarré.");
            triggerShake();
        } finally {
            setLoading(false);
        }
    };
 
    // ─── Confirmer la recharge ────────────────────────────────────────────
    const confirmerRecharge = async () => {
        if (!user || !carte) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_URL}/api/recharge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    numero: user.numero,
                    code: carte.code,
                    methode: step === "qr" ? "qr" : "code",
                }),
            });
            const text = await res.text();
            let data: any = {};
            try { data = JSON.parse(text); } catch {
                setError("Réponse serveur invalide. Réessayez.");
                triggerShake();
                return;
            }
            if (!res.ok) {
                setError(data.error ?? "Erreur lors de la recharge.");
                triggerShake();
                return;
            }
            // Mettre à jour le solde local
            const updatedUser = { ...user, solde: data.nouveau_solde };
            await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
            setUser(updatedUser);
            setSuccessData(data);
            setStep("succes");
            Animated.spring(successScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
            fetchHistorique(user.numero);
        } catch {
            setError("Impossible de contacter le serveur.");
            triggerShake();
        } finally {
            setLoading(false);
        }
    };
 
    // ─── Initier un virement bancaire ────────────────────────────────────
    const handleVirementConfirm = async () => {
        if (!user || !selectedBanque) return;
        const mt = parseFloat(montantVir);
        if (!numCompte.trim() || numCompte.trim().length < 8) {
            setError("Numéro de compte invalide (minimum 8 caractères)."); triggerShake(); return;
        }
        if (!titulaire.trim()) {
            setError("Nom du titulaire requis."); triggerShake(); return;
        }
        if (isNaN(mt) || mt < 1000) {
            setError("Montant minimum : 1 000 FCFA."); triggerShake(); return;
        }
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API_URL}/api/recharge/virement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    numero: user.numero,
                    banque: selectedBanque.key,
                    num_compte: numCompte.trim(),
                    titulaire: titulaire.trim(),
                    montant: mt,
                }),
            });
            const text = await res.text();
            let data: any = {};
            try { data = JSON.parse(text); } catch {
                setError("Réponse serveur invalide."); triggerShake(); return;
            }
            if (!res.ok) { setError(data.error ?? "Erreur virement."); triggerShake(); return; }
            const updatedUser = { ...user, solde: data.nouveau_solde };
            await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
            setUser(updatedUser);
            setVirSuccessData(data);
            setStep("banque_succes");
            Animated.spring(successScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
        } catch {
            setError("Impossible de contacter le serveur.");
            triggerShake();
        } finally {
            setLoading(false);
        }
    };
 
    const resetVirement = () => {
        setSelectedBanque(null); setNumCompte(""); setTitulaire("");
        setMontantVir(""); setError(""); setVirSuccessData(null);
        successScale.setValue(0); setStep("choix");
    };
 
    const reset = () => {
        setStep("choix"); setCode(""); setCodeDisplay("");
        setCarte(null); setError(""); setSuccessData(null);
        successScale.setValue(0);
    };
 
    const fmt = (n: number) => n.toLocaleString("fr-FR");
    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
 
    // ══════════════════════════════════════════════════════════════════════
    // ── PAGE SUCCÈS ───────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════
    if (step === "succes" && successData) return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.black} />
            <View style={s.successPage}>
                {/* Cercle animé */}
                <Animated.View style={[s.successCircle, { transform: [{ scale: successScale }] }]}>
                    <MaterialIcons name="check" size={64} color={C.black} />
                </Animated.View>
 
                <Text style={s.successTitle}>Recharge réussie !</Text>
                <Text style={s.successSub}>Votre compte a été crédité</Text>
 
                {/* Montant crédité */}
                <View style={s.successAmtBox}>
                    <Text style={s.successAmtLbl}>Montant crédité</Text>
                    <Text style={s.successAmt}>+{fmt(successData.montant)} FCFA</Text>
                </View>
 
                {/* Nouveau solde */}
                <View style={s.newSoldeCard}>
                    <MaterialIcons name="account-balance-wallet" size={20} color={C.green} />
                    <View>
                        <Text style={s.newSoldeLbl}>Nouveau solde</Text>
                        <Text style={s.newSoldeVal}>{fmt(parseFloat(successData.nouveau_solde))} FCFA</Text>
                    </View>
                </View>
 
                {/* Référence */}
                <View style={s.refBox}>
                    <Text style={s.refLbl}>RÉFÉRENCE</Text>
                    <Text style={s.refVal}>{successData.reference}</Text>
                </View>
 
                <TouchableOpacity style={s.primaryBtn} onPress={reset} activeOpacity={0.85}>
                    <Text style={s.primaryBtnTxt}>Faire une autre recharge</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
 
    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.black} />
 
            {/* Scanner modal */}
            <Modal visible={showScanner} animationType="slide" statusBarTranslucent>
                <SafeAreaView style={{ flex: 1, backgroundColor: C.black }}>
                    <ScannerQR onScanned={handleQRScanned} onClose={() => setShowScanner(false)} />
                </SafeAreaView>
            </Modal>
 
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
 
                    {/* ── HEADER ────────────────────────────────────── */}
                    <View style={s.header}>
                        <View style={s.headerBlob1} />
                        <View style={s.headerBlob2} />
                        <View style={s.headerContent}>
                            <View>
                                <Text style={s.headerTitle}>Recharger</Text>
                                <Text style={s.headerSub}>Créditez votre compte MTN MoMo</Text>
                            </View>
                            {user?.solde !== undefined && (
                                <View style={s.soldeChip}>
                                    <MaterialIcons name="account-balance-wallet" size={13} color={C.black} />
                                    <Text style={s.soldeChipTxt}>{fmt(parseFloat(user.solde))} FCFA</Text>
                                </View>
                            )}
                        </View>
 
                        {/* Carte visuelle */}
                        <View style={s.carteVisuelle}>
                            <View style={s.carteVisuelleBg} />
                            <View style={s.carteVisuelleBg2} />
                            <View style={s.carteTop}>
                                <MaterialIcons name="sim-card" size={28} color={C.yellow} />
                                <Text style={s.carteLogo}>MTN MoMo</Text>
                            </View>
                            <Text style={s.carteNumDisplay}>
                                {codeDisplay || "XXXX  XXXX  XXXX  XXXX"}
                            </Text>
                            <View style={s.carteBottom}>
                                <View>
                                    <Text style={s.carteLblSm}>MONTANT</Text>
                                    <Text style={s.carteValSm}>{carte ? `${fmt(carte.montant)} FCFA` : "— FCFA"}</Text>
                                </View>
                                <MaterialIcons name="credit-card" size={36} color="rgba(255,204,0,0.3)" />
                            </View>
                        </View>
                    </View>
 
                    <Animated.View style={[{ opacity: fadeAnim }, { paddingHorizontal: 16, paddingTop: 20 }]}>
                        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
 
                        {/* ══════════════════════════════════════════════
                            ÉTAPE : CHOIX DE MÉTHODE
                        ══════════════════════════════════════════════ */}
                        {(step === "choix") && (
                            <>
                                <Text style={s.sectionLbl}>Comment voulez-vous recharger ?</Text>
 
                                {/* Méthode : Scanner QR */}
                                <TouchableOpacity style={s.methodeCard} onPress={() => setShowScanner(true)} activeOpacity={0.85}>
                                    <View style={[s.methodeIcon, { backgroundColor: C.yellow + "18" }]}>
                                        <MaterialIcons name="qr-code-scanner" size={30} color={C.yellow} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.methodeTitle}>Scanner le QR code</Text>
                                        <Text style={s.methodeSub}>Pointez la caméra vers le QR code imprimé sur la carte</Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={22} color={C.gray} />
                                </TouchableOpacity>
 
                                {/* Méthode : Code manuel */}
                                <TouchableOpacity style={s.methodeCard} onPress={() => setStep("code")} activeOpacity={0.85}>
                                    <View style={[s.methodeIcon, { backgroundColor: C.blue + "18" }]}>
                                        <MaterialIcons name="pin" size={30} color={C.blue} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.methodeTitle}>Entrer le code manuellement</Text>
                                        <Text style={s.methodeSub}>Saisissez le code à 16 chiffres inscrit sur la carte</Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={22} color={C.gray} />
                                </TouchableOpacity>
 
                                {/* Méthode : Virement bancaire */}
                                <TouchableOpacity style={[s.methodeCard, { borderColor: "#1a5276" + "50", backgroundColor: "#1a5276" + "0A" }]} onPress={() => setStep("banque")} activeOpacity={0.85}>
                                    <View style={[s.methodeIcon, { backgroundColor: "#1a5276" + "22" }]}>
                                        <MaterialIcons name="account-balance" size={30} color="#3B8BFF" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.methodeTitle}>Virement bancaire</Text>
                                        <Text style={s.methodeSub}>UBA, BGFI, LCB, Ecobank et autres banques du Congo</Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={22} color={C.gray} />
                                </TouchableOpacity>
 
                                {/* Info */}
                                <View style={s.infoBox}>
                                    <MaterialIcons name="info-outline" size={16} color={C.blue} />
                                    <Text style={s.infoTxt}>
                                        Les cartes de recharge MTN MoMo sont disponibles chez tous les revendeurs agréés MTN.
                                    </Text>
                                </View>
 
                                {/* Montants disponibles */}
                                <Text style={[s.sectionLbl, { marginTop: 24 }]}>Valeurs disponibles</Text>
                                <View style={s.montantsGrid}>
                                    {MONTANTS_CARTE.map((m) => (
                                        <View key={m} style={s.montantChip}>
                                            <Text style={s.montantChipTxt}>{fmt(m)}</Text>
                                            <Text style={s.montantChipUnit}>FCFA</Text>
                                        </View>
                                    ))}
                                </View>
 
                                {/* Historique rapide */}
                                {historique.length > 0 && (
                                    <>
                                        <TouchableOpacity style={s.histoHeader} onPress={() => setShowHisto(!showHisto)}>
                                            <View style={s.histoTitleRow}>
                                                <View style={s.histoAccent} />
                                                <Text style={s.histoTitle}>Dernières recharges</Text>
                                            </View>
                                            <MaterialIcons name={showHisto ? "expand-less" : "expand-more"} size={22} color={C.gray} />
                                        </TouchableOpacity>
                                        {showHisto && historique.map((h, i) => (
                                            <View key={i} style={s.histoItem}>
                                                <View style={s.histoIcon}>
                                                    <MaterialIcons name={h.methode === "qr" ? "qr-code-scanner" : "pin"} size={16} color={C.green} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={s.histoRef}>{h.reference}</Text>
                                                    <Text style={s.histoDate}>{fmtDate(h.created_at)}</Text>
                                                </View>
                                                <Text style={s.histoMontant}>+{fmt(h.montant)} F</Text>
                                            </View>
                                        ))}
                                    </>
                                )}
                            </>
                        )}
 
                        {/* ══════════════════════════════════════════════
                            ÉTAPE : SÉLECTION BANQUE
                        ══════════════════════════════════════════════ */}
                        {step === "banque" && (
                            <>
                                <TouchableOpacity style={s.backBtn} onPress={() => { setStep("choix"); setError(""); }}>
                                    <MaterialIcons name="arrow-back" size={18} color={C.yellow} />
                                    <Text style={s.backBtnTxt}>Retour</Text>
                                </TouchableOpacity>
                                <Text style={s.sectionLbl}>Sélectionnez votre banque</Text>
                                <Text style={s.sectionDesc}>Choisissez la banque depuis laquelle vous souhaitez effectuer le virement</Text>
                                {BANQUES_CONGO.map((b) => (
                                    <TouchableOpacity
                                        key={b.key}
                                        style={[s.methodeCard, selectedBanque?.key === b.key && { borderColor: b.color, backgroundColor: b.color + "0A" }]}
                                        onPress={() => { setSelectedBanque(b); setStep("banque_form"); setError(""); }}
                                        activeOpacity={0.82}
                                    >
                                        <View style={[s.bankLogo, { backgroundColor: b.color }]}>
                                            <Text style={s.bankLogoTxt}>{b.abrev.slice(0, 3)}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.methodeTitle}>{b.nom}</Text>
                                            <Text style={s.methodeSub}>SWIFT : {b.swift}</Text>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={22} color={C.gray} />
                                    </TouchableOpacity>
                                ))}
                            </>
                        )}
 
                        {/* ══════════════════════════════════════════════
                            ÉTAPE : FORMULAIRE VIREMENT
                        ══════════════════════════════════════════════ */}
                        {step === "banque_form" && selectedBanque && (
                            <>
                                <TouchableOpacity style={s.backBtn} onPress={() => { setStep("banque"); setError(""); }}>
                                    <MaterialIcons name="arrow-back" size={18} color={C.yellow} />
                                    <Text style={s.backBtnTxt}>Retour</Text>
                                </TouchableOpacity>
 
                                {/* Banque sélectionnée */}
                                <View style={[s.selectedBankCard, { borderColor: selectedBanque.color + "50" }]}>
                                    <View style={[s.bankLogo, { backgroundColor: selectedBanque.color }]}>
                                        <Text style={s.bankLogoTxt}>{selectedBanque.abrev.slice(0, 3)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.methodeTitle}>{selectedBanque.nom}</Text>
                                        <Text style={[s.methodeSub, { color: selectedBanque.color }]}>SWIFT : {selectedBanque.swift}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setStep("banque")} style={{ padding: 6 }}>
                                        <Text style={{ color: C.yellow, fontWeight: "700", fontSize: 12 }}>Changer</Text>
                                    </TouchableOpacity>
                                </View>
 
                                <Text style={s.sectionLbl}>Informations du virement</Text>
 
                                {/* Numéro de compte */}
                                <Text style={s.fieldLbl}>Numéro de compte bancaire (RIB/IBAN)</Text>
                                <View style={[s.codeInput, virFocused === "compte" && { borderColor: selectedBanque.color }, error && !numCompte && s.codeInputError]}>
                                    <MaterialIcons name="account-balance" size={20} color={virFocused === "compte" ? selectedBanque.color : C.gray} style={{ marginLeft: 14 }} />
                                    <TextInput
                                        style={[s.codeTextField, { fontSize: 15, letterSpacing: 1 }]}
                                        placeholder="Entrez votre numéro de compte"
                                        placeholderTextColor={C.gray}
                                        value={numCompte}
                                        onChangeText={(t) => { setNumCompte(t); setError(""); }}
                                        autoCapitalize="characters"
                                        onFocus={() => setVirFocused("compte")}
                                        onBlur={() => setVirFocused(null)}
                                        returnKeyType="next"
                                    />
                                </View>
 
                                {/* Titulaire */}
                                <Text style={[s.fieldLbl, { marginTop: 14 }]}>Nom du titulaire du compte</Text>
                                <View style={[s.codeInput, virFocused === "nom" && { borderColor: selectedBanque.color }]}>
                                    <MaterialIcons name="person" size={20} color={virFocused === "nom" ? selectedBanque.color : C.gray} style={{ marginLeft: 14 }} />
                                    <TextInput
                                        style={[s.codeTextField, { fontSize: 15, letterSpacing: 0 }]}
                                        placeholder="Nom et prénom"
                                        placeholderTextColor={C.gray}
                                        value={titulaire}
                                        onChangeText={(t) => { setTitulaire(t); setError(""); }}
                                        onFocus={() => setVirFocused("nom")}
                                        onBlur={() => setVirFocused(null)}
                                        returnKeyType="next"
                                    />
                                </View>
 
                                {/* Montant */}
                                <Text style={[s.fieldLbl, { marginTop: 14 }]}>Montant à virer (FCFA)</Text>
                                <View style={[s.codeInput, virFocused === "montant" && { borderColor: selectedBanque.color }]}>
                                    <MaterialIcons name="account-balance-wallet" size={20} color={virFocused === "montant" ? selectedBanque.color : C.gray} style={{ marginLeft: 14 }} />
                                    <TextInput
                                        style={[s.codeTextField, { fontSize: 18 }]}
                                        placeholder="0"
                                        placeholderTextColor={C.gray}
                                        value={montantVir}
                                        onChangeText={(t) => { setMontantVir(t.replace(/\D/g, "")); setError(""); }}
                                        keyboardType="number-pad"
                                        onFocus={() => setVirFocused("montant")}
                                        onBlur={() => setVirFocused(null)}
                                        returnKeyType="done"
                                    />
                                    <Text style={{ color: C.gray, fontWeight: "700", marginRight: 14 }}>FCFA</Text>
                                </View>
 
                                {/* Montants rapides */}
                                <View style={[s.montantsGrid, { marginTop: 12 }]}>
                                    {[5000, 10000, 25000, 50000, 100000, 200000].map((m) => (
                                        <TouchableOpacity
                                            key={m}
                                            style={[s.montantChip, montantVir === String(m) && { borderColor: selectedBanque.color, backgroundColor: selectedBanque.color + "12" }]}
                                            onPress={() => setMontantVir(String(m))}
                                        >
                                            <Text style={[s.montantChipTxt, montantVir === String(m) && { color: selectedBanque.color }]}>{fmt(m)}</Text>
                                            <Text style={s.montantChipUnit}>FCFA</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
 
                                {/* Note info */}
                                <View style={[s.infoBox, { marginBottom: 8 }]}>
                                    <MaterialIcons name="schedule" size={15} color={C.blue} />
                                    <Text style={s.infoTxt}>
                                        Le crédit est instantané si la banque est partenaire MTN. Sinon sous 24-48h ouvrables.
                                    </Text>
                                </View>
 
                                {error ? (
                                    <View style={s.errorBox}>
                                        <MaterialIcons name="error-outline" size={16} color={C.error} />
                                        <Text style={s.errorTxt}>{error}</Text>
                                    </View>
                                ) : null}
 
                                <TouchableOpacity
                                    style={[s.primaryBtn, (!numCompte || !titulaire || !montantVir) && s.primaryBtnOff]}
                                    onPress={() => {
                                        if (!numCompte.trim() || !titulaire.trim() || !montantVir) { setError("Tous les champs sont obligatoires."); triggerShake(); return; }
                                        setError(""); setStep("banque_confirm");
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <MaterialIcons name="arrow-forward" size={20} color={C.black} />
                                    <Text style={s.primaryBtnTxt}>CONTINUER</Text>
                                </TouchableOpacity>
                            </>
                        )}
 
                        {/* ══════════════════════════════════════════════
                            ÉTAPE : CONFIRMATION VIREMENT
                        ══════════════════════════════════════════════ */}
                        {step === "banque_confirm" && selectedBanque && (
                            <>
                                <TouchableOpacity style={s.backBtn} onPress={() => { setStep("banque_form"); setError(""); }}>
                                    <MaterialIcons name="arrow-back" size={18} color={C.yellow} />
                                    <Text style={s.backBtnTxt}>Modifier</Text>
                                </TouchableOpacity>
 
                                <Text style={s.sectionLbl}>Récapitulatif du virement</Text>
 
                                <View style={s.recapCard}>
                                    {/* Bandeau banque */}
                                    <View style={[s.bankRecapHeader, { backgroundColor: selectedBanque.color + "18" }]}>
                                        <View style={[s.bankLogo, { backgroundColor: selectedBanque.color, width: 40, height: 40, borderRadius: 10 }]}>
                                            <Text style={[s.bankLogoTxt, { fontSize: 11 }]}>{selectedBanque.abrev.slice(0, 3)}</Text>
                                        </View>
                                        <Text style={[s.methodeTitle, { color: selectedBanque.color }]}>{selectedBanque.nom}</Text>
                                    </View>
                                    <Text style={s.recapTitle}>Détails</Text>
                                    {[
                                        { lbl: "Numéro de compte", val: numCompte },
                                        { lbl: "Titulaire",        val: titulaire },
                                        { lbl: "Numéro MoMo destinataire", val: `+242 ${user?.numero ?? "—"}` },
                                    ].map((row) => (
                                        <View key={row.lbl} style={s.recapRow}>
                                            <Text style={s.recapLbl}>{row.lbl}</Text>
                                            <Text style={s.recapVal}>{row.val}</Text>
                                        </View>
                                    ))}
                                    <View style={s.recapDiv} />
                                    <View style={s.recapRow}>
                                        <Text style={[s.recapLbl, { fontWeight: "800", color: C.white }]}>Montant</Text>
                                        <Text style={[s.recapMontant, { color: C.green }]}>+{fmt(parseFloat(montantVir))} FCFA</Text>
                                    </View>
                                    <View style={s.recapDiv} />
                                    <View style={s.recapRow}>
                                        <Text style={s.recapLbl}>Frais bancaires</Text>
                                        <Text style={[s.recapVal, { color: C.green }]}>Gratuit</Text>
                                    </View>
                                </View>
 
                                {error ? (
                                    <View style={s.errorBox}>
                                        <MaterialIcons name="error-outline" size={16} color={C.error} />
                                        <Text style={s.errorTxt}>{error}</Text>
                                    </View>
                                ) : null}
 
                                <TouchableOpacity
                                    style={[s.primaryBtn, loading && s.primaryBtnOff, { backgroundColor: selectedBanque.color }]}
                                    onPress={handleVirementConfirm}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    <MaterialIcons name="account-balance" size={20} color="#fff" />
                                    <Text style={[s.primaryBtnTxt, { color: "#fff" }]}>
                                        {loading ? "Traitement…" : "CONFIRMER LE VIREMENT"}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
 
                        {/* ══════════════════════════════════════════════
                            ÉTAPE : SAISIE DU CODE
                        ══════════════════════════════════════════════ */}
                        {step === "code" && (
                            <>
                                <TouchableOpacity style={s.backBtn} onPress={() => { setStep("choix"); setError(""); setCode(""); setCodeDisplay(""); }}>
                                    <MaterialIcons name="arrow-back" size={18} color={C.yellow} />
                                    <Text style={s.backBtnTxt}>Retour</Text>
                                </TouchableOpacity>
 
                                <Text style={s.sectionLbl}>Code de recharge</Text>
                                <Text style={s.sectionDesc}>Grattez la zone argentée et entrez les 16 chiffres</Text>
 
                                {/* Champ code */}
                                <View style={[s.codeInput, error ? s.codeInputError : null]}>
                                    <MaterialIcons name="credit-card" size={22} color={code.length === 16 ? C.green : C.gray} style={{ marginLeft: 16 }} />
                                    <TextInput
                                        style={s.codeTextField}
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                        placeholderTextColor={C.gray}
                                        value={codeDisplay}
                                        onChangeText={handleCodeChange}
                                        keyboardType="number-pad"
                                        maxLength={19} // 16 chiffres + 3 tirets
                                        autoFocus
                                    />
                                    {code.length > 0 && (
                                        <TouchableOpacity onPress={() => { setCode(""); setCodeDisplay(""); setError(""); }} style={{ padding: 12 }}>
                                            <MaterialIcons name="close" size={18} color={C.gray} />
                                        </TouchableOpacity>
                                    )}
                                </View>
 
                                {/* Compteur de chiffres */}
                                <Text style={[s.codeCounter, code.length === 16 && { color: C.green }]}>
                                    {code.length}/16 chiffres
                                </Text>
 
                                {error ? (
                                    <View style={s.errorBox}>
                                        <MaterialIcons name="error-outline" size={16} color={C.error} />
                                        <Text style={s.errorTxt}>{error}</Text>
                                    </View>
                                ) : null}
 
                                {/* Ou scanner */}
                                <View style={s.orRow}>
                                    <View style={s.orLine} />
                                    <Text style={s.orTxt}>ou</Text>
                                    <View style={s.orLine} />
                                </View>
                                <TouchableOpacity style={s.scanAlt} onPress={() => setShowScanner(true)} activeOpacity={0.85}>
                                    <MaterialIcons name="qr-code-scanner" size={20} color={C.yellow} />
                                    <Text style={s.scanAltTxt}>Scanner le QR code à la place</Text>
                                </TouchableOpacity>
 
                                <TouchableOpacity
                                    style={[s.primaryBtn, (code.length !== 16 || loading) && s.primaryBtnOff]}
                                    onPress={() => verifierCode()}
                                    disabled={code.length !== 16 || loading}
                                    activeOpacity={0.85}
                                >
                                    {loading ? (
                                        <Text style={s.primaryBtnTxt}>Vérification…</Text>
                                    ) : (
                                        <>
                                            <MaterialIcons name="search" size={20} color={C.black} />
                                            <Text style={s.primaryBtnTxt}>VÉRIFIER LA CARTE</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
 
                        {/* ══════════════════════════════════════════════
                            ÉTAPE : CONFIRMATION
                        ══════════════════════════════════════════════ */}
                        {step === "confirmation" && carte && (
                            <>
                                <TouchableOpacity style={s.backBtn} onPress={() => { setStep("code"); setCarte(null); }}>
                                    <MaterialIcons name="arrow-back" size={18} color={C.yellow} />
                                    <Text style={s.backBtnTxt}>Modifier</Text>
                                </TouchableOpacity>
 
                                {/* Badge carte valide */}
                                <View style={s.carteValideBadge}>
                                    <MaterialIcons name="check-circle" size={18} color={C.green} />
                                    <Text style={s.carteValideTxt}>Carte valide et disponible</Text>
                                </View>
 
                                {/* Récapitulatif */}
                                <View style={s.recapCard}>
                                    <Text style={s.recapTitle}>Récapitulatif de la recharge</Text>
 
                                    <View style={s.recapRow}>
                                        <Text style={s.recapLbl}>Code carte</Text>
                                        <Text style={s.recapVal}>{carte.code}</Text>
                                    </View>
                                    <View style={s.recapDiv} />
 
                                    <View style={s.recapRow}>
                                        <Text style={s.recapLbl}>Compte</Text>
                                        <View style={{ alignItems: "flex-end" }}>
                                            <Text style={s.recapVal}>{user?.name}</Text>
                                            <Text style={{ color: C.gray, fontSize: 12 }}>+242 {user?.numero}</Text>
                                        </View>
                                    </View>
                                    <View style={s.recapDiv} />
 
                                    {carte.expires_at && (
                                        <>
                                            <View style={s.recapRow}>
                                                <Text style={s.recapLbl}>Expire le</Text>
                                                <Text style={s.recapVal}>{fmtDate(carte.expires_at)}</Text>
                                            </View>
                                            <View style={s.recapDiv} />
                                        </>
                                    )}
 
                                    <View style={s.recapRow}>
                                        <Text style={[s.recapLbl, { fontWeight: "800", color: C.white }]}>Montant crédité</Text>
                                        <Text style={s.recapMontant}>+{fmt(carte.montant)} FCFA</Text>
                                    </View>
                                </View>
 
                                {/* Solde après */}
                                {user?.solde !== undefined && (
                                    <View style={s.afterSoldeRow}>
                                        <Text style={s.afterSoldeLbl}>Solde après recharge</Text>
                                        <Text style={s.afterSoldeVal}>
                                            {fmt(parseFloat(user.solde) + carte.montant)} FCFA
                                        </Text>
                                    </View>
                                )}
 
                                {error ? (
                                    <View style={s.errorBox}>
                                        <MaterialIcons name="error-outline" size={16} color={C.error} />
                                        <Text style={s.errorTxt}>{error}</Text>
                                    </View>
                                ) : null}
 
                                <TouchableOpacity
                                    style={[s.primaryBtn, loading && s.primaryBtnOff]}
                                    onPress={confirmerRecharge}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    {loading ? (
                                        <Text style={s.primaryBtnTxt}>Recharge en cours…</Text>
                                    ) : (
                                        <>
                                            <MaterialIcons name="bolt" size={20} color={C.black} />
                                            <Text style={s.primaryBtnTxt}>CONFIRMER LA RECHARGE</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
 
                        </Animated.View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
 
// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.black },
 
    // Header
    header: { backgroundColor: C.dark, paddingBottom: 24, overflow: "hidden" },
    headerBlob1: { position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: C.yellow, opacity: 0.06 },
    headerBlob2: { position: "absolute", bottom: 20, left: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: C.green, opacity: 0.05 },
    headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    headerTitle: { fontSize: 26, fontWeight: "900", color: C.white, letterSpacing: -0.5 },
    headerSub:   { fontSize: 12, color: C.gray, fontWeight: "600", marginTop: 2 },
    soldeChip: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: C.yellow, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    },
    soldeChipTxt: { fontSize: 12, fontWeight: "900", color: C.black },
 
    // Carte visuelle
    carteVisuelle: {
        marginHorizontal: 20, borderRadius: 20, padding: 22,
        backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A",
        overflow: "hidden",
    },
    carteVisuelleBg:  { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: C.yellow, opacity: 0.06 },
    carteVisuelleBg2: { position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: C.green, opacity: 0.05 },
    carteTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    carteLogo: { fontSize: 15, fontWeight: "900", color: C.yellow, letterSpacing: 1 },
    carteNumDisplay: { fontSize: 18, fontWeight: "800", color: C.white, letterSpacing: 4, marginBottom: 20, fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" },
    carteBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    carteLblSm: { fontSize: 9, color: C.gray, fontWeight: "700", letterSpacing: 1, marginBottom: 3 },
    carteValSm: { fontSize: 14, fontWeight: "900", color: C.yellow },
 
    // Sections
    sectionLbl:  { fontSize: 12, fontWeight: "700", color: C.gray, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 4 },
    sectionDesc: { fontSize: 13, color: C.gray, marginBottom: 16, lineHeight: 19 },
 
    // Méthodes
    methodeCard: {
        flexDirection: "row", alignItems: "center", gap: 16,
        backgroundColor: C.card, borderRadius: 18, padding: 18,
        borderWidth: 1, borderColor: C.border, marginBottom: 12,
    },
    methodeIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    methodeTitle: { fontSize: 15, fontWeight: "800", color: C.white, marginBottom: 4 },
    methodeSub:   { fontSize: 12, color: C.gray, lineHeight: 17 },
 
    // Banque
    bankLogo: {
        width: 46, height: 46, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    bankLogoTxt: {
        color: "#fff", fontWeight: "900", fontSize: 13, letterSpacing: 0.5,
    },
    selectedBankCard: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: C.surface, borderRadius: 14,
        borderWidth: 1.5, padding: 14, marginBottom: 20,
    },
    bankRecapHeader: {
        flexDirection: "row", alignItems: "center", gap: 12,
        padding: 12, borderRadius: 10, marginBottom: 12,
    },
    fieldLbl: {
        fontSize: 11, fontWeight: "700", color: C.gray,
        letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8,
    },
 
    infoBox: {
        flexDirection: "row", gap: 10, alignItems: "flex-start",
        backgroundColor: C.blue + "12", borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: C.blue + "25", marginTop: 4,
    },
    infoTxt: { flex: 1, fontSize: 12, color: C.light, lineHeight: 18 },
 
    // Montants
    montantsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
    montantChip: {
        backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
        paddingHorizontal: 16, paddingVertical: 10, alignItems: "center",
    },
    montantChipTxt:  { fontSize: 14, fontWeight: "900", color: C.yellow },
    montantChipUnit: { fontSize: 9, color: C.gray, fontWeight: "700" },
 
    // Historique
    histoHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 10 },
    histoTitleRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
    histoAccent:    { width: 4, height: 16, borderRadius: 2, backgroundColor: C.green },
    histoTitle:     { fontSize: 15, fontWeight: "800", color: C.white },
    histoItem: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    histoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.green + "15", alignItems: "center", justifyContent: "center" },
    histoRef:     { fontSize: 13, fontWeight: "700", color: C.white },
    histoDate:    { fontSize: 11, color: C.gray },
    histoMontant: { fontSize: 14, fontWeight: "900", color: C.green },
 
    // Bouton retour
    backBtn:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
    backBtnTxt: { color: C.yellow, fontWeight: "700", fontSize: 14 },
 
    // Saisie code
    codeInput: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: C.card, borderRadius: 16,
        borderWidth: 2, borderColor: C.border, minHeight: 60,
    },
    codeInputError: { borderColor: C.error },
    codeTextField: {
        flex: 1, color: C.white, fontSize: 20, fontWeight: "900",
        paddingHorizontal: 12, paddingVertical: 16,
        letterSpacing: 3,
        fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    },
    codeCounter: { fontSize: 12, color: C.gray, fontWeight: "600", marginTop: 6, marginBottom: 4, textAlign: "right" },
 
    orRow:  { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
    orLine: { flex: 1, height: 1, backgroundColor: C.border },
    orTxt:  { color: C.gray, fontSize: 13, fontWeight: "600" },
    scanAlt: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: C.yellow + "15", borderRadius: 12, borderWidth: 1,
        borderColor: C.yellow + "30", paddingVertical: 14, marginBottom: 20,
    },
    scanAltTxt: { color: C.yellow, fontWeight: "800", fontSize: 14 },
 
    // Confirmation
    carteValideBadge: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: C.green + "12", borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: C.green + "25", marginBottom: 16,
    },
    carteValideTxt: { color: C.green, fontWeight: "700", fontSize: 14 },
    recapCard: { backgroundColor: C.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
    recapTitle: { fontSize: 16, fontWeight: "800", color: C.white, marginBottom: 16 },
    recapRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
    recapLbl:   { fontSize: 14, color: C.gray },
    recapVal:   { fontSize: 14, fontWeight: "700", color: C.white },
    recapDiv:   { height: 1, backgroundColor: C.border },
    recapMontant: { fontSize: 20, fontWeight: "900", color: C.green },
    afterSoldeRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        backgroundColor: C.green + "10", borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: C.green + "20", marginBottom: 16,
    },
    afterSoldeLbl: { fontSize: 13, color: C.gray, fontWeight: "600" },
    afterSoldeVal: { fontSize: 18, fontWeight: "900", color: C.green },
 
    // Erreur
    errorBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: C.error + "12", borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: C.error + "25", marginBottom: 12,
    },
    errorTxt: { color: C.error, fontSize: 13, flex: 1 },
 
    // Bouton principal
    primaryBtn: {
        backgroundColor: C.yellow, borderRadius: 16, height: 58,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
        shadowColor: C.yellow, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4, shadowRadius: 16, elevation: 8, marginTop: 8,
    },
    primaryBtnOff: { opacity: 0.4 },
    primaryBtnTxt: { fontSize: 15, fontWeight: "900", color: C.black, letterSpacing: 0.8 },
 
    // Succès
    successPage:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    successCircle: {
        width: 120, height: 120, borderRadius: 60, backgroundColor: C.yellow,
        alignItems: "center", justifyContent: "center", marginBottom: 24,
        shadowColor: C.yellow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
    },
    successTitle: { fontSize: 28, fontWeight: "900", color: C.white, marginBottom: 6 },
    successSub:   { fontSize: 14, color: C.gray, marginBottom: 24 },
    successAmtBox: { backgroundColor: C.green + "15", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.green + "30", alignItems: "center", marginBottom: 16, width: "100%" },
    successAmtLbl: { fontSize: 11, color: C.gray, fontWeight: "700", letterSpacing: 1, marginBottom: 6 },
    successAmt:    { fontSize: 36, fontWeight: "900", color: C.green },
    newSoldeCard:  { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16, width: "100%" },
    newSoldeLbl:   { fontSize: 11, color: C.gray, fontWeight: "600" },
    newSoldeVal:   { fontSize: 20, fontWeight: "900", color: C.white },
    refBox: { backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 28, width: "100%", borderWidth: 1, borderColor: C.border },
    refLbl: { fontSize: 9, color: C.gray, fontWeight: "700", letterSpacing: 1.5, marginBottom: 5 },
    refVal: { fontSize: 16, color: C.yellow, fontWeight: "900", letterSpacing: 2 },
});
 
// ─── STYLES SCANNER ───────────────────────────────────────────────────────────
const qs = StyleSheet.create({
    center:    { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: C.black },
    txt:       { color: C.gray, fontSize: 14 },
    title:     { fontSize: 20, fontWeight: "800", color: C.white, marginTop: 16, marginBottom: 8 },
    sub:       { fontSize: 14, color: C.gray, textAlign: "center", lineHeight: 21, marginBottom: 28 },
    btn:       { backgroundColor: C.yellow, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
    btnTxt:    { color: C.black, fontWeight: "900", fontSize: 15 },
    header:    { backgroundColor: C.yellow, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    closeBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 16, fontWeight: "900", color: C.black },
    headerSub:   { fontSize: 12, color: "rgba(0,0,0,0.5)", fontWeight: "600" },
    overlay:     { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    overlayTop:  { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
    overlayMiddle: { flexDirection: "row" },
    overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
    overlayBottom: { flex: 1.5, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "flex-start", paddingTop: 20, gap: 8 },
    viewfinder: { width: 240, height: 240 },
    corner:     { position: "absolute", width: 32, height: 32, borderColor: C.yellow, borderWidth: 3 },
    TL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
    TR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
    BL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
    BR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },
    scanLine: { position: "absolute", top: "45%", left: 8, right: 8, height: 2, backgroundColor: C.yellow, opacity: 0.8 },
    hint: { color: C.white, fontSize: 13, fontWeight: "600", textAlign: "center" },
    errBanner: {
        position: "absolute", bottom: 36, left: 20, right: 20,
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: C.dark, borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: C.error,
    },
    errTxt: { color: C.error, fontSize: 13, flex: 1 },
});