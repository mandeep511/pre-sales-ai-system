# Campaign Management System Setup Guide

This guide explains how to set up and use the complete campaign management system with CRUD functionality.

## Features Implemented

### Backend (websocket-server)
- ✅ Prisma ORM with SQLite database
- ✅ Complete database schema (User, Campaign, Lead, CallSession, etc.)
- ✅ RESTful API routes for campaign CRUD operations
- ✅ Authentication middleware with session management
- ✅ Activity logging for audit trail
- ✅ Config versioning for campaigns
- ✅ Demo user and campaign seed data

### Frontend (webapp)
- ✅ Campaign list page with stats
- ✅ Campaign creation form with validation
- ✅ Campaign detail view
- ✅ Campaign edit functionality
- ✅ Campaign archive (soft delete)
- ✅ API client for backend communication

## Setup Instructions

### 1. Install Dependencies

```bash
# Backend
cd websocket-server
npm install

# Frontend
cd ../webapp
npm install
```

### 2. Database Setup

The database is already initialized with:
- Demo user (email: demo@example.com, password: demo123)
- Demo campaign for testing

To reset the database:

```bash
cd websocket-server
rm -f prisma/dev.db
npx prisma db push
npx ts-node prisma/seed.ts
```

### 3. Environment Variables

Backend `.env` is already configured with:
```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="your-secret-key"
OPENAI_API_KEY="your-openai-api-key"
PORT=8081
```

### 4. Start the Servers

```bash
# Terminal 1: Start backend
cd websocket-server
npm run dev

# Terminal 2: Start frontend
cd webapp
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8081
- Campaigns UI: http://localhost:3000/campaigns

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get single campaign
- `POST /api/campaigns` - Create new campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Archive campaign

## Database Schema

### Campaign Model
```typescript
{
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  systemPrompt: string
  callGoal?: string
  voice: string
  postCallForm: string (JSON)
  tools: string (JSON)
  batchSize: number
  callGap: number
  maxRetries: number
  priority: number
}
```

## Usage Guide

### Creating a Campaign

1. Navigate to `/campaigns`
2. Click "New Campaign"
3. Fill in the form:
   - **Basic Information**: Name, description, status
   - **AI Configuration**: System prompt, call goal, voice
   - **Queue Settings**: Batch size, call gap, max retries, priority
4. Click "Create Campaign"

### Editing a Campaign

1. Go to campaign detail page
2. Click "Edit" button
3. Modify fields
4. Click "Save Changes"

Config changes are automatically versioned for audit trail.

### Archiving a Campaign

1. Go to campaign detail page
2. Click "Archive" button
3. Confirm deletion

Campaign is soft-deleted (status set to 'archived').

## Testing with Demo Data

Login credentials:
- Email: `demo@example.com`
- Password: `demo123`

A demo campaign is pre-created for testing all CRUD operations.

## Next Steps

The basic CRUD functionality is complete. Future enhancements:

1. **Tools Configuration** - UI for managing campaign tools
2. **Post-Call Forms** - Dynamic form builder
3. **Lead Management** - Import/manage leads for campaigns
4. **Queue Integration** - Trigger calls based on campaign settings
5. **Analytics** - Campaign performance metrics
6. **Real-time Updates** - WebSocket updates for call status

## File Structure

```
websocket-server/
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts              # Seed data script
│   └── dev.db               # SQLite database
├── src/
│   ├── routes/
│   │   ├── campaigns.ts     # Campaign CRUD routes
│   │   └── auth.ts          # Auth routes
│   ├── middleware/
│   │   └── auth.ts          # Auth middleware
│   ├── lib/
│   │   └── prisma.ts        # Prisma client
│   └── server.ts            # Express server

webapp/
├── app/(platform)/
│   ├── campaigns/
│   │   ├── page.tsx         # Campaign list
│   │   ├── new/page.tsx     # Create campaign
│   │   └── [id]/
│   │       ├── page.tsx     # Campaign detail
│   │       └── edit/page.tsx # Edit campaign
│   └── layout.tsx           # Platform layout
├── components/
│   └── campaign-form.tsx    # Reusable campaign form
└── lib/
    └── api-client.ts        # API client functions
```

## Troubleshooting

### "Unauthorized" errors
Make sure to login first using the demo credentials. Session cookies are used for authentication.

### Database errors
Reset the database with:
```bash
cd websocket-server
rm -f prisma/dev.db
npx prisma db push
npx ts-node prisma/seed.ts
```

### CORS errors
Ensure both servers are running and CORS is configured for `http://localhost:3000`.

### Type errors
Run TypeScript build to check for errors:
```bash
cd websocket-server
npm run build
```
