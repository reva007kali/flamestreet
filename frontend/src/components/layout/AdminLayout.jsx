import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useQueueStore } from "@/store/queueStore";
import { useState } from "react";
import { api } from "@/lib/axios";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import {
  LayoutDashboard,
  ShoppingCart,
  Tag,
  Package,
  Users,
  Dumbbell,
  Building2,
  Settings2,
  Truck,
  BadgeDollarSign,
  CreditCard,
  ListOrdered,
  Image,
  Newspaper,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Flame,
  Menu,
  X,
} from "lucide-react";

const NAV_GROUPS = [
  {
    title: "Ringkasan",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    ],
  },
  {
    title: "Order",
    items: [
      { to: "/admin/orders", label: "Orderan", Icon: ShoppingCart },
      { to: "/cashier/queue", label: "Antrian Orderan", Icon: ListOrdered },
    ],
  },
  {
    title: "Konten",
    items: [
      { to: "/admin/articles", label: "Articles", Icon: Newspaper },
      { to: "/admin/promo-banners", label: "Promo Banner", Icon: Image },
    ],
  },
  {
    title: "Katalog",
    items: [
      { to: "/admin/categories", label: "Categories", Icon: Tag },
      { to: "/admin/products", label: "Products", Icon: Package },
    ],
  },
  {
    title: "Orang",
    items: [
      { to: "/admin/users", label: "Users", Icon: Users },
      { to: "/admin/members", label: "Members", Icon: Users },
      { to: "/admin/trainers", label: "Trainers", Icon: Dumbbell },
    ],
  },
  {
    title: "Lokasi",
    items: [
      { to: "/admin/gyms", label: "Gyms", Icon: Building2 },
      { to: "/admin/delivery-branches", label: "Cabang Delivery", Icon: Truck },
    ],
  },
  {
    title: "Konfigurasi",
    items: [
      {
        to: "/admin/payment-methods",
        label: "Metode Pembayaran",
        Icon: CreditCard,
      },
      { to: "/admin/redeems", label: "Redeem Approval", Icon: Wallet },
      { to: "/admin/delivery-pricing", label: "Ongkir Delivery", Icon: BadgeDollarSign },
      { to: "/admin/point-settings", label: "Point Settings", Icon: Settings2 },
    ],
  },
];

export default function AdminLayout() {
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const counts = useQueueStore((s) => s.counts);
  const handleLogout = async () => {
    try {
      await api.delete("/device-tokens", {
        data: { platform: "web", device_id: getOrCreateDeviceId() },
      });
    } catch {}
    logout();
  };

  // Desktop: collapsed state
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* ─── Mobile overlay ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={[
          // base
          "fixed inset-y-0 left-0 z-30 flex flex-col bg-zinc-900 border-r border-zinc-800/70",
          "transition-all duration-200 ease-in-out",
          // mobile: slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // desktop: sticky full height, width toggles
          "md:sticky md:top-0 md:h-screen md:translate-x-0",
          collapsed ? "md:w-[60px]" : "md:w-[220px]",
          // mobile always full width sidebar
          "w-[220px]",
        ].join(" ")}
      >
        {/* Logo row */}
        <div
          className={[
            "flex h-14 shrink-0 items-center border-b border-zinc-800/70",
            collapsed ? "md:justify-center px-3" : "justify-between px-4",
          ].join(" ")}
        >
          {/* Logo — hidden when collapsed on desktop */}
          <Link
            to="/admin"
            className={[
              "flex items-center gap-2.5",
              collapsed ? "md:hidden" : "",
            ].join(" ")}
            onClick={() => setMobileOpen(false)}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]">
              <Flame className="h-4 w-4 text-white" />
            </span>
            <span className="text-[13.5px] font-semibold tracking-tight text-zinc-100">
              Flamestreet
            </span>
          </Link>

          {/* Collapsed: just icon */}
          {collapsed && (
            <Link
              to="/admin"
              className="hidden md:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]"
            >
              <Flame className="h-4 w-4 text-white" />
            </Link>
          )}

          {/* Collapse toggle — desktop */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={[
              "hidden md:flex items-center justify-center rounded-md",
              "h-7 w-7 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300",
              collapsed ? "mx-auto" : "",
            ].join(" ")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Close button — mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center rounded-md h-7 w-7 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="sidebar-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-2 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div
                className={[
                  "px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600",
                  collapsed ? "md:hidden" : "",
                ].join(" ")}
              >
                {group.title}
              </div>

              {group.items.map(({ to, label, Icon }) => {
                const isActive =
                  location.pathname === to ||
                  location.pathname.startsWith(to + "/");
                const badgeCount =
                  to === "/cashier/queue" ? (counts?.queue_unpaid ?? 0) : 0;

                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? label : undefined}
                    className={[
                      "group relative flex items-center gap-3 rounded-lg py-2 text-[13px] font-medium",
                      "transition-colors duration-150",
                      collapsed ? "md:justify-center md:px-0 px-3" : "px-3",
                      isActive
                        ? "bg-zinc-800 text-zinc-50"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200",
                    ].join(" ")}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
                    )}

                    <Icon
                      className={[
                        "h-[15px] w-[15px] shrink-0 transition-colors",
                        isActive
                          ? "text-[var(--accent)]"
                          : "text-zinc-500 group-hover:text-zinc-300",
                      ].join(" ")}
                    />

                    <span className={collapsed ? "md:hidden" : ""}>
                      {label}
                    </span>

                    {badgeCount > 0 ? (
                      collapsed ? (
                        <span className="absolute right-2 top-2 hidden h-2 w-2 rounded-full bg-[var(--accent)] md:block" />
                      ) : (
                        <span className="ml-auto rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] text-[var(--accent)]">
                          {badgeCount}
                        </span>
                      )
                    ) : null}

                    {isActive && !collapsed && badgeCount === 0 && (
                      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] md:block" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-zinc-800/70 p-2 pb-4 pt-3">
          <button
            onClick={() => handleLogout()}
            title={collapsed ? "Logout" : undefined}
            className={[
              "group flex w-full items-center gap-3 rounded-lg py-2 text-[13px] font-medium",
              "text-zinc-500 transition-colors hover:bg-red-950/50 hover:text-red-400",
              collapsed ? "md:justify-center md:px-0 px-3" : "px-3",
            ].join(" ")}
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>Logout</span>
          </button>
        </div>
      </aside>

      {/* ─── Main area ─── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800/70 bg-zinc-950/80 px-4 backdrop-blur-sm md:px-6">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center rounded-md h-8 w-8 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <Breadcrumb pathname={location.pathname} />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Breadcrumb({ pathname }) {
  const segments = pathname.replace("/admin", "").split("/").filter(Boolean);
  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-zinc-500">
      <Link to="/admin" className="transition-colors hover:text-zinc-300">
        Admin
      </Link>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-zinc-700">/</span>
          <span
            className={
              i === segments.length - 1
                ? "text-zinc-300 capitalize"
                : "capitalize"
            }
          >
            {seg.replace(/-/g, " ")}
          </span>
        </span>
      ))}
    </nav>
  );
}
