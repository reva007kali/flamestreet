import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";
import { Flame, LogOut, Menu, Truck, X, MessageCircle } from "lucide-react";
import { api } from "@/lib/axios";
import { getOrCreateDeviceId } from "@/lib/deviceId";

const NAV_GROUPS = [
  {
    title: "Kurir",
    items: [
      { to: "/courier/dashboard", label: "Deliveries", Icon: Truck },
      { to: "/courier/chats", label: "Chats", Icon: MessageCircle },
    ],
  },
];

export default function CourierLayout() {
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleLogout = async () => {
    try {
      await api.delete("/device-tokens", {
        data: { platform: "web", device_id: getOrCreateDeviceId() },
      });
    } catch {}
    logout();
  };

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
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/70">
          <Link
            to="/courier"
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
            type="button"
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

              {group.items.map(({ to, label, Icon }) => {
                const isActive =
                  location.pathname === to ||
                  location.pathname.startsWith(to + "/");
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
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-zinc-800/70 p-2 pb-4 pt-3">
          <button
            onClick={() => handleLogout()}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-red-950/50 hover:text-red-400"
            type="button"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800/70 bg-zinc-950/80  backdrop-blur-sm md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center rounded-md h-8 w-8 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Breadcrumb pathname={location.pathname} />
        </header>

        <main className="flex-1 p-4 pb-24 md:p-7 md:pb-7">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800/70 bg-zinc-950/90 backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-2 px-4 py-2">
            <Link
              to="/courier/dashboard"
              className={[
                "flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-black uppercase tracking-widest",
                location.pathname.startsWith("/courier/dashboard")
                  ? "text-emerald-400"
                  : "text-zinc-500",
              ].join(" ")}
            >
              <Truck size={18} />
              Home
            </Link>
            <Link
              to="/courier/chats"
              className={[
                "flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-black uppercase tracking-widest",
                location.pathname.startsWith("/courier/chats")
                  ? "text-emerald-400"
                  : "text-zinc-500",
              ].join(" ")}
            >
              <MessageCircle size={18} />
              Chats
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

function Breadcrumb({ pathname }) {
  const segments = pathname.replace("/courier", "").split("/").filter(Boolean);
  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-zinc-500">
      <Link to="/courier" className="transition-colors hover:text-zinc-300">
        Courier
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
