# ZameenAI — Technical Specification

**Project:** ZameenAI  
**Document:** Technical Specification  
**Version:** 1.0  
**Status:** Development Baseline  
**Primary Architecture:** React + TypeScript + Vite + FastAPI + PostgreSQL/PostGIS  
**Backend Language:** Python  
**Database:** PostgreSQL + PostGIS  

---

# 1. Document Purpose

This document defines the technical architecture, technology stack, application structure, data architecture, API architecture, AI/ML pipeline, GIS architecture, security model, processing workflow, development standards, testing strategy, and deployment structure for the ZameenAI platform.

ZameenAI is an AI-powered land-record digitization and land-acquisition management platform designed to digitize land documents, extract structured information, validate records, connect land records with GIS parcels, manage land-acquisition workflows, monitor project progress, and provide analytics and AI-assisted decision support.

This document is intended to serve as the primary technical reference for implementation.

---

# 2. System Overview

ZameenAI follows a modular full-stack architecture.

```text
┌───────────────────────────────────────────────────────────────┐
│                         ZameenAI                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  React + TypeScript Frontend                                  │
│                                                               │
│  ├── Authentication / RBAC                                    │
│  ├── Dashboards                                                │
│  ├── Document Upload                                           │
│  ├── AI Extraction Review                                     │
│  ├── Verification                                              │
│  ├── Land Acquisition Workflow                                │
│  ├── GIS Map                                                   │
│  ├── Timeline / Milestones                                     │
│  ├── Reports                                                   │
│  └── Notifications                                             │
│                                                               │
├───────────────────────────────┬───────────────────────────────┤
│                               │                               │
│         REST API              │        Background Jobs        │
│                               │                               │
│       FastAPI                 │       Celery + Redis          │
│                               │                               │
├───────────────────────────────┴───────────────────────────────┤
│                     Application Services                       │
│                                                               │
│  Auth │ Documents │ OCR │ AI │ Validation │ GIS │ Workflow    │
│  Dashboard │ Timeline │ Notifications │ Reports │ Analytics   │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                     Data / AI Layer                            │
│                                                               │
│ PostgreSQL + PostGIS │ File Storage │ AI/ML Models            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

# 3. Architectural Principles

The system shall follow the following principles:

1. **Modular architecture**
2. **API-first backend**
3. **Separation of frontend and backend**
4. **Service-oriented internal application structure**
5. **Human-in-the-loop AI**
6. **AI output shall not automatically become an official verified record**
7. **Role-based access control**
8. **Auditability**
9. **Data integrity**
10. **Replaceable AI/OCR providers**
11. **Replaceable external government integrations**
12. **GIS-native data handling**
13. **Asynchronous processing for expensive operations**
14. **Secure document handling**
15. **Version-controlled records**
16. **Explainable AI outputs**
17. **Configuration-driven validation and workflow rules**
18. **Scalable architecture**

---

# 4. Technology Stack

## 4.1 Frontend

| Component | Technology |
|---|---|
| Language | TypeScript |
| Framework | React |
| Build Tool | Vite |
| Routing | TanStack Router |
| Server/API State | TanStack Query |
| Forms | React Hook Form |
| Form Validation | Zod |
| HTTP Client | Axios / Fetch |
| GIS | Leaflet + React Leaflet |
| Charts | Recharts |
| UI | Component-based React UI system |
| Styling | CSS / Tailwind CSS depending on implementation |
| Package Manager | npm |

---

## 4.2 Backend

| Component | Technology |
|---|---|
| Language | Python |
| API Framework | FastAPI |
| ASGI Server | Uvicorn |
| Validation | Pydantic |
| ORM | SQLAlchemy |
| Database Migration | Alembic |
| Authentication | JWT-based authentication |
| Background Jobs | Celery |
| Message Broker | Redis |
| API Documentation | OpenAPI / Swagger |
| Logging | Python logging |
| Testing | Pytest |

---

## 4.3 Database

| Component | Technology |
|---|---|
| Relational Database | PostgreSQL |
| Spatial Database | PostGIS |
| ORM | SQLAlchemy |
| Migration | Alembic |
| Spatial ORM | GeoAlchemy2 |

---

## 4.4 AI / Document Intelligence

| Function | Technology |
|---|---|
| Image Processing | OpenCV |
| Image Handling | Pillow |
| PDF Processing | PyMuPDF |
| OCR | Tesseract / PaddleOCR / EasyOCR |
| Text Processing | Python NLP libraries |
| Data Processing | NumPy + pandas |
| Classical ML | scikit-learn |
| Advanced ML | XGBoost / LightGBM |
| Deep Learning | PyTorch / TensorFlow if required |

The architecture shall keep OCR and AI providers abstract so that models can be replaced without changing the main application architecture.

---

## 4.5 Infrastructure

Prototype:

```text
Frontend → Vite
Backend → Uvicorn
Database → PostgreSQL + PostGIS
Redis → Local Redis instance
Storage → Local filesystem
```

Production-ready architecture:

```text
Frontend → CDN / Web Server
Backend → Containerized FastAPI
Workers → Celery Workers
Broker → Redis
Database → Managed PostgreSQL + PostGIS
Storage → Object Storage
Monitoring → Centralized Logging / Metrics
```

---

# 5. Repository Structure

The project shall use separate frontend and backend applications.

```text
ZameenAI/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── routes/
│   │   ├── styles/
│   │   ├── main.tsx
│   │   └── routeTree.gen.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── workers/
│   │   ├── ai/
│   │   ├── ocr/
│   │   ├── gis/
│   │   ├── workflow/
│   │   ├── notifications/
│   │   ├── reports/
│   │   └── main.py
│   │
│   ├── migrations/
│   ├── tests/
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env
│
├── docs/
│   ├── PRD.md
│   ├── SRS.md
│   ├── TECHSPEC.md
│   ├── API.md
│   └── ARCHITECTURE.md
│
├── data/
│   ├── uploads/
│   ├── processed/
│   └── exports/
│
├── docker/
│
├── .gitignore
└── README.md
```

---

# 6. Frontend Architecture

The frontend shall be organized by feature/module rather than only by page.

```text
src/
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   ├── modals/
│   └── common/
│
├── features/
│   ├── auth/
│   ├── users/
│   ├── documents/
│   ├── digitization/
│   ├── verification/
│   ├── validation/
│   ├── gis/
│   ├── acquisition/
│   ├── dashboard/
│   ├── timeline/
│   ├── notifications/
│   ├── reports/
│   └── decision-support/
│
├── routes/
│   ├── __root.tsx
│   ├── login.tsx
│   ├── dashboard/
│   ├── documents/
│   ├── verification/
│   ├── gis/
│   ├── acquisition/
│   ├── reports/
│   └── users/
│
├── services/
│   ├── api.ts
│   ├── auth.ts
│   ├── documents.ts
│   ├── acquisition.ts
│   ├── gis.ts
│   └── reports.ts
│
├── hooks/
├── types/
├── utils/
└── lib/
```

---

# 7. Routing Architecture

TanStack Router shall be used for frontend routing.

Example route hierarchy:

```text
/
├── login
│
├── dashboard
│
├── documents
│   ├── upload
│   ├── processing
│   ├── :documentId
│   └── :documentId/results
│
├── verification
│   ├── queue
│   └── :recordId
│
├── acquisition
│   ├── proposals
│   ├── create
│   ├── :proposalId
│   ├── :proposalId/timeline
│   ├── :proposalId/documents
│   └── :proposalId/gis
│
├── gis
│
├── reports
│
├── notifications
│
└── administration
    ├── users
    ├── roles
    └── audit
