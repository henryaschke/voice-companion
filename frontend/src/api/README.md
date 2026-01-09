# API & Data Architecture

## Overview

The frontend uses a **hybrid data approach** that combines:
- **Real backend data** from the FastAPI backend
- **Mock enrichments** for analytics features not yet implemented

This allows the UI to display rich, complete data while maintaining real-time sync with the backend.

## Architecture

```
Backend API (PersonWithStats)
         ↓
    people.ts (API client)
         ↓
  careHomeAdapter.ts (Transformer)
         ↓
    useCareHomeResidents.ts (React Hook)
         ↓
  CareHomeResidents.tsx (UI Component)
```

## Files

### `people.ts`
API client for fetching and creating people (seniors/patients).

**Key functions:**
- `fetchSeniors()` - Fetch all seniors with call statistics
- `fetchPatients()` - Fetch all patients with call statistics
- `createSenior(payload)` - Create a new senior
- `createPatient(payload)` - Create a new patient

### `careHomeAdapter.ts`
Transforms backend `PersonWithStats` to frontend `Resident` type.

**Key functions:**
- `transformPersonToResident(person)` - Transform single person
- `transformPeopleToResidents(people)` - Transform array of people
- `setMockEnrichment(id, data)` - Add mock data for testing
- `computeAttentionStatus(person)` - Compute attention level from real data
- `computeTrend(person)` - Compute trend indicator

**What uses real data:**
- ✅ `id`, `name`, `age`, `phone`
- ✅ `lastConversation` (from `last_call_at`)
- ✅ `conversationCount` (from `total_calls`)
- ✅ `attentionStatus` (computed from `avg_sentiment_score`, `calls_this_week`)
- ✅ `trend` (computed from sentiment)
- ✅ `steckbrief` (parsed from `personal_context_json`, `address_json`)

**What uses mock enrichments (temporary):**
- 🎭 `repeatedThemes` - Will come from call transcript analysis
- 🎭 `missedConversations` - Will come from scheduled call tracking
- 🎭 `shortenedConversations` - Will come from duration analytics
- 🎭 `attentionReasons` - Will come from detailed analytics

### `useCareHomeResidents.ts`
React hook that manages residents data fetching and state.

**Returns:**
- `residents` - Array of transformed residents
- `aggregatedInsights` - Computed statistics
- `isLoading` - Loading state
- `error` - Error message if any
- `refetch()` - Function to reload data

## Data Flow: Creating a New Resident

1. User fills out form in `AddUser.tsx`
2. Form submits to backend via `createSenior()`
3. Backend creates `Person` record and returns `PersonWithStats`
4. User navigates to care home residents page
5. `useCareHomeResidents` hook fetches all seniors
6. `careHomeAdapter` transforms backend data to `Resident` format
7. New resident appears immediately in the list! ✨

## Mock Enrichments

Mock enrichments are stored in `careHomeAdapter.ts` as a simple object:

```typescript
const mockEnrichments: Record<number, MockEnrichment> = {
  1: {
    attentionStatus: "bitte_pruefen",
    trend: "down",
    repeatedThemes: [
      { theme: "Einsamkeit", timeContext: "seit 3 Tagen" }
    ],
    missedConversations: 2,
    shortenedConversations: 1,
  }
};
```

**To add mock data for testing:**
```typescript
import { setMockEnrichment } from "@/api/careHomeAdapter";

setMockEnrichment(123, {
  attentionStatus: "beobachtung",
  repeatedThemes: [
    { theme: "Familie", timeContext: "diese Woche" }
  ],
  missedConversations: 1,
});
```

## Gradually Moving to Real Data

As backend features are implemented, update `careHomeAdapter.ts`:

1. **When transcript analysis is ready:**
   ```typescript
   repeatedThemes: person.analyzed_themes || enrichment.repeatedThemes
   ```

2. **When scheduled calls are tracked:**
   ```typescript
   missedConversations: person.missed_calls_count || enrichment.missedConversations
   ```

3. **Remove mock enrichments when all features are implemented**

## Environment Setup

Create `.env` in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Testing

1. **Start backend:**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Create a test senior:**
   - Navigate to "Bewohner hinzufügen"
   - Fill out form
   - Submit

4. **Verify it appears:**
   - Navigate to "Bewohnerübersicht"
   - Your new resident should appear immediately!

## API Authentication

Currently using simple token-based auth. Add `ADMIN_TOKEN` to backend `.env`:

```env
ADMIN_TOKEN=dev-admin-token
```

The frontend will need to send this in headers when authentication is fully implemented.

## Future Enhancements

- [ ] Add real-time updates via WebSocket
- [ ] Implement advanced analytics in backend
- [ ] Add caching layer (React Query / SWR)
- [ ] Remove all mock enrichments
- [ ] Add optimistic UI updates
- [ ] Implement proper authentication flow

