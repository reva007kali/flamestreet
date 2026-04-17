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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PaymentMethod = { id: number; code: string; name: string };

const LAST_ADDRESS_KEY = "flamestreet_last_delivery_address";
const LAST_GYM_KEY = "flamestreet_last_gym_id";
const EMPTY_ROLES: readonly string[] = [];

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

  const roles = useAuthStore((s) => s.user?.roles ?? EMPTY_ROLES);
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

  const pmOptions = useMemo(
    () => (pmQuery.data ?? []).filter((m) => m.code),
    [pmQuery.data],
  );

  const createOrder = useMutation({
    mutationFn: async () => {
      const payload = {
        gym_id: gymId ? Number(gymId) : null,
        delivery_address: deliveryAddress,
        delivery_notes: deliveryNotes || null,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        payment_method: paymentMethod,
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
      return r.data?.order;
    },
    onSuccess: async (order) => {
      try {
        if (deliveryAddress)
          await SecureStore.setItemAsync(LAST_ADDRESS_KEY, deliveryAddress);
        if (gymId) await SecureStore.setItemAsync(LAST_GYM_KEY, String(gymId));
        else await SecureStore.deleteItemAsync(LAST_GYM_KEY);
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
        e?.response?.data?.message ?? "Please check your inputs",
      );
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

  const pointsBalance = Number(pointsQuery.data?.balance ?? 0) || 0;
  const pointsDue = Math.round(Number(total()) || 0);
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
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#121212",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingBottom: 40,
              maxHeight: "90%",
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#333",
                borderRadius: 2,
                alignSelf: "center",
                marginTop: 12,
              }}
            />

            <View style={{ padding: 24, gap: 20 }}>
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

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 400 }}
              >
                <View style={{ gap: 12 }}>
                  <Pressable
                    onPress={() => {
                      setGymId(null);
                      setGymModalOpen(false);
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
                        Custom Delivery
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.muted,
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        Input address manually
                      </Text>
                    </View>
                  </Pressable>

                  {(gymsQuery.data ?? [])
                    .filter(
                      (g: any) =>
                        !gymSearch ||
                        g.gym_name
                          .toLowerCase()
                          .includes(gymSearch.toLowerCase()),
                    )
                    .map((g: any) => {
                      const active = Number(gymId) === Number(g.id);
                      return (
                        <Pressable
                          key={g.id}
                          onPress={() => {
                            setGymId(Number(g.id));
                            setGymModalOpen(false);
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
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                              }}
                            >
                              <Text
                                style={{
                                  color: "#fff",
                                  fontWeight: "900",
                                  fontSize: 16,
                                }}
                              >
                                {g.gym_name}
                              </Text>
                              {active && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={20}
                                  color={theme.colors.green}
                                />
                              )}
                            </View>
                            <Text
                              style={{
                                color: theme.colors.muted,
                                fontSize: 12,
                                marginTop: 4,
                              }}
                              numberOfLines={2}
                            >
                              {g.address}
                            </Text>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
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
              label="Full Address"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="St. Number, Building, floor..."
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
              Rp {Number(total()).toLocaleString("id-ID")}
            </Text>
          </View>
          <Button
            onPress={() => createOrder.mutate()}
            disabled={
              createOrder.isPending ||
              cartItems.length === 0 ||
              !deliveryAddress ||
              !paymentMethod ||
              !pointsOk
            }
            style={{ height: 60, borderRadius: 20 }}
          >
            <Text style={{ color: "#000", fontWeight: "900", fontSize: 18 }}>
              {createOrder.isPending ? "Processing..." : "Confirm & Order"}
            </Text>
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
