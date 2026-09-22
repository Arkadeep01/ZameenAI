import { createFileRoute } from '@tanstack/react-router'
import GisMap from '../features/gis/GisMap'

export const Route = createFileRoute('/gis')({
  component: GisPage,
})

function GisPage() {
  return (
    <div>
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800">National Land Parcel Map (GIS)</h1>
        <p className="text-sm text-slate-500">
          Color-coded by acquisition status — click a parcel for details.
        </p>
      </div>
      <GisMap />
    </div>
  )
}