```

Routes shall enforce RBAC requirements.

---

# 8. Backend Architecture

FastAPI shall act as the main API layer.

```text
Client
  ↓
FastAPI Router
  ↓
Dependency / Authentication
  ↓
Pydantic Schema Validation
  ↓
Service Layer
  ↓
Repository / External Service
  ↓
Database / Storage / AI / GIS
```

The backend shall avoid placing business logic directly inside route handlers.

---

# 9. Backend Directory Responsibilities

## `api/`

Contains API routers and endpoint definitions.

```text
api/
├── auth.py
├── users.py
├── documents.py
├── digitization.py
├── verification.py
├── validation.py
├── gis.py
├── acquisition.py
├── dashboard.py
├── timeline.py
├── notifications.py
├── reports.py
└── decision_support.py
```

---

## `core/`

Contains application-wide configuration.

```text
core/
├── config.py
├── security.py
├── database.py
├── logging.py
└── dependencies.py
```

---

## `models/`

Contains SQLAlchemy database models.

---

## `schemas/`

Contains Pydantic request/response models.

---

## `services/`

Contains business logic.

---

## `repositories/`

Contains database-access logic where repository abstraction is useful.

---

## `ai/`

Contains AI/ML services.

```text
ai/
├── classification/
├── extraction/
├── confidence/
├── prediction/
└── decision_support/
```

---

## `ocr/`

Contains OCR providers and preprocessing.

```text
ocr/
├── preprocessing.py
├── tesseract_provider.py
├── paddle_provider.py
├── extraction.py
└── interface.py
```

---

## `gis/`

Contains spatial operations and GIS integration.

---

## `workflow/`

Contains workflow state transitions, approvals, SLA calculations, and workflow rules.

---

# 10. Configuration Management

Configuration shall be environment-based.

Example:

```env
APP_NAME=ZameenAI
ENVIRONMENT=development
DEBUG=true

DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/zameenai

REDIS_URL=redis://localhost:6379/0

JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

UPLOAD_DIR=./data/uploads
PROCESSED_DIR=./data/processed

OCR_PROVIDER=tesseract
AI_PROVIDER=local

MAX_UPLOAD_SIZE_MB=25

CORS_ORIGINS=http://localhost:5173
```

Secrets shall never be committed to Git.

---

# 11. Database Architecture

PostgreSQL shall be the primary transactional database.

PostGIS shall be enabled for spatial functionality.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

# 12. Core Database Entities

The initial database shall contain the following logical entities:

```text
User
Role
Permission
UserRole
RolePermission

LandDocument
DocumentVersion
DocumentMetadata

ProcessingJob
OCRResult
ExtractionResult
ExtractedField
ConfidenceScore

VerificationTask
VerificationReview
ValidationResult
ValidationIssue

LandParcel
ParcelDocument
ParcelGeometry

AcquisitionProposal
ProposalDocument
ProposalStatusHistory

WorkflowTask
Approval
Query
Objection

Compensation
AffectedFamily
RehabilitationRecord
PossessionRecord

Milestone
TimelineEvent

Notification
NotificationPreference

AuditLog

Report
ReportExecution

Prediction
RiskAssessment
Recommendation
```

---

# 13. User and RBAC Model

## Roles

Initial roles may include:

```text
SUPER_ADMIN
ADMIN
PROJECT_OFFICER
LAND_VERIFICATION_OFFICER
FIELD_OFFICER
REVIEWER
APPROVING_AUTHORITY
ANALYST
VIEWER
```

The exact role list shall remain configurable.

---

## Permission Model

Permissions shall follow:

```text
MODULE.ACTION
```

Examples:

```text
DOCUMENT.CREATE
DOCUMENT.READ
DOCUMENT.UPDATE
DOCUMENT.DELETE

VERIFICATION.READ
VERIFICATION.REVIEW
VERIFICATION.APPROVE

PROPOSAL.CREATE
PROPOSAL.SUBMIT
PROPOSAL.VERIFY
PROPOSAL.APPROVE

GIS.READ
GIS.UPDATE

REPORT.READ
REPORT.CREATE
REPORT.EXPORT
```

---

# 14. Authentication

Authentication shall use token-based authentication.

Flow:

```text
Login
 ↓
Credential Verification
 ↓
Access Token
 ↓
Frontend Stores Authentication State
 ↓
API Request
 ↓
Token Verification
 ↓
User + Role Resolution
 ↓
Permission Check
 ↓
Request Execution
```

Passwords shall be securely hashed.

The backend shall never return password hashes to the frontend.

---

# 15. FR-01 — User & Role Management

Technical components:

```text
User API
Role API
Permission API
Authentication Service
Authorization Service
Audit Service
```

Required functionality:

- User creation
- User login
- Logout/session termination
- Profile management
- Role assignment
- Permission assignment
- Account activation/deactivation
- Role-based dashboard access
- Role-based API authorization
- Audit logging

---

# 16. FR-02 — Land Record Document Upload

Supported initial formats:

```text
PDF
JPG
JPEG
PNG
TIFF
```

Upload process:

```text
Frontend
 ↓
Upload API
 ↓
File Validation
 ↓
Metadata Validation
 ↓
Duplicate Check
 ↓
Secure Storage
 ↓
Document Record
 ↓
Processing Job
```

Validation shall include:

- MIME type
- Extension
- File size
- File integrity
- Duplicate detection
- Malware/security scanning architecture
- Required metadata

---

# 17. Document Storage

The application shall use a storage abstraction.

```python
class StorageProvider:
    upload()
    download()
    delete()
    exists()
    get_url()
```

Prototype:

```text
LocalStorageProvider
```

Production:

```text
S3StorageProvider
AzureBlobStorageProvider
GovernmentStorageProvider
```

The application shall not directly depend on filesystem paths throughout the business logic.

---

# 18. FR-03 — AI Land Record Digitization

Digitization pipeline:

```text
Document Upload
       ↓
Processing Job
       ↓
PDF/Image Conversion
       ↓
Image Preprocessing
       ↓
Document Classification
       ↓
Language Detection
       ↓
OCR
       ↓
Layout Detection
       ↓
Field Extraction
       ↓
Normalization
       ↓
Confidence Scoring
       ↓
Validation
       ↓
Human Verification
       ↓
