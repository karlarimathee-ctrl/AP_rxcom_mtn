import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MTN = {
    yellow: "#FFCC00",
    black: "#0A0A0A",
    darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray: "#B0B0B0",
    white: "#FFFFFF",
    accent: "#4CAF50",
};

const FAQ = [
    {
        q: "Comment envoyer de l'argent ?",
        r: "Depuis l'onglet 'Envoyer', saisissez le numéro du destinataire, le montant et votre PIN pour confirmer.",
    },
    {
        q: "Mon transfert est bloqué, que faire ?",
        r: "Vérifiez votre connexion internet et votre solde. Si le problème persiste, contactez le support au 1234.",
    },
    {
        q: "Comment modifier mon PIN ?",
        r: "Rendez-vous dans Profil → Sécurité & PIN → Modifier le PIN.",
    },
    {
        q: "Comment recharger mon compte ?",
        r: "Composez le *126# ou rendez-vous chez un agent MTN MoMo agréé.",
    },
];

function FaqItem({ q, r }: { q: string; r: string }) {
    const [open, setOpen] = useState(false);
    return (
        <TouchableOpacity
            style={styles.faqItem}
            onPress={() => setOpen((v) => !v)}
            activeOpacity={0.7}
        >
            <View style={styles.faqHeader}>
                <Text style={styles.faqQ}>{q}</Text>
                <MaterialIcons name={open ? "expand-less" : "expand-more"} size={20} color={MTN.lightGray} />
            </View>
            {open && <Text style={styles.faqR}>{r}</Text>}
        </TouchableOpacity>
    );
}

export default function AideScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.yellow} />
            {/*<SubPageHeader title="Aide & Support" accentColor={MTN.accent} />*/}
            

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

                {/* Contacts rapides */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Nous contacter</Text>

                    {[
                        { icon: "call",          label: "Appeler le 1234",          color: MTN.accent,    action: () => Linking.openURL("tel:1234") },
                        { icon: "chat",          label: "Chat en direct",            color: "#2196F3",     action: () => {} },
                        { icon: "email",         label: "Envoyer un email",          color: "#FF9800",     action: () => Linking.openURL("mailto:support@mtn.cg") },
                        { icon: "public",        label: "Centre d'aide en ligne",    color: "#9C27B0",     action: () => Linking.openURL("https://mtn.cg") },
                    ].map((item) => (
                        <TouchableOpacity key={item.label} style={styles.row} onPress={item.action} activeOpacity={0.7}>
                            <View style={[styles.rowIcon, { backgroundColor: item.color + "18" }]}>
                                <MaterialIcons name={item.icon as any} size={18} color={item.color} />
                            </View>
                            <Text style={styles.rowLabel}>{item.label}</Text>
                            <MaterialIcons name="chevron-right" size={20} color={MTN.lightGray} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* FAQ */}
                <Text style={styles.faqTitle}>Questions fréquentes</Text>
                <View style={styles.card}>
                    {FAQ.map((item) => (
                        <FaqItem key={item.q} q={item.q} r={item.r} />
                    ))}
                </View>

                {/* Horaires */}
                <View style={[styles.card, { padding: 16 }]}>
                    <View style={styles.horairesRow}>
                        <MaterialIcons name="schedule" size={18} color={MTN.accent} />
                        <Text style={styles.horairesText}>Support disponible 7j/7 de 7h à 22h</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: MTN.black },
    container: { padding: 20, paddingBottom: 40 },
    card: {
        backgroundColor: MTN.darkGray, borderRadius: 16,
        borderWidth: 1, borderColor: MTN.mediumGray,
        marginBottom: 16, overflow: "hidden",
    },
    sectionTitle: {
        fontSize: 11, fontWeight: "700", color: MTN.lightGray,
        letterSpacing: 1, textTransform: "uppercase",
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    },
    row: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 14,
        borderTopWidth: 1, borderTopColor: MTN.mediumGray, gap: 12,
    },
    rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    rowLabel: { flex: 1, fontSize: 14, color: MTN.white, fontWeight: "600" },
    faqTitle: {
        fontSize: 11, fontWeight: "700", color: MTN.lightGray,
        letterSpacing: 1, textTransform: "uppercase", marginBottom: 8,
    },
    faqItem: {
        borderTopWidth: 1, borderTopColor: MTN.mediumGray,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    faqQ: { flex: 1, fontSize: 14, color: MTN.white, fontWeight: "600", paddingRight: 8 },
    faqR: { fontSize: 13, color: MTN.lightGray, lineHeight: 19, marginTop: 10 },
    horairesRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    horairesText: { fontSize: 13, color: MTN.lightGray, fontWeight: "600" },
});
