import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "../lib/api";
import Screen from "../ui/Screen";
import Card from "../ui/Card";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import { useToast } from "../ui/Toast";
import { useEffect, useState } from "react";

export default function TrainerWithdrawScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payoutBank, setPayoutBank] = useState("");
  const [payoutAccountNumber, setPayoutAccountNumber] = useState("");

  const pointsQuery = useQuery({
    queryKey: ["trainer", "points"],
    queryFn: async () => (await api.get("/trainer/points")).data,
  });

  const redeemsQuery = useQuery({
    queryKey: ["trainer", "redeems"],
    queryFn: async () => (await api.get("/trainer/redeems")).data,
  });

  const redeem = useMutation({
    mutationFn: async () => {
      const payload: any = { amount: Number(amount) || 0 };
      if (description) payload.description = description;
      const r = await api.post("/trainer/points/redeem", payload);
      return r.data;
    },
    onSuccess: async () => {
      setAmount("");
      setDescription("");
      await pointsQuery.refetch();
      await redeemsQuery.refetch();
      toast.show({ variant: "success", title: "Redeem request created" });
    },
    onError: (e: any) => {
      Alert.alert(
        "Redeem failed",
        e?.response?.data?.message ?? "Cannot redeem points",
      );
    },
  });

  useEffect(() => {
    const b = pointsQuery.data?.payout?.payout_bank ?? "";
    const a = pointsQuery.data?.payout?.payout_account_number ?? "";
    setPayoutBank((v) => (v ? v : b));
    setPayoutAccountNumber((v) => (v ? v : a));
  }, [pointsQuery.data?.payout?.payout_bank, pointsQuery.data?.payout?.payout_account_number]);

  const payoutAcc = pointsQuery.data?.payout?.payout_account_number ?? "";
  const balance = Number(pointsQuery.data?.balance ?? 0);
  const redeems = redeemsQuery.data?.data ?? [];

  const savePayout = useMutation({
    mutationFn: async () => {
      const payload: any = { payout_account_number: payoutAccountNumber };
      if (payoutBank) payload.payout_bank = payoutBank;
      await api.put("/trainer/payout-account", payload);
    },
    onSuccess: async () => {
      await pointsQuery.refetch();
      toast.show({ variant: "success", title: "Payout account updated" });
    },
    onError: (e: any) => {
      Alert.alert(
        "Update failed",
        e?.response?.data?.message ?? "Cannot update payout account",
      );
    },
  });

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing || pointsQuery.isFetching || redeemsQuery.isFetching}
            onRefresh={async () => {
              await onRefresh();
              await Promise.all([pointsQuery.refetch(), redeemsQuery.refetch()]);
            }}
          />
        }
      >
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
          Withdraw Points
        </Text>

        <Card style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Balance</Text>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}>
            {balance.toLocaleString("id-ID")} fp
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
            Rp {Number(pointsQuery.data?.balance_rupiah ?? 0).toLocaleString("id-ID")}
          </Text>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
            Payout Account
          </Text>
          <TextField
            label="Bank (optional)"
            value={payoutBank}
            onChangeText={setPayoutBank}
            placeholder="e.g. BCA"
          />
          <TextField
            label="Account number"
            value={payoutAccountNumber}
            onChangeText={setPayoutAccountNumber}
            placeholder="Account number"
            keyboardType="numeric"
          />
          <Button
            onPress={() => savePayout.mutate()}
            disabled={savePayout.isPending || !payoutAccountNumber}
          >
            {savePayout.isPending ? "Saving..." : "Save payout account"}
          </Button>
        </Card>

        <Card style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
            Create Redeem Request
          </Text>
          <TextField
            label="Amount (points)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="e.g. 10000"
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Notes"
          />
          <Button
            onPress={() => redeem.mutate()}
            disabled={redeem.isPending || !Number(amount)}
          >
            {redeem.isPending ? "Submitting..." : "Request withdraw"}
          </Button>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
            Redeem History
          </Text>
          {(redeems as any[]).map((r: any) => (
            <View
              key={r.id}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                padding: 12,
                gap: 4,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                {Number(r.amount ?? 0).toLocaleString("id-ID")} fp
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Status: {r.status ?? "pending"}
                {r.deducted ? " • deducted" : ""}
              </Text>
              {r.description ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={2}>
                  {r.description}
                </Text>
              ) : null}
            </View>
          ))}
          {!(redeems as any[]).length ? (
            <Text style={{ color: theme.colors.muted }}>No redeem requests yet.</Text>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}
