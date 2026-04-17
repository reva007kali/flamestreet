import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useQueueStore } from "@/store/queueStore";
import { useState } from "react";
import {
  Flame,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  ReceiptText,
  X,
} from "lucide-react";

const NAV_GROUPS = [
  {
    title: "Kasir",
    items: [
      { to: "/cashier/dashboard", label: "Dashboard", Icon: LayoutDashboard },
      {
        to: "/cashier/queue",
        label: "Antrian Orderan",
        Icon: ListOrdered,
        badgeKey: "queue_unpaid",
      },
      { to: "/cashier/orders", label: "Orders", Icon: ReceiptText },
    ],
  },
];

export default function CashierLayout() {
  const logout = useAuthStore((s) => s.logout);
  const counts = useQueueStore((s) => s.counts);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 flex flex-col bg-zinc-900 border-r border-zinc-800/70",
          "transition-all duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:sticky md:top-0 md:h-screen md:translate-x-0",
          "md:w-[220px] w-[220px]",
        ].join(" ")}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/70 px-4">
          <Link
            to="/cashier"
            className="flex items-center gap-2.5"
            onClick={() => setMobileOpen(false)}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]">
              <Flame className="h-4 w-4 text-white" />
            </span>
            <span className="text-[13.5px] font-semibold tracking-tight text-zinc-100">
              Flamestreet
            </span>
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center rounded-md h-7 w-7 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="sidebar-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-2 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {group.title}
              </div>

              {group.items.map(({ to, label, Icon, badgeKey }) => {
                const isActive =
                  location.pathname === to ||
                  location.pathname.startsWith(to + "/");
                const badgeCount =
                  badgeKey && counts?.[badgeKey] != null
                    ? Number(counts[badgeKey])
                    : 0;

                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "group relative flex items-center gap-3 rounded-lg py-2 text-[13px] font-medium",
                      "transition-colors duration-150",
                      "px-3",
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

                    <span>{label}</span>

                    {badgeCount > 0 ? (
                      <span className="ml-auto rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] text-[var(--accent)]">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-zinc-800/70 p-2 pb-4 pt-3">
          <button
            onClick={() => logout()}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-red-950/50 hover:text-red-400"
            type="button"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800/70 bg-zinc-950/80 px-4 backdrop-blur-sm md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center rounded-md h-8 w-8 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Breadcrumb pathname={location.pathname} />
        </header>

        <main className="flex-1 p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Breadcrumb({ pathname }) {
  const segments = pathname.replace("/cashier", "").split("/").filter(Boolean);
  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-zinc-500">
      <Link to="/cashier" className="transition-colors hover:text-zinc-300">
        Cashier
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
