import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
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

type PaymentMethod = { id: number; code: string; name: string };

const LAST_ADDRESS_KEY = "flamestreet_last_delivery_address";
const LAST_GYM_KEY = "flamestreet_last_gym_id";
const EMPTY_ROLES: readonly string[] = [];

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
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

  const roles = useAuthStore((s) => s.user?.roles ?? EMPTY_ROLES);
  const isTrainer = roles.includes("trainer");

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
    if (!isTrainer && !gymId && defGym) setGymId(Number(defGym));
  }, [meQuery.data, recipientName, recipientPhone, gymId, isTrainer]);

  useEffect(() => {
    if (loadedLast) return;
    let cancelled = false;
    async function loadLast() {
      try {
        const addr = await SecureStore.getItemAsync(LAST_ADDRESS_KEY);
        const gid = await SecureStore.getItemAsync(LAST_GYM_KEY);
        if (cancelled) return;
        if (!deliveryAddress && addr) setDeliveryAddress(addr);
        if (!isTrainer && !gymId && gid) setGymId(Number(gid));
      } catch {}
      if (!cancelled) setLoadedLast(true);
    }
    loadLast();
    return () => {
      cancelled = true;
    };
  }, [loadedLast, deliveryAddress, gymId, isTrainer]);

  const selectedGym = useMemo(() => {
    const id = Number(gymId ?? 0);
    if (!id) return null;
    return (gymsQuery.data ?? []).find((g: any) => Number(g.id) === id) ?? null;
  }, [gymId, gymsQuery.data]);

  useEffect(() => {
    if (!selectedGym) return;
    const parts = [
      selectedGym?.gym_name,
      selectedGym?.address,
      selectedGym?.city,
      selectedGym?.province,
    ].filter(Boolean);
    if (!deliveryAddress) setDeliveryAddress(parts.join(", "));
  }, [selectedGym?.id]);

  useEffect(() => {
    if (isTrainer) return;
    if (!loadedLast) return;
    const hasAny = Boolean(deliveryAddress?.trim());
    const hasGym = Boolean(gymId);
    if (!hasAny && !hasGym && (gymsQuery.data ?? []).length) {
      setGymModalOpen(true);
    }
  }, [isTrainer, loadedLast, deliveryAddress, gymId, gymsQuery.data]);

  const pmOptions = useMemo(() => {
    const list = pmQuery.data ?? [];
    return list.filter((m) => m.code);
  }, [pmQuery.data]);

  const createOrder = useMutation({
    mutationFn: async () => {
      const payload = {
        gym_id: gymId ? Number(gymId) : null,
        delivery_address: deliveryAddress,
        delivery_notes: deliveryNotes || null,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        payment_method: paymentMethod,
        delivery_fee: gymId ? 0 : 0,
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
        if (deliveryAddress) {
          await SecureStore.setItemAsync(LAST_ADDRESS_KEY, deliveryAddress);
        }
        if (gymId) {
          await SecureStore.setItemAsync(LAST_GYM_KEY, String(gymId));
        } else {
          await SecureStore.deleteItemAsync(LAST_GYM_KEY);
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
          if (url) {
            await WebBrowser.openBrowserAsync(url);
          }
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
        e?.response?.data?.message ?? "Please check your inputs",
      );
    },
  });

  const methods = (() => {
    const list: PaymentMethod[] = pmOptions.length
      ? pmOptions
      : [{ id: 0, code: "doku-qris", name: "QRIS (DOKU)" }];
    const hasPoints = list.some((m) => m.code === "flame-points");
    if (!hasPoints)
      list.push({ id: -1, code: "flame-points", name: "Flame Points" });
    return list;
  })();

  const pointsBalance = Number(pointsQuery.data?.balance ?? 0) || 0;
  const pointsDue = Math.round(Number(total()) || 0);
  const pointsOk =
    paymentMethod !== "flame-points" || pointsBalance >= pointsDue;

  return (
    <Screen>
      <Modal visible={gymModalOpen} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: 14,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.bg,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: theme.colors.border,
              overflow: "hidden",
              maxHeight: "85%",
            }}
          >
            <View style={{ padding: 14, gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}>
                  Choose gym coverage
                </Text>
                <Pressable onPress={() => setGymModalOpen(false)}>
                  <Ionicons name="close" size={18} color={theme.colors.muted} />
                </Pressable>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Ionicons name="search" size={16} color={theme.colors.muted} />
                <TextInput
                  value={gymSearch}
                  onChangeText={setGymSearch}
                  placeholder="Search gym..."
                  placeholderTextColor={theme.colors.muted}
                  style={{ flex: 1, color: theme.colors.text }}
                />
              </View>
              <Pressable
                onPress={() => {
                  setGymId(null);
                  setGymModalOpen(false);
                }}
              >
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: !gymId ? theme.colors.green : theme.colors.border,
                    backgroundColor: !gymId ? "#0b1b12" : "transparent",
                    borderRadius: theme.radius.md,
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    Custom address
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    Ketik alamat manual
                  </Text>
                </View>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
              {(gymsQuery.data ?? [])
                .filter((g: any) => {
                  const s = gymSearch.trim().toLowerCase();
                  if (!s) return true;
                  return String(g.gym_name ?? "").toLowerCase().includes(s);
                })
                .map((g: any) => {
                  const active = Number(gymId ?? 0) === Number(g.id);
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => {
                        setGymId(Number(g.id));
                        setGymModalOpen(false);
                        const parts = [g.gym_name, g.address, g.city, g.province].filter(Boolean);
                        if (!deliveryAddress) setDeliveryAddress(parts.join(", "));
                      }}
                    >
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: active ? theme.colors.green : theme.colors.border,
                          backgroundColor: active ? "#0b1b12" : "transparent",
                          borderRadius: theme.radius.md,
                          padding: 12,
                          gap: 4,
                        }}
                      >
                        <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                          {g.gym_name}
                        </Text>
                        <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={2}>
                          {[g.address, g.city, g.province].filter(Boolean).join(", ")}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <Text
          style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800" }}
        >
          Checkout
        </Text>

        <Card style={{ gap: 10 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 16,
              fontWeight: "900",
            }}
          >
            Items
          </Text>
          {cartItems.map((i) => (
            <View
              key={i.key}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                padding: 12,
                gap: 6,
              }}
            >
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                {toPublicUrl(i.image) ? (
                  <Image
                    source={{ uri: toPublicUrl(i.image) as string }}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 10,
                      backgroundColor: "#0a0f0c",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                    resizeMode="contain"
                  />
                ) : (
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 10,
                      backgroundColor: "#0a0f0c",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="image"
                      size={16}
                      color={theme.colors.muted}
                    />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{ color: theme.colors.text, fontWeight: "900" }}
                    numberOfLines={1}
                  >
                    {i.name}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    {i.quantity} × Rp{" "}
                    {(
                      Number(i.base_price ?? 0) +
                      (i.modifier_options ?? []).reduce(
                        (s, o) => s + Number(o.additional_price ?? 0),
                        0,
                      )
                    ).toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
              {(i.modifier_options ?? []).length ? (
                <View style={{ gap: 4 }}>
                  {(i.modifier_options ?? []).map((m, idx) => (
                    <Text
                      key={`${i.key}:${idx}`}
                      style={{ color: theme.colors.muted, fontSize: 12 }}
                    >
                      {m.modifier_name}: {m.option_name}
                      {Number(m.additional_price ?? 0) > 0
                        ? ` (+Rp ${Number(m.additional_price).toLocaleString(
                            "id-ID",
                          )})`
                        : ""}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {!cartItems.length ? (
            <Text style={{ color: theme.colors.muted }}>Cart is empty</Text>
          ) : null}
        </Card>

        {!isTrainer ? (
          <Card style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}>
                Gym coverage
              </Text>
              <Pressable onPress={() => setGymModalOpen(true)}>
                <Text style={{ color: theme.colors.green, fontWeight: "900" }}>
                  Choose
                </Text>
              </Pressable>
            </View>
            {selectedGym ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: 12,
                  gap: 4,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                  {selectedGym.gym_name}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={2}>
                  {[selectedGym.address, selectedGym.city, selectedGym.province].filter(Boolean).join(", ")}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Free delivery to gym coverage
                </Text>
              </View>
            ) : (
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Custom address. Tap “Choose” to select gym coverage.
              </Text>
            )}
          </Card>
        ) : null}

        <Card style={{ gap: theme.spacing.md }}>
          <TextField
            label="Delivery address"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Address"
            multiline
            style={{ minHeight: 80, textAlignVertical: "top" }}
            editable
          />
          <TextField
            label="Notes (optional)"
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            placeholder="Notes"
          />

          <TextField
            label="Recipient name"
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Name"
          />

          <TextField
            label="Recipient phone"
            value={recipientPhone}
            onChangeText={setRecipientPhone}
            placeholder="Phone"
            keyboardType="phone-pad"
          />
        </Card>

        <Card style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
            Payment method
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {methods.map((m) => {
              const active = m.code === paymentMethod;
              return (
                <Pressable
                  key={m.code}
                  onPress={() => setPaymentMethod(m.code)}
                  style={{ width: "31%" }}
                >
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: active
                        ? theme.colors.green
                        : theme.colors.border,
                      backgroundColor: active ? "#0b1b12" : "transparent",
                      borderRadius: theme.radius.md,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      minHeight: 56,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? theme.colors.text : theme.colors.muted,
                        fontSize: 12,
                        fontWeight: "900",
                      }}
                      numberOfLines={2}
                    >
                      {m.name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {paymentMethod === "flame-points" ? (
          <Card style={{ gap: 10 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
              Flame Points
            </Text>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: theme.colors.muted }}>Saldo</Text>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                {pointsBalance.toLocaleString("id-ID")} fp
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: theme.colors.muted }}>Total dibayar</Text>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                {pointsDue.toLocaleString("id-ID")} fp
              </Text>
            </View>
            {!pointsOk ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: "#0a0f0c",
                  borderRadius: theme.radius.md,
                  padding: 10,
                }}
              >
                <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>
                  Maaf yaa, point kamu belum cukup
                </Text>
              </View>
            ) : (
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Points akan langsung dipotong saat order dibuat.
              </Text>
            )}
          </Card>
        ) : null}

        <Card style={{ gap: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 16,
              fontWeight: "800",
            }}
          >
            Total: Rp {Number(total()).toLocaleString("id-ID")}
          </Text>
          <Button
            onPress={() => createOrder.mutate()}
            disabled={
              createOrder.isPending ||
              cartItems.length === 0 ||
              !deliveryAddress ||
              !paymentMethod ||
              !pointsOk
            }
          >
            {createOrder.isPending ? "Placing order..." : "Place order"}
          </Button>
        </Card>
      </ScrollView>
    </Screen>
  );
}
