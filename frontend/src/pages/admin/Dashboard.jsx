import { cloneElement, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";
import {
  TrendingUp,
  Users,
  Dumbbell,
  Package,
  ShoppingCart,
  Download,
  Calendar as CalendarIcon,
  ArrowUpRight,
  DollarSign,
  Wallet,
  Percent,
  ChevronRight,
  Activity,
  Award,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#84cc16",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
];

export default function Dashboard() {
  const pad2 = (n) => String(n).padStart(2, "0");
  const toYmd = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => toYmd(new Date()), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return toYmd(d);
  }, [now]);
  const defaultTo = useMemo(() => today, [today]);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const monthOptions = useMemo(() => {
    const out = [];
    const base = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = d.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
      const f = toYmd(new Date(y, m, 1));
      const t = toYmd(new Date(y, m + 1, 0));
      out.push({
        label,
        from: f,
        to: t,
        key: `${y}-${String(m + 1).padStart(2, "0")}`,
      });
    }
    return out;
  }, [now]);

  const query = useQuery({
    queryKey: ["admin", "dashboard", { from, to }],
    queryFn: async () =>
      (await api.get("/admin/dashboard", { params: { from, to } })).data,
  });

  const {
    counts = {},
    sales = {},
    top_products: topProducts = [],
    top_trainers: topTrainers = [],
    top_members: topMembers = [],
  } = query.data ?? {};
  const baseUrl = useMemo(
    () => (import.meta.env.VITE_API_URL ?? "").replace(/\/api\/?$/, ""),
    [],
  );

  const chartData = useMemo(() => {
    return topProducts.map((p) => ({
      name: p.product_name,
      value: Number(p.qty_sold ?? 0),
    }));
  }, [topProducts]);

  const money = (v) => `Rp ${Number(v ?? 0).toLocaleString("id-ID")}`;

  const pie = useMemo(() => {
    const total =
      chartData.reduce((sum, s) => sum + (Number(s.value ?? 0) || 0), 0) || 0;
    let acc = 0;
    const stops = chartData
      .filter((s) => (Number(s.value ?? 0) || 0) > 0)
      .map((s, idx) => {
        const start = acc;
        const end = acc + ((Number(s.value ?? 0) || 0) / total) * 100;
        acc = end;
        return `${COLORS[idx % COLORS.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      });
    return {
      total,
      conic: stops.length
        ? `conic-gradient(${stops.join(", ")})`
        : "conic-gradient(#27272a 0 100%)",
    };
  }, [chartData]);

  async function downloadReport(type) {
    const res = await api.get("/admin/reports/orders-export", {
      params: { from, to, type },
      responseType: "blob",
    });
    const cd = res.headers?.["content-disposition"] ?? "";
    const filename =
      /filename="?([^"]+)"?/i.exec(cd)?.[1] ?? `report-${type}-${from}.csv`;
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen space-y-8 p-6 lg:p-10 bg-[#09090b] text-white">
      {/* APP BAR / HEADER */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--accent)] font-bold tracking-tighter uppercase text-sm italic">
            <Activity size={16} /> Flamestreet
          </div>
          <h1 className="text-4xl font-black tracking-tight uppercase italic">
            Dashboard
          </h1>
          <p className="text-zinc-500 text-sm font-medium">
            Real-time business performance & analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-zinc-900/40 p-1.5 rounded-2xl border border-zinc-800/50 backdrop-blur-md">
          <div className="flex items-center gap-2 pl-3">
            <CalendarIcon size={14} className="text-zinc-500" />
            <select
              className="bg-transparent border-none text-xs font-bold text-zinc-300 outline-none cursor-pointer uppercase tracking-wider"
              defaultValue=""
              onChange={(e) => {
                const opt = monthOptions.find((m) => m.key === e.target.value);
                if (opt) {
                  setFrom(opt.from);
                  setTo(opt.to);
                }
                e.target.value = "";
              }}
            >
              <option value="" className="bg-zinc-950">
                Quick Period
              </option>
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key} className="bg-zinc-950">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="h-4 w-[1px] bg-zinc-800" />
          <Button
            size="sm"
            type="button"
            onClick={() => {
              setFrom(today);
              setTo(today);
            }}
            className="bg-zinc-950 text-zinc-200 hover:bg-zinc-900 rounded-xl font-black text-[11px] uppercase tracking-widest px-4 h-9 border border-zinc-800"
          >
            Hari Ini
          </Button>
          <div className="flex items-center gap-2 px-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="bg-transparent text-xs font-bold text-zinc-400 outline-none"
            />
            <ChevronRight size={12} className="text-zinc-700" />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="bg-transparent text-xs font-bold text-zinc-400 outline-none"
            />
          </div>
          <Button
            size="sm"
            onClick={() => downloadReport("orders")}
            className="bg-white text-black hover:bg-zinc-200 rounded-xl font-bold text-[11px] uppercase tracking-widest px-4 h-9 shadow-lg"
          >
            <Download className="mr-2 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* STATS HIGHLIGHTS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModernStatCard
          title="Revenue"
          value={money(sales.net_sales)}
          description={`${sales.orders_paid ?? 0} Orders Valid`}
          icon={<DollarSign className="text-emerald-400" />}
          accent="emerald"
        />
        <ModernStatCard
          title="Gross Profit"
          value={money(sales.net_profit)}
          description="Revenue after COGS"
          icon={<TrendingUp className="text-blue-400" />}
          accent="blue"
        />
        <ModernStatCard
          title="Cash In"
          value={money(sales.total_collected)}
          description="Total funds received"
          icon={<Wallet className="text-amber-400" />}
          accent="amber"
        />
        <ModernStatCard
          title="Promotions"
          value={money(sales.discounts)}
          description="Total vouchers used"
          icon={<Percent className="text-rose-400" />}
          accent="rose"
        />
      </div>

      {/* QUICK METRICS */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          {
            key: "users",
            label: "Total Users",
            icon: <Users />,
            to: "/admin/users",
            color: "border-blue-500/20 text-blue-400",
          },
          {
            key: "trainers",
            label: "Trainers",
            icon: <Dumbbell />,
            to: "/admin/trainers",
            color: "border-purple-500/20 text-purple-400",
          },
          {
            key: "members",
            label: "Members",
            icon: <Users />,
            to: "/admin/members",
            color: "border-emerald-500/20 text-emerald-400",
          },
          {
            key: "products",
            label: "Catalog",
            icon: <Package />,
            to: "/admin/products",
            color: "border-orange-500/20 text-orange-400",
          },
          {
            key: "orders",
            label: "Bookings",
            icon: <ShoppingCart />,
            to: "/admin/orders",
            color: "border-rose-500/20 text-rose-400",
          },
        ].map((c) => (
          <Link
            key={c.key}
            to={c.to}
            className="group active:scale-95 transition-all"
          >
            <Card
              className={`bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-700 transition-colors backdrop-blur-sm`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className={`p-2 rounded-xl bg-zinc-950 shadow-inner ${c.color}`}
                >
                  {cloneElement(c.icon, { size: 18 })}
                </div>
                <div>
                  <div className="text-xl font-black text-white">
                    {counts[c.key] ?? 0}
                  </div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
                    {c.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* DATA VISUALIZATION */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* DONUT CHART PRODUCT */}
        <Card className="lg:col-span-8 bg-zinc-950 border-zinc-800/60 shadow-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-900 px-6 py-5">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">
                Inventory Performance
              </CardTitle>
              <CardDescription className="text-xs text-zinc-600">
                Distribution of top selling products
              </CardDescription>
            </div>
            <Link
              to="/admin/products"
              className="text-[10px] font-black uppercase text-[var(--accent)] hover:underline"
            >
              View Analytics
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center justify-around gap-10">
              <div className="relative h-[220px] w-[220px] flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[18px] border-zinc-900" />
                <div
                  className="h-full w-full rounded-full border-[18px] transition-all duration-700 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
                  style={{ background: pie.conic }}
                />
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black tracking-tighter">
                    {pie.total}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    Units Sold
                  </span>
                </div>
              </div>
              <div className="flex-1 max-w-sm space-y-3">
                {chartData.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-6 rounded-full"
                        style={{ background: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-[13px] font-bold text-zinc-300 group-hover:text-white transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-black text-zinc-500 tabular-nums">
                      {item.value}{" "}
                      <span className="text-[10px] opacity-40">QTY</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-900/20">
              <Table>
                <TableHeader className="bg-zinc-900/50">
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 h-10 px-6 text-left">
                      Product Asset
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 h-10 text-right">
                      Volume
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 h-10 px-6 text-right">
                      Net Revenue
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.slice(0, 4).map((p) => (
                    <TableRow
                      key={p.product_id}
                      className="border-zinc-900 hover:bg-zinc-900/40"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                            {p.product_image && (
                              <img
                                src={
                                  p.product_image.startsWith("uploads/")
                                    ? `${baseUrl}/${p.product_image}`
                                    : `${baseUrl}/storage/${p.product_image}`
                                }
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <span className="text-sm font-bold text-zinc-200">
                            {p.product_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold text-zinc-400 tabular-nums">
                        {p.qty_sold}
                      </TableCell>
                      <TableCell className="px-6 text-right text-sm font-black text-emerald-400 tabular-nums">
                        {money(p.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* LEADERBOARD TRAINER */}
        <Card className="lg:col-span-4 bg-zinc-950 border-zinc-800/60 shadow-xl">
          <CardHeader className="border-b border-zinc-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <Award size={16} className="text-blue-500" /> Top Trainers
              </CardTitle>
              <Badge className="bg-blue-500/10 text-blue-500 border-none text-[9px] font-black uppercase tracking-widest px-2">
                Elite Status
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-900">
              {topTrainers.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-5 hover:bg-zinc-900/20 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative">
                      <div className="h-11 w-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-black text-zinc-500 group-hover:border-blue-500/50 transition-colors">
                        {idx + 1}
                      </div>
                      {idx === 0 && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-zinc-950 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {t.full_name}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                        @{t.username} • {t.tier}
                      </p>
                    </div>
                  </div>
                  <div className="text-right pl-2">
                    <p className="text-sm font-black text-blue-400 tabular-nums">
                      {Number(t.total_points).toLocaleString()}{" "}
                      <span className="text-[9px] opacity-50 uppercase tracking-widest font-bold">
                        PTS
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {!topTrainers.length && (
              <div className="p-20 text-center text-[10px] font-bold text-zinc-700 uppercase tracking-[0.3em]">
                Standby for data...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {query.isLoading && (
        <div className="fixed bottom-10 right-10 flex items-center gap-3 bg-[var(--accent)] text-[var(--accent-foreground)] px-6 py-3 rounded-2xl shadow-2xl font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-right duration-300">
          <Loader2 className="animate-spin h-3.5 w-3.5" /> Synchronizing
          Intelligence...
        </div>
      )}
    </div>
  );
}

function ModernStatCard({ title, value, description, icon, accent }) {
  const accentMap = {
    emerald: "from-emerald-500/10 to-transparent text-emerald-400",
    blue: "from-blue-500/10 to-transparent text-blue-400",
    amber: "from-amber-500/10 to-transparent text-amber-400",
    rose: "from-rose-500/10 to-transparent text-rose-400",
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800/60 overflow-hidden group shadow-lg">
      <div className={`h-1 w-full bg-gradient-to-r ${accentMap[accent]}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {title}
        </CardTitle>
        <div
          className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:scale-110 transition-transform duration-300`}
        >
          {cloneElement(icon, { size: 16 })}
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="text-2xl font-black text-white tabular-nums tracking-tighter">
          {value}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">
            {description}
          </p>
          <div className="h-4 w-4 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <ChevronRight size={10} className="text-zinc-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
