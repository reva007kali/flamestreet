import { useQuery } from "@tanstack/react-query";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Image, RefreshControl, ScrollView, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { RootStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { toPublicUrl } from "../lib/assets";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import ModifierSelector, {
  ProductModifier,
  ProductModifierOption,
  isModifierComplete,
} from "../components/ModifierSelector";
import { useToast } from "../ui/Toast";

type ProductDetailRoute = RouteProp<RootStackParamList, "ProductDetail">;

type Product = {
  id: number;
  slug: string;
  name: string;
  price: number;
  description?: string | null;
  ingredients?: string | null;
  nutritional_info?: Record<string, any> | null;
  image?: string | null;
  modifiers?: ProductModifier[];
};

export default function ProductDetailScreen() {
  const route = useRoute<ProductDetailRoute>();
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const { refreshing, onRefresh } = usePullToRefresh();
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);

  const query = useQuery({
    queryKey: ["product", route.params.slug],
    queryFn: async (): Promise<Product> => {
      const r = await api.get(`/products/${route.params.slug}`);
      return r.data?.product ?? r.data ?? null;
    },
  });

  const product = query.data;
  const modifiers = (product?.modifiers ?? []) as ProductModifier[];

  useEffect(() => {
    if (!product) return;
    const next: number[] = [];
    for (const m of modifiers) {
      const opts = m.options ?? [];
      const defaults = opts.filter((o) => o.is_default);
      if (m.type === "single") {
        if (defaults[0]) next.push(defaults[0].id);
      } else {
        for (const o of defaults) next.push(o.id);
      }
    }
    setSelectedOptionIds(Array.from(new Set(next)));
  }, [product?.id]);

  const selectedSnapshots = useMemo(() => {
    const set = new Set(selectedOptionIds);
    const out: {
      modifier_name: string;
      option_name: string;
      additional_price: number;
    }[] = [];
    for (const m of modifiers) {
      for (const o of m.options ?? []) {
        if (!set.has(o.id)) continue;
        out.push({
          modifier_name: m.name,
          option_name: o.name,
          additional_price: Number(o.additional_price ?? 0),
        });
      }
    }
    return out;
  }, [modifiers, selectedOptionIds]);

  const additionalPrice = useMemo(
    () =>
      selectedSnapshots.reduce(
        (s, o) => s + Number(o.additional_price ?? 0),
        0,
      ),
    [selectedSnapshots],
  );

  const canAdd = useMemo(() => {
    if (!modifiers.length) return true;
    return modifiers.every((m) => isModifierComplete(m, selectedOptionIds));
  }, [modifiers, selectedOptionIds]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing || query.isFetching}
            onRefresh={onRefresh}
          />
        }
      >
        {query.isLoading ? (
          <Text style={{ color: theme.colors.muted }}>Loading…</Text>
        ) : null}
        {!query.isLoading && !product ? (
          <Text style={{ color: theme.colors.muted }}>Not found</Text>
        ) : null}

        {product ? (
          <View style={{ gap: theme.spacing.md }}>
            <Card style={{ gap: 12 }}>
              {toPublicUrl(product.image) ? (
                <Image
                  source={{ uri: toPublicUrl(product.image) as string }}
                  style={{
                    width: "100%",
                    height: 200,
                    borderRadius: theme.radius.md,
                    backgroundColor: "#0a0f0c",
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 200,
                    borderRadius: theme.radius.md,
                    backgroundColor: "#0a0f0c",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                />
              )}
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 20,
                  fontWeight: "900",
                }}
              >
                {product.name}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                Rp{" "}
                {(
                  Number(product.price ?? 0) + Number(additionalPrice ?? 0)
                ).toLocaleString("id-ID")}
              </Text>
              {product.description ? (
                <Text style={{ color: theme.colors.text }}>
                  {product.description}
                </Text>
              ) : null}
              {product.ingredients ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Ingredients: {product.ingredients}
                </Text>
              ) : null}
            </Card>

            {modifiers.length ? (
              <ModifierSelector
                modifiers={modifiers}
                selectedIds={selectedOptionIds}
                onChange={setSelectedOptionIds}
              />
            ) : null}

            {!canAdd ? (
              <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
                Please choose required variants first.
              </Text>
            ) : null}

            <Button
              onPress={() => {
                if (!product) return;
                if (!canAdd) return;
                addItem(
                  {
                    product_id: product.id,
                    slug: product.slug,
                    name: product.name,
                    image: product.image ?? null,
                    base_price: Number(product.price ?? 0),
                    modifier_option_ids: selectedOptionIds,
                    modifier_options: selectedSnapshots,
                  },
                  1,
                );
                toast.show({
                  variant: "success",
                  title: "Added to cart",
                  message: product.name,
                });
              }}
              disabled={!canAdd}
            >
              Add to cart
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
