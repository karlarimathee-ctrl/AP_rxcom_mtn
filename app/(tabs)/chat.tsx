import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import {
    AppState, AppStateStatus, FlatList,
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
import API_URL from "../../backend/api";
 
// ─── Config notifications ─────────────────────────────────────────────────────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList:   true,
        shouldPlaySound:  true,
        shouldSetBadge:   true,
    }),
});
 
const MTN = {
    yellow:     "#FFCC00",
    black:      "#0A0A0A",
    darkGray:   "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray:  "#B0B0B0",
    white:      "#FFFFFF",
    error:      "#FF4444",
    success:    "#00C853",
    blue:       "#4FC3F7",
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
    is_delivered?: number;
    is_read?: number;
};
 
type PresenceInfo = {
    is_online: boolean;
    last_seen: string | null;
};
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
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
 
// Formate "dernière connexion"
const formatLastSeen = (last_seen: string | null): string => {
    if (!last_seen) return "jamais connecté";
    const d = new Date(last_seen);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)   return "à l'instant";
    if (diffMin < 60)  return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)    return `aujourd'hui à ${formatTime(last_seen)}`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1)   return `hier à ${formatTime(last_seen)}`;
    return `le ${formatDate(last_seen)}`;
};
 
// ─── Clé AsyncStorage pour les messages en cache ──────────────────────────────
const msgCacheKey = (me: string, other: string) => `msgs_${me}_${other}`;
const convCacheKey = (me: string) => `convs_${me}`;
 
