import { TableSkeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div className="skeleton" style={{ height: 24, width: 220, borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: 140, borderRadius: 6 }} />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
