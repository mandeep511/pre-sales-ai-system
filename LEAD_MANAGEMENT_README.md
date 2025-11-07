# Lead Management Implementation

## Overview
Complete lead management functionality with CRUD operations, CSV import, tagging, campaign association, and lifecycle tracking.

## Features Implemented

### 1. Backend API Routes (`websocket-server/src/routes/leads.ts`)

#### Endpoints:
- **GET /api/leads** - List leads with filters
  - Query params: status, campaignId, tags, search, page, limit
  - Returns paginated results with campaign info
  
- **GET /api/leads/:id** - Get single lead with call history
  - Includes campaign details and last 10 call sessions
  
- **POST /api/leads** - Create new lead
  - Required: name, phone
  - Optional: email, company, metadata, tags, campaignId, priority
  - Validates phone uniqueness
  - Logs activity
  
- **PUT /api/leads/:id** - Update existing lead
  - Validates phone uniqueness across leads
  - Logs activity
  
- **POST /api/leads/bulk/tags** - Bulk update tags
  - Body: { leadIds, addTags, removeTags }
  - Merges tags efficiently
  
- **POST /api/leads/bulk/assign-campaign** - Bulk assign campaign
  - Body: { leadIds, campaignId }
  
- **POST /api/leads/import** - CSV import
  - Body: { leads, campaignId }
  - Validates required fields
  - Detects duplicates by phone
  - Returns success/failed/duplicate counts
  
- **DELETE /api/leads/:id** - Archive lead (soft delete)
  - Sets status to 'archived'

### 2. Authentication Middleware (`websocket-server/src/middleware/auth.ts`)
- Bearer token authentication
- Validates user from database
- Checks active status
- Injects user into request object

### 3. Frontend API Client (`webapp/lib/api-client.ts`)
- Lead CRUD operations
- Bulk operations
- CSV import
- Campaign listing
- Auto-injects auth headers from localStorage

### 4. Lead List Page (`webapp/app/(platform)/leads/page.tsx`)
- Data table with sortable columns
- Search across name, email, phone, company
- Status filter
- Bulk selection with checkboxes
- Bulk tag addition dialog
- Bulk campaign assignment dialog
- Responsive design

### 5. CSV Import Page (`webapp/app/(platform)/leads/import/page.tsx`)
- File upload with drag-and-drop area
- Optional campaign assignment
- CSV parsing (handles case-insensitive columns)
- Import results with success/duplicate/error counts
- Error details display

### 6. Lead Detail Page (`webapp/app/(platform)/leads/[id]/page.tsx`)
- Contact information display
- Campaign badge with link
- Tags display
- Call history timeline
- Additional metadata (JSON)
- Back navigation

### 7. Campaign Routes (`websocket-server/src/routes/campaigns.ts`)
- Basic campaign listing for dropdown menus
- GET /api/campaigns

## Database Schema (from Prisma)
```prisma
model Lead {
  id           String        @id @default(auto()) @map("_id") @db.ObjectId
  name         String
  phone        String        @unique
  email        String?
  company      String?
  metadata     Json?
  tags         String[]      @default([])
  status       String        @default("new")
  priority     Int           @default(0)
  campaignId   String?       @db.ObjectId
  campaign     Campaign?     @relation(fields: [campaignId], references: [id])
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  lastCalledAt DateTime?
  callSessions CallSession[]
}
```

## CSV Format
Required columns:
- `name` - Lead's full name
- `phone` - Unique phone number

Optional columns:
- `email` - Email address
- `company` - Company name

Column names are case-insensitive (e.g., Name, NAME, name all work).

### Sample CSV (`sample-leads.csv`)
```csv
name,phone,email,company
John Doe,+1234567890,john@example.com,Acme Corp
Jane Smith,+1234567891,jane@example.com,Tech Solutions
```

## Activity Logging
All operations log to the ActivityLog table:
- `lead_created`
- `lead_updated`
- `lead_archived`
- `leads_bulk_tags_updated`
- `leads_bulk_campaign_assigned`
- `leads_imported`

## Integration Points
- Uses Prisma schema from SCO-001
- Integrates with Campaign model (SCO-004)
- Follows routing patterns from SCO-003
- Uses shadcn UI components
- Phone uniqueness enforced at DB level

## Testing Instructions

### 1. Start the servers:
```bash
# Terminal 1 - Backend
cd websocket-server
npm run dev

# Terminal 2 - Frontend
cd webapp
npm run dev
```

### 2. Test Lead Creation:
- Login (mock auth accepts any credentials)
- Navigate to /leads
- Leads page should load (empty initially)

### 3. Test CSV Import:
- Click "Import CSV"
- Upload `sample-leads.csv`
- Optionally assign to a campaign
- Click "Import Leads"
- Verify success/duplicate/error counts
- Click "View Leads"

### 4. Test Lead List:
- Verify all imported leads appear
- Test search functionality
- Test status filter
- Select multiple leads
- Click "Add Tags"
- Add comma-separated tags
- Verify tags appear

### 5. Test Lead Detail:
- Click on a lead name
- Verify contact information displays
- Verify tags display
- Call history should be empty initially

### 6. Test Bulk Campaign Assignment:
- Return to leads list
- Select multiple leads
- Click "Assign Campaign"
- Select a campaign (must exist in DB)
- Verify campaign appears in lead rows

## Environment Variables
Ensure these are set in `websocket-server/.env`:
```env
DATABASE_URL=mongodb://...
PORT=8081
```

And in `webapp/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8081/api
```

## Next Steps
- Implement real authentication with JWT
- Add lead editing UI
- Add pagination controls
- Add advanced filtering (tags, date ranges)
- Add export to CSV
- Add lead merge functionality
- Add duplicate detection during manual creation
- Add campaign creation from leads page
- Add lead notes/comments
- Add file attachments

## Files Created/Modified

### Backend:
- `websocket-server/src/middleware/auth.ts` (new)
- `websocket-server/src/routes/leads.ts` (new)
- `websocket-server/src/routes/campaigns.ts` (new)
- `websocket-server/src/server.ts` (modified)

### Frontend:
- `webapp/lib/api-client.ts` (new)
- `webapp/app/(platform)/leads/page.tsx` (modified)
- `webapp/app/(platform)/leads/import/page.tsx` (modified)
- `webapp/app/(platform)/leads/[id]/page.tsx` (modified)

### Other:
- `sample-leads.csv` (new)