export default function ChatScreen() {
    const [currentUser, setCurrentUser]         = useState<any>(null);
    const [activeTab, setActiveTab]             = useState<"messages" | "contacts">("messages");
    const [conversations, setConversations]     = useState<Conversation[]>([]);
    const [contacts, setContacts]               = useState<Contact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [searchQuery, setSearchQuery]         = useState("");
 
    // Chat
    const [chatOpen, setChatOpen]         = useState(false);
    const [chatContact, setChatContact]   = useState<Contact | Conversation | null>(null);
    const [messages, setMessages]         = useState<Message[]>([]);
    const [newMessage, setNewMessage]     = useState("");
    const [sending, setSending]           = useState(false);
 
    // Présence
    const [presence, setPresence]         = useState<PresenceInfo>({ is_online: false, last_seen: null });
 
    const flatListRef  = useRef<FlatList>(null);
    const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
    const presencePoll = useRef<ReturnType<typeof setInterval> | null>(null);
    const appStateRef  = useRef<AppStateStatus>(AppState.currentState);
    const currentUserRef = useRef<any>(null);
 
    // ─── Init : charger user, demander permissions notifs, enregistrer token ──
    useEffect(() => {
        AsyncStorage.getItem("user").then((v) => {
            if (v) {
                const u = JSON.parse(v);
                setCurrentUser(u);
                currentUserRef.current = u;
                registerForPushNotifications(u.numero);
                // Marquer comme en ligne
                updatePresence(u.numero, true);
                // Charger conversations depuis le cache d'abord
                loadConvsFromCache(u.numero);
            }
        });
 
        // Écouter changements AppState (foreground / background)
        const sub = AppState.addEventListener("change", handleAppStateChange);
        return () => sub.remove();
    }, []);
 
    // ─── Écouter les notifications reçues (app au premier plan) ───────────────
    useEffect(() => {
        const sub = Notifications.addNotificationReceivedListener((notif) => {
            const data = notif.request.content.data as any;
            // Si chat ouvert avec cet expéditeur → recharger les messages directement
            if (chatOpen && chatContact && data?.from_numero === chatContact.numero) {
                loadMessages(chatContact.numero);
            } else {
                // Sinon rafraîchir la liste des conversations
                if (currentUserRef.current) fetchConversations(currentUserRef.current.numero);
            }
        });
        return () => sub.remove();
    }, [chatOpen, chatContact]);
 
    const handleAppStateChange = (nextState: AppStateStatus) => {
        const u = currentUserRef.current;
        if (!u) return;
        if (nextState === "active") {
            updatePresence(u.numero, true);
            fetchConversations(u.numero);
            // Marquer messages comme livrés dès qu'on ouvre l'app
            markAllDelivered(u.numero);
        } else {
            updatePresence(u.numero, false);
        }
        appStateRef.current = nextState;
    };
 
    // ─── Poll conversations toutes les 5s ────────────────────────────────────
    useEffect(() => {
        if (currentUser) {
            fetchConversations(currentUser.numero);
            markAllDelivered(currentUser.numero);
            const interval = setInterval(() => fetchConversations(currentUser.numero), 5000);
            return () => clearInterval(interval);
        }
    }, [currentUser]);
 
    // ─── Fonctions réseau ─────────────────────────────────────────────────────
    const updatePresence = async (numero: string, online: boolean) => {
        try {
            await fetch(`${API_URL}/api/presence/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero, is_online: online }),
            });
        } catch {}
    };
 
    const markAllDelivered = async (numero: string) => {
        try {
            await fetch(`${API_URL}/api/messages/delivered`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to_numero: numero }),
            });
        } catch {}
    };
 
    const registerForPushNotifications = async (numero: string) => {
        if (!Device.isDevice) return;
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== "granted") return;
 
        // Android : créer channel
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("messages", {
                name: "Messages",
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FFCC00",
                sound: "default",
            });
        }
 
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
 
        // Sauvegarder le token localement
        await AsyncStorage.setItem("pushToken", token);
 
        // Envoyer au serveur
        try {
            await fetch(`${API_URL}/api/presence/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero, push_token: token }),
            });
        } catch {}
    };
 
    // ─── Cache conversations ───────────────────────────────────────────────────
    const loadConvsFromCache = async (numero: string) => {
        try {
            const cached = await AsyncStorage.getItem(convCacheKey(numero));
            if (cached) setConversations(JSON.parse(cached));
        } catch {}
    };
 
    const fetchConversations = async (numero: string) => {
        try {
            const res = await fetch(`${API_URL}/api/conversations?numero=${numero}`);
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
                // Persister en cache
                await AsyncStorage.setItem(convCacheKey(numero), JSON.stringify(data));
            }
        } catch {}
    };
 
    // ─── Présence du contact ouvert ────────────────────────────────────────────
    const startPresencePoll = (numero: string) => {
        fetchPresence(numero);
        presencePoll.current = setInterval(() => fetchPresence(numero), 10000);
    };
 
    const fetchPresence = async (numero: string) => {
        try {
            const res = await fetch(`${API_URL}/api/presence/${numero}`);
            if (res.ok) setPresence(await res.json());
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
                    if (raw.startsWith("242"))  raw = raw.slice(3);
                    if (/^06\d{7}$/.test(raw)) {
                        simContacts.push({ name: c.name ?? "Inconnu", numero: raw });
                    }
                });
            });
 
            const unique = simContacts.filter(
                (c, i, arr) =>
                    arr.findIndex((x) => x.numero === c.numero) === i &&
                    c.numero !== currentUser?.numero
            );
 
            if (unique.length === 0) {
                setContacts([]);
                setActiveTab("contacts");
                setLoadingContacts(false);
                return;
            }
 
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
        if (pollRef.current)      { clearInterval(pollRef.current);      pollRef.current = null; }
        if (presencePoll.current) { clearInterval(presencePoll.current); presencePoll.current = null; }
 
        setChatContact(contact);
        setChatOpen(true);
 
        // Charger depuis cache d'abord (affichage instantané)
        const cached = await AsyncStorage.getItem(msgCacheKey(currentUser.numero, contact.numero));
        if (cached) setMessages(JSON.parse(cached));
 
        // Puis charger depuis le serveur
        await loadMessages(contact.numero);
 
        // Marquer comme lus
        fetch(`${API_URL}/api/messages/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from_numero: contact.numero, to_numero: currentUser.numero }),
        });
 
        // Démarrer poll présence
        startPresencePoll(contact.numero);
 
        // Poll messages toutes les 3s
        pollRef.current = setInterval(async () => {
            await loadMessages(contact.numero);
            // Marquer comme lus en continu
            fetch(`${API_URL}/api/messages/read`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from_numero: contact.numero, to_numero: currentUser.numero }),
            });
        }, 3000);
    };
 
    const closeChat = () => {
        setChatOpen(false);
        setChatContact(null);
        setMessages([]);
        setNewMessage("");
        setPresence({ is_online: false, last_seen: null });
        if (pollRef.current)      clearInterval(pollRef.current);
        if (presencePoll.current) clearInterval(presencePoll.current);
        if (currentUser) fetchConversations(currentUser.numero);
    };
 
    const loadMessages = async (toNumero: string) => {
        try {
            const res = await fetch(
                `${API_URL}/api/messages?from=${currentUser.numero}&to=${toNumero}`
            );
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                // Persister en cache AsyncStorage
                await AsyncStorage.setItem(
                    msgCacheKey(currentUser.numero, toNumero),
                    JSON.stringify(data)
                );
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 80);
            }
        } catch {}
    };
 
    // ─── ENVOYER MESSAGE ──────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (!newMessage.trim() || !chatContact || sending) return;
        const content = newMessage.trim();
        setNewMessage("");
        setSending(true);
 
        // Affichage optimiste
        const tempMsg: Message = {
            id: `temp-${Date.now()}`,
            from_numero: currentUser.numero,
            to_numero: chatContact.numero,
            content,
            created_at: new Date().toISOString(),
            is_delivered: 0,
            is_read: 0,
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
                setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
                setNewMessage(content);
                const err = await res.json().catch(() => ({}));
                alert(err.error ?? "Erreur lors de l'envoi du message.");
            } else {
                await loadMessages(chatContact.numero);
            }
        } catch {
            setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
            setNewMessage(content);
            alert("Impossible d'envoyer le message. Vérifiez votre connexion.");
        } finally {
            setSending(false);
        }
    };
 
    // ─── Ticks WhatsApp ────────────────────────────────────────────────────────
    // ✓ gris  = envoyé (sur serveur)
    // ✓✓ gris = livré (destinataire a ouvert l'app)
    // ✓✓ bleu = lu (destinataire a ouvert la conversation)
    const renderTicks = (msg: Message) => {
        if (msg.id.toString().startsWith("temp-")) {
            // Message en cours d'envoi → horloge
            return <MaterialIcons name="access-time" size={12} color="rgba(0,0,0,0.4)" />;
        }
        if (msg.is_read) {
            return (
                <View style={styles.ticksRow}>
                    <MaterialIcons name="done-all" size={14} color={MTN.blue} />
                </View>
            );
        }
        if (msg.is_delivered) {
            return (
                <View style={styles.ticksRow}>
                    <MaterialIcons name="done-all" size={14} color="rgba(0,0,0,0.4)" />
                </View>
            );
        }
        return (
            <View style={styles.ticksRow}>
                <MaterialIcons name="done" size={14} color="rgba(0,0,0,0.4)" />
            </View>
        );
    };
 
    // ─── Filtres ───────────────────────────────────────────────────────────────
    const filteredConversations = conversations.filter((c) =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.numero.includes(searchQuery)
    );
 
    const filteredContacts = contacts.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.numero.includes(searchQuery)
    );
 
    const withAccount    = filteredContacts.filter((c) => c.hasAccount);
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
                    <View style={styles.bubbleFooter}>
                        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                            {formatTime(item.created_at)}
                        </Text>
                        {isMe && renderTicks(item)}
                    </View>
                </View>
            </View>
        );
    };
 
    // ─── Statut présence dans le header du chat ───────────────────────────────
    const renderPresenceStatus = () => {
        if (presence.is_online) {
            return (
                <View style={styles.onlineRow}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineTxt}>en ligne</Text>
                </View>
            );
        }
        if (presence.last_seen) {
            return (
                <Text style={styles.lastSeenTxt}>
                    vu {formatLastSeen(presence.last_seen)}
                </Text>
            );
        }
        return <Text style={styles.chatNumero}>{chatContact?.numero}</Text>;
    };
 
    // ─── RENDER ───────────────────────────────────────────────────────────────
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
                        Messages{" "}
                        {conversations.reduce((s, c) => s + (c.unread ?? 0), 0) > 0
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
 
                    {/* Header chat avec présence */}
                    <View style={styles.chatHeader}>
                        <TouchableOpacity onPress={closeChat} style={{ padding: 6 }}>
                            <MaterialIcons name="arrow-back" size={24} color={MTN.white} />
                        </TouchableOpacity>
                        <View style={styles.chatAvatarWrap}>
                            <View style={styles.chatAvatar}>
                                <Text style={styles.chatAvatarTxt}>{initials(chatContact?.name ?? "?")}</Text>
                            </View>
                            {/* Point vert si en ligne */}
                            {presence.is_online && <View style={styles.onlineDotAvatar} />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.chatName}>{chatContact?.name}</Text>
                            {renderPresenceStatus()}
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
    headerSub:   { fontSize: 11, fontWeight: "700", color: "rgba(0,0,0,0.5)", letterSpacing: 0.8 },
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
    tab:       { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9 },
    tabActive: { backgroundColor: MTN.yellow },
    tabTxt:       { fontSize: 13, fontWeight: "700", color: MTN.lightGray },
    tabTxtActive: { color: MTN.black },
 
    empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: MTN.white },
    emptyDesc:  { fontSize: 13, color: MTN.lightGray, textAlign: "center", lineHeight: 20 },
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
    convRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
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
    contactAvatar:    { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
    contactAvatarTxt: { fontSize: 15, fontWeight: "900" },
    contactName:      { fontSize: 15, fontWeight: "700", color: MTN.white },
    contactNumero:    { fontSize: 12, color: MTN.lightGray, marginTop: 1 },
    contactUsername:  { fontSize: 11, color: MTN.yellow, fontWeight: "700", marginTop: 2 },
    noAccountTxt:     { fontSize: 11, color: MTN.error, marginTop: 2, fontWeight: "600" },
    chatBtn: {
        backgroundColor: MTN.yellow, borderRadius: 12,
        width: 38, height: 38, alignItems: "center", justifyContent: "center",
    },
 
    // ── Chat ──────────────────────────────────────────────────────────────────
    chatSafe: { flex: 1, backgroundColor: MTN.black },
    chatHeader: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: MTN.darkGray, paddingHorizontal: 14, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: MTN.mediumGray,
    },
    chatAvatarWrap: { position: "relative" },
    chatAvatar: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
    },
    chatAvatarTxt: { fontSize: 15, fontWeight: "900", color: MTN.black },
    onlineDotAvatar: {
        position: "absolute", bottom: 1, right: 1,
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: MTN.success,
        borderWidth: 2, borderColor: MTN.darkGray,
    },
    chatName:     { fontSize: 16, fontWeight: "800", color: MTN.white },
    chatNumero:   { fontSize: 12, color: MTN.lightGray },
    onlineRow:    { flexDirection: "row", alignItems: "center", gap: 5 },
    onlineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: MTN.success },
    onlineTxt:    { fontSize: 12, color: MTN.success, fontWeight: "700" },
    lastSeenTxt:  { fontSize: 12, color: MTN.lightGray },
 
    msgList: { padding: 16, paddingBottom: 8 },
    noMsg:   { alignItems: "center", paddingTop: 80, gap: 14 },
    noMsgTxt: { color: MTN.lightGray, fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
 
    msgRow:      { flexDirection: "row", marginBottom: 10, alignItems: "flex-end", gap: 8 },
    msgRowMe:    { justifyContent: "flex-end" },
    msgRowOther: { justifyContent: "flex-start" },
    msgAvatar: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: MTN.mediumGray, alignItems: "center", justifyContent: "center",
    },
    msgAvatarTxt: { fontSize: 10, fontWeight: "900", color: MTN.lightGray },
    bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
    bubbleMe:    { backgroundColor: MTN.yellow, borderBottomRightRadius: 4 },
    bubbleOther: {
        backgroundColor: MTN.darkGray, borderBottomLeftRadius: 4,
        borderWidth: 1, borderColor: MTN.mediumGray,
    },
    bubbleTxt:      { fontSize: 14, lineHeight: 20 },
    bubbleTxtMe:    { color: MTN.black, fontWeight: "600" },
    bubbleTxtOther: { color: MTN.white },
    bubbleFooter: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "flex-end", gap: 4, marginTop: 3,
    },
    bubbleTime:      { fontSize: 10 },
    bubbleTimeMe:    { color: "rgba(0,0,0,0.45)" },
    bubbleTimeOther: { color: MTN.lightGray },
    ticksRow: { flexDirection: "row", alignItems: "center" },
 
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
