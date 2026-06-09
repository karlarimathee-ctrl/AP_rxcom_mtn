import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
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
    accent: "#00BCD4",
};

type NotifSection = {
    title: string;
    items: { key: string; icon: string; label: string; description: string }[];
};

const SECTIONS: NotifSection[] = [
    {
        title: "Transactions",
        items: [
            { key: "envoi",       icon: "arrow-upward",    label: "Envois d'argent",     description: "Confirmations de vos envois" },
            { key: "reception",   icon: "arrow-downward",  label: "Réceptions",           description: "Quand vous recevez de l'argent" },
            { key: "paiement",    icon: "shopping-cart",   label: "Paiements",            description: "Confirmations de paiements" },
        ],
    },
    {
        title: "Compte",
        items: [
            { key: "connexion",   icon: "login",           label: "Connexions",           description: "Alertes de nouvelle connexion" },
            { key: "solde",       icon: "account-balance", label: "Solde faible",         description: "Quand votre solde est bas" },
            { key: "promo",       icon: "local-offer",     label: "Promotions",           description: "Offres et nouvelles de MTN" },
        ],
    },
    {
        title: "Système",
        items: [
            { key: "maj",         icon: "system-update",   label: "Mises à jour",         description: "Nouvelles versions disponibles" },
            { key: "maintenance", icon: "build",           label: "Maintenance",          description: "Interruptions de service planifiées" },
        ],
    },
];

export default function NotificationsSettingsScreen() {
    const [settings, setSettings] = useState<Record<string, boolean>>({
        envoi: true, reception: true, paiement: true,
        connexion: true, solde: true, promo: false,
        maj: true, maintenance: false,
    });

    const toggle = (key: string) =>
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.yellow} />
            {/*<SubPageHeader title="Notifications" accentColor={MTN.accent} />*/}


            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
                {SECTIONS.map((section) => (
                    <View key={section.title} style={styles.card}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.items.map((item) => (
                            <View key={item.key} style={styles.row}>
                                <View style={[styles.rowIcon, { backgroundColor: MTN.accent + "18" }]}>
                                    <MaterialIcons name={item.icon as any} size={18} color={MTN.accent} />
                                </View>
                                <View style={styles.rowContent}>
                                    <Text style={styles.rowLabel}>{item.label}</Text>
                                    <Text style={styles.rowDesc}>{item.description}</Text>
                                </View>
                                <Switch
                                    value={!!settings[item.key]}
                                    onValueChange={() => toggle(item.key)}
                                    trackColor={{ false: MTN.mediumGray, true: MTN.accent + "88" }}
                                    thumbColor={settings[item.key] ? MTN.accent : MTN.lightGray}
                                />
                            </View>
                        ))}
                    </View>
                ))}
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
        paddingHorizontal: 16, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: MTN.mediumGray, gap: 12,
    },
    rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 14, color: MTN.white, fontWeight: "600", marginBottom: 2 },
    rowDesc: { fontSize: 11, color: MTN.lightGray, lineHeight: 15 },
});
