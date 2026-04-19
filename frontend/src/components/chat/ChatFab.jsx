import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";
import { MessageCircle } from "lucide-react";

export default function ChatFab({ to }) {
  const q = useQuery({
    queryKey: ["chatThreads"],
    queryFn: async () => (await api.get("/chats/threads")).data.threads ?? [],
    refetchInterval: 8000,
  });

  const unread = useMemo(() => {
    const list = q.data ?? [];
    return list.reduce(
      (sum, t) => sum + (Number(t?.unread_count ?? 0) || 0),
      0,
    );
  }, [q.data]);

  return (
    <Link
      to={to}
      className="fixed bottom-20 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-black shadow-[0_12px_30px_rgba(16,185,129,0.22)]"
    >
      <MessageCircle size={18} />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-black px-2 py-0.5 text-[10px] font-black text-emerald-400">
          {unread}
        </span>
      )}
    </Link>
  );
}