Verified Digital Record
```

---

# 19. Document Preprocessing

OpenCV/Pillow/PyMuPDF shall be used where applicable.

Preprocessing operations:

- PDF page rendering
- Resolution normalization
- Image resizing
- Grayscale conversion
- Noise removal
- Contrast enhancement
- Deskewing
- Rotation correction
- Cropping
- Thresholding

Preprocessing shall preserve the original document.

Original files shall never be overwritten.

---

# 20. Document Classification

The classifier shall identify document categories.

Example categories:

```text
LAND_RECORD
SALE_DEED
TITLE_DOCUMENT
ACQUISITION_NOTICE
COMPENSATION_DOCUMENT
R_AND_R_DOCUMENT
POSSESSION_DOCUMENT
SURVEY_DOCUMENT
OTHER
```

Classification shall produce:

```json
{
  "document_type": "LAND_RECORD",
  "confidence": 0.94
}
```

---

# 21. OCR Architecture

OCR shall use a provider abstraction.

```text
OCR Interface
     │
     ├── Tesseract Provider
     ├── PaddleOCR Provider
     └── EasyOCR Provider
```

The provider shall return:

```json
{
  "text": "...",
  "language": "en",
  "pages": [],
  "confidence": 0.91
}
```

Page-level text and confidence shall be preserved.

---

# 22. Multilingual OCR

The system shall be designed for multilingual land records.

The OCR architecture shall support:

```text
English
Hindi
Regional Indian Languages
```

Language support shall depend on the selected OCR engine and available models.

Language detection shall occur before or during OCR.

---

# 23. Document Intelligence

OCR text alone is insufficient.

The system shall identify:

- Tables
- Key-value pairs
- Headings
- Paragraphs
- Signatures
- Document numbers
- Dates
- Names
- Survey identifiers
- Areas
- Addresses
- Land classifications

The system shall preserve page and region references wherever possible.

---

# 24. FR-04 — Field Extraction

Initial structured fields:

```text
owner_name
co_owner_name
survey_number
plot_number
khasra_number
dag_number
area
area_unit
land_type
village
district
state
document_number
registration_date
issue_date
parties
address
compensation_amount
```

The schema shall be extensible.

---

# 25. Extraction Result Structure

Example:

```json
{
  "document_id": "DOC-001",
  "fields": [
    {
      "field_name": "owner_name",
      "value": "Example Name",
      "confidence": 0.97,
      "page": 1,
      "bounding_box": [120, 200, 500, 250]
    }
  ]
}
```

Bounding boxes shall be retained where supported by the OCR/AI pipeline.

---

# 26. FR-05 — Confidence Scoring

Confidence shall be calculated at multiple levels.

```text
OCR Confidence
       ↓
Field Extraction Confidence
       ↓
Validation Confidence
       ↓
Document Confidence
```

Example categories:

```text
HIGH       >= 0.90
MEDIUM     0.70 - 0.89
LOW        < 0.70
```

Thresholds shall be configurable.

---

# 27. Human Review Trigger

Low-confidence extraction shall automatically create or prioritize a verification task.

```text
Confidence >= threshold
        ↓
Normal verification

Confidence < threshold
        ↓
Priority verification
```

The threshold shall not be hard-coded throughout the application.

---

# 28. FR-06 — Human-in-the-Loop Verification

Verification interface:

```text
┌─────────────────────┬──────────────────────┐
│                     │                      │
│ Original Document   │ Extracted Data       │
│                     │                      │
│ PDF/Image Viewer    │ Field 1              │
│                     │ Field 2              │
│                     │ Field 3              │
│                     │                      │
│                     │ Confidence           │
│                     │ Validation Issues    │
│                     │                      │
└─────────────────────┴──────────────────────┘
```

Reviewer actions:

```text
Accept
Edit
Reject
Request Reprocessing
Add Remark
Escalate
Approve Verification
```

Every modification shall be auditable.

---

# 29. Verification Data Lifecycle

```text
AI Extracted
    ↓
Pending Review
    ↓
Under Review
    ↓
Corrected
    ↓
Verified
    ↓
Locked / Official Record
```

The original AI extraction shall remain available in history.

---

# 30. FR-07 — Automated Validation

Validation shall use a rule engine.

Validation categories:

```text
Required-field validation
Format validation
Type validation
Range validation
Cross-field validation
Duplicate validation
Spatial validation
Document consistency
Business-rule validation
```

Example:

```text
Area must be greater than 0.

Survey number must follow configured format.

Required owner name must be present.

Compensation cannot be negative.

Acquired area cannot exceed notified area.
```

---

# 31. Validation Result

Example:

```json
{
  "status": "WARNING",
  "issues": [
    {
      "field": "area",
      "type": "RANGE_CHECK",
      "severity": "WARNING",
      "message": "Area differs from linked parcel area."
    }
  ]
}
```

Severity:

```text
INFO
WARNING
ERROR
CRITICAL
```

---

# 32. FR-08 — GIS Architecture

PostGIS shall store spatial data.

Core spatial entities:

```text
LandParcel
ProjectBoundary
SurveyLocation
FieldInspectionLocation
AcquisitionBoundary
```

Spatial data shall use a defined coordinate reference system.

The initial prototype shall use a standard geographic CRS such as WGS84 where appropriate.

---

# 33. GIS Frontend

Leaflet + React Leaflet shall provide:

- Interactive map
- Base layers
- Parcel visualization
- Project boundaries
- Marker locations
- Parcel selection
- Search
- Filtering
- Status visualization
- Popup information
- Geo-tagged field evidence

---

# 34. Parcel Status

Example:

```text
NOTIFIED
UNDER_VERIFICATION
ACQUIRED
COMPENSATION_PENDING
COMPENSATION_PAID
R_AND_R_PENDING
R_AND_R_COMPLETED
POSSESSION_PENDING
POSSESSION_COMPLETED
```

The frontend shall visually differentiate statuses.

---

# 35. Land Record ↔ Parcel Linking

Linking process:

```text
Land Record
    ↓
Survey / Plot Identifier
    ↓
Parcel Search
    ↓
Spatial Match
    ↓
Manual Confirmation if Required
    ↓
Parcel Link
```

The system shall support manual confirmation when automated spatial/identifier matching is uncertain.

---

# 36. Government GIS Integration

Government integrations shall use an abstraction layer.

```text
GovernmentGISProvider
        │
        ├── MockGISProvider
        ├── GovernmentGISProvider
        └── FutureProvider
```

External APIs shall not be directly embedded into UI components.

---

# 37. FR-09 — Land Acquisition Workflow

The acquisition workflow shall be state-driven.

Core states:

```text
DRAFT
SUBMITTED
UNDER_VERIFICATION
QUERY_RAISED
RESUBMITTED
VERIFIED
PENDING_APPROVAL
APPROVED
REJECTED
NOTIFICATION
COMPENSATION
R_AND_R
POSSESSION
COMPLETED
```

---

# 38. Workflow State Machine

Example:

```text
DRAFT
  │
  ▼
SUBMITTED
  │
  ▼
UNDER_VERIFICATION
  │
  ├──── Query ────► QUERY_RAISED
  │                    │
  │                    ▼
  │                RESUBMITTED
  │                    │
  │                    └────► UNDER_VERIFICATION
  │
  ▼
VERIFIED
  │
  ▼
PENDING_APPROVAL
  │
  ├──► APPROVED
  │
  └──► REJECTED
             │
             └──► DRAFT / CLOSED
