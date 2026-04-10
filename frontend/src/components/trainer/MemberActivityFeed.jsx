import { useNotifStore } from '@/store/notifStore'

export default function MemberActivityFeed() {
  const notifications = useNotifStore((s) => s.notifications)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="font-medium">Activity Feed</div>
      <div className="mt-3 space-y-2">
        {notifications.length ? (
          notifications.slice(0, 10).map((n) => (
            <div key={n.id} className="rounded border border-zinc-800 bg-zinc-950 p-3 text-sm">
              <div className="text-zinc-200">{n.title}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {new Date(n.createdAt).toLocaleString('id-ID')}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-zinc-400">No activity yet.</div>
        )}
      </div>
    </div>
  )
}

