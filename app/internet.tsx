import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
 
const C = {
    yellow:  "#FFCC00",
    yellowD: "#C9A000",
    black:   "#080808",
    ink:     "#111111",
    card:    "#161616",
    surface: "#1E1E1E",
    border:  "#252525",
    gray:    "#666666",
    light:   "#BBBBBB",
    white:   "#F5F5F5",
    green:   "#00D97E",
    blue:    "#3B8BFF",
};
 
type Forfait = {
    nom: string;
    detail: string;
    prix: number;
    duree: string;
    dureeNum: string;
    type: "data" | "whatsapp" | "appel" | "sms";
    validite: "1J" | "3J" | "7J" | "30J";
    ussd: string;
};
 
const FORFAITS: Forfait[] = [
    { nom: "3GB + 3GB Bonus",          detail: "Ndeko Net",  prix: 1200, duree: "3 Jours",  dureeNum: "3J",  type: "data",     validite: "3J",  ussd: "*154*3*6*1#"  },
    { nom: "WhatsApp Text illimité",   detail: "Ndeko Net",  prix: 450,  duree: "7 Jours",  dureeNum: "7J",  type: "whatsapp", validite: "7J",  ussd: "*154*3*6*4#"  },
    { nom: "WhatsApp Text illimité",   detail: "Ndeko Net",  prix: 1000, duree: "30 Jours", dureeNum: "30J", type: "whatsapp", validite: "30J", ussd: "*154*3*6*5#"  },
    { nom: "800MB",                    detail: "Ndeko Net",  prix: 350,  duree: "1 Jour",   dureeNum: "1J",  type: "data",     validite: "1J",  ussd: "*154*3*6*7#"  },
    { nom: "3.5GB Plan",               detail: "Ndeko Net",  prix: 850,  duree: "1 Jour",   dureeNum: "1J",  type: "data",     validite: "1J",  ussd: "*154*3*6*2#"  },
    { nom: "1.5GB",                    detail: "Ndeko Net",  prix: 400,  duree: "1 Jour",   dureeNum: "1J",  type: "data",     validite: "1J",  ussd: "*154*3*6*8#"  },
    { nom: "6.5GB",                    detail: "Ndeko Net",  prix: 1300, duree: "1 Jour",   dureeNum: "1J",  type: "data",     validite: "1J",  ussd: "*154*3*6*9#"  },
    { nom: "3GB",                      detail: "Ndeko Net",  prix: 660,  duree: "3 Jours",  dureeNum: "3J",  type: "data",     validite: "3J",  ussd: "*154*3*6*3#"  },
    { nom: "6GB + 6GB Bonus",          detail: "Ndeko Net",  prix: 1100, duree: "3 Jours",  dureeNum: "3J",  type: "data",     validite: "3J",  ussd: "*154*3*6*6#"  },
    { nom: "10GB",                     detail: "Ndeko Net",  prix: 2000, duree: "7 Jours",  dureeNum: "7J",  type: "data",     validite: "7J",  ussd: "*154*3*6*10#" },
    { nom: "20GB",                     detail: "Ndeko Net",  prix: 4500, duree: "30 Jours", dureeNum: "30J", type: "data",     validite: "30J", ussd: "*154*3*6*11#" },
    { nom: "WhatsApp + 500MB",         detail: "Ndeko Net",  prix: 600,  duree: "7 Jours",  dureeNum: "7J",  type: "whatsapp", validite: "7J",  ussd: "*154*3*6*12#" },
];
 
const TYPES    = ["Tous", "data", "whatsapp", "appel", "sms"];
const VALIDITE = ["Tous", "1J", "3J", "7J", "30J"];
const PRIX_MAX = ["Tous", "500", "1000", "2000", "5000"];
 
const TYPE_LABELS: Record<string, string> = {
    Tous: "Type", data: "Data", whatsapp: "WhatsApp", appel: "Appels", sms: "SMS",
};
const VALID_LABELS: Record<string, string> = {
    Tous: "Validité", "1J": "1 Jour", "3J": "3 Jours", "7J": "7 Jours", "30J": "30 Jours",
};
const PRIX_LABELS: Record<string, string> = {
    Tous: "Prix", "500": "≤ 500F", "1000": "≤ 1000F", "2000": "≤ 2000F", "5000": "≤ 5000F",
};
 
