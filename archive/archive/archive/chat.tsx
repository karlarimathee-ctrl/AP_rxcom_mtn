import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
import React, { useEffect, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import API_URL from "../../backend/api";
 
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
 
type Contact = {
    id: string;
    name: string;
    numero: string;
    hasAccount: boolean;
    username?: string | null;
};
 
type Conversation = {
    numero: string;
    name: string;
    username?: string;
    lastMessage?: string;
    lastTime?: string;
    unread?: number;
};
 
type Message = {
    id: string;
    from_numero: string;
    to_numero: string;
    content: string;
    created_at: string;
};
 
const initials = (name: string) =>
    (name ?? "?").split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
 
const formatTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};
 
const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
};
 
export default function ChatScreen() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"messages" | "contacts">("messages");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
 
    // Chat
    const [chatOpen, setChatOpen] = useState(false);
    const [chatContact, setChatContact] = useState<Contact | Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
 
    useEffect(() => {
        AsyncStorage.getItem("user").then((v) => {
            if (v) setCurrentUser(JSON.parse(v));
        });
    }, []);
 
    useEffect(() => {
        if (currentUser) {
            fetchConversations();
            const interval = setInterval(fetchConversations, 5000);
            return () => clearInterval(interval);
        }
    }, [currentUser]);
 
    const fetchConversations = async () => {
        try {
            const res = await fetch(`${API_URL}/api/conversations?numero=${currentUser.numero}`);
            if (res.ok) setConversations(await res.json());
        } catch {}
    };
 
    // ─── IMPORTER CONTACTS SIM ────────────────────────────────────────────────
    const importContacts = async () => {
        setLoadingContacts(true);
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== "granted") { setLoadingContacts(false); return; }
 
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
            });
 
            const simContacts: { name: string; numero: string }[] = [];
            data.forEach((c) => {
                c.phoneNumbers?.forEach((p) => {
                    let raw = (p.number ?? "").replace(/[\s\-\(\)\.]/g, "");
                    if (raw.startsWith("+242")) raw = raw.slice(4);
                    if (raw.startsWith("242")) raw = raw.slice(3);
                    if (/^06\d{7}$/.test(raw)) {
                        simContacts.push({ name: c.name ?? "Inconnu", numero: raw });
                    }
                });
            });
 
            // Dédupliquer par numéro
            const unique = simContacts.filter(
                (c, i, arr) => arr.findIndex((x) => x.numero === c.numero) === i
                    && c.numero !== currentUser?.numero
            );
 
            if (unique.length === 0) {
                setContacts([]);
                setActiveTab("contacts");
                setLoadingContacts(false);
                return;
            }
 
            // Vérifier lesquels ont un compte
            const res = await fetch(`${API_URL}/api/check-users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numeros: unique.map((c) => c.numero) }),
            });
            const data2 = await res.json();
 
            const enriched: Contact[] = unique.map((c) => {
                const found = data2.results?.find((r: any) => r.numero === c.numero);
                return {
                    id: c.numero,
                    name: c.name,
                    numero: c.numero,
                    hasAccount: found?.hasAccount ?? false,
                    username: found?.username,
                };
            });
 
            // Trier : avec compte en premier
            enriched.sort((a, b) => Number(b.hasAccount) - Number(a.hasAccount));
            setContacts(enriched);
            setActiveTab("contacts");
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingContacts(false);
        }
    };
 
    // ─── OUVRIR CHAT ─────────────────────────────────────────────────────────
    const openChat = async (contact: Contact | Conversation) => {
        // Nettoyer l'ancien poll AVANT d'en démarrer un nouveau
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        setChatContact(contact);
        setChatOpen(true);
        await loadMessages(contact.numero);
        // Marquer comme lus
        fetch(`${API_URL}/api/messages/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from_numero: contact.numero, to_numero: currentUser.numero }),
        });
        pollRef.current = setInterval(async () => {
            await loadMessages(contact.numero);
        }, 3000);
    };
 
    const closeChat = () => {
        setChatOpen(false);
        setChatContact(null);
        setMessages([]);
        setNewMessage("");
        if (pollRef.current) clearInterval(pollRef.current);
        fetchConversations();
    };
 
    const loadMessages = async (toNumero: string) => {
        try {
            const res = await fetch(
                `${API_URL}/api/messages?from=${currentUser.numero}&to=${toNumero}`
            );
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 80);
            }
        } catch {}
    };
 
    const sendMessage = async () => {
        if (!newMessage.trim() || !chatContact || sending) return;
        const content = newMessage.trim();
        setNewMessage("");
        setSending(true);

        // Affichage optimiste : ajouter le message localement tout de suite
        const tempMsg: Message = {
            id: `temp-${Date.now()}`,
            from_numero: currentUser.numero,
            to_numero: chatContact.numero,
            content,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            const res = await fetch(`${API_URL}/api/messages/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    from_numero: currentUser.numero,
                    to_numero: chatContact.numero,
                    content,
                }),
            });

            if (!res.ok) {
                // Annuler le message optimiste et remettre le texte
                setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
                setNewMessage(content);
                const err = await res.json().catch(() => ({}));
                alert(err.error ?? "Erreur lors de l'envoi du message.");
            } else {
                // Remplacer le message temporaire par les vraies données du serveur
                await loadMessages(chatContact.numero);
            }
        } catch {
            // Erreur réseau : annuler l'optimiste et remettre le texte
            setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
            setNewMessage(content);
            alert("Impossible d'envoyer le message. Vérifiez votre connexion.");
        } finally {
            setSending(false);
        }
    };
 
    const filteredConversations = conversations.filter((c) =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.numero.includes(searchQuery)
    );
 
    const filteredContacts = contacts.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.numero.includes(searchQuery)
    );
 
    const withAccount = filteredContacts.filter((c) => c.hasAccount);
    const withoutAccount = filteredContacts.filter((c) => !c.hasAccount);
 
    // ─── RENDER MESSAGE ───────────────────────────────────────────────────────
    const renderMsg = ({ item }: { item: Message }) => {
        const isMe = item.from_numero === currentUser?.numero;
        return (
            <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                {!isMe && (
                    <View style={styles.msgAvatar}>
                        <Text style={styles.msgAvatarTxt}>{initials(chatContact?.name ?? "?")}</Text>
                    </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    <Text style={[styles.bubbleTxt, isMe ? styles.bubbleTxtMe : styles.bubbleTxtOther]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                        {formatTime(item.created_at)}
                    </Text>
                </View>
            </View>
        );
    };
 
    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.black} />
 
            {/* HEADER */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Communauté</Text>
                    <Text style={styles.headerSub}>MTN MoMo Gramm</Text>
                </View>
                <TouchableOpacity
                    style={styles.importBtn}
                    onPress={importContacts}
                    disabled={loadingContacts}
                    activeOpacity={0.8}
                >
                    <MaterialIcons name={loadingContacts ? "sync" : "contacts"} size={18} color={MTN.black} />
                    <Text style={styles.importBtnTxt}>
                        {loadingContacts ? "Chargement…" : "Importer SIM"}
                    </Text>
                </TouchableOpacity>
            </View>
 
            {/* SEARCH */}
            <View style={styles.searchWrap}>
                <MaterialIcons name="search" size={18} color={MTN.lightGray} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher…"
                    placeholderTextColor={MTN.lightGray}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <MaterialIcons name="close" size={16} color={MTN.lightGray} />
                    </TouchableOpacity>
                )}
            </View>
 
            {/* TABS */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "messages" && styles.tabActive]}
                    onPress={() => setActiveTab("messages")}
                >
                    <Text style={[styles.tabTxt, activeTab === "messages" && styles.tabTxtActive]}>
                        Messages {conversations.filter(c => (c.unread ?? 0) > 0).length > 0
                            ? `(${conversations.reduce((s, c) => s + (c.unread ?? 0), 0)})`
                            : ""}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "contacts" && styles.tabActive]}
                    onPress={() => setActiveTab("contacts")}
                >
                    <Text style={[styles.tabTxt, activeTab === "contacts" && styles.tabTxtActive]}>
                        Contacts {contacts.length > 0 ? `(${contacts.length})` : ""}
                    </Text>
                </TouchableOpacity>
            </View>
 
            {/* ── TAB MESSAGES ─────────────────────────────────────────────── */}
            {activeTab === "messages" && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
                    {filteredConversations.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialIcons name="chat-bubble-outline" size={60} color={MTN.mediumGray} />
                            <Text style={styles.emptyTitle}>Aucune conversation</Text>
                            <Text style={styles.emptyDesc}>
                                Importez vos contacts SIM pour trouver vos amis sur MTN MoMo Gramm.
                            </Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={importContacts}>
                                <Text style={styles.emptyBtnTxt}>Importer mes contacts</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        filteredConversations.map((c) => (
                            <TouchableOpacity
                                key={c.numero}
                                style={styles.convItem}
                                onPress={() => openChat(c)}
                                activeOpacity={0.75}
                            >
                                <View style={styles.convAvatar}>
                                    <Text style={styles.convAvatarTxt}>{initials(c.name)}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.convRow}>
                                        <Text style={styles.convName}>{c.name}</Text>
                                        <Text style={styles.convTime}>{formatDate(c.lastTime ?? "")}</Text>
                                    </View>
                                    <Text style={styles.convLast} numberOfLines={1}>
                                        {c.lastMessage ?? ""}
                                    </Text>
                                </View>
                                {(c.unread ?? 0) > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadTxt}>{c.unread}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}
 
            {/* ── TAB CONTACTS ─────────────────────────────────────────────── */}
            {activeTab === "contacts" && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
                    {contacts.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialIcons name="sim-card" size={60} color={MTN.mediumGray} />
                            <Text style={styles.emptyTitle}>Aucun contact importé</Text>
                            <Text style={styles.emptyDesc}>
                                Appuyez sur "Importer SIM" pour voir lesquels de vos contacts ont
                                un compte MTN MoMo Gramm.
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Avec compte */}
                            {withAccount.length > 0 && (
                                <>
                                    <View style={styles.sectionHeader}>
                                        <MaterialIcons name="check-circle" size={14} color={MTN.success} />
                                        <Text style={styles.sectionTxt}>
                                            Sur MTN MoMo Gramm ({withAccount.length})
                                        </Text>
                                    </View>
                                    {withAccount.map((c) => (
                                        <View key={c.numero} style={styles.contactItem}>
                                            <View style={[styles.contactAvatar, { backgroundColor: MTN.yellow }]}>
                                                <Text style={[styles.contactAvatarTxt, { color: MTN.black }]}>
                                                    {initials(c.name)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.contactName}>{c.name}</Text>
                                                <Text style={styles.contactNumero}>{c.numero}</Text>
                                                {c.username && (
                                                    <Text style={styles.contactUsername}>@{c.username}</Text>
                                                )}
                                            </View>
                                            <TouchableOpacity
                                                style={styles.chatBtn}
                                                onPress={() => openChat(c)}
                                                activeOpacity={0.8}
                                            >
                                                <MaterialIcons name="chat" size={18} color={MTN.black} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </>
                            )}
 
                            {/* Sans compte */}
                            {withoutAccount.length > 0 && (
                                <>
                                    <View style={styles.sectionHeader}>
                                        <MaterialIcons name="cancel" size={14} color={MTN.lightGray} />
                                        <Text style={[styles.sectionTxt, { color: MTN.lightGray }]}>
                                            Pas encore sur l'appli ({withoutAccount.length})
                                        </Text>
                                    </View>
                                    {withoutAccount.map((c) => (
                                        <View key={c.numero} style={[styles.contactItem, { opacity: 0.5 }]}>
                                            <View style={[styles.contactAvatar, { backgroundColor: MTN.mediumGray }]}>
                                                <Text style={[styles.contactAvatarTxt, { color: MTN.lightGray }]}>
                                                    {initials(c.name)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.contactName}>{c.name}</Text>
                                                <Text style={styles.contactNumero}>{c.numero}</Text>
                                                <Text style={styles.noAccountTxt}>Pas de compte</Text>
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
 
            {/* ── MODAL CHAT ───────────────────────────────────────────────── */}
            <Modal visible={chatOpen} animationType="slide" onRequestClose={closeChat}>
                <SafeAreaView style={styles.chatSafe}>
                    <StatusBar barStyle="light-content" backgroundColor={MTN.darkGray} />
 
                    <View style={styles.chatHeader}>
                        <TouchableOpacity onPress={closeChat} style={{ padding: 6 }}>
                            <MaterialIcons name="arrow-back" size={24} color={MTN.white} />
                        </TouchableOpacity>
                        <View style={styles.chatAvatar}>
                            <Text style={styles.chatAvatarTxt}>{initials(chatContact?.name ?? "?")}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.chatName}>{chatContact?.name}</Text>
                            <Text style={styles.chatNumero}>{chatContact?.numero}</Text>
                        </View>
                    </View>
 
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                    >
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id?.toString()}
                            renderItem={renderMsg}
                            contentContainerStyle={styles.msgList}
                            onContentSizeChange={() =>
                                flatListRef.current?.scrollToEnd({ animated: true })
                            }
                            ListEmptyComponent={
                                <View style={styles.noMsg}>
                                    <MaterialIcons name="waving-hand" size={40} color={MTN.mediumGray} />
                                    <Text style={styles.noMsgTxt}>
                                        Dites bonjour à {chatContact?.name} !
                                    </Text>
                                </View>
                            }
                        />
 
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.msgInput}
                                placeholder="Écrire un message…"
                                placeholderTextColor={MTN.lightGray}
                                value={newMessage}
                                onChangeText={setNewMessage}
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnOff]}
                                onPress={sendMessage}
                                disabled={!newMessage.trim() || sending}
                                activeOpacity={0.8}
                            >
                                <MaterialIcons name="send" size={20} color={MTN.black} />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
 
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: MTN.black },
 
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        backgroundColor: MTN.yellow, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
    },
    headerTitle: { fontSize: 22, fontWeight: "900", color: MTN.black },
    headerSub: { fontSize: 11, fontWeight: "700", color: "rgba(0,0,0,0.5)", letterSpacing: 0.8 },
    importBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: MTN.black, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    },
    importBtnTxt: { color: MTN.yellow, fontWeight: "800", fontSize: 12 },
 
    searchWrap: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: MTN.darkGray, margin: 12, borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: MTN.mediumGray,
    },
    searchInput: { flex: 1, color: MTN.white, fontSize: 14 },
 
    tabs: {
        flexDirection: "row", marginHorizontal: 12, marginBottom: 6,
        backgroundColor: MTN.darkGray, borderRadius: 12, padding: 4,
        borderWidth: 1, borderColor: MTN.mediumGray,
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9 },
    tabActive: { backgroundColor: MTN.yellow },
    tabTxt: { fontSize: 13, fontWeight: "700", color: MTN.lightGray },
    tabTxtActive: { color: MTN.black },
 
    empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: MTN.white },
    emptyDesc: { fontSize: 13, color: MTN.lightGray, textAlign: "center", lineHeight: 20 },
    emptyBtn: {
        backgroundColor: MTN.yellow, borderRadius: 14,
        paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
    },
    emptyBtnTxt: { color: MTN.black, fontWeight: "900", fontSize: 14 },
 
    convItem: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 14, gap: 12,
        borderBottomWidth: 1, borderBottomColor: MTN.darkGray,
    },
    convAvatar: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
    },
    convAvatarTxt: { fontSize: 17, fontWeight: "900", color: MTN.black },
    convRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
    convName: { fontSize: 15, fontWeight: "800", color: MTN.white },
    convTime: { fontSize: 11, color: MTN.lightGray },
    convLast: { fontSize: 13, color: MTN.lightGray },
    unreadBadge: {
        backgroundColor: MTN.yellow, borderRadius: 10,
        minWidth: 20, height: 20, paddingHorizontal: 5,
        alignItems: "center", justifyContent: "center",
    },
    unreadTxt: { fontSize: 11, fontWeight: "900", color: MTN.black },
 
    sectionHeader: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: MTN.darkGray,
    },
    sectionTxt: { fontSize: 12, fontWeight: "700", color: MTN.success, letterSpacing: 0.5 },
 
    contactItem: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 14, gap: 12,
        borderBottomWidth: 1, borderBottomColor: MTN.darkGray,
    },
    contactAvatar: {
        width: 46, height: 46, borderRadius: 23,
        alignItems: "center", justifyContent: "center",
    },
    contactAvatarTxt: { fontSize: 15, fontWeight: "900" },
    contactName: { fontSize: 15, fontWeight: "700", color: MTN.white },
    contactNumero: { fontSize: 12, color: MTN.lightGray, marginTop: 1 },
    contactUsername: { fontSize: 11, color: MTN.yellow, fontWeight: "700", marginTop: 2 },
    noAccountTxt: { fontSize: 11, color: MTN.error, marginTop: 2, fontWeight: "600" },
    chatBtn: {
        backgroundColor: MTN.yellow, borderRadius: 12,
        width: 38, height: 38, alignItems: "center", justifyContent: "center",
    },
 
    chatSafe: { flex: 1, backgroundColor: MTN.black },
    chatHeader: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: MTN.darkGray, paddingHorizontal: 14, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: MTN.mediumGray,
    },
    chatAvatar: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
    },
    chatAvatarTxt: { fontSize: 15, fontWeight: "900", color: MTN.black },
    chatName: { fontSize: 16, fontWeight: "800", color: MTN.white },
    chatNumero: { fontSize: 12, color: MTN.lightGray },
 
    msgList: { padding: 16, paddingBottom: 8 },
    noMsg: { alignItems: "center", paddingTop: 80, gap: 14 },
    noMsgTxt: { color: MTN.lightGray, fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
 
    msgRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-end", gap: 8 },
    msgRowMe: { justifyContent: "flex-end" },
    msgRowOther: { justifyContent: "flex-start" },
    msgAvatar: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: MTN.mediumGray, alignItems: "center", justifyContent: "center",
    },
    msgAvatarTxt: { fontSize: 10, fontWeight: "900", color: MTN.lightGray },
    bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
    bubbleMe: { backgroundColor: MTN.yellow, borderBottomRightRadius: 4 },
    bubbleOther: {
        backgroundColor: MTN.darkGray, borderBottomLeftRadius: 4,
        borderWidth: 1, borderColor: MTN.mediumGray,
    },
    bubbleTxt: { fontSize: 14, lineHeight: 20 },
    bubbleTxtMe: { color: MTN.black, fontWeight: "600" },
    bubbleTxtOther: { color: MTN.white },
    bubbleTime: { fontSize: 10, marginTop: 3 },
    bubbleTimeMe: { color: "rgba(0,0,0,0.45)", textAlign: "right" },
    bubbleTimeOther: { color: MTN.lightGray },
 
    inputRow: {
        flexDirection: "row", alignItems: "flex-end", gap: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: MTN.darkGray, borderTopWidth: 1, borderTopColor: MTN.mediumGray,
    },
    msgInput: {
        flex: 1, backgroundColor: MTN.mediumGray, borderRadius: 22,
        paddingHorizontal: 16, paddingVertical: 10,
        color: MTN.white, fontSize: 14, maxHeight: 100,
    },
    sendBtn: {
        backgroundColor: MTN.yellow, width: 44, height: 44,
        borderRadius: 22, alignItems: "center", justifyContent: "center",
    },
    sendBtnOff: { opacity: 0.35 },
});