import axios from 'axios'

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