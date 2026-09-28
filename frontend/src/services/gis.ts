import axios from 'axios'

import type { Parcel, ParcelStatus } from '../types/gis'

export interface ParcelFeature {
  type: 'Feature'
  id: string
  properties: {
    survey_number: string
    owner_name: string
    village: string
    district: string
    state: string
    status: string
    area_hectares: number
    notification_id: string
    color: string
  }
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
}

export interface ParcelFeatureCollection {
  type: 'FeatureCollection'
  features: ParcelFeature[]
}

export async function fetchParcels(status?: string): Promise<ParcelFeatureCollection> {
  const { data } = await axios.get<ParcelFeatureCollection>('/api/gis/parcels', {
    params: status ? { status } : undefined,
  })
  return data
}

export async function fetchParcel(id: string): Promise<ParcelFeature> {
  const { data } = await axios.get<ParcelFeature>(`/api/gis/parcels/${id}`)
  return data
}
/* ========================================================================== */
/* LAND PARCEL SEARCH (PostGIS cadastral search)                               */
/*                                                                             */
/* Read-only client for the existing backend endpoint:                          */
/*   GET /api/gis/db/parcels/search                                             */
/* Defined in backend/app/api/api_v1/gis/routes.py.                             */
/*                                                                             */
/* This module does NOT change the backend contract — it only calls it.        */
/* Response shape mirrors the endpoint exactly:                                 */
/*   { status, count, data: SearchParcelRow[] }                                  */
/* ========================================================================== */

/** One row of `public.land_parcels` as returned by /gis/db/parcels/search. */
export interface SearchParcelRow {
  id: number | string
  parcel_code: string | null
  khasra_no: string | null
  khata_no: string | null
  owner_name: string | null
  area: number | string | null
  village: string | null
  tehsil: string | null
  district: string | null
  project_id: number | string | null
  land_classification: string | null
  acquisition_status: string | null
  verification_status: string | null
  /** GeoJSON Polygon from ST_AsGeoJSON(geometry). Nullable in the schema. */
  geometry: { type: string; coordinates: number[][][] } | null
}

export interface SearchParcelResponse {
  status: string
  count: number
  data: SearchParcelRow[]
}

/** Query parameters accepted by the endpoint (all optional). */
export interface SearchParcelParams {
  parcel_code?: string
  khasra_no?: string
  district?: string
  acquisition_status?: string
  verification_status?: string
  land_classification?: string
}

const SEARCH_ENDPOINT = '/api/gis/db/parcels/search'

/**
 * Searches registered land parcels.
 *
 * Throws only when the endpoint itself reports a failure. Callers are expected
 * to handle a missing/unavailable GIS module separately from a real API error.
 */
export async function searchLandParcels(
  params: SearchParcelParams = {},
): Promise<SearchParcelResponse> {
  const clean: Record<string, string> = {}

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.trim() !== '') {
      clean[key] = value.trim()
    }
  }

  const { data } = await axios.get<SearchParcelResponse>(SEARCH_ENDPOINT, {
    params: clean,
  })

  return data
}

/* ========================================================================== */
/* ROW -> CANONICAL PARCEL                                                     */
/* ========================================================================== */

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** Derives the canonical ParcelStatus from the two backend status columns. */
function deriveStatus(acquisitionStatus: string, verificationStatus: string): ParcelStatus {
  const acq = acquisitionStatus.toLowerCase()
  const ver = verificationStatus.toLowerCase()

  if (/(dispute|reject|contest|litigation)/.test(ver) || /(dispute|contest)/.test(acq)) {
    return 'disputed'
  }
  if (/(pending|review|progress|processing|hold)/.test(ver)) {
    return 'review'
  }
  if (acq !== '' && !/^(none|no|nil|null|not[_ ]?acquired|clear|safe|0|false)$/.test(acq)) {
    return 'acquisition'
  }

  return 'safe'
}

function deriveStatusLabel(status: ParcelStatus, acquisitionStatus: string, verificationStatus: string): string {
  if (status === 'acquisition') {
    return acquisitionStatus ? text(acquisitionStatus) : 'Under Acquisition'
  }
  if (status === 'disputed') return 'Disputed / Under Contest'
  if (status === 'review') {
    return verificationStatus ? text(verificationStatus) : 'Under Review'
  }

  return verificationStatus ? text(verificationStatus) : 'Safe / Clear Title'
}

/** Bounding-box centre of a GeoJSON polygon, as [lat, lng]. */
function polygonCenter(geometry: SearchParcelRow['geometry']): [number, number] | null {
  const ring = geometry?.coordinates?.[0]
  if (!Array.isArray(ring) || ring.length === 0) return null

  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  for (const point of ring) {
    if (!Array.isArray(point) || point.length < 2) continue
    const [lng, lat] = point
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return null

  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
}

/**
 * Maps one backend row to the canonical `Parcel` shape consumed by
 * `CitizenGISMap` / `ParcelPolygon` / `gis/ParcelCard`.
 *
 * Returns `null` when the row carries no usable polygon, because the map
 * components dereference `geometry.coordinates[0]` directly. Callers keep such
 * rows in the result list (they are still real records) but must exclude them
 * from the parcels passed to the map.
 */
export function searchRowToParcel(row: SearchParcelRow): Parcel | null {
  const geometry = row.geometry
  const center = polygonCenter(geometry)
  if (!geometry || !center) return null

  const ring = geometry.coordinates[0] ?? []
  const hasRing = ring.some(
    (point) => Array.isArray(point) && point.length >= 2 &&
      Number.isFinite(point[0]) && Number.isFinite(point[1]),
  )
  if (!hasRing) return null

  const acquisitionStatus = text(row.acquisition_status)
  const verificationStatus = text(row.verification_status)
  const status = deriveStatus(acquisitionStatus, verificationStatus)

  const khasra = text(row.khasra_no)
  const parcelCode = text(row.parcel_code)
  const numericArea = Number(row.area)
  const area = Number.isFinite(numericArea) ? numericArea : 0

  return {
    id: String(row.id),
    cadastralId: parcelCode || `KH-${row.id}`,

    surveyNumber: parcelCode || (khasra ? `Khasra No. ${khasra}` : `Parcel ${row.id}`),
    khasraNumber: khasra || parcelCode || String(row.id),

    area,
    areaUnit: 'Acres',

    village: text(row.village),
    tehsil: text(row.tehsil),
    district: text(row.district),
    state: '',

    landType: text(row.land_classification) || 'Unclassified',

    status,
    statusLabel: deriveStatusLabel(status, acquisitionStatus, verificationStatus),

    geometry: {
      type: 'Polygon',
      coordinates: [
        ring
          .filter((point) => Array.isArray(point) && point.length >= 2)
          .map((point) => [Number(point[0]), Number(point[1])] as [number, number]),
      ],
    },
    center,

    khatauni: text(row.khata_no) || undefined,
  }
}