```

Only authorized roles shall perform state transitions.

---

# 39. Workflow Tasks

Each workflow stage may create tasks.

Example:

```text
Verification Task
Approval Task
Field Verification Task
Document Review Task
Compensation Task
R&R Task
Possession Task
```

Task fields:

```text
task_id
proposal_id
assigned_to
task_type
status
priority
created_at
due_at
completed_at
remarks
```

---

# 40. Approval Hierarchy

The approval system shall support configurable approval levels.

```text
Officer Verification
        ↓
Department Review
        ↓
Administrative Approval
        ↓
Final Approval
```

The exact hierarchy shall be configurable based on project requirements.

---

# 41. Compensation Module

The system shall store:

- Compensation assessment
- Assessed amount
- Paid amount
- Payment status
- Payment date
- Beneficiary
- Supporting documents
- Pending amount

Status:

```text
NOT_ASSESSED
ASSESSED
PARTIALLY_PAID
PAID
DISPUTED
```

---

# 42. Affected and Displaced Families

The system shall maintain:

```text
AffectedFamily
```

Data may include:

```text
family identifier
land parcel
affected area
displacement status
eligibility
R&R status
benefits
remarks
```

---

# 43. Rehabilitation & Resettlement

R&R tracking shall include:

```text
ELIGIBILITY_ASSESSMENT
BENEFIT_ASSIGNED
BENEFIT_PENDING
BENEFIT_PROVIDED
RESETTLEMENT_PENDING
RESETTLEMENT_COMPLETED
```

---

# 44. Possession Tracking

Possession records shall include:

```text
possession date
parcel
project
authority
status
supporting document
remarks
```

---

# 45. FR-10 — Dashboard Architecture

Dashboards shall be role-aware.

Dashboard levels:

```text
Executive
National
State
District
Project
Operational
Field Officer
Reviewer
```

---

# 46. Dashboard KPIs

Required KPIs include:

```text
Area Notified
Area Acquired
Compensation Assessed
Compensation Paid
Affected Families
Displaced Families
R&R Status
Project Progress
Possession Status
Timeline Adherence
```

---

# 47. Dashboard Filtering

Filters shall support:

```text
Date
State
District
Project
Proposal
Land Type
Acquisition Status
Compensation Status
R&R Status
Timeline Status
```

Filters should be composable.

---

# 48. Dashboard Drill-Down

Example:

```text
National
  ↓
State
  ↓
District
  ↓
Project
  ↓
Proposal
  ↓
Land Parcel
  ↓
Document
```

---

# 49. FR-11 — Timeline and Milestone Monitoring

Each project shall support milestones.

Example:

```text
Proposal Submitted
Land Verification
Approval
Notification
Compensation Assessment
Compensation Payment
R&R
Possession
Project Completion
```

Each milestone shall store:

```text
planned_start
planned_end
actual_start
actual_end
due_date
status
progress_percentage
owner
```

---

# 50. Timeline Status

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
AT_RISK
OVERDUE
BLOCKED
```

---

# 51. Timeline Adherence

Basic calculation:

```text
Timeline Adherence =
Completed Milestones On Time
--------------------------------
Total Completed Milestones
× 100
```

More advanced project-level calculations may incorporate weighted milestones.

---

# 52. Alert Conditions

Examples:

```text
Deadline approaching
Milestone overdue
Workflow task overdue
Proposal pending too long
Compensation pending
R&R delayed
API synchronization failure
Low-confidence extraction
High-risk project
```

---

# 53. Notification Architecture

```text
Event
 ↓
Notification Engine
 ↓
Recipient Resolution
 ↓
Preference Check
 ↓
Notification Delivery
```

Initial delivery:

```text
In-App
```

Future:

```text
Email
SMS
Push Notification
```

---

# 54. Notification Data Model

```text
Notification
NotificationPreference
NotificationDelivery
```

Notification fields:

```text
recipient
type
title
message
severity
reference_type
reference_id
read_status
created_at
```

---

# 55. Secure Document Repository

The repository shall support:

- Document storage
- Metadata
- Search
- Preview
- Download
- Access control
- Version history
- Audit history
- Document categorization

Documents shall be linked to:

```text
Proposal
Parcel
Workflow
Verification
Compensation
R&R
Possession
```

---

# 56. Document Version Control

Each document update shall create a new version.

```text
Document
  ├── Version 1
  ├── Version 2
  ├── Version 3
  └── Current Version
```

Previous versions shall not be silently overwritten.

---

# 57. Audit Logging

All important actions shall generate audit events.

Example:

```text
LOGIN
DOCUMENT_UPLOADED
DOCUMENT_VIEWED
DOCUMENT_DOWNLOADED
DOCUMENT_UPDATED
AI_PROCESSING_STARTED
AI_PROCESSING_COMPLETED
FIELD_CORRECTED
RECORD_VERIFIED
PROPOSAL_SUBMITTED
QUERY_RAISED
APPROVAL_GRANTED
APPROVAL_REJECTED
STATUS_CHANGED
COMPENSATION_UPDATED
R_AND_R_UPDATED
POSSESSION_UPDATED
```

Audit record:

```text
user
action
entity_type
entity_id
timestamp
IP / session metadata where appropriate
before_value
after_value
```

---

# 58. FR-12 — AI Decision Support

AI decision support shall be separated from deterministic workflow logic.

Potential predictions:

```text
Project Delay Risk
Proposal Risk
Workflow Bottleneck
Compensation Delay Risk
R&R Delay Risk
Timeline Deviation
Inter-agency Dependency Risk
```

---

# 59. Predictive Analytics Pipeline

```text
Historical Data
      ↓
Data Cleaning
      ↓
Feature Engineering
      ↓
Dataset
      ↓
Model Training
      ↓
Evaluation
      ↓
Model Versioning
      ↓
Prediction Service
      ↓
Risk Score
      ↓
Explanation
      ↓
Recommendation
```

---

# 60. Risk Score

Example:

```text
Risk Score = 0.82
Risk Level = HIGH
```

Initial classification:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Thresholds shall be configurable.

---

# 61. Explainable AI

Every prediction should provide contributing indicators.

Example:

```text
HIGH DELAY RISK

Contributing indicators:
- Verification pending for 18 days
- Two workflow tasks overdue
- Compensation assessment incomplete
- Required document missing
```

The system shall avoid presenting predictions as guaranteed outcomes.

---

# 62. AI Recommendation Engine

Recommendations may include:

```text
Prioritize pending verification
Request missing document
Escalate overdue approval
Review compensation case
Schedule field verification
Coordinate with external department
```

Recommendations shall be advisory.

Human authorities shall retain decision-making responsibility.

---

# 63. AI Service Abstraction

AI providers shall be replaceable.

```python
class DocumentClassifier:
    classify(document)

class FieldExtractor:
    extract(document, ocr_result)

class ConfidenceEngine:
    calculate(extraction)

class RiskPredictor:
    predict(project_data)

class DecisionSupportEngine:
    recommend(context)
```

---

# 64. Background Processing

Expensive operations shall be asynchronous.

Suitable jobs:

```text
OCR
Document preprocessing
AI extraction
Confidence calculation
Batch validation
Report generation
Prediction generation
Government API synchronization
```

Architecture:

```text
FastAPI
   ↓
Celery Task
   ↓
Redis
   ↓
Celery Worker
   ↓
AI/OCR Processing
   ↓
Database
```

---

# 65. Processing Job Model

```text
ProcessingJob
```

Fields:

```text
id
document_id
job_type
status
progress
started_at
completed_at
error_message
retry_count
result_reference
```

Status:

```text
QUEUED
PROCESSING
COMPLETED
FAILED
RETRYING
CANCELLED
```

---

# 66. API Architecture

All backend functionality shall be exposed through versioned APIs.

Base:

```text
/api/v1/
```

Example:

```text
/api/v1/auth
/api/v1/users
/api/v1/documents
/api/v1/digitization
/api/v1/verification
/api/v1/validation
/api/v1/gis
/api/v1/acquisition
/api/v1/dashboard
/api/v1/timeline
/api/v1/notifications
/api/v1/reports
/api/v1/decision-support
```

---

# 67. Authentication API

Example endpoints:

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/refresh
```

---

# 68. Document API

```text
POST   /api/v1/documents
GET    /api/v1/documents
GET    /api/v1/documents/{id}
PATCH  /api/v1/documents/{id}
DELETE /api/v1/documents/{id}

POST /api/v1/documents/{id}/process
GET  /api/v1/documents/{id}/processing-status
GET  /api/v1/documents/{id}/versions
```

---

# 69. Verification API

```text
GET   /api/v1/verification/queue
GET   /api/v1/verification/{id}
PATCH /api/v1/verification/{id}
POST  /api/v1/verification/{id}/approve
POST  /api/v1/verification/{id}/reject
POST  /api/v1/verification/{id}/reprocess
```

---

# 70. Acquisition API

```text
POST /api/v1/acquisition/proposals
GET  /api/v1/acquisition/proposals
GET  /api/v1/acquisition/proposals/{id}
PATCH /api/v1/acquisition/proposals/{id}

