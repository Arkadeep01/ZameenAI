import { useState } from 'react'
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

import { fetchParcels, ParcelFeature } from '../../services/gis'

type LatLng = [number, number]

// GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]
function toLeafletPositions(geometry: ParcelFeature['geometry']): LatLng[] {
  return geometry.coordinates[0].map(([lng, lat]) => [lat, lng])
}

const STATUS_LABELS: Record<string, string> = {
  NOTIFIED: 'Notified (Pending)',
  UNDER_VERIFICATION: 'Under Verification',
  ACQUIRED: 'Acquired',
  COMPENSATION_PENDING: 'Compensation Pending',
  COMPENSATION_PAID: 'Compensation Paid',
  R_AND_R_PENDING: 'R&R Pending',
  R_AND_R_COMPLETED: 'R&R Completed',
  POSSESSION_PENDING: 'Possession Pending',
  POSSESSION_COMPLETED: 'Possession Completed',
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

async function geocodeAddress(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Geocoding request failed')
  return res.json()
}

/** Child of MapContainer — needed because useMap() only works inside it */
function FlyToLocation({ position, zoom }: { position: LatLng | null; zoom: number }) {
  const map = useMap()
  if (position) {
    map.flyTo(position, zoom, { duration: 1.2 })
  }
  return null
}

function LocationSearchBox({ onLocate }: { onLocate: (pos: LatLng, label: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setIsSearching(true)
    setError(null)
    try {
      const data = await geocodeAddress(query)
      setResults(data)
      setShowResults(true)
      if (data.length === 0) setError('No matching location found.')
    } catch {
      setError('Search failed. Try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelect = (result: NominatimResult) => {
    onLocate([parseFloat(result.lat), parseFloat(result.lon)], result.display_name)
    setShowResults(false)
    setQuery(result.display_name)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    setError(null)
  }

  return (
    <div className="absolute top-4 right-4 z-[1000] w-[85%] max-w-xs sm:max-w-sm">
      <form onSubmit={handleSearch} className="relative">
        <div className="flex items-center bg-white rounded-full shadow-lg border border-slate-200 overflow-hidden pl-1">
          <Search className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search location…"
            className="flex-1 min-w-0 px-2.5 py-2 text-sm outline-none bg-transparent"
          />
          {query && (
            <button type="button" onClick={handleClear} className="p-1 mr-0.5 text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSearching}
            className="m-1 px-3 py-1.5 rounded-full bg-[#003366] text-white text-xs font-semibold hover:bg-[#00284d] disabled:opacity-60 shrink-0"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Go'}
          </button>
        </div>

        {showResults && results.length > 0 && (
          <ul className="mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-h-56 overflow-y-auto">
            {results.map((r) => (
              <li
                key={r.place_id}
                onClick={() => handleSelect(r)}
                className="px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
              >
                {r.display_name}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="mt-1.5 px-3.5 py-2.5 bg-white rounded-xl shadow-lg border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}
      </form>
    </div>
  )
}

interface GisMapProps {
  /** Compact mode for embedding inside the module-detail modal's demo tab */
  compact?: boolean
}

export default function GisMap({ compact = false }: GisMapProps) {
  const [selected, setSelected] = useState<ParcelFeature | null>(null)
  const [flyTarget, setFlyTarget] = useState<LatLng | null>(null)
  const [searchedLabel, setSearchedLabel] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gis-parcels'],
    queryFn: () => fetchParcels(),
  })

  if (isLoading) return <p className="p-4 text-sm text-slate-500">Loading parcels…</p>
  if (isError) return <p className="p-4 text-sm text-red-600">Failed to load parcel data.</p>

  const features = data?.features ?? []
  const center: LatLng =
    features.length > 0 ? toLeafletPositions(features[0].geometry)[0] : [28.6139, 77.209] // fallback: Delhi

  const handleLocate = (pos: LatLng, label: string) => {
    setFlyTarget(pos)
    setSearchedLabel(label)
    setSelected(null)
  }

  return (
    <div className={compact ? 'flex flex-col gap-3' : 'flex h-[calc(100vh-8rem)]'}>
      <div className={compact ? 'relative h-64 w-full rounded-lg overflow-hidden border border-slate-200' : 'relative flex-1'}>
        {!compact && <LocationSearchBox onLocate={handleLocate} />}

        <MapContainer center={center} zoom={compact ? 15 : 16} className="h-full w-full" scrollWheelZoom={!compact}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {flyTarget && <FlyToLocation position={flyTarget} zoom={15} />}

          {features.map((feature) => (
            <Polygon
              key={feature.id}
              positions={toLeafletPositions(feature.geometry)}
              pathOptions={{
                color: feature.properties.color,
                fillColor: feature.properties.color,
                fillOpacity: feature.id === selected?.id ? 0.55 : 0.3,
                weight: feature.id === selected?.id ? 3 : 2,
              }}
              eventHandlers={{ click: () => setSelected(feature) }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold">{feature.properties.notification_id}</div>
                  <div>Khasra/Survey: {feature.properties.survey_number}</div>
                  <div>Owner: {feature.properties.owner_name}</div>
                  <div>{feature.properties.village}, {feature.properties.district}</div>
                  <div className="mt-1 font-semibold" style={{ color: feature.properties.color }}>
                    {STATUS_LABELS[feature.properties.status] ?? feature.properties.status}
                  </div>
                </div>
              </Popup>
            </Polygon>
          ))}
        </MapContainer>
      </div>

      {!compact && (
        <aside className="w-80 shrink-0 border-l p-4 overflow-y-auto">
          {searchedLabel && !selected && (
            <div className="mb-4 p-2.5 rounded bg-blue-50 border border-blue-200 text-xs text-blue-800">
              Jumped to: <span className="font-semibold">{searchedLabel}</span>
              <p className="mt-1 text-[10px] text-blue-600">
                No parcel data at this location yet — only the 4 dummy parcels (Jewar, Pune) have data.
              </p>
            </div>
          )}

          <h2 className="mb-2 font-semibold">Parcel Details</h2>
          {selected ? (
            <ul className="space-y-1 text-sm">
              <li><b>Notification ID:</b> {selected.properties.notification_id}</li>
              <li><b>Survey No.:</b> {selected.properties.survey_number}</li>
              <li><b>Owner:</b> {selected.properties.owner_name}</li>
              <li><b>Location:</b> {selected.properties.village}, {selected.properties.district}, {selected.properties.state}</li>
              <li><b>Area:</b> {selected.properties.area_hectares} ha</li>
              <li>
                <b>Status:</b>{' '}
                <span style={{ color: selected.properties.color }} className="font-semibold">
                  {STATUS_LABELS[selected.properties.status] ?? selected.properties.status}
                </span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Search a location above, or click a parcel on the map.</p>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Legend</h3>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#dc2626' }} /> Notified (Pending)</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#f59e0b' }} /> In Progress</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#16a34a' }} /> Acquired</li>
            </ul>
          </div>
        </aside>
      )}
    </div>
  )
}