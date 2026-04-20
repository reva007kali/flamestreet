import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { api } from "../lib/api";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import TextField from "../ui/TextField";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import { toPublicUrl } from "../lib/assets";
import { useToast } from "../ui/Toast";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import OsmMapPicker, { type OsmMapPickerRef } from "../components/OsmMapPicker";
type PaymentMethod = { id: number; code: string; name: string };

const LAST_ADDRESS_KEY = "flamestreet_last_delivery_address";
const LAST_GYM_KEY = "flamestreet_last_gym_id";
const LAST_LAT_KEY = "flamestreet_last_delivery_lat";
const LAST_LNG_KEY = "flamestreet_last_delivery_lng";
const RECENT_LOCATIONS_KEY = "flamestreet_recent_locations_v1";
const EMPTY_ROLES: readonly string[] = [];
const WA_PHONE = "6285182841385";

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const total = useCartStore((s) => s.total);
  const { refreshing, onRefresh } = usePullToRefresh();

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("doku-qris");
  const [gymId, setGymId] = useState<number | null>(null);
  const [gymModalOpen, setGymModalOpen] = useState(false);
  const [gymSearch, setGymSearch] = useState("");
  const [loadedLast, setLoadedLast] = useState(false);
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressFocus, setAddressFocus] = useState(false);
  const [didManualAddress, setDidManualAddress] = useState(false);
  const [debouncedAddressQuery, setDebouncedAddressQuery] = useState("");
  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [deliveryModeTouched, setDeliveryModeTouched] = useState(false);
  const mapRef = useRef<OsmMapPickerRef | null>(null);
  const customMapEnabled = false;

  const openGojek = useCallback(async () => {
    try {
      await WebBrowser.openBrowserAsync("https://gofood.link/a/LY83SJu");
    } catch {
      Alert.alert("Gojek", "Tidak bisa membuka Gojek.");
    }
  }, []);

  const roles = useAuthStore((s) => s.user?.roles ?? EMPTY_ROLES);
  const userId = useAuthStore((s) => s.user?.id ?? 0);
  const isTrainer = roles.includes("trainer");

  // -- Queries (Logic tetap) --
  const pmQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async (): Promise<PaymentMethod[]> => {
      const r = await api.get("/payment-methods");
      return r.data?.methods ?? [];
    },
  });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data.user,
  });

  const gymsQuery = useQuery({
    queryKey: ["gyms"],
    queryFn: async () => (await api.get("/gyms")).data.gyms ?? [],
  });

  const pointsQuery = useQuery({
    queryKey: ["checkout", "points", isTrainer ? "trainer" : "member"],
    queryFn: async () => {
      if (isTrainer) return (await api.get("/trainer/points")).data;
      return (await api.get("/member/points")).data;
    },
  });

  useEffect(() => {
    if (!meQuery.data) return;
    if (!recipientName) setRecipientName(meQuery.data?.full_name ?? "");
    if (!recipientPhone) setRecipientPhone(meQuery.data?.phone_number ?? "");
    const defGym = meQuery.data?.member_profile?.default_gym_id ?? null;
    if (!isTrainer && !gymId && defGym && !deliveryModeTouched)
      setGymId(Number(defGym));
  }, [
    meQuery.data,
    recipientName,
    recipientPhone,
    gymId,
    isTrainer,
    deliveryModeTouched,
  ]);

  useEffect(() => {
    if (loadedLast) return;
    let cancelled = false;
    async function loadLast() {
      try {
        const addr = await SecureStore.getItemAsync(LAST_ADDRESS_KEY);
        const gid = await SecureStore.getItemAsync(LAST_GYM_KEY);
        const lat = await SecureStore.getItemAsync(LAST_LAT_KEY);
        const lng = await SecureStore.getItemAsync(LAST_LNG_KEY);
        if (cancelled) return;
        if (!deliveryAddress && addr) setDeliveryAddress(addr);
        if (!isTrainer && !gymId && gid && !deliveryModeTouched)
          setGymId(Number(gid));
        if (!deliveryLat && lat) setDeliveryLat(Number(lat));
        if (!deliveryLng && lng) setDeliveryLng(Number(lng));
        const recentRaw = await SecureStore.getItemAsync(
          `${RECENT_LOCATIONS_KEY}:${userId}`,
        );
        if (!cancelled && recentRaw) {
          try {
            const parsed = JSON.parse(recentRaw);
            if (Array.isArray(parsed)) setRecentLocations(parsed.slice(0, 5));
          } catch {}
        }
      } catch {}
      if (!cancelled) setLoadedLast(true);
    }
    loadLast();
    return () => {
      cancelled = true;
    };
  }, [
    loadedLast,
    deliveryAddress,
    gymId,
    isTrainer,
    deliveryLat,
    deliveryLng,
    userId,
    deliveryModeTouched,
  ]);

  useEffect(() => {
    if (!loadedLast) return;
    if (gymId) return;
    if (deliveryLat != null && deliveryLng != null) return;
    setDeliveryLat(-6.2);
    setDeliveryLng(106.8);
  }, [loadedLast, gymId, deliveryLat, deliveryLng]);

  useEffect(() => {
    const q = String(addressQuery ?? "").trim();
    const t = setTimeout(() => setDebouncedAddressQuery(q), 350);
    return () => clearTimeout(t);
  }, [addressQuery]);

  const selectedGym = useMemo(() => {
    const id = Number(gymId ?? 0);
    if (!id) return null;
    return (gymsQuery.data ?? []).find((g: any) => Number(g.id) === id) ?? null;
  }, [gymId, gymsQuery.data]);

  useEffect(() => {
    if (!selectedGym) return;
    setDeliveryLat(null);
    setDeliveryLng(null);
    setDidManualAddress(false);
  }, [selectedGym?.id]);

  useEffect(() => {
    if (!loadedLast) return;
    const hasAny = Boolean(deliveryAddress?.trim());
    const hasGym = Boolean(gymId);
    if (!hasAny && !hasGym && (gymsQuery.data ?? []).length) {
      setGymModalOpen(true);
    }
  }, [isTrainer, loadedLast, deliveryAddress, gymId, gymsQuery.data]);

  const pmOptions = useMemo(
    () => (pmQuery.data ?? []).filter((m) => m.code),
    [pmQuery.data],
  );

  const quoteQuery = useQuery({
    queryKey: ["delivery", "quote", deliveryLat, deliveryLng],
    enabled:
      customMapEnabled && !gymId && deliveryLat != null && deliveryLng != null,
    queryFn: async () =>
      (
        await api.get("/delivery/quote", {
          params: { lat: deliveryLat, lng: deliveryLng },
        })
      ).data?.quote,
    staleTime: 15_000,
  });

  const reverseQuery = useQuery({
    queryKey: ["delivery", "reverse", deliveryLat, deliveryLng],
    enabled:
      customMapEnabled &&
      !gymId &&
      deliveryLat != null &&
      deliveryLng != null &&
      !didManualAddress,
    queryFn: async () =>
      (
        await api.get("/delivery/reverse-geocode", {
          params: { lat: deliveryLat, lng: deliveryLng },
        })
      ).data?.result,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (gymId) return;
    const label = reverseQuery.data?.label
      ? String(reverseQuery.data.label)
      : "";
    if (!label) return;
    if (!deliveryAddress || !didManualAddress) {
      setDeliveryAddress(label);
    }
  }, [gymId, reverseQuery.data?.label]);

  const geocodeQuery = useQuery({
    queryKey: ["delivery", "geocode", debouncedAddressQuery],
    enabled:
      customMapEnabled &&
      !gymId &&
      addressFocus &&
      debouncedAddressQuery.length >= 3,
    queryFn: async () =>
      (
        await api.get("/delivery/geocode-search", {
          params: { q: debouncedAddressQuery },
        })
      ).data?.results ?? [],
    staleTime: 30_000,
  });

  const normalizeRecent = useCallback((list: any[]) => {
    const out: any[] = [];
    const seen = new Set<string>();
    for (const x of list) {
      if (!x || typeof x !== "object") continue;
      const type = x.type === "gym" ? "gym" : "custom";
      const key =
        type === "gym"
          ? `gym:${Number(x.gym_id ?? 0)}`
          : `custom:${Number(x.lat ?? 0).toFixed(5)}:${Number(x.lng ?? 0).toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        type,
        label: x.label ? String(x.label) : "",
        gym_id: type === "gym" ? Number(x.gym_id ?? 0) : null,
        lat: type === "custom" ? Number(x.lat ?? 0) : null,
        lng: type === "custom" ? Number(x.lng ?? 0) : null,
        address: x.address ? String(x.address) : "",
      });
      if (out.length >= 5) break;
    }
    return out;
  }, []);

  const saveRecent = useCallback(
    async (next: any[]) => {
      try {
        await SecureStore.setItemAsync(
          `${RECENT_LOCATIONS_KEY}:${userId}`,
          JSON.stringify(next.slice(0, 5)),
        );
      } catch {}
    },
    [userId],
  );

  const pushRecent = useCallback(
    async (entry: any) => {
      const next = normalizeRecent([entry, ...recentLocations]);
      setRecentLocations(next);
      await saveRecent(next);
    },
    [normalizeRecent, recentLocations, saveRecent],
  );

  const applyRecent = useCallback((entry: any) => {
    if (!entry) return;
    if (entry.type === "gym" && entry.gym_id) {
      setDeliveryModeTouched(true);
      setGymId(Number(entry.gym_id));
      setHistoryOpen(false);
      return;
    }
    if (entry.type === "custom" && entry.lat != null && entry.lng != null) {
      const lat = Number(entry.lat);
      const lng = Number(entry.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setDeliveryModeTouched(true);
      setGymId(null);
      setDeliveryLat(lat);
      setDeliveryLng(lng);
      if (entry.label) setDeliveryAddress(String(entry.label));
      setAddressQuery(entry.label ? String(entry.label) : "");
      setDidManualAddress(true);
      setHistoryOpen(false);
      mapRef.current?.setPoint(lat, lng, 19);
    }
  }, []);

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!gymId) {
        throw new Error(
          "Custom address sementara nonaktif. Pilih Gym Coverage atau Order via Gojek.",
        );
      }

      const deliveryFee = 0;
      const payload = {
        gym_id: gymId ? Number(gymId) : null,
        delivery_address: deliveryAddress,
        delivery_lat: null,
        delivery_lng: null,
        delivery_notes: deliveryNotes || null,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        payment_method: paymentMethod,
        delivery_fee: deliveryFee,
        discount_amount: 0,
        items: cartItems.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          modifier_option_ids: i.modifier_option_ids ?? [],
          item_notes: null,
        })),
      };
      const r = await api.post("/orders", payload);
      return r.data?.order;
    },
    onSuccess: async (order) => {
      try {
        if (deliveryAddress)
          await SecureStore.setItemAsync(LAST_ADDRESS_KEY, deliveryAddress);
        if (gymId) await SecureStore.setItemAsync(LAST_GYM_KEY, String(gymId));
        else await SecureStore.deleteItemAsync(LAST_GYM_KEY);
        if (!gymId && deliveryLat != null && deliveryLng != null) {
          await SecureStore.setItemAsync(LAST_LAT_KEY, String(deliveryLat));
          await SecureStore.setItemAsync(LAST_LNG_KEY, String(deliveryLng));
        }

        if (gymId) {
          const g = selectedGym;
          await pushRecent({
            type: "gym",
            gym_id: Number(gymId),
            label: g?.gym_name ? String(g.gym_name) : "Gym Coverage",
            address: g?.address ? String(g.address) : "",
          });
        }
      } catch {}
      clearCart();
      if (paymentMethod === "flame-points") {
        toast.show({
          variant: "success",
          title: "Order paid",
          message: `#${order?.order_number ?? ""}`,
        });
      }
      if (
        order?.payment_method &&
        String(order.payment_method).startsWith("doku-")
      ) {
        try {
          const r = await api.post(`/orders/${order.id}/doku/checkout`);
          const url = r.data?.payment_url;
          if (url) await WebBrowser.openBrowserAsync(url);
        } catch {}
      }
      navigation.navigate("OrderDetail", {
        orderNumber: order.order_number,
        orderId: order.id,
      });
    },
    onError: (e: any) => {
      Alert.alert(
        "Checkout failed",
        e?.response?.data?.message ?? e?.message ?? "Please check your inputs",
      );
    },
  });

  const waOrder = useMutation({
    mutationFn: async () => {
      if (!gymId) {
        throw new Error("Pilih Gym Coverage dulu untuk order via WhatsApp.");
      }
      const body = String(deliveryAddress ?? "").trim();
      if (!body) throw new Error("Alamat pengantaran wajib diisi.");
      if (!cartItems.length) throw new Error("Cart masih kosong.");
      const subtotalSnapshot = Number(total()) || 0;
      const itemsSnapshot = cartItems.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        base_price: i.base_price,
        modifier_options: i.modifier_options ?? [],
      }));

      const payload = {
        gym_id: Number(gymId),
        delivery_address: body,
        delivery_lat: null,
        delivery_lng: null,
        delivery_notes: deliveryNotes || null,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        payment_method: paymentMethod || null,
        delivery_fee: 0,
        discount_amount: 0,
        items: cartItems.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          modifier_option_ids: i.modifier_option_ids ?? [],
          item_notes: null,
        })),
      };

      const r = await api.post("/orders", payload);
      const order = r.data?.order;
      if (!order?.id) throw new Error("Gagal membuat order.");

      let paymentUrl = "";
      if (String(paymentMethod ?? "").startsWith("doku-")) {
        try {
          const pr = await api.post(`/orders/${order.id}/doku/checkout`);
          paymentUrl = pr.data?.payment_url ? String(pr.data.payment_url) : "";
        } catch {}
      }

      return { order, paymentUrl, subtotalSnapshot, itemsSnapshot };
    },
    onSuccess: async ({
      order,
      paymentUrl,
      subtotalSnapshot,
      itemsSnapshot,
    }: any) => {
      const roles = useAuthStore.getState().user?.roles ?? EMPTY_ROLES;
      const roleLabel = roles.includes("trainer") ? "Trainer" : "Member";
      const name = useAuthStore.getState().user?.full_name ?? "";
      const lines: string[] = [];
      lines.push("Halo Flamestreet, saya mau order via WhatsApp.");
      lines.push("");
      lines.push(`Nama: ${name || recipientName || "-"}`);
      lines.push(`Role: ${roleLabel}`);
      lines.push(`Alamat Pengantaran: ${String(deliveryAddress ?? "").trim()}`);
      lines.push("");
      lines.push("Items:");
      (itemsSnapshot ?? []).forEach((i: any, idx: number) => {
        const mods = (i.modifier_options ?? [])
          .map((m: any) => m.option_name)
          .filter(Boolean)
          .join(", ");
        const unit = Number(i.base_price ?? 0);
        const totalLine = unit * Number(i.quantity ?? 1);
        lines.push(
          `${idx + 1}) ${i.name} x${i.quantity} - Rp ${totalLine.toLocaleString("id-ID")}`,
        );
        if (mods) lines.push(`   • ${mods}`);
      });
      lines.push("");
      lines.push(
        `Subtotal: Rp ${Number(subtotalSnapshot ?? 0).toLocaleString("id-ID")}`,
      );
      lines.push(
        `Total: Rp ${Number(subtotalSnapshot ?? 0).toLocaleString("id-ID")}`,
      );
      lines.push("");
      lines.push(`Order Number: #${order?.order_number ?? ""}`);
      if (paymentUrl) lines.push(`Payment (DOKU): ${paymentUrl}`);
      const text = encodeURIComponent(lines.join("\n"));
      const waUrl = `https://wa.me/${WA_PHONE}?text=${text}`;
      await WebBrowser.openBrowserAsync(waUrl);
      clearCart();
      navigation.navigate("OrderDetail", {
        orderNumber: order.order_number,
        orderId: order.id,
      });
    },
    onError: (e: any) => {
      Alert.alert("WhatsApp Order", e?.message ?? "Gagal");
    },
  });

  const methods = (() => {
    const list: PaymentMethod[] = pmOptions.length
      ? pmOptions
      : [{ id: 0, code: "doku-qris", name: "QRIS" }];
    if (!list.some((m) => m.code === "flame-points"))
      list.push({ id: -1, code: "flame-points", name: "Flame Points" });
    return list;
  })();

  const deliveryFee = 0;
  const finalTotal = Math.max(
    0,
    Math.round((Number(total()) || 0) + deliveryFee),
  );
  const deliveryOk = Boolean(gymId);

  const pointsBalance = Number(pointsQuery.data?.balance ?? 0) || 0;
  const pointsDue = finalTotal;
  const pointsOk =
    paymentMethod !== "flame-points" || pointsBalance >= pointsDue;

  return (
    <Screen>
      {/* -- REFINED GYM MODAL -- */}
      <Modal visible={gymModalOpen} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "flex-start",
          }}
        >
          <View
            style={{
              backgroundColor: "#121212",
              flex: 1,
              paddingTop: Math.max(insets.top, 12),
            }}
          >
            <View style={{ paddingHorizontal: 20, paddingBottom: 14, gap: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}
                >
                  Delivery Coverage
                </Text>
                <Pressable
                  onPress={() => setGymModalOpen(false)}
                  style={{
                    backgroundColor: "#222",
                    padding: 8,
                    borderRadius: 20,
                  }}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: "#1a1a1a",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.05)",
                }}
              >
                <Ionicons name="search" size={20} color={theme.colors.muted} />
                <TextInput
                  value={gymSearch}
                  onChangeText={setGymSearch}
                  placeholder="Find your gym..."
                  placeholderTextColor={theme.colors.muted}
                  style={{ flex: 1, color: "#fff", fontSize: 16 }}
                />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View
                  style={{
                    gap: 12,
                    paddingBottom: Math.max(insets.bottom, 16),
                  }}
                >
                  <Pressable
                    onPress={() => {
                      setDeliveryModeTouched(true);
                      setGymModalOpen(false);
                      openGojek();
                    }}
                  >
                    <View
                      style={{
                        padding: 16,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: !gymId
                          ? theme.colors.green
                          : "rgba(255,255,255,0.05)",
                        backgroundColor: !gymId
                          ? "rgba(34, 197, 94, 0.1)"
                          : "#1a1a1a",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "900",
                          fontSize: 16,
                        }}
                      >
                        Order via Gojek
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.muted,
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        Untuk alamat di luar gym coverage
                      </Text>
                    </View>
                  </Pressable>

                  {(gymsQuery.data ?? [])
                    .filter(
                      (g: any) =>
                        !gymSearch ||
                        String(g.gym_name ?? "")
                          .toLowerCase()
                          .includes(gymSearch.toLowerCase()) ||
                        String(g.address ?? "")
                          .toLowerCase()
                          .includes(gymSearch.toLowerCase()) ||
                        String(g.city ?? "")
                          .toLowerCase()
                          .includes(gymSearch.toLowerCase()) ||
                        String(g.province ?? "")
                          .toLowerCase()
                          .includes(gymSearch.toLowerCase()),
                    )
                    .map((g: any) => {
                      const active = Number(gymId) === Number(g.id);
                      const rawImg = g.image ? String(g.image) : "";
                      const img = rawImg
                        ? toPublicUrl(
                            rawImg.startsWith("uploads/") ||
                              rawImg.startsWith("storage/") ||
                              rawImg.startsWith("http")
                              ? rawImg
                              : `storage/${rawImg}`,
                          )
                        : null;
                      const addr = [g.address, g.city, g.province]
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <Pressable
                          key={g.id}
                          onPress={async () => {
                            setDeliveryModeTouched(true);
                            setGymId(Number(g.id));
                            setDeliveryLat(null);
                            setDeliveryLng(null);
                            setDidManualAddress(false);
                            setGymModalOpen(false);
                            if (!isTrainer) {
                              try {
                                await api.put("/me/member-profile", {
                                  default_gym_id: Number(g.id),
                                });
                              } catch {}
                            }
                          }}
                        >
                          <View
                            style={{
                              padding: 16,
                              borderRadius: 20,
                              borderWidth: 1,
                              borderColor: active
                                ? theme.colors.green
                                : "rgba(255,255,255,0.05)",
                              backgroundColor: active
                                ? "rgba(34, 197, 94, 0.1)"
                                : "#1a1a1a",
                            }}
                          >
                            <View style={{ flexDirection: "row", gap: 12 }}>
                              <View
                                style={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: 16,
                                  overflow: "hidden",
                                  borderWidth: 1,
                                  borderColor: "rgba(255,255,255,0.08)",
                                  backgroundColor: "#111",
                                }}
                              >
                                {img ? (
                                  <Image
                                    source={{ uri: img as string }}
                                    style={{ width: 56, height: 56 }}
                                  />
                                ) : null}
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    gap: 10,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: "#fff",
                                      fontWeight: "900",
                                      fontSize: 16,
                                      flex: 1,
                                    }}
                                    numberOfLines={1}
                                  >
                                    {g.gym_name}
                                  </Text>
                                  {active ? (
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={20}
                                      color={theme.colors.green}
                                    />
                                  ) : null}
                                </View>
                                <Text
                                  style={{
                                    color: theme.colors.muted,
                                    fontSize: 12,
                                    marginTop: 4,
                                  }}
                                  numberOfLines={2}
                                >
                                  {addr}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={historyOpen} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#121212",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>
                Recent Locations
              </Text>
              <Pressable
                onPress={() => setHistoryOpen(false)}
                style={{
                  backgroundColor: "#222",
                  padding: 8,
                  borderRadius: 20,
                }}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              <View style={{ padding: 16, gap: 10 }}>
                {recentLocations.length ? (
                  recentLocations.map((x, idx) => (
                    <Pressable key={idx} onPress={() => applyRecent(x)}>
                      <View
                        style={{
                          padding: 14,
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.06)",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          gap: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontWeight: "900",
                            fontSize: 13,
                          }}
                          numberOfLines={1}
                        >
                          {String(x?.label ?? x?.address ?? "Location")}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.muted,
                            fontSize: 12,
                          }}
                          numberOfLines={2}
                        >
                          {x?.type === "gym"
                            ? "Gym Coverage"
                            : "Custom Address"}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <Text style={{ color: theme.colors.muted }}>
                    Belum ada history.
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          padding: 20,
          gap: 20,
          paddingBottom: 20 + Math.max(insets.bottom, 16) + 24,
        }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.green}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 28,
            fontWeight: "900",
            letterSpacing: -1,
          }}
        >
          Checkout
        </Text>

        {/* -- DELIVERY SECTION (MAP FIRST) -- */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontWeight: "800",
              textTransform: "uppercase",
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            Delivery
          </Text>

          {gymId ? (
            <Card
              style={{
                padding: 16,
                borderRadius: 24,
                backgroundColor: "#151515",
                gap: 10,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Ionicons
                  name="business"
                  size={18}
                  color={theme.colors.green}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}
                  >
                    Gym Coverage (Gratis Ongkir)
                  </Text>
                  <Text
                    style={{ color: theme.colors.muted, fontSize: 12 }}
                    numberOfLines={2}
                  >
                    {selectedGym?.gym_name ?? "Gym"} •{" "}
                    {selectedGym?.address ?? ""}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => setGymModalOpen(true)}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 16,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "900" }}
                    >
                      Ganti Gym
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDeliveryModeTouched(true);
                    openGojek();
                  }}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 16,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "900" }}
                    >
                      Order via Gojek
                    </Text>
                  </View>
                </Pressable>
              </View>
              {recentLocations.length ? (
                <Pressable onPress={() => setHistoryOpen(true)}>
                  <View
                    style={{
                      marginTop: 10,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 16,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "900" }}
                    >
                      History ({recentLocations.length})
                    </Text>
                  </View>
                </Pressable>
              ) : null}
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              <Card
                style={{
                  padding: 16,
                  borderRadius: 24,
                  backgroundColor: "#151515",
                  gap: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.05)",
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}
                >
                  Custom Address (sementara nonaktif)
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Untuk alamat di luar gym coverage, silakan order via Gojek.
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable onPress={openGojek} style={{ flex: 1 }}>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 16,
                        paddingVertical: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "900" }}
                      >
                        Order via Gojek
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setGymModalOpen(true)}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 16,
                        paddingVertical: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "900" }}
                      >
                        Gym Coverage
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </Card>
            </View>
          )}
        </View>

        {/* -- ITEMS SECTION -- */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontWeight: "800",
              textTransform: "uppercase",
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            Order Summary
          </Text>
          {cartItems.map((i) => (
            <View
              key={i.key}
              style={{
                flexDirection: "row",
                gap: 14,
                backgroundColor: "#151515",
                padding: 12,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.03)",
              }}
            >
              <Image
                source={
                  toPublicUrl(i.image)
                    ? { uri: toPublicUrl(i.image) as string }
                    : require("../../assets/icon.png")
                }
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  backgroundColor: "#000",
                }}
              />
              <View style={{ flex: 1, justifyContent: "center" }}>
                <Text
                  style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}
                  numberOfLines={1}
                >
                  {i.name}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  {i.quantity} pcs • Rp{" "}
                  {(
                    Number(i.base_price) +
                    (i.modifier_options ?? []).reduce(
                      (s, o) => s + Number(o.additional_price),
                      0,
                    )
                  ).toLocaleString("id-ID")}
                </Text>
                {i.modifier_options?.map((m, idx) => (
                  <Text
                    key={idx}
                    style={{
                      color: theme.colors.green,
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    + {m.option_name}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* -- DELIVERY SECTION -- */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontWeight: "800",
                textTransform: "uppercase",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              Shipping Details
            </Text>
            {!isTrainer && (
              <Pressable
                onPress={() => setGymModalOpen(true)}
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.green,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  Change Gym
                </Text>
              </Pressable>
            )}
          </View>

          <Card
            style={{
              padding: 16,
              borderRadius: 24,
              gap: 16,
              backgroundColor: "#151515",
            }}
          >
            {selectedGym && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: "rgba(34, 197, 94, 0.05)",
                  padding: 12,
                  borderRadius: 16,
                }}
              >
                <Ionicons
                  name="business"
                  size={20}
                  color={theme.colors.green}
                />
                <View>
                  <Text
                    style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}
                  >
                    {selectedGym.gym_name}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.green,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Free Delivery Applied
                  </Text>
                </View>
              </View>
            )}

            <TextField
              label="Alamat Pengantaran"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Tulis alamat lengkap untuk pengantaran"
              multiline
              style={{ minHeight: 60 }}
            />

            <TextField
              label="Courier Notes"
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              placeholder="e.g. drop at reception"
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Recipient"
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Phone"
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </Card>
        </View>

        {/* -- PAYMENT SECTION -- */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontWeight: "800",
              textTransform: "uppercase",
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            Payment Method
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {methods.map((m) => {
              const active = m.code === paymentMethod;
              return (
                <Pressable
                  key={m.code}
                  onPress={() => setPaymentMethod(m.code)}
                  style={{ flex: 1, minWidth: "25%" }}
                >
                  <View
                    style={{
                      padding: 16,
                      borderRadius: 20,
                      backgroundColor: active
                        ? "rgba(34, 197, 94, 0.1)"
                        : "#151515",
                      borderWidth: 1,
                      borderColor: active
                        ? theme.colors.green
                        : "rgba(255,255,255,0.03)",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={m.code === "flame-points" ? "flash" : "card"}
                      size={20}
                      color={active ? theme.colors.green : "#555"}
                    />
                    <Text
                      style={{
                        color: active ? "#fff" : theme.colors.muted,
                        fontWeight: "600",
                        fontSize: 10,
                        marginTop: 8,
                      }}
                    >
                      {m.name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* -- FLAME POINTS INFO -- */}
        {paymentMethod === "flame-points" && (
          <LinearGradient
            colors={["#1a1a1a", "#0d1a11"]}
            style={{
              padding: 20,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: pointsOk
                ? "rgba(34, 197, 94, 0.2)"
                : theme.colors.danger,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  YOUR BALANCE
                </Text>
                <Text
                  style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}
                >
                  {pointsBalance.toLocaleString("id-ID")} fp
                </Text>
              </View>
              <Ionicons name="flash" size={32} color={theme.colors.green} />
            </View>
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(255,255,255,0.05)",
                marginVertical: 15,
              }}
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: theme.colors.muted }}>Payment Amount</Text>
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                {pointsDue.toLocaleString("id-ID")} fp
              </Text>
            </View>
            {!pointsOk && (
              <Text
                style={{
                  color: "#ef4444",
                  fontSize: 12,
                  fontWeight: "700",
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                Insufficient points balance
              </Text>
            )}
          </LinearGradient>
        )}

        {/* -- FINAL ACTION -- */}
        <View style={{ marginTop: 10, gap: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
              Total Payment
            </Text>
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "900" }}>
              Rp {Number(finalTotal).toLocaleString("id-ID")}
            </Text>
          </View>
          <Button
            onPress={() => createOrder.mutate()}
            disabled={
              createOrder.isPending ||
              waOrder.isPending ||
              cartItems.length === 0 ||
              !deliveryAddress ||
              !paymentMethod ||
              !deliveryOk ||
              !pointsOk
            }
            style={{ height: 60, borderRadius: 20 }}
          >
            <Text style={{ color: "#000", fontWeight: "900", fontSize: 18 }}>
              {createOrder.isPending ? "Processing..." : "Confirm & Order"}
            </Text>
          </Button>

          <Pressable
            onPress={() => waOrder.mutate()}
            disabled={
              waOrder.isPending ||
              createOrder.isPending ||
              cartItems.length === 0 ||
              !deliveryAddress ||
              !deliveryOk
            }
          >
            <View
              style={{
                height: 54,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                backgroundColor: "#151515",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 10,
                opacity:
                  waOrder.isPending ||
                  createOrder.isPending ||
                  cartItems.length === 0 ||
                  !deliveryAddress ||
                  !deliveryOk
                    ? 0.4
                    : 1,
              }}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
                {waOrder.isPending
                  ? "Membuka WhatsApp..."
                  : "Order via WhatsApp"}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={customMapEnabled && mapOpen}
        animationType="slide"
        transparent
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
          <View
            style={{
              paddingTop: Math.max(insets.top, 12),
              paddingHorizontal: 14,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              backgroundColor: theme.colors.bg,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Pressable onPress={() => setMapOpen(false)}>
              <Text style={{ color: theme.colors.green, fontWeight: "900" }}>
                Close
              </Text>
            </Pressable>
            <Text
              style={{ color: theme.colors.text, fontWeight: "900" }}
              numberOfLines={1}
            >
              Pilih Lokasi
            </Text>
            <Pressable
              onPress={async () => {
                try {
                  const perm =
                    await Location.requestForegroundPermissionsAsync();
                  if (!perm.granted) return;
                  const pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Highest,
                  });
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  setDeliveryLat(lat);
                  setDeliveryLng(lng);
                  setDidManualAddress(false);
                  mapRef.current?.setPoint(lat, lng, 19);
                } catch {}
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                My Location
              </Text>
            </Pressable>
          </View>

          <View style={{ flex: 1, padding: 14 }}>
            {deliveryLat != null && deliveryLng != null ? (
              <OsmMapPicker
                ref={(r) => {
                  mapRef.current = r;
                }}
                lat={deliveryLat}
                lng={deliveryLng}
                zoom={19}
                onChange={(lat, lng) => {
                  setDeliveryLat(lat);
                  setDeliveryLng(lng);
                  setDidManualAddress(false);
                }}
                height={520}
              />
            ) : null}
            <View style={{ height: 12 }} />
            <Pressable onPress={() => setMapOpen(false)}>
              <View
                style={{
                  height: 54,
                  borderRadius: 18,
                  backgroundColor: theme.colors.green,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#041009", fontWeight: "900" }}>
                  Pakai Lokasi Ini
                </Text>
              </View>
            </Pressable>
            <View style={{ height: Math.max(insets.bottom, 12) }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