POST /api/v1/acquisition/proposals/{id}/submit
POST /api/v1/acquisition/proposals/{id}/verify
POST /api/v1/acquisition/proposals/{id}/approve
POST /api/v1/acquisition/proposals/{id}/reject
```

---

# 71. GIS API

```text
GET  /api/v1/gis/parcels
GET  /api/v1/gis/parcels/{id}
GET  /api/v1/gis/parcels/{id}/documents
POST /api/v1/gis/parcels/{id}/link-document
GET  /api/v1/gis/layers
```

Spatial filtering shall support bounding-box and attribute-based filtering where required.

---

# 72. Dashboard API

```text
GET /api/v1/dashboard/summary
GET /api/v1/dashboard/kpis
GET /api/v1/dashboard/acquisition
GET /api/v1/dashboard/compensation
GET /api/v1/dashboard/r-and-r
GET /api/v1/dashboard/timeline
GET /api/v1/dashboard/gis
```

---

# 73. Report API

```text
GET  /api/v1/reports
POST /api/v1/reports
POST /api/v1/reports/{id}/generate
GET  /api/v1/reports/{id}/download
```

---

# 74. API Response Standard

Successful response:

```json
{
  "success": true,
  "data": {},
  "message": "Request successful"
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

The exact envelope may be simplified for endpoints where standard FastAPI semantics are preferable.

---

# 75. Error Handling

The backend shall use centralized exception handling.

Categories:

```text
AuthenticationError
AuthorizationError
ValidationError
NotFoundError
ConflictError
ProcessingError
ExternalServiceError
StorageError
DatabaseError
```

Errors shall be logged internally without exposing sensitive implementation details to clients.

---

# 76. Government API Integration

Integration architecture:

```text
ZameenAI
    ↓
Integration Service
    ↓
Provider Adapter
    ↓
Government API
```

Potential systems:

```text
Land Records
Cadastral Maps
Government Portals
Relevant Department Systems
```

The prototype shall use mock APIs where real government access is unavailable.

---

# 77. Integration Requirements

Each integration shall support:

```text
Authentication
Request mapping
Response mapping
Validation
Timeout
Retry
Error handling
Logging
Synchronization status
```

External APIs shall not be tightly coupled to business logic.

---

# 78. Data Synchronization

Synchronization states:

```text
NOT_SYNCED
SYNC_PENDING
SYNCING
SYNCED
SYNC_FAILED
```

Synchronization history shall be retained.

---

# 79. Field Data Collection

The frontend shall be responsive for field officers.

Required capabilities:

```text
Parcel search
GPS capture
Geo-tagging
Field survey form
Inspection checklist
Photo upload
Document capture
Remarks
Verification submission
```

Each field activity shall retain:

```text
officer
timestamp
location
project
parcel
activity
```

---

# 80. Security Architecture

Security shall be implemented at multiple layers.

```text
Frontend Security
       ↓
API Security
       ↓
Authentication
       ↓
Authorization
       ↓
Database Security
       ↓
Storage Security
       ↓
Audit
```

---

# 81. API Security

Requirements:

- JWT authentication
- RBAC
- Input validation
- File validation
- Rate limiting architecture
- CORS configuration
- Secure headers
- HTTPS in production
- Error sanitization

---

# 82. File Security

Uploaded files shall be treated as untrusted input.

Checks:

```text
Extension
MIME Type
Size
Content Integrity
Duplicate
Malware Scanning Architecture
```

Files shall not be executed.

---

# 83. Data Protection

Sensitive data shall be protected through:

```text
Encryption in transit
Secure authentication
Access control
Least privilege
Database permissions
Storage access controls
Audit logging
Backup controls
```

---

# 84. Database Integrity

The database shall use:

- Primary keys
- Foreign keys
- Unique constraints
- Check constraints
- NOT NULL constraints
- Indexes
- Transactions

Business-critical state transitions shall occur transactionally.

---

# 85. Indexing Strategy

Indexes shall be created for:

```text
User.email
Document.status
Document.created_at
Proposal.status
Proposal.project_id
WorkflowTask.assigned_to
WorkflowTask.status
Notification.recipient_id
AuditLog.entity_id
LandParcel identifiers
Spatial geometry
```

PostGIS spatial indexes shall use appropriate GiST indexes.

---

# 86. Database Migration

Alembic shall manage schema changes.

Workflow:

```text
Model Change
 ↓
Alembic Revision
 ↓
Review Migration
 ↓
Run Migration
 ↓
Verify Schema
```

Database schema changes shall not be made manually in production.

---

# 87. Frontend State Management

The frontend shall distinguish:

### Server State

Managed by:

```text
TanStack Query
```

Examples:

```text
Documents
Proposals
Dashboard data
GIS data
Notifications
Reports
Users
```

### Local UI State

Managed through React state/hooks.

Examples:

```text
Modal state
Selected tab
Map selection
Temporary filters
Form state
```

---

# 88. API Client

A centralized API client shall handle:

```text
Base URL
Authentication
Headers
Error handling
Request cancellation
Response parsing
```

Example structure:

```text
services/
├── api.ts
├── auth.ts
├── documents.ts
├── verification.ts
├── acquisition.ts
├── gis.ts
├── dashboard.ts
└── reports.ts
```

---

# 89. Frontend Type Safety

TypeScript types shall represent:

```text
User
Role
Document
ProcessingJob
OCRResult
ExtractedField
VerificationTask
ValidationIssue
LandParcel
Proposal
WorkflowTask
Milestone
Notification
Report
RiskAssessment
```

Types should correspond to API contracts.

---

# 90. Form Validation

Forms shall use:

```text
React Hook Form
+
Zod
```

Validation shall occur client-side for UX and server-side for security/data integrity.

The frontend shall never rely exclusively on client validation.

---

# 91. Loading and Processing States

The UI shall explicitly represent:

```text
Idle
Loading
Processing
Success
Error
Empty
Retry
```

Document processing shall display meaningful progress.

Example:

```text
Uploading
   ↓
Preprocessing
   ↓
OCR
   ↓
AI Extraction
   ↓
Confidence Analysis
   ↓
Validation
   ↓
Ready for Review
```

---

# 92. Responsive Design

The application shall support:

```text
Desktop
Tablet
Mobile
```

Field workflows shall be optimized for mobile.

Executive dashboards shall prioritize desktop/tablet layouts.

---

# 93. Accessibility

The frontend should follow WCAG-oriented practices.

Requirements:

- Keyboard navigation
- Semantic HTML
- Accessible labels
- Focus management
- Sufficient contrast
- Screen-reader-friendly controls
- Accessible forms
- Accessible tables
- Accessible notifications

---

# 94. Reporting Architecture

The report engine shall support:

```text
Standard Reports
Custom Reports
Filtered Reports
Executive Reports
Operational Reports
```

Export formats:

```text
CSV
Excel
PDF
```

---

# 95. Analytics Architecture

Analytics shall use structured operational data.

Metrics:

```text
Acquisition progress
Area statistics
Compensation statistics
R&R statistics
Timeline adherence
Workflow throughput
Verification workload
AI extraction accuracy
Validation error frequency
```

---

# 96. AI Performance Metrics

The AI pipeline shall track:

### OCR

```text
Character Error Rate
Word Error Rate
```

### Extraction

```text
Precision
Recall
F1 Score
Field Accuracy
```

### Classification

```text
Accuracy
Precision
Recall
F1 Score
```

### Prediction

```text
MAE
RMSE
Accuracy
Precision
Recall
F1
ROC-AUC
```

The appropriate metric depends on the model and task.

---

# 97. Human Review Metrics

The platform shall track:

```text
Average Review Time
Correction Rate
Low Confidence Rate
AI Acceptance Rate
Reprocessing Rate
Verification Backlog
```

These metrics shall help measure AI effectiveness.

---

# 98. Testing Strategy

Testing shall occur at multiple levels.

```text
Unit Testing
Integration Testing
API Testing
Database Testing
AI/OCR Testing
GIS Testing
RBAC Testing
Workflow Testing
Frontend Testing
End-to-End Testing
Performance Testing
Security Testing
```

---

# 99. Backend Testing

Use:

```text
Pytest
FastAPI TestClient
Test PostgreSQL Database
```

Test:

```text
Authentication
Permissions
Document upload
Processing
Extraction
Validation
Workflow transitions
GIS queries
Reports
Notifications
```

---

# 100. Frontend Testing

The frontend should include:

```text
Component Tests
Route Tests
Form Tests
API Integration Tests
RBAC Tests
Critical User Journey Tests
```

---

# 101. End-to-End Testing

The primary E2E test shall cover:

```text
Login
 ↓
Create Proposal
 ↓
Upload Document
 ↓
Process Document
 ↓
OCR
 ↓
Extraction
 ↓
Confidence
 ↓
Verification
 ↓
Validation
 ↓
GIS Linking
 ↓
Submit Proposal
 ↓
Approval
 ↓
Timeline
 ↓
Dashboard
```

---

# 102. Prototype AI Strategy

For the initial SIH prototype, the architecture shall allow mock AI services.

Example:

```text
MockOCRService
MockExtractionService
MockConfidenceService
MockPredictionService
```

This allows complete UI and workflow development before production-grade AI models are finalized.

---

# 103. Production AI Strategy

Production architecture shall replace mocks with actual providers.

```text
Application
    ↓
AI Interface
    ↓
Configured Provider
    ↓
Model
```

The application shall not need major architectural changes when models are replaced.

---

# 104. Seed Data

The prototype shall include realistic synthetic data.

Seed data should include:

```text
Users
Roles
Projects
Proposals
Documents
Land Parcels
Workflow Tasks
Compensation Records
Affected Families
R&R Records
Milestones
Notifications
Audit Logs
Predictions
```

No real sensitive land-record data shall be included in source control.

---

# 105. Demo Dataset

The demo dataset shall support the complete prototype flow.

At minimum:

```text
3–5 Projects
Multiple States/Districts
10+ Proposals
Multiple Land Parcels
Multiple Documents
Different Workflow States
Different Compensation States
Different R&R States
Delayed and On-Time Projects
Low and High AI Confidence Records
```

---

# 106. Logging

Application logs shall include:

```text
timestamp
level
service
request_id
user_id where appropriate
operation
status
error information
```

Sensitive information shall not be written to logs.

---

# 107. Observability

Production architecture should support:

```text
Application Logs
API Metrics
Background Job Metrics
Database Metrics
AI Processing Metrics
Error Monitoring
```

---

# 108. Performance Requirements

The application should aim for:

### Standard API Requests

Target:

```text
< 500 ms
```

for ordinary database-backed operations under normal prototype load.

### Heavy Operations

OCR and AI processing shall be asynchronous.

The API shall return a job identifier rather than blocking the request.

---

# 109. Scalability

The system shall support independent scaling of:

```text
Frontend
API Servers
Celery Workers
Redis
Database
Object Storage
AI Processing
```

Example:

```text
              Load Balancer
                   │
          ┌────────┴────────┐
          │                 │
      FastAPI 1         FastAPI 2
          │                 │
          └────────┬────────┘
                   │
                Database
                   │
                 Redis
                   │
          ┌────────┴────────┐
          │                 │
      Worker 1           Worker 2
```

---

# 110. Deployment

Prototype deployment may use Docker.

Services:

```text
frontend
backend
postgres
redis
worker
```

Example:

```text
docker-compose.yml
```

Production deployment may use:

```text
Docker
Kubernetes / managed container platform
Managed PostgreSQL
Managed Redis
Object Storage
CDN
```

---

# 111. Environment Separation

The system shall support:

```text
development
testing
staging
production
```

Each environment shall have independent:

```text
Database
Storage
Secrets
API credentials
AI configuration
```

---

# 112. CI/CD

Future CI/CD pipeline:

```text
Git Push
   ↓
Lint
   ↓
Type Check
   ↓
Unit Tests
   ↓
Integration Tests
   ↓
Build
   ↓
Security Checks
   ↓
Deploy Staging
   ↓
E2E Tests
   ↓
Production Deployment
```

---

# 113. Git Strategy

Suggested branches:

```text
main
develop
feature/*
fix/*
```

Feature development shall be module-oriented.

Examples:

```text
feature/document-upload
feature/ocr-pipeline
feature/gis-parcel
feature/acquisition-workflow
feature/dashboard
```

---

# 114. API Documentation

FastAPI OpenAPI documentation shall be maintained.

Development endpoints:

```text
/docs
/redoc
```

The API documentation shall describe:

```text
Request
Response
Authentication
Errors
Parameters
File uploads
Status codes
```

---

# 115. Status Code Standards

Use appropriate HTTP status codes.

```text
200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
429 Too Many Requests
500 Internal Server Error
502 External Service Error
```

---

# 116. Data Lifecycle

Document lifecycle:

```text
Uploaded
 ↓
Stored
 ↓
Processed
 ↓
OCR
 ↓
Extracted
 ↓
Confidence Scored
 ↓
Validated
 ↓
Human Reviewed
 ↓
Verified
 ↓
Linked to Parcel
 ↓
Used in Acquisition Workflow
 ↓
Archived
```

---

# 117. End-to-End System Flow

```text
LOGIN
  ↓
RBAC DASHBOARD
  ↓
CREATE LAND ACQUISITION PROPOSAL
  ↓
UPLOAD LAND DOCUMENTS
  ↓
DOCUMENT STORAGE
  ↓
ASYNC PROCESSING JOB
  ↓
PREPROCESSING
  ↓
DOCUMENT CLASSIFICATION
  ↓
LANGUAGE DETECTION
  ↓
OCR
  ↓
LAYOUT ANALYSIS
  ↓
FIELD EXTRACTION
  ↓
CONFIDENCE SCORING
  ↓
AUTOMATED VALIDATION
  ↓
HUMAN VERIFICATION
  ↓
VERIFIED DIGITAL RECORD
  ↓
GIS PARCEL IDENTIFICATION
  ↓
PROPOSAL SUBMISSION
  ↓
LAND VERIFICATION
  ↓
APPROVAL
  ↓
NOTIFICATION
  ↓
COMPENSATION
  ↓
R&R
  ↓
POSSESSION
  ↓
PROJECT MONITORING
  ↓
DASHBOARD
  ↓
MIS REPORT
  ↓
AI RISK ANALYSIS
  ↓
DECISION SUPPORT
  ↓
AUDIT HISTORY
```

---

# 118. Module Dependency Architecture

```text
                    Authentication
                          │
                          ▼
                    User / RBAC
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
        Documents      Acquisition    Dashboard
             │            │            │
             ▼            ▼            │
       AI Digitization  Workflow       │
             │            │            │
             ▼            ▼            │
            OCR       Timeline         │
             │            │            │
             ▼            ▼            │
        Extraction    Compensation     │
             │            │            │
             ▼            ▼            │
        Confidence        R&R           │
             │            │            │
             ▼            ▼            │
        Verification   Possession       │
             │            │            │
             └──────┬─────┴────────────┘
                    ▼
                   GIS
                    │
                    ▼
              Analytics / MIS
                    │
                    ▼
             AI Decision Support
```

---

# 119. Cross-Cutting Services

The following shall operate across multiple modules:

```text
Authentication
Authorization
Audit
Notifications
Document Storage
File Processing
Government Integration
Reporting
Analytics
Configuration
Logging
```

These should not be duplicated inside individual modules.

---

# 120. Core Functional Requirements Mapping

| Requirement | Primary Technical Components |
|---|---|
| FR-01 User & Role Management | FastAPI + JWT + RBAC + PostgreSQL |
| FR-02 Document Upload | React + FastAPI + Storage |
| FR-03 AI Digitization | Celery + AI Services |
| FR-04 OCR + Intelligence | OpenCV + OCR + AI |
| FR-05 Confidence Scoring | AI/Rules Engine |
| FR-06 Human Verification | React + FastAPI + Audit |
| FR-07 Automated Validation | Validation Engine |
| FR-08 GIS | PostGIS + GeoAlchemy2 + Leaflet |
| FR-09 Acquisition Workflow | Workflow Engine + PostgreSQL |
| FR-10 Dashboard | FastAPI + TanStack Query + Recharts |
| FR-11 Timeline | Workflow + Milestone Engine |
| FR-12 AI Decision Support | ML Pipeline + Prediction Service |

---

# 121. Development Priority

## P0 — Foundation

```text
Project setup
Frontend setup
Backend setup
Database
Alembic
API architecture
Authentication
RBAC
Environment configuration
```

---

## P1 — Core ZameenAI

```text
Document upload
Storage
Processing jobs
Preprocessing
OCR
Extraction
Confidence scoring
Human verification
Validation
```

---

## P2 — Land Acquisition

```text
Proposal management
Workflow
GIS
Parcel linking
Timeline
Compensation
Affected families
R&R
Possession
```

---

## P3 — Governance

```text
Dashboard
Notifications
Document repository
Audit
MIS reports
Field data collection
```

---

## P4 — Advanced Intelligence

```text
Government APIs
Predictive analytics
Risk scoring
AI recommendations
Policy insights
Advanced analytics
```

---

# 122. MVP Definition

The minimum demonstrable system shall include:

```text
Authentication
RBAC
Dashboard
Proposal Creation
Document Upload
AI/OCR Processing
Structured Extraction
Confidence Scores
Human Verification
Automated Validation
GIS Parcel Visualization
Acquisition Workflow
Timeline
Compensation
R&R
Possession
Notifications
Audit History
Basic MIS Report
Basic AI Risk Prediction
```

---

# 123. SIH Demonstration Flow

The preferred live demonstration shall follow one complete case.

```text
1. Login
2. Role-based dashboard
3. Create acquisition proposal
4. Upload land document
5. Start AI processing
6. Show processing stages
7. Display OCR/extracted fields
8. Display confidence scores
9. Show low-confidence field
10. Human reviewer corrects field
11. Run validation
12. Link record to GIS parcel
13. Submit proposal
14. Move through workflow
15. Show timeline
16. Show compensation
17. Show R&R
18. Show possession
19. Show dashboard update
20. Generate MIS report
21. Show AI risk prediction
22. Show audit history
```

---

# 124. Technical Non-Goals for Initial Prototype

The following shall not block the initial prototype:

```text
Real government production APIs
Production-grade nationwide deployment
Advanced deep-learning models
Fully automated legal decision-making
Real payment gateway integration
Production SMS infrastructure
Complex distributed microservices
Kubernetes
Real sensitive government datasets
```

The architecture shall remain capable of supporting these capabilities later.

---

# 125. Prototype vs Production Architecture

## Prototype

```text
React
   ↓
FastAPI
   ↓
PostgreSQL/PostGIS
   ↓
Local Storage
   ↓
Celery + Redis
   ↓
Mock Government APIs
   ↓
Mock/Local AI Models
```

## Production

```text
React CDN
   ↓
Load Balancer
   ↓
FastAPI Cluster
   ↓
Service Layer
   ├── PostgreSQL/PostGIS
   ├── Redis
   ├── Object Storage
   ├── AI Services
   ├── OCR Services
   └── Government APIs
```

---

# 126. Architecture Decision Records

The following decisions are considered baseline architectural decisions.

### ADR-001 — Backend Framework

**Decision:** FastAPI

**Reason:** Python-native AI/ML integration, high-performance API development, automatic OpenAPI documentation, Pydantic integration, and familiarity with Python AI tooling.

---

### ADR-002 — Frontend

**Decision:** React + TypeScript + Vite

**Reason:** Component-based architecture, strong TypeScript support, mature ecosystem, and separation from backend.

---

### ADR-003 — Routing

**Decision:** TanStack Router

**Reason:** Type-safe routing and file-based route organization.

---

### ADR-004 — Database

**Decision:** PostgreSQL + PostGIS

**Reason:** Relational transactional data combined with native spatial capabilities.

---

### ADR-005 — ORM

**Decision:** SQLAlchemy

**Reason:** Mature Python ORM with strong PostgreSQL support and flexibility for PostGIS.

---

### ADR-006 — AI Processing

**Decision:** Provider abstraction

**Reason:** OCR and AI models may change during development and production deployment.

---

### ADR-007 — Human Verification

**Decision:** AI-assisted but human-approved records

**Reason:** Land records are high-impact administrative data and AI extraction errors must be reviewable and correctable.

---

# 127. Technical Acceptance Criteria

The system shall be considered technically ready for the initial prototype when:

### Frontend

- React application runs successfully.
- TypeScript compilation succeeds.
- TanStack Router generates routes successfully.
- API client is operational.
- Authentication flow works.
- Responsive layouts work.

### Backend

- FastAPI starts successfully.
- OpenAPI documentation is available.
- PostgreSQL connection works.
- Alembic migrations execute successfully.
- Authentication works.
- RBAC works.
- Core APIs return expected responses.

### AI

- Document upload works.
- Processing pipeline executes.
- OCR returns text.
- Extraction returns structured fields.
- Confidence scores are generated.
- Human verification can modify extracted values.

### GIS

- PostGIS is enabled.
- Parcels can be stored.
- Parcel geometry can be retrieved.
- Map renders parcel data.
- Documents can be linked to parcels.

### Workflow

- Proposal can be created.
- Proposal can be submitted.
- Verification can occur.
- Approval can occur.
- State transitions are recorded.
- Timeline milestones are tracked.

### Governance

- Dashboard displays acquisition KPIs.
- Notifications are generated.
- Audit history is recorded.
- Basic MIS reports can be generated.

### AI Decision Support

- Risk score can be generated.
- Risk category can be displayed.
- Contributing indicators can be displayed.

---

# 128. Definition of Done for a Module

A module shall not be considered complete merely because the UI exists.

Each module should contain:

```text
UI
API
Database Model
Schema
Service Logic
Validation
Authorization
Error Handling
Loading/Error States
Audit Requirements
Testing
Documentation
```

For AI modules additionally:

```text
Model/Provider Interface
Input Processing
Output Schema
Confidence
Evaluation
Fallback
Logging
```

For GIS modules additionally:

```text
Geometry Model
Spatial Query
Map Visualization
Coordinate Handling
Spatial Validation
```

---

# 129. Final Technical Architecture

The final ZameenAI architecture is:

```text
┌─────────────────────────────────────────────────────────────────┐
│                         USER / OFFICER                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              REACT + TYPESCRIPT + VITE                          │
│                                                                 │
│ TanStack Router │ TanStack Query │ React Hook Form │ Zod        │
│ Leaflet         │ Recharts       │ Feature Modules             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST / JSON
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FASTAPI                                 │
│                                                                 │
│ Auth │ RBAC │ Documents │ AI │ OCR │ GIS │ Workflow            │
│ Dashboard │ Timeline │ Reports │ Notifications │ Analytics      │
└───────────────┬───────────────────────┬─────────────────────────┘
                │                       │
                ▼                       ▼
┌──────────────────────────┐   ┌─────────────────────────────────┐
│ APPLICATION SERVICES     │   │ BACKGROUND PROCESSING            │
│                          │   │                                 │
│ Business Rules           │   │ Celery                          │
│ Validation               │   │ Redis                           │
│ Workflow                 │   │ OCR                             │
│ Integration              │   │ AI Extraction                   │
│ Decision Support         │   │ Reports                         │
└────────────┬─────────────┘   └────────────────┬────────────────┘
             │                                  │
             └────────────────┬─────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA & INTELLIGENCE                          │
│                                                                 │
│ PostgreSQL │ PostGIS │ SQLAlchemy │ GeoAlchemy2                 │
│                                                                 │
│ Document Storage │ OCR │ ML Models │ Prediction Models          │
└─────────────────────────────────────────────────────────────────┘
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
      Government APIs     GIS Systems      External Services
```

---

# 130. Final Technology Decision Summary

```text
FRONTEND
React
TypeScript
Vite
TanStack Router
TanStack Query
React Hook Form
Zod
Leaflet / React Leaflet
Recharts

BACKEND
Python
FastAPI
Uvicorn
Pydantic
SQLAlchemy
Alembic

DATABASE
PostgreSQL
PostGIS
GeoAlchemy2

ASYNC PROCESSING
Celery
Redis

DOCUMENT / AI
PyMuPDF
OpenCV
Pillow
Tesseract / PaddleOCR / EasyOCR
NumPy
pandas
scikit-learn
XGBoost / LightGBM when required
PyTorch / TensorFlow when required

STORAGE
Local filesystem for prototype
Object storage abstraction for production

TESTING
Pytest
FastAPI TestClient
Frontend component/E2E testing

DEPLOYMENT
Docker
Containerized FastAPI
PostgreSQL/PostGIS
Redis
Celery workers

ARCHITECTURE
Modular
API-first
RBAC
Human-in-the-loop
GIS-enabled
AI-assisted
Auditable
Scalable
```

---

# 131. Implementation Rule

The implementation shall proceed **module-wise**, not page-wise.

The preferred development sequence is:

```text
Foundation
   ↓
Authentication + RBAC
   ↓
Document Management
   ↓
AI Digitization
   ↓
OCR + Extraction
   ↓
Confidence
   ↓
Verification
   ↓
Validation
   ↓
GIS
   ↓
Acquisition Workflow
   ↓
Timeline
   ↓
Compensation / R&R / Possession
   ↓
Dashboard
   ↓
Notifications
   ↓
Reports / MIS
   ↓
Audit
   ↓
Government Integrations
   ↓
Predictive Analytics
   ↓
AI Decision Support
```

Every module shall be implemented across its required layers:

```text
Frontend
    +
API
    +
Backend Service
    +
Database
    +
Validation
    +
Authorization
    +
Testing
    +
Audit
```

No module shall be considered production-ready if only its frontend page has been implemented.

---

# 132. End State

ZameenAI shall provide a unified digital platform in which:

```text
Physical Land Documents
        ↓
Digital Documents
        ↓
AI-Extracted Land Records
        ↓
Confidence-Aware Data
        ↓
Human-Verified Records
        ↓
Validated Land Information
        ↓
GIS-Linked Parcels
        ↓
Land Acquisition Workflow
        ↓
Compensation / R&R / Possession
        ↓
Timeline & Project Monitoring
        ↓
Dashboards & MIS
        ↓
Predictive Risk Analysis
        ↓
AI Decision Support
```

The architecture is designed so that the initial SIH prototype can be implemented with mock AI and government integrations while preserving a technically valid path toward production-grade AI, GIS, government-system integration, secure document management, predictive analytics, and large-scale deployment.