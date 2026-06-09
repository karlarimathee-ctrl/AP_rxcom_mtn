import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
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
    accent: "#B0B0B0",
};

export default function AProposScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.yellow} />
            {/*<SubPageHeader title="A propos de MTN" accentColor={MTN.accent} />*/}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

                {/* Logo section */}
                <View style={styles.logoSection}>
                    <View style={styles.logoBox}>
                        <Text style={styles.logoText}>MTN</Text>
                    </View>
                    <Text style={styles.appName}>MOMO GRAMM</Text>
                    <Text style={styles.version}>Version 1.0.0</Text>
                    <View style={styles.buildBadge}>
                        <Text style={styles.buildText}>Build 2026.05.21</Text>
                    </View>
                </View>

                {/* Infos app */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Application</Text>
                    {[
                        { label: "Version",           value: "1.0.0" },
                        { label: "Dernière mise à jour", value: "21 Mai 2026" },
                        { label: "Plateforme",         value: "React Native / Expo" },
                        { label: "Environnement",      value: "Production" },
                    ].map((item) => (
                        <View key={item.label} style={styles.row}>
                            <Text style={styles.rowLabel}>{item.label}</Text>
                            <Text style={styles.rowValue}>{item.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Légal */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Légal</Text>
                    {[
                        { label: "Conditions d'utilisation", icon: "description" },
                        { label: "Politique de confidentialité", icon: "privacy-tip" },
                        { label: "Mentions légales", icon: "gavel" },
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.label}
                            style={styles.linkRow}
                            onPress={() => Linking.openURL("https://mtn.cg")}
                            activeOpacity={0.7}
                        >
                            <MaterialIcons name={item.icon as any} size={18} color={MTN.lightGray} />
                            <Text style={styles.linkLabel}>{item.label}</Text>
                            <MaterialIcons name="open-in-new" size={16} color={MTN.lightGray} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Crédits */}
                <View style={[styles.card, { padding: 20, alignItems: "center" }]}>
                    <Text style={styles.creditText}>
                        © {new Date().getFullYear()} MTN Congo — Tous droits réservés
                    </Text>
                    <Text style={styles.creditSub}>
                        Développé par WebNova au Congo-Brazzaville
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: MTN.black },
    container: { padding: 20, paddingBottom: 40 },
    logoSection: { alignItems: "center", marginBottom: 28 },
    logoBox: {
        width: 80, height: 80, borderRadius: 20,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
        marginBottom: 12, shadowColor: MTN.yellow,
        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    },
    logoText: { fontSize: 22, fontWeight: "900", color: MTN.black, letterSpacing: 2 },
    appName: { fontSize: 18, fontWeight: "900", color: MTN.white, letterSpacing: 3, marginBottom: 4 },
    version: { fontSize: 13, color: MTN.lightGray, fontWeight: "600", marginBottom: 8 },
    buildBadge: {
        backgroundColor: MTN.darkGray, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 4,
        borderWidth: 1, borderColor: MTN.mediumGray,
    },
    buildText: { fontSize: 11, color: MTN.lightGray, fontWeight: "700" },
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
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 13,
        borderTopWidth: 1, borderTopColor: MTN.mediumGray,
    },
    rowLabel: { fontSize: 13, color: MTN.lightGray, fontWeight: "600" },
    rowValue: { fontSize: 13, color: MTN.white, fontWeight: "700" },
    linkRow: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        borderTopWidth: 1, borderTopColor: MTN.mediumGray,
    },
    linkLabel: { flex: 1, fontSize: 14, color: MTN.white, fontWeight: "600" },
    creditText: { fontSize: 13, color: MTN.lightGray, fontWeight: "600", textAlign: "center", marginBottom: 6 },
    creditSub: { fontSize: 12, color: MTN.mediumGray, textAlign: "center" },
});