const dialUSSD = (ussd: string) => {
    const encoded = encodeURIComponent(ussd);
    const url = Platform.OS === "android"
        ? `tel:${encoded}`
        : `tel:${encoded}`;
    Linking.openURL(url).catch(() => {
        Linking.openURL(`tel:${ussd}`);
    });
};
 
export default function InternetScreen() {
    const [typeFilter,   setTypeFilter]   = useState("Tous");
    const [validFilter,  setValidFilter]  = useState("Tous");
    const [prixFilter,   setPrixFilter]   = useState("Tous");
    const [openDropdown, setOpenDropdown] = useState<"type"|"valid"|"prix"|null>(null);
 
    const filtered = FORFAITS.filter((f) => {
        const okType  = typeFilter  === "Tous" || f.type === typeFilter;
        const okValid = validFilter === "Tous" || f.validite === validFilter;
        const okPrix  = prixFilter  === "Tous" || f.prix <= parseInt(prixFilter);
        return okType && okValid && okPrix;
    });
 
    const Dropdown = ({
        id, value, options, labels, onChange,
    }: {
        id: "type"|"valid"|"prix";
        value: string;
        options: string[];
        labels: Record<string, string>;
        onChange: (v: string) => void;
    }) => {
        const isOpen = openDropdown === id;
        return (
            <View style={{ position: "relative", zIndex: isOpen ? 100 : 1 }}>
                <TouchableOpacity
                    style={[s.filterBtn, value !== "Tous" && s.filterBtnActive]}
                    onPress={() => setOpenDropdown(isOpen ? null : id)}
                    activeOpacity={0.8}
                >
                    <Text style={[s.filterBtnTxt, value !== "Tous" && s.filterBtnTxtActive]}>
                        {labels[value]}
                    </Text>
                    <MaterialIcons
                        name={isOpen ? "expand-less" : "expand-more"}
                        size={16}
                        color={value !== "Tous" ? C.black : C.light}
                    />
                </TouchableOpacity>
 
                {isOpen && (
                    <View style={s.dropMenu}>
                        {options.map((opt) => (
                            <TouchableOpacity
                                key={opt}
                                style={[s.dropItem, opt === value && s.dropItemActive]}
                                onPress={() => { onChange(opt); setOpenDropdown(null); }}
                            >
                                {opt === value && (
                                    <MaterialIcons name="check" size={14} color={C.yellow} />
                                )}
                                <Text style={[s.dropItemTxt, opt === value && s.dropItemTxtActive]}>
                                    {labels[opt]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };
 
    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.black} />
 
            
 
            {/* ── FILTRES ─────────────────────────────────────── */}
            <View style={s.filtersRow}>
                <Dropdown
                    id="type"
                    value={typeFilter}
                    options={TYPES}
                    labels={TYPE_LABELS}
                    onChange={setTypeFilter}
                />
                <Dropdown
                    id="valid"
                    value={validFilter}
                    options={VALIDITE}
                    labels={VALID_LABELS}
                    onChange={setValidFilter}
                />
                <Dropdown
                    id="prix"
                    value={prixFilter}
                    options={PRIX_MAX}
                    labels={PRIX_LABELS}
                    onChange={setPrixFilter}
                />
            </View>
 
            {/* ── SECTION LABEL ───────────────────────────────── */}
            <View style={s.sectionLblRow}>
                <View style={s.sectionAccent} />
                <Text style={s.sectionLbl}>
                    Tous les forfaits
                    <Text style={s.sectionCount}> ({filtered.length})</Text>
                </Text>
            </View>
 
            {/* ── LISTE ───────────────────────────────────────── */}
            <ScrollView
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => setOpenDropdown(null)}
            >
                {filtered.length === 0 ? (
                    <View style={s.emptyWrap}>
                        <MaterialIcons name="wifi-off" size={48} color={C.gray} />
                        <Text style={s.emptyTxt}>Aucun forfait pour ces filtres</Text>
                    </View>
                ) : (
                    filtered.map((f, i) => (
                        <View key={i} style={s.row}>
                            {/* Infos gauche */}
                            <View style={s.rowLeft}>
                                {/* Icône type */}
                                <View style={[s.typeIcon, {
                                    backgroundColor:
                                        f.type === "whatsapp" ? "#25D36615" :
                                        f.type === "data"     ? C.blue + "15" :
                                        C.yellow + "15",
                                }]}>
                                    <MaterialIcons
                                        name={
                                            f.type === "whatsapp" ? "chat" :
                                            f.type === "data"     ? "wifi" :
                                            "call"
                                        }
                                        size={16}
                                        color={
                                            f.type === "whatsapp" ? "#25D366" :
                                            f.type === "data"     ? C.blue :
                                            C.yellow
                                        }
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.rowNom}>{f.nom}</Text>
                                    <Text style={s.rowDetail}>{f.detail}</Text>
                                </View>
                            </View>
 
                            {/* Prix + durée + bouton */}
                            <View style={s.rowRight}>
                                <View style={s.prixWrap}>
                                    <Text style={s.prixNum}>{f.prix.toLocaleString("fr-FR")}</Text>
                                    <View>
                                        <Text style={s.prixUnit}>FCFA</Text>
                                        <Text style={s.prixDuree}>{f.duree}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={s.acheterBtn}
                                    onPress={() => dialUSSD(f.ussd)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={s.acheterTxt}>Acheter</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
 
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.black },
 
    // Header
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: C.ink,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: C.surface,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 17, fontWeight: "800", color: C.white },
 
    // Filtres
    filtersRow: {
        flexDirection: "row", gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: C.ink,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    filterBtn: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: C.surface, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8,
        borderWidth: 1, borderColor: C.border,
    },
    filterBtnActive: {
        backgroundColor: C.yellow, borderColor: C.yellowD,
    },
    filterBtnTxt: { fontSize: 13, fontWeight: "700", color: C.light },
    filterBtnTxtActive: { color: C.black },
 
    // Dropdown
    dropMenu: {
        position: "absolute", top: 44, left: 0,
        minWidth: 160,
        backgroundColor: C.card,
        borderRadius: 14, borderWidth: 1, borderColor: C.border,
        overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
    },
    dropItem: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    dropItemActive: { backgroundColor: C.yellow + "15" },
    dropItemTxt: { fontSize: 14, color: C.light, fontWeight: "600" },
    dropItemTxtActive: { color: C.yellow, fontWeight: "800" },
 
    // Section label
    sectionLblRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    },
    sectionAccent: { width: 3, height: 16, borderRadius: 2, backgroundColor: C.yellow },
    sectionLbl: { fontSize: 13, fontWeight: "700", color: C.light },
    sectionCount: { color: C.gray, fontWeight: "600" },
 
    // Liste
    listContent: { paddingBottom: 100 },
 
    // Ligne forfait
    row: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: C.border,
        gap: 12,
    },
    rowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    typeIcon: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    rowNom:    { fontSize: 14, fontWeight: "800", color: C.white, marginBottom: 3 },
    rowDetail: { fontSize: 11, color: C.gray, fontWeight: "600" },
 
    rowRight: { alignItems: "flex-end", gap: 8 },
    prixWrap: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
    prixNum:  { fontSize: 22, fontWeight: "900", color: C.yellow, lineHeight: 26 },
    prixUnit: { fontSize: 10, fontWeight: "700", color: C.light, lineHeight: 14 },
    prixDuree:{ fontSize: 10, color: C.gray, lineHeight: 14 },
 
    acheterBtn: {
        backgroundColor: C.yellow, borderRadius: 10,
        paddingHorizontal: 16, paddingVertical: 8,
    },
    acheterTxt: { fontSize: 13, fontWeight: "900", color: C.black },
 
    // Empty
    emptyWrap: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyTxt: { fontSize: 14, color: C.gray, fontWeight: "600" },
 
    // Card style pour les items
    card: {
        backgroundColor: C.card, borderRadius: 14,
        borderWidth: 1, borderColor: C.border,
    },
});