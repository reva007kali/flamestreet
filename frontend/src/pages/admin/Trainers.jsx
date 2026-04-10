import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function Trainers() {
  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
  }, [])

  function imageUrl(path) {
    if (!path) return null
    if (/^https?:\/\//i.test(path)) return path
    if (path.startsWith('uploads/')) return `${baseUrl}/${path}`
    return `${baseUrl}/storage/${path}`
  }

  const query = useQuery({
    queryKey: ['admin', 'trainers'],
    queryFn: async () => (await api.get('/admin/trainers')).data,
  })

  const verify = useMutation({
    mutationFn: async ({ profileId, is_verified }) =>
      (await api.put(`/admin/trainers/${profileId}/verify`, { is_verified })).data.trainer_profile,
    onSuccess: () => query.refetch(),
  })

  const trainers = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Trainers</h1>

      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trainer</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                        {t.avatar ? (
                          <img src={imageUrl(t.avatar)} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{t.full_name}</div>
                        <div className="text-xs text-zinc-500">{t.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400">{t.trainer_profile?.referral_code ?? '-'}</TableCell>
                  <TableCell className="text-zinc-400">{t.trainer_profile?.tier ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={t.trainer_profile?.is_verified ? 'success' : 'default'}>
                      {t.trainer_profile?.is_verified ? 'verified' : 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant={t.trainer_profile?.is_verified ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() =>
                        verify.mutate({
                          profileId: t.trainer_profile.id,
                          is_verified: !t.trainer_profile.is_verified,
                        })
                      }
                    >
                      {t.trainer_profile?.is_verified ? 'Unverify' : 'Verify'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {query.isLoading ? <div className="mt-3 text-sm text-zinc-400">Loading...</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}
