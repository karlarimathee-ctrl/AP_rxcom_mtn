import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import API_URL from "../backend/api";
 
const { width: SW } = Dimensions.get("window");
 
const C = {
    yellow:  "#FFCC00",
    black:   "#080808",
    ink:     "#111111",
    card:    "#161616",
    surface: "#1E1E1E",
    border:  "#252525",
    muted:   "#3A3A3A",
    gray:    "#777777",
    light:   "#CCCCCC",
    white:   "#F5F5F5",
    green:   "#00D97E",
    blue:    "#3B8BFF",
    orange:  "#FF7A30",
    purple:  "#B26EFF",
    red:     "#FF4559",
    teal:    "#00C9B1",
};
 
type User = { id: number; name: string; username: string; numero: string };
 
// ─── Types ────────────────────────────────────────────────────────────────────
type Epargne = {
    id: number;
    nom: string;
    objectif: number;
    solde: number;
    couleur: string;
    icone: string;
    date_creation: string;
};
 
type Tontine = {
    id: number;
    nom: string;
    cotisation_mensuelle: number;
    nombre_membres: number;
    membres_actuels: number;
    tour_actuel: number;
    prochain_beneficiaire: string | null;
    prochain_date: string | null;
    statut: "actif" | "complet" | "en_attente";
    est_membre: boolean;
    est_admin: boolean;
    solde_total: number;
};
 
type ModalType =
    | "nouvelle_epargne"
    | "depot_epargne"
    | "nouvelle_tontine"
    | "rejoindre_tontine"
    | "detail_tontine"
    | null;
 
const COULEURS = ["#FFCC00", "#00D97E", "#3B8BFF", "#FF7A30", "#B26EFF", "#FF4559", "#00C9B1"];
const ICONES   = ["savings", "home", "school", "flight", "favorite", "directions-car", "phone-android", "star"];
 
const fmt = (n: number) => n.toLocaleString("fr-FR");
const pct = (solde: number, obj: number) => Math.min(1, solde / Math.max(1, obj));
 
