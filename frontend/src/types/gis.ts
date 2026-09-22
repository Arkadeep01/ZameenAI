export type ParcelStatus = "safe" | "review" | "acquisition" | "disputed";

export interface ParcelGeometry {
  type: "Polygon";
  coordinates: [number, number][][];
}

export interface Parcel {
  id: string;
  cadastralId: string;

  surveyNumber: string;
  khasraNumber: string;
  plotNumber?: string;
  dagNumber?: string;

  area: number;
  areaUnit: "Acres" | "Hectares";

  village: string;
  tehsil: string;
  district: string;
  state: string;

  landType: string;

  status: ParcelStatus;
  statusLabel: string;

  geometry: ParcelGeometry;

  center: [number, number];

  khatauni?: string;

  lagaan?: string;

  description?: string;

  acquisition?: {
    active: boolean;
    reason?: string;
    gazetteDate?: string;
    notificationYear?: string;
    nextStep?: string;
    law?: string;
  };

  verification?: {
    verified: boolean;
    authority?: string;
    message?: string;
  };
}
