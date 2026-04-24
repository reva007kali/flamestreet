import { useMemo, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

type Item = any;
type Purchase = any;

function fmtMoney(v: any) {
  return `Rp ${Number(v ?? 0).toLocaleString("id-ID")}`;
}

export default function FpShopScreen() {
  const nav = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const roles = user?.roles ?? [];
  const isTrainer = roles.includes("trainer");
  const isMember = roles.includes("member");

  const pointsQuery = useQuery({
    queryKey: ["fp-shop", "points", isTrainer ? "trainer" : "member"],
    queryFn: async () => {
      const r = await api.get(isTrainer ? "/trainer/points" : "/member/points");
      return r.data;
    },
    enabled: isTrainer || isMember,
  });

  const itemsQuery = useQuery({
    queryKey: ["fp-shop", "items", "coupon"],
    queryFn: async () =>
      (await api.get("/fp-shop/items", { params: { type: "coupon" } })).data
        .items ?? [],
    enabled: isTrainer || isMember,
  });

  const myCouponsQuery = useQuery({
    queryKey: ["fp-shop", "purchases", "coupon", "available"],
    queryFn: async () =>
      (
        await api.get("/fp-shop/purchases", {
          params: { type: "coupon", status: "available" },
        })
      ).data.purchases ?? [],
    enabled: isTrainer || isMember,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const buyMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return (await api.post(`/fp-shop/items/${Number(itemId)}/buy`)).data
        .purchase as Purchase;
    },
    onSuccess: () => {
      setError(null);
      setSuccess("Berhasil beli kupon.");
      myCouponsQuery.refetch();
      itemsQuery.refetch();
      pointsQuery.refetch();
    },
    onError: (e: any) => {
      setSuccess(null);
      setError(e?.response?.data?.message ?? "Gagal beli kupon");
    },
  });

  const pointsBalance = Number(pointsQuery.data?.balance ?? 0) || 0;
  const coupons: Item[] = useMemo(() => {
    const rows = itemsQuery.data ?? [];
    return rows.filter((x: any) => x && x.type === "coupon");
  }, [itemsQuery.data]);
  const owned = (myCouponsQuery.data ?? []).length;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <Pressable
              onPress={() => nav.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: "rgba(255,255,255,0.04)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            </Pressable>

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 10,
                  letterSpacing: 2,
                  fontWeight: "900",
                }}
              >
                FP SHOP
              </Text>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>
                Kupon Diskon
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                Beli kupon pakai Flame Points (FP).
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 10,
                  letterSpacing: 2,
                  fontWeight: "900",
                }}
              >
                BALANCE
              </Text>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "900" }}>
                {pointsBalance.toLocaleString("id-ID")} FP
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
                My Kupon: {owned}
              </Text>
            </View>
          </View>

          {error ? (
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(244,63,94,0.25)",
                backgroundColor: "rgba(244,63,94,0.12)",
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#fecdd3", fontWeight: "800" }}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(16,185,129,0.25)",
                backgroundColor: "rgba(16,185,129,0.12)",
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#bbf7d0", fontWeight: "800" }}>
                {success}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              padding: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 10,
                  letterSpacing: 2,
                  fontWeight: "900",
                }}
              >
                COUPONS
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 10,
                  letterSpacing: 2,
                  fontWeight: "900",
                }}
              >
                FP ONLY
              </Text>
            </View>

            {itemsQuery.isLoading ? (
              <Text style={{ color: theme.colors.muted, fontWeight: "800" }}>
                Loading…
              </Text>
            ) : coupons.length ? (
              <View style={{ gap: 10 }}>
                {coupons.map((it: any) => {
                  const fp = Number(it.fp_price ?? 0) || 0;
                  const canBuy = pointsBalance >= fp;
                  const label =
                    it.discount_type === "percent"
                      ? `${Number(it.discount_value ?? 0)}%`
                      : fmtMoney(it.discount_value ?? 0);
                  const min =
                    it.min_subtotal != null
                      ? `Min ${fmtMoney(it.min_subtotal)}`
                      : "";
                  const max =
                    it.max_discount != null
                      ? `Max ${fmtMoney(it.max_discount)}`
                      : "";

                  return (
                    <View
                      key={String(it.id)}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.08)",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        padding: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: "#fff",
                              fontWeight: "900",
                              fontSize: 14,
                            }}
                            numberOfLines={1}
                          >
                            {String(it.name ?? "Coupon")}
                          </Text>
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.55)",
                              marginTop: 3,
                              fontWeight: "700",
                            }}
                          >
                            {label}
                            {min ? ` • ${min}` : ""}
                            {max ? ` • ${max}` : ""}
                          </Text>
                          {it.description ? (
                            <Text
                              style={{
                                color: "rgba(255,255,255,0.45)",
                                marginTop: 6,
                                fontWeight: "600",
                              }}
                            >
                              {String(it.description)}
                            </Text>
                          ) : null}
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.7)",
                              fontWeight: "900",
                            }}
                          >
                            {fp.toLocaleString("id-ID")} FP
                          </Text>
                          <Pressable
                            onPress={() => {
                              setError(null);
                              setSuccess(null);
                              buyMutation.mutate(Number(it.id));
                            }}
                            disabled={buyMutation.isPending || !canBuy}
                            style={{
                              marginTop: 8,
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              borderRadius: 14,
                              backgroundColor: theme.colors.green,
                              opacity: buyMutation.isPending || !canBuy ? 0.35 : 1,
                            }}
                          >
                            <Text
                              style={{
                                color: "#04100a",
                                fontWeight: "900",
                                letterSpacing: 2,
                                fontSize: 10,
                              }}
                            >
                              BUY
                            </Text>
                          </Pressable>
                          {!canBuy ? (
                            <Text
                              style={{
                                color: "#fecdd3",
                                marginTop: 6,
                                fontWeight: "800",
                                fontSize: 11,
                              }}
                            >
                              FP kurang
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={{ color: theme.colors.muted, fontWeight: "800" }}>
                Belum ada kupon.
              </Text>
            )}
          </View>

          <View
            style={{
              marginTop: 12,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              padding: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 10,
                  letterSpacing: 2,
                  fontWeight: "900",
                }}
              >
                MERCHANDISE
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 10,
                  letterSpacing: 2,
                  fontWeight: "900",
                }}
              >
                COMING SOON
              </Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontWeight: "700" }}>
              FP Shop akan support merch. Untuk checkout, yang ditampilkan hanya kupon
              diskon.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