export default function EpargneScreen() {
    const [user, setUser]           = useState<User | null>(null);
    const [tab, setTab]             = useState<"personnel" | "tontine">("personnel");
    const [epargnes, setEpargnes]   = useState<Epargne[]>([]);
    const [tontines, setTontines]   = useState<Tontine[]>([]);
    const [loading, setLoading]     = useState(false);
    const [modal, setModal]         = useState<ModalType>(null);
    const [selected, setSelected]   = useState<Tontine | Epargne | null>(null);
 
    // Formulaires épargne
    const [eNom, setENom]           = useState("");
    const [eObjectif, setEObjectif] = useState("");
    const [eCouleur, setECouleur]   = useState(C.yellow);
    const [eIcone, setEIcone]       = useState("savings");
    const [eDepot, setEDepot]       = useState("");
 
    // Formulaires tontine
    const [tNom, setTNom]             = useState("");
    const [tCotisation, setTCotisation] = useState("");
    const [tMembres, setTMembres]     = useState("");
    const [tCodeInvit, setTCodeInvit] = useState("");
    const [tError, setTError]         = useState("");
 
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;
 
    useEffect(() => {
        AsyncStorage.getItem("user").then((v) => {
            if (v) {
                const u = JSON.parse(v);
                setUser(u);
                fetchData(u.numero);
            }
        });
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);
 
    const fetchData = async (numero: string) => {
        setLoading(true);
        try {
            const [eRes, tRes] = await Promise.all([
                fetch(`${API_URL}/api/epargnes?numero=${numero}`),
                fetch(`${API_URL}/api/tontines?numero=${numero}`),
            ]);
            if (eRes.ok) setEpargnes(await eRes.json());
            if (tRes.ok) setTontines(await tRes.json());
        } catch {} finally {
            setLoading(false);
        }
    };
 
    const refresh = () => user && fetchData(user.numero);
 
    // ─── Créer épargne ────────────────────────────────────────────────────────
    const creerEpargne = async () => {
        if (!eNom.trim() || !eObjectif) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/epargnes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    numero: user?.numero,
                    nom: eNom.trim(),
                    objectif: parseFloat(eObjectif),
                    couleur: eCouleur,
                    icone: eIcone,
                }),
            });
            if (res.ok) {
                setModal(null);
                setENom(""); setEObjectif(""); setECouleur(C.yellow); setEIcone("savings");
                refresh();
            }
        } catch {} finally {
            setLoading(false);
        }
    };
 
    // ─── Déposer dans épargne ─────────────────────────────────────────────────
    const deposerEpargne = async () => {
        if (!eDepot || !selected) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/epargnes/${(selected as Epargne).id}/depot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero: user?.numero, montant: parseFloat(eDepot) }),
            });
            if (res.ok) {
                setModal(null);
                setEDepot("");
                refresh();
            }
        } catch {} finally {
            setLoading(false);
        }
    };
 
    // ─── Créer tontine ────────────────────────────────────────────────────────
    const creerTontine = async () => {
        setTError("");
        if (!tNom.trim() || !tCotisation || !tMembres) {
            setTError("Tous les champs sont requis.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tontines`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    numero: user?.numero,
                    nom: tNom.trim(),
                    cotisation_mensuelle: parseFloat(tCotisation),
                    nombre_membres: parseInt(tMembres),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setModal(null);
                setTNom(""); setTCotisation(""); setTMembres("");
                refresh();
            } else {
                setTError(data.error ?? "Erreur");
            }
        } catch { setTError("Impossible de contacter le serveur."); }
        finally { setLoading(false); }
    };
 
    // ─── Rejoindre tontine ────────────────────────────────────────────────────
    const rejoindre = async () => {
        setTError("");
        if (!tCodeInvit.trim()) { setTError("Entrez un code d'invitation."); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tontines/rejoindre`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero: user?.numero, code: tCodeInvit.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setModal(null);
                setTCodeInvit("");
                refresh();
            } else {
                setTError(data.error ?? "Code invalide.");
            }
        } catch { setTError("Impossible de contacter le serveur."); }
        finally { setLoading(false); }
    };
 
    // ─── Payer cotisation ─────────────────────────────────────────────────────
    const payerCotisation = async (tontineId: number) => {
        setLoading(true);
        try {
            await fetch(`${API_URL}/api/tontines/${tontineId}/cotiser`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero: user?.numero }),
            });
            refresh();
        } catch {} finally { setLoading(false); }
    };
 
    // ─── Total épargne ────────────────────────────────────────────────────────
    const totalEpargne = epargnes.reduce((s, e) => s + e.solde, 0);
    const totalTontine = tontines.reduce((s, t) => s + t.solde_total, 0);
 
    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.black} />
 
            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <View style={s.header}>
                <View style={s.headerBlob1} />
                <View style={s.headerBlob2} />
                <Text style={s.headerTitle}>Épargne</Text>
                <Text style={s.headerSub}>MTN MoMo · Votre argent en sécurité</Text>
 
                {/* Total cards */}
                <View style={s.totalsRow}>
                    <View style={s.totalCard}>
                        <MaterialIcons name="account-balance" size={18} color={C.yellow} />
                        <Text style={s.totalLbl}>Personnel</Text>
                        <Text style={s.totalAmt}>{fmt(totalEpargne)}</Text>
                        <Text style={s.totalUnit}>FCFA</Text>
                    </View>
                    <View style={[s.totalCard, { borderColor: C.teal + "30" }]}>
                        <MaterialIcons name="groups" size={18} color={C.teal} />
                        <Text style={s.totalLbl}>Tontines</Text>
                        <Text style={[s.totalAmt, { color: C.teal }]}>{fmt(totalTontine)}</Text>
                        <Text style={s.totalUnit}>FCFA</Text>
                    </View>
                </View>
            </View>
 
            {/* ── TABS ────────────────────────────────────────────────────── */}
            <View style={s.tabs}>
                <TouchableOpacity
                    style={[s.tab, tab === "personnel" && s.tabActive]}
                    onPress={() => setTab("personnel")}
                >
                    <MaterialIcons name="account-balance" size={16} color={tab === "personnel" ? C.black : C.gray} />
                    <Text style={[s.tabTxt, tab === "personnel" && s.tabTxtActive]}>Personnel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.tab, tab === "tontine" && s.tabActive]}
                    onPress={() => setTab("tontine")}
                >
                    <MaterialIcons name="groups" size={16} color={tab === "tontine" ? C.black : C.gray} />
                    <Text style={[s.tabTxt, tab === "tontine" && s.tabTxtActive]}>Caisse / Tontine</Text>
                    {tontines.length > 0 && (
                        <View style={s.tabBadge}>
                            <Text style={s.tabBadgeTxt}>{tontines.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
 
            <Animated.View style={[{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
 
            {/* ══════════════════════════════════════════════════════════════
                TAB PERSONNEL
            ══════════════════════════════════════════════════════════════ */}
            {tab === "personnel" && (
                <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* CTA créer */}
                    <TouchableOpacity style={s.createBtn} onPress={() => setModal("nouvelle_epargne")} activeOpacity={0.85}>
                        <View style={s.createBtnIcon}>
                            <MaterialIcons name="add" size={22} color={C.black} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.createBtnTitle}>Nouvelle épargne</Text>
                            <Text style={s.createBtnSub}>Définissez un objectif et épargnez à votre rythme</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color="rgba(0,0,0,0.4)" />
                    </TouchableOpacity>
 
                    {epargnes.length === 0 ? (
                        <View style={s.empty}>
                            <View style={s.emptyCircle}>
                                <MaterialIcons name="savings" size={36} color={C.muted} />
                            </View>
                            <Text style={s.emptyTitle}>Aucune épargne</Text>
                            <Text style={s.emptyDesc}>Créez votre première tirelire et commencez à économiser dès aujourd'hui.</Text>
                        </View>
                    ) : (
                        epargnes.map((e) => {
                            const progress = pct(e.solde, e.objectif);
                            return (
                                <TouchableOpacity
                                    key={e.id}
                                    style={s.epargneCard}
                                    onPress={() => { setSelected(e); setModal("depot_epargne"); }}
                                    activeOpacity={0.8}
                                >
                                    <View style={s.epargneCardTop}>
                                        <View style={[s.epargneIcon, { backgroundColor: e.couleur + "20" }]}>
                                            <MaterialIcons name={e.icone as any} size={22} color={e.couleur} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.epargneNom}>{e.nom}</Text>
                                            <Text style={s.epargneObj}>Objectif : {fmt(e.objectif)} FCFA</Text>
                                        </View>
                                        <View style={s.epargnePct}>
                                            <Text style={[s.epargnePctTxt, { color: e.couleur }]}>
                                                {Math.round(progress * 100)}%
                                            </Text>
                                        </View>
                                    </View>
 
                                    {/* Progress bar */}
                                    <View style={s.progressBg}>
                                        <View style={[s.progressFill, {
                                            width: `${Math.round(progress * 100)}%` as any,
                                            backgroundColor: e.couleur,
                                        }]} />
                                    </View>
 
                                    <View style={s.epargneBottom}>
                                        <Text style={s.epargneSolde}>{fmt(e.solde)} FCFA</Text>
                                        <TouchableOpacity
                                            style={[s.depotBtn, { borderColor: e.couleur + "50" }]}
                                            onPress={() => { setSelected(e); setModal("depot_epargne"); }}
                                        >
                                            <MaterialIcons name="add" size={14} color={e.couleur} />
                                            <Text style={[s.depotBtnTxt, { color: e.couleur }]}>Déposer</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}
 
            {/* ══════════════════════════════════════════════════════════════
                TAB TONTINE
            ══════════════════════════════════════════════════════════════ */}
            {tab === "tontine" && (
                <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* CTA row */}
                    <View style={s.tontineCtaRow}>
                        <TouchableOpacity
                            style={[s.tontineCta, { backgroundColor: C.yellow }]}
                            onPress={() => { setTError(""); setModal("nouvelle_tontine"); }}
                            activeOpacity={0.85}
                        >
                            <MaterialIcons name="add-circle" size={20} color={C.black} />
                            <Text style={[s.tontineCtaTxt, { color: C.black }]}>Créer une caisse</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.tontineCta, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}
                            onPress={() => { setTError(""); setModal("rejoindre_tontine"); }}
                            activeOpacity={0.85}
                        >
                            <MaterialIcons name="group-add" size={20} color={C.teal} />
                            <Text style={[s.tontineCtaTxt, { color: C.teal }]}>Rejoindre</Text>
                        </TouchableOpacity>
                    </View>
 
                    {/* Explication rapide */}
                    <View style={s.infoBox}>
                        <MaterialIcons name="info-outline" size={16} color={C.blue} style={{ marginTop: 1 }} />
                        <Text style={s.infoTxt}>
                            Chaque mois, les membres cotisent un montant fixe. À tour de rôle,
                            un membre reçoit la totalité de la cagnotte du mois.
                        </Text>
                    </View>
 
                    {tontines.length === 0 ? (
                        <View style={s.empty}>
                            <View style={s.emptyCircle}>
                                <MaterialIcons name="groups" size={36} color={C.muted} />
                            </View>
                            <Text style={s.emptyTitle}>Aucune caisse commune</Text>
                            <Text style={s.emptyDesc}>Créez ou rejoignez une tontine pour épargner en groupe.</Text>
                        </View>
                    ) : (
                        tontines.map((t) => {
                            const membresProgress = t.membres_actuels / t.nombre_membres;
                            const statColor = t.statut === "actif" ? C.green : t.statut === "complet" ? C.yellow : C.gray;
                            const statLabel = t.statut === "actif" ? "ACTIF" : t.statut === "complet" ? "TERMINÉ" : "EN ATTENTE";
                            return (
                                <TouchableOpacity
                                    key={t.id}
                                    style={s.tontineCard}
                                    onPress={() => { setSelected(t); setModal("detail_tontine"); }}
                                    activeOpacity={0.8}
                                >
                                    {/* Top */}
                                    <View style={s.tontineCardTop}>
                                        <View style={s.tontineIconWrap}>
                                            <MaterialIcons name="groups" size={22} color={C.teal} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.tontineNom}>{t.nom}</Text>
                                            <View style={[s.statutBadge, { backgroundColor: statColor + "20" }]}>
                                                <View style={[s.statutDot, { backgroundColor: statColor }]} />
                                                <Text style={[s.statutTxt, { color: statColor }]}>{statLabel}</Text>
                                                {t.est_admin && <Text style={s.adminBadge}>  ADMIN</Text>}
                                            </View>
                                        </View>
                                        <View style={s.cotisationBadge}>
                                            <Text style={s.cotisationAmt}>{fmt(t.cotisation_mensuelle)}</Text>
                                            <Text style={s.cotisationUnit}>F/mois</Text>
                                        </View>
                                    </View>
 
                                    {/* Stats */}
                                    <View style={s.tontineStats}>
                                        <View style={s.tontieStat}>
                                            <Text style={s.tontineStatVal}>{t.membres_actuels}/{t.nombre_membres}</Text>
                                            <Text style={s.tontineStatLbl}>Membres</Text>
                                        </View>
                                        <View style={s.tontineStatDiv} />
                                        <View style={s.tontieStat}>
                                            <Text style={s.tontineStatVal}>{fmt(t.solde_total)}</Text>
                                            <Text style={s.tontineStatLbl}>Cagnotte (F)</Text>
                                        </View>
                                        <View style={s.tontineStatDiv} />
                                        <View style={s.tontieStat}>
                                            <Text style={s.tontineStatVal}>Tour {t.tour_actuel}</Text>
                                            <Text style={s.tontineStatLbl}>En cours</Text>
                                        </View>
                                    </View>
 
                                    {/* Prochain bénéficiaire */}
                                    {t.prochain_beneficiaire && (
                                        <View style={s.prochainRow}>
                                            <MaterialIcons name="emoji-events" size={14} color={C.yellow} />
                                            <Text style={s.prochainTxt}>
                                                Prochain bénéficiaire : <Text style={{ color: C.yellow, fontWeight: "800" }}>{t.prochain_beneficiaire}</Text>
                                                {t.prochain_date ? `  ·  ${new Date(t.prochain_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}` : ""}
                                            </Text>
                                        </View>
                                    )}
 
                                    {/* Barre membres */}
                                    <View style={s.progressBg}>
                                        <View style={[s.progressFill, {
                                            width: `${Math.round(membresProgress * 100)}%` as any,
                                            backgroundColor: C.teal,
                                        }]} />
                                    </View>
 
                                    {/* Bouton payer */}
                                    {t.est_membre && t.statut === "actif" && (
                                        <TouchableOpacity
                                            style={s.payBtn}
                                            onPress={() => payerCotisation(t.id)}
                                            activeOpacity={0.85}
                                        >
                                            <MaterialIcons name="payments" size={16} color={C.black} />
                                            <Text style={s.payBtnTxt}>Payer ma cotisation · {fmt(t.cotisation_mensuelle)} FCFA</Text>
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}
            </Animated.View>
 
            {/* ══════════════════════════════════════════════════════════════
                MODALS
            ══════════════════════════════════════════════════════════════ */}
 
            {/* ── Nouvelle épargne ─────────────────────────────────────── */}
            <Modal visible={modal === "nouvelle_epargne"} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>Nouvelle épargne</Text>
                        <Text style={s.modalSub}>Définissez un objectif et suivez votre progression</Text>
 
                        <Text style={s.fieldLbl}>Nom de l'épargne</Text>
                        <TextInput style={s.fieldInput} placeholder="Ex: Voyage, Voiture…" placeholderTextColor={C.gray}
                            value={eNom} onChangeText={setENom} />
 
                        <Text style={s.fieldLbl}>Objectif (FCFA)</Text>
                        <TextInput style={s.fieldInput} placeholder="Ex: 500000" placeholderTextColor={C.gray}
                            keyboardType="numeric" value={eObjectif} onChangeText={setEObjectif} />
 
                        <Text style={s.fieldLbl}>Couleur</Text>
                        <View style={s.colorsRow}>
                            {COULEURS.map((c) => (
                                <TouchableOpacity key={c} onPress={() => setECouleur(c)}
                                    style={[s.colorDot, { backgroundColor: c }, eCouleur === c && s.colorDotSelected]} />
                            ))}
                        </View>
 
                        <Text style={s.fieldLbl}>Icône</Text>
                        <View style={s.iconsRow}>
                            {ICONES.map((ic) => (
                                <TouchableOpacity key={ic} onPress={() => setEIcone(ic)}
                                    style={[s.iconOpt, eIcone === ic && { backgroundColor: eCouleur + "30", borderColor: eCouleur }]}>
                                    <MaterialIcons name={ic as any} size={20} color={eIcone === ic ? eCouleur : C.gray} />
                                </TouchableOpacity>
                            ))}
                        </View>
 
                        <TouchableOpacity style={s.modalBtn} onPress={creerEpargne} disabled={loading} activeOpacity={0.85}>
                            <Text style={s.modalBtnTxt}>Créer l'épargne</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.modalCancel} onPress={() => setModal(null)}>
                            <Text style={s.modalCancelTxt}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
 
            {/* ── Dépôt dans épargne ───────────────────────────────────── */}
            <Modal visible={modal === "depot_epargne"} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <View style={[s.modalIconBig, { backgroundColor: ((selected as Epargne)?.couleur ?? C.yellow) + "20" }]}>
                            <MaterialIcons name={(selected as Epargne)?.icone as any ?? "savings"} size={32}
                                color={(selected as Epargne)?.couleur ?? C.yellow} />
                        </View>
                        <Text style={s.modalTitle}>{(selected as Epargne)?.nom}</Text>
                        <Text style={s.modalSub}>
                            Solde actuel : {fmt((selected as Epargne)?.solde ?? 0)} FCFA  ·  Objectif : {fmt((selected as Epargne)?.objectif ?? 0)} FCFA
                        </Text>
 
                        {/* Progress */}
                        <View style={[s.progressBg, { marginVertical: 12 }]}>
                            <View style={[s.progressFill, {
                                width: `${Math.round(pct((selected as Epargne)?.solde ?? 0, (selected as Epargne)?.objectif ?? 1) * 100)}%` as any,
                                backgroundColor: (selected as Epargne)?.couleur ?? C.yellow,
                            }]} />
                        </View>
 
                        <Text style={s.fieldLbl}>Montant à déposer (FCFA)</Text>
                        <TextInput style={s.fieldInput} placeholder="Ex: 10000" placeholderTextColor={C.gray}
                            keyboardType="numeric" value={eDepot} onChangeText={setEDepot} />
 
                        <TouchableOpacity style={s.modalBtn} onPress={deposerEpargne} disabled={loading} activeOpacity={0.85}>
                            <MaterialIcons name="add-circle" size={18} color={C.black} />
                            <Text style={s.modalBtnTxt}>Déposer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.modalCancel} onPress={() => setModal(null)}>
                            <Text style={s.modalCancelTxt}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
 
            {/* ── Nouvelle tontine ─────────────────────────────────────── */}
            <Modal visible={modal === "nouvelle_tontine"} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>Créer une caisse</Text>
                        <Text style={s.modalSub}>Vous serez l'administrateur du groupe</Text>
 
                        {tError ? <View style={s.errBox}><Text style={s.errTxt}>{tError}</Text></View> : null}
 
                        <Text style={s.fieldLbl}>Nom de la caisse</Text>
                        <TextInput style={s.fieldInput} placeholder="Ex: Caisse famille 2025" placeholderTextColor={C.gray}
                            value={tNom} onChangeText={setTNom} />
 
                        <Text style={s.fieldLbl}>Cotisation mensuelle (FCFA)</Text>
                        <TextInput style={s.fieldInput} placeholder="Ex: 25000" placeholderTextColor={C.gray}
                            keyboardType="numeric" value={tCotisation} onChangeText={setTCotisation} />
 
                        <Text style={s.fieldLbl}>Nombre de membres</Text>
                        <TextInput style={s.fieldInput} placeholder="Ex: 6" placeholderTextColor={C.gray}
                            keyboardType="numeric" value={tMembres} onChangeText={setTMembres} />
 
                        {tCotisation && tMembres ? (
                            <View style={s.resumeBox}>
                                <MaterialIcons name="calculate" size={16} color={C.teal} />
                                <Text style={s.resumeTxt}>
                                    Chaque membre recevra{" "}
                                    <Text style={{ color: C.teal, fontWeight: "900" }}>
                                        {fmt(parseFloat(tCotisation || "0") * parseInt(tMembres || "0"))} FCFA
                                    </Text>
                                    {" "}à son tour (sur {tMembres} mois)
                                </Text>
                            </View>
                        ) : null}
 
                        <TouchableOpacity style={s.modalBtn} onPress={creerTontine} disabled={loading} activeOpacity={0.85}>
                            <Text style={s.modalBtnTxt}>Créer la caisse</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.modalCancel} onPress={() => setModal(null)}>
                            <Text style={s.modalCancelTxt}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
 
            {/* ── Rejoindre tontine ────────────────────────────────────── */}
            <Modal visible={modal === "rejoindre_tontine"} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <View style={[s.modalIconBig, { backgroundColor: C.teal + "20" }]}>
                            <MaterialIcons name="group-add" size={32} color={C.teal} />
                        </View>
                        <Text style={s.modalTitle}>Rejoindre une caisse</Text>
                        <Text style={s.modalSub}>L'administrateur vous partage un code d'invitation unique</Text>
 
                        {tError ? <View style={s.errBox}><Text style={s.errTxt}>{tError}</Text></View> : null}
 
                        <Text style={s.fieldLbl}>Code d'invitation</Text>
                        <TextInput style={[s.fieldInput, { letterSpacing: 4, textAlign: "center", fontSize: 20, fontWeight: "900" }]}
                            placeholder="XXXXXX" placeholderTextColor={C.muted}
                            autoCapitalize="characters" maxLength={8}
                            value={tCodeInvit} onChangeText={setTCodeInvit} />
 
                        <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.teal }]} onPress={rejoindre} disabled={loading} activeOpacity={0.85}>
                            <Text style={s.modalBtnTxt}>Rejoindre</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.modalCancel} onPress={() => setModal(null)}>
                            <Text style={s.modalCancelTxt}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
 
            {/* ── Détail tontine ───────────────────────────────────────── */}
            <Modal visible={modal === "detail_tontine"} animationType="slide" transparent>
                <View style={s.modalOverlay}>
                    <View style={[s.modalSheet, { maxHeight: "85%" }]}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>{(selected as Tontine)?.nom}</Text>
 
                        <View style={s.tontineStats}>
                            {[
                                { lbl: "Cotisation", val: `${fmt((selected as Tontine)?.cotisation_mensuelle ?? 0)} F` },
                                { lbl: "Membres",    val: `${(selected as Tontine)?.membres_actuels}/${(selected as Tontine)?.nombre_membres}` },
                                { lbl: "Tour",       val: `${(selected as Tontine)?.tour_actuel ?? 1}/${(selected as Tontine)?.nombre_membres ?? "?"}` },
                            ].map((item) => (
                                <View key={item.lbl} style={s.tontieStat}>
                                    <Text style={s.tontineStatVal}>{item.val}</Text>
                                    <Text style={s.tontineStatLbl}>{item.lbl}</Text>
                                </View>
                            ))}
                        </View>
 
                        {(selected as Tontine)?.prochain_beneficiaire && (
                            <View style={[s.prochainRow, { marginTop: 8 }]}>
                                <MaterialIcons name="emoji-events" size={16} color={C.yellow} />
                                <Text style={s.prochainTxt}>
                                    Prochain : <Text style={{ color: C.yellow, fontWeight: "800" }}>{(selected as Tontine)?.prochain_beneficiaire}</Text>
                                </Text>
                            </View>
                        )}
 
                        {/* Code d'invitation (admin seulement) */}
                        {(selected as Tontine)?.est_admin && (
                            <View style={s.codeBox}>
                                <Text style={s.codeLbl}>Code d'invitation à partager</Text>
                                <Text style={s.codeTxt}>{"TON_CODE_ICI"}</Text>
                            </View>
                        )}
 
                        <TouchableOpacity style={s.modalBtn} onPress={() => setModal(null)} activeOpacity={0.85}>
                            <Text style={s.modalBtnTxt}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
 
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.black },
 
    // Header
    header: {
        backgroundColor: C.ink, paddingBottom: 20,
        paddingHorizontal: 20, paddingTop: 16, overflow: "hidden",
    },
    headerBlob1: {
        position: "absolute", top: -50, right: -50,
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: C.yellow, opacity: 0.05,
    },
    headerBlob2: {
        position: "absolute", bottom: -30, left: -40,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: C.teal, opacity: 0.06,
    },
    headerTitle: { fontSize: 26, fontWeight: "900", color: C.white, letterSpacing: -0.5 },
    headerSub:   { fontSize: 12, color: C.gray, fontWeight: "600", marginBottom: 16, marginTop: 2 },
    totalsRow: { flexDirection: "row", gap: 10 },
    totalCard: {
        flex: 1, backgroundColor: "#1A1A1A", borderRadius: 16,
        padding: 14, borderWidth: 1, borderColor: C.yellow + "25",
        gap: 4,
    },
    totalLbl:  { fontSize: 11, color: C.gray, fontWeight: "700" },
    totalAmt:  { fontSize: 22, fontWeight: "900", color: C.yellow, letterSpacing: -0.5 },
    totalUnit: { fontSize: 10, color: C.muted, fontWeight: "600" },
 
    // Tabs
    tabs: {
        flexDirection: "row", marginHorizontal: 16, marginVertical: 12,
        backgroundColor: C.surface, borderRadius: 14, padding: 4,
        borderWidth: 1, borderColor: C.border,
    },
    tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 11 },
    tabActive: { backgroundColor: C.yellow },
    tabTxt:   { fontSize: 13, fontWeight: "700", color: C.gray },
    tabTxtActive: { color: C.black },
    tabBadge: {
        backgroundColor: C.teal, borderRadius: 8,
        minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
    },
    tabBadgeTxt: { fontSize: 9, fontWeight: "900", color: C.black },
 
    scrollContent: { paddingHorizontal: 16, paddingBottom: 110, paddingTop: 4 },
 
    // CTA créer épargne
    createBtn: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: C.yellow, borderRadius: 18, padding: 16, marginBottom: 16,
    },
    createBtnIcon: {
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center",
    },
    createBtnTitle: { fontSize: 15, fontWeight: "800", color: C.black },
    createBtnSub:   { fontSize: 12, color: "rgba(0,0,0,0.55)", marginTop: 2 },
 
    // Empty
    empty: { alignItems: "center", paddingTop: 60, gap: 10 },
    emptyCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        alignItems: "center", justifyContent: "center", marginBottom: 6,
    },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: C.light },
    emptyDesc:  { fontSize: 13, color: C.gray, textAlign: "center", lineHeight: 19 },
 
    // Épargne card
    epargneCard: {
        backgroundColor: C.card, borderRadius: 18, padding: 18,
        borderWidth: 1, borderColor: C.border, marginBottom: 12,
    },
    epargneCardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
    epargneIcon:    { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    epargneNom:     { fontSize: 15, fontWeight: "800", color: C.white },
    epargneObj:     { fontSize: 11, color: C.gray, marginTop: 2 },
    epargnePct:     { alignItems: "flex-end" },
    epargnePctTxt:  { fontSize: 18, fontWeight: "900" },
    progressBg:     { height: 6, backgroundColor: C.muted, borderRadius: 3, marginBottom: 12 },
    progressFill:   { height: 6, borderRadius: 3 },
    epargneBottom:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    epargneSolde:   { fontSize: 16, fontWeight: "900", color: C.white },
    depotBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    },
    depotBtnTxt: { fontSize: 12, fontWeight: "800" },
 
    // Tontine
    tontineCtaRow:  { flexDirection: "row", gap: 10, marginBottom: 12 },
    tontineCta: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, borderRadius: 14, paddingVertical: 14,
    },
    tontineCtaTxt:  { fontSize: 13, fontWeight: "800" },
    infoBox: {
        flexDirection: "row", gap: 8, alignItems: "flex-start",
        backgroundColor: C.blue + "12", borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: C.blue + "25", marginBottom: 16,
    },
    infoTxt: { flex: 1, fontSize: 12, color: C.light, lineHeight: 18 },
    tontineCard: {
        backgroundColor: C.card, borderRadius: 18, padding: 18,
        borderWidth: 1, borderColor: C.border, marginBottom: 12,
    },
    tontineCardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
    tontineIconWrap: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: C.teal + "20", alignItems: "center", justifyContent: "center",
    },
    tontineNom:     { fontSize: 15, fontWeight: "800", color: C.white, marginBottom: 4 },
    statutBadge:    { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statutDot:      { width: 5, height: 5, borderRadius: 2.5 },
    statutTxt:      { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
    adminBadge:     { fontSize: 9, color: C.yellow, fontWeight: "900", letterSpacing: 0.5 },
    cotisationBadge:{ alignItems: "flex-end" },
    cotisationAmt:  { fontSize: 18, fontWeight: "900", color: C.yellow },
    cotisationUnit: { fontSize: 10, color: C.gray },
    tontineStats: {
        flexDirection: "row", backgroundColor: C.surface, borderRadius: 12,
        padding: 12, marginBottom: 12,
    },
    tontieStat:     { flex: 1, alignItems: "center" },
    tontineStatVal: { fontSize: 15, fontWeight: "900", color: C.white, marginBottom: 2 },
    tontineStatLbl: { fontSize: 10, color: C.gray, fontWeight: "600" },
    tontineStatDiv: { width: 1, backgroundColor: C.border, marginVertical: 4 },
    prochainRow: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: C.yellow + "10", borderRadius: 10, padding: 10, marginBottom: 10,
    },
    prochainTxt: { fontSize: 12, color: C.light, flex: 1, lineHeight: 17 },
    payBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: C.yellow, borderRadius: 12, paddingVertical: 12, marginTop: 4,
    },
    payBtnTxt: { fontSize: 13, fontWeight: "900", color: C.black },
 
    // Modal
    modalOverlay:   { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
    modalSheet: {
        backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, borderTopWidth: 1, borderColor: C.border,
    },
    modalHandle:    { width: 40, height: 4, backgroundColor: C.muted, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
    modalIconBig: {
        width: 64, height: 64, borderRadius: 20,
        alignItems: "center", justifyContent: "center",
        alignSelf: "center", marginBottom: 14,
    },
    modalTitle:     { fontSize: 22, fontWeight: "900", color: C.white, marginBottom: 4 },
    modalSub:       { fontSize: 13, color: C.gray, marginBottom: 20, lineHeight: 19 },
    fieldLbl:       { fontSize: 11, fontWeight: "700", color: C.gray, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, marginTop: 12 },
    fieldInput: {
        backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
        paddingHorizontal: 16, paddingVertical: 14, color: C.white, fontSize: 15, fontWeight: "600",
    },
    colorsRow:  { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 4 },
    colorDot:   { width: 30, height: 30, borderRadius: 15 },
    colorDotSelected: { borderWidth: 3, borderColor: C.white, transform: [{ scale: 1.15 }] },
    iconsRow:   { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    iconOpt: {
        width: 44, height: 44, borderRadius: 12,
        borderWidth: 1, borderColor: C.border,
        backgroundColor: C.surface, alignItems: "center", justifyContent: "center",
    },
    resumeBox: {
        flexDirection: "row", gap: 8, alignItems: "flex-start",
        backgroundColor: C.teal + "12", borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: C.teal + "25", marginTop: 12,
    },
    resumeTxt: { flex: 1, fontSize: 13, color: C.light, lineHeight: 19 },
    errBox: {
        backgroundColor: C.red + "15", borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: C.red + "30", marginBottom: 8,
    },
    errTxt:   { color: C.red, fontSize: 13, fontWeight: "600" },
    modalBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: C.yellow, borderRadius: 14, height: 54, marginTop: 20,
    },
    modalBtnTxt:    { fontSize: 15, fontWeight: "900", color: C.black },
    modalCancel:    { alignItems: "center", paddingVertical: 14 },
    modalCancelTxt: { color: C.gray, fontSize: 14, fontWeight: "600" },
    codeBox: {
        backgroundColor: C.yellow + "12", borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: C.yellow + "30", alignItems: "center", marginVertical: 12,
    },
    codeLbl: { fontSize: 11, color: C.gray, fontWeight: "700", marginBottom: 6 },
    codeTxt: { fontSize: 28, fontWeight: "900", color: C.yellow, letterSpacing: 6 },
});