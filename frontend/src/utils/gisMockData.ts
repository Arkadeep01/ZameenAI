import type { Parcel } from "../types/gis";

/* ========================================================================== */
/* CITIZEN                                                                    */
/* ========================================================================== */

export const citizenInfo = {
  name: "Ramesh Kumar Sharma",
  village: "Haripur",
  tehsil: "Sadar",
  district: "Varanasi",
  state: "Uttar Pradesh",
};

/* ========================================================================== */
/* PARCELS                                                                    */
/* ========================================================================== */

export const gisParcels: Parcel[] = [
  {
    id: "1024",
    cadastralId: "CAD-IND-3421",

    surveyNumber: "Khasra No. 342/1",
    khasraNumber: "342/1",

    area: 1.5,
    areaUnit: "Acres",

    village: "Haripur",
    tehsil: "Sadar",
    district: "Varanasi",
    state: "Uttar Pradesh",

    landType: "Agricultural (Fasli)",

    status: "safe",
    statusLabel: "Safe / No Action Required",

    center: [25.3339, 82.9814],

    khatauni: "KH-9911",

    lagaan: "₹105 / year",

    description:
      "Digitally verified cadastral parcel. No disputes or acquisition notices recorded.",

    verification: {
      verified: true,
      authority: "Varanasi District Revenue Office",
      message: "Digitally Verified by Varanasi District Revenue Office",
    },

    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [82.9799, 25.3345],
          [82.9821, 25.3348],
          [82.9822, 25.3328],
          [82.98, 25.3325],
          [82.9799, 25.3345],
        ],
      ],
    },
  },

  {
    id: "1025",
    cadastralId: "CAD-IND-3422",

    surveyNumber: "Khasra No. 342/2",
    khasraNumber: "342/2",

    area: 2.0,
    areaUnit: "Acres",

    village: "Haripur",
    tehsil: "Sadar",
    district: "Varanasi",
    state: "Uttar Pradesh",

    landType: "Agricultural (Fasli)",

    status: "acquisition",
    statusLabel: "Under Acquisition",

    center: [25.3353, 82.984],

    khatauni: "KH-9912",

    lagaan: "₹140 / year",

    description:
      "Government acquisition notice issued for National Highway NH-31 widening and expressway link project.",

    acquisition: {
      active: true,
      reason: "National Highway NH-31 Widening & Expressway Link Project.",
      gazetteDate: "10 September",
      notificationYear: "2026",
      nextStep: "Valuation & Compensation in progress",
      law: "Right to Fair Compensation & Transparency Act (RFCTLARR) applicable",
    },

    verification: {
      verified: true,
      authority: "Varanasi District Revenue Office",
      message: "Cadastral boundary digitally verified.",
    },

    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [82.9826, 25.336],
          [82.9856, 25.3362],
          [82.9855, 25.3335],
          [82.9828, 25.3332],
          [82.9826, 25.336],
        ],
      ],
    },
  },

  {
    id: "1089",
    cadastralId: "CAD-IND-9312",

    surveyNumber: "Khasra No. 118",
    khasraNumber: "118",

    area: 0.75,
    areaUnit: "Acres",

    village: "Kalyanpur",
    tehsil: "Sadar",
    district: "Varanasi",
    state: "Uttar Pradesh",

    landType: "Residential / Homestead",

    status: "safe",
    statusLabel: "Safe / Under Routine Verification",

    center: [25.3374, 82.987],

    khatauni: "KH-9913",

    lagaan: "₹95 / year",

    description:
      "Annual cadastral mapping is underway. Official stamp mutation logged and verified without disputes.",

    verification: {
      verified: true,
      authority: "Varanasi District Revenue Office",
      message: "Official stamp mutation logged and verified without disputes.",
    },

    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [82.9858, 25.3384],
          [82.9882, 25.3382],
          [82.9881, 25.3365],
          [82.9857, 25.3367],
          [82.9858, 25.3384],
        ],
      ],
    },
  },
];

/* ========================================================================== */
/* DEFAULT SELECTED PARCEL                                                   */
/* ========================================================================== */

export const selectedGISParcel =
  gisParcels.find((parcel) => parcel.id === "1025") ?? gisParcels[0];

/* ========================================================================== */
/* TOTAL AREA                                                                 */
/* ========================================================================== */

export const totalArea = gisParcels.reduce(
  (total, parcel) => total + parcel.area,
  0,
);

/* ========================================================================== */
/* ACQUISITION PARCELS                                                        */
/* ========================================================================== */

export const acquisitionParcels = gisParcels.filter(
  (parcel) => parcel.status === "acquisition",
);
