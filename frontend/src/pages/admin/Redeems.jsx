import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export default function Redeems() {
  const query = useQuery({
    queryKey: ['admin', 'redeems', { status: 'pending' }],
    queryFn: async () => (await api.get('/admin/redeems', { params: { status: 'pending' } })).data,
  })

  const act = useMutation({
    mutationFn: async ({ id, action, rejected_reason }) =>
      (await api.put(`/admin/redeems/${id}`, { action, rejected_reason })).data.redeem,
    onSuccess: () => query.refetch(),
  })

  const rows = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Redeem Approvals</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trainer</TableHead>
                <TableHead>Rekening</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.trainer_profile?.user?.full_name ?? '-'}</div>
                    <div className="text-xs text-zinc-500">{r.trainer_profile?.user?.email ?? '-'}</div>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    <div className="text-xs text-zinc-500">{r.payout_bank ?? '-'}</div>
                    <div className="font-medium">{r.payout_account_number ?? '-'}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-indigo-400">
                    {Number(r.amount ?? 0).toLocaleString('id-ID')} pts
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ id: r.id, action: 'approve' })}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={act.isPending}
                        onClick={() => {
                          const reason = window.prompt('Alasan reject (optional):') || null
                          act.mutate({ id: r.id, action: 'reject', rejected_reason: reason })
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && !query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-zinc-500 text-sm italic">
                    Tidak ada redeem pending.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {query.isLoading ? <div className="mt-3 text-sm text-zinc-400">Loading...</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}

