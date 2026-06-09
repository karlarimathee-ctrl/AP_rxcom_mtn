import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    FlatList,
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
    accent: "#FF9800",
    error: "#FF4444",
    success: "#00C853",
};

type FilterType = "tous" | "envoi" | "reception" | "paiement";

const FILTERS: { key: FilterType; label: string }[] = [
    { key: "tous", label: "Tous" },
    { key: "envoi", label: "Envois" },
    { key: "reception", label: "Réceptions" },
    { key: "paiement", label: "Paiements" },
];

// Données fictives — à remplacer par un appel API
const MOCK_TRANSACTIONS = [
    { id: "1", type: "reception", nom: "Alice Mbemba", montant: 5000, date: "Aujourd'hui, 10:32", note: "Remboursement" },
    { id: "2", type: "envoi",     nom: "Bob Nkounkou", montant: 2500, date: "Hier, 18:15",       note: "Courses" },
    { id: "3", type: "paiement",  nom: "MTN MoMo",    montant: 1000, date: "20 Mai, 09:00",      note: "Achat crédit" },
    { id: "4", type: "reception", nom: "Claire Itoua", montant: 10000, date: "19 Mai, 14:22",    note: "" },
    { id: "5", type: "envoi",     nom: "David Oko",   montant: 3000, date: "18 Mai, 11:05",      note: "Transport" },
];

type Transaction = typeof MOCK_TRANSACTIONS[0];

function TransactionCard({ item }: { item: Transaction }) {
    const isEnvoi = item.type === "envoi";
    const isPaiement = item.type === "paiement";
    const color = isEnvoi ? MTN.error : isPaiement ? MTN.accent : MTN.success;
    const icon = isEnvoi ? "arrow-upward" : isPaiement ? "shopping-cart" : "arrow-downward";
    const sign = isEnvoi || isPaiement ? "−" : "+";

    return (
        <View style={styles.txCard}>
            <View style={[styles.txIcon, { backgroundColor: color + "18" }]}>
                <MaterialIcons name={icon as any} size={20} color={color} />
            </View>
            <View style={styles.txInfo}>
                <Text style={styles.txNom}>{item.nom}</Text>
                {item.note ? <Text style={styles.txNote}>{item.note}</Text> : null}
                <Text style={styles.txDate}>{item.date}</Text>
            </View>
            <Text style={[styles.txMontant, { color }]}>
                {sign} {item.montant.toLocaleString()} F
            </Text>
        </View>
    );
}

export default function HistoriqueScreen() {
    const [filter, setFilter] = useState<FilterType>("tous");

    const filtered = filter === "tous"
        ? MOCK_TRANSACTIONS
        : MOCK_TRANSACTIONS.filter((t) => t.type === filter);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.yellow} />
            {/*<SubPageHeader title="Historique des comptes" accentColor={MTN.accent} />*/}
           

            {/* Filtres */}
            <View style={styles.filtersRow}>
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                        onPress={() => setFilter(f.key)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {filtered.length === 0 ? (
                <View style={styles.empty}>
                    <MaterialIcons name="receipt-long" size={48} color={MTN.mediumGray} />
                    <Text style={styles.emptyText}>Aucune transaction</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(i) => i.id}
                    renderItem={({ item }) => <TransactionCard item={item} />}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: MTN.black },
    filtersRow: {
        flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 14,
    },
    filterBtn: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, backgroundColor: MTN.darkGray,
        borderWidth: 1, borderColor: MTN.mediumGray,
    },
    filterBtnActive: { backgroundColor: MTN.accent + "22", borderColor: MTN.accent },
    filterText: { fontSize: 13, color: MTN.lightGray, fontWeight: "600" },
    filterTextActive: { color: MTN.accent, fontWeight: "800" },
    list: { paddingHorizontal: 16, paddingBottom: 40 },
    txCard: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: MTN.darkGray, borderRadius: 14,
        borderWidth: 1, borderColor: MTN.mediumGray,
        padding: 14, marginBottom: 10,
    },
    txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    txInfo: { flex: 1 },
    txNom: { fontSize: 14, color: MTN.white, fontWeight: "700", marginBottom: 2 },
    txNote: { fontSize: 12, color: MTN.lightGray, marginBottom: 2 },
    txDate: { fontSize: 11, color: MTN.lightGray },
    txMontant: { fontSize: 15, fontWeight: "900" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    emptyText: { fontSize: 15, color: MTN.lightGray, fontWeight: "600" },
});
