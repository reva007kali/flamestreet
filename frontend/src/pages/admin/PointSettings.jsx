import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PointSettings() {
  const query = useQuery({
    queryKey: ['admin', 'point-settings'],
    queryFn: async () => (await api.get('/admin/point-settings')).data.settings,
  })

  const [rows, setRows] = useState([])

  useEffect(() => {
    if (query.data) setRows(query.data)
  }, [query.data])

  const save = useMutation({
    mutationFn: async () => (await api.put('/admin/point-settings', { settings: rows })).data.settings,
    onSuccess: (data) => setRows(data),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Point Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {rows.map((s, idx) => (
              <div key={s.key} className="grid gap-2 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-zinc-400">Key</Label>
                  <div className="text-sm text-zinc-200">{s.key}</div>
                </div>
                <div className="space-y-1">
                  <Label>Value</Label>
                  <Input
                    value={s.value}
                    onChange={(e) =>
                      setRows((r) =>
                        r.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input
                    value={s.description ?? ''}
                    onChange={(e) =>
                      setRows((r) =>
                        r.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
