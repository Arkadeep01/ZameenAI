export interface PortalLink {
  name: string;
  short: string;
  route: string;
  badge: string;
  desc: string;
}

export const PORTAL_LINKS: PortalLink[] = [
  {
    name: "Approver Portal",
    short: "Approver",
    route: "/approver",
    badge: "CALA / DM",
    desc: "Statutory sanction & award clearance",
  },
  {
    name: "Field Officer Portal",
    short: "Field Officer",
    route: "/field-officer",
    badge: "FIELD",
    desc: "JMS surveys & geo-tagged evidence",
  },
  {
    name: "Executive DSS",
    short: "Executive DSS",
    route: "/executive",
    badge: "EXEC",
    desc: "National KPIs & bottleneck forecast",
  },
  {
    name: "Citizen Portal",
    short: "Citizen",
    route: "/citizen/dashboard",
    badge: "CITIZEN",
    desc: "Land, compensation & grievance tracking",
  },
  {
    name: "System Admin",
    short: "System Admin",
    route: "/admin",
    badge: "ADMIN",
    desc: "SSO, audit logs & registry sync",
  },
  {
    name: "Desk Validator Portal",
    short: "Desk Validator",
    route: "/desk-validator",
    badge: "LAO",
    desc: "AI record scrutiny & validation queue",
  },
  {
    name: "PIA Portal",
    short: "PIA",
    route: "/pia",
    badge: "PIA",
    desc: "Requisition proposals & dossiers",
  },
];

/** Map stakeholder persona ids (landing cards) to portal routes. */
export const PERSONA_TO_PORTAL: Record<string, string> = {
  pia: "/pia",
  "field-officer": "/field-officer",
  lao: "/desk-validator",
  approver: "/approver",
  executive: "/executive",
  citizen: "/citizen/dashboard",
  admin: "/admin",
};
