# Question-Based Track Selection Implementation Guide

## Overview

This document outlines the implementation plan for adding question-based track selection to the Spot game website. Players will now answer questions and select tracks from the past year, rather than having their entire Spotify library automatically fetched.

## Current Flow (Before Changes)

1. Player visits website → Enters game code
2. Player authenticates with Spotify
3. Player's Spotify library is fetched automatically
4. Player joins game (tracks count sent to Supabase)
5. Host iOS app fetches tracks from Spotify API

## New Flow (After Changes)

1. Player visits website → Enters game code
2. Player authenticates with Spotify
3. **Check if player already has answers for this game**
   - If yes → Show "Update Your Answers" screen
   - If no → Show question selection screen
4. **Question Selection Screen:**
   - Display all 20 active questions
   - Player selects 5+ questions (minimum required)
   - Show progress indicator
5. **Track Selection:**
   - For each selected question:
     - Show track selector/search interface
     - Filter tracks to past year only
     - Player selects one track per question
     - Save answer to Supabase immediately
6. **Ready Confirmation:**
   - After all selected questions answered → Show "Ready!" confirmation
   - Player can return anytime to update answers (before game starts)

---

## Database Schema

### Tables (Already Created in Supabase)

#### `questions` Table
- `id` (UUID) - Primary key
- `question_text` (TEXT) - e.g., "What's your favorite song to sing in the shower?"
- `display_order` (INTEGER) - For consistent ordering
- `is_active` (BOOLEAN) - Whether question is available
- `created_at`, `updated_at` - Timestamps

#### `player_question_answers` Table
- `id` (UUID) - Primary key
- `game_player_id` (UUID) - References `game_players.id`
- `question_id` (UUID) - References `questions.id`
- `track_id` (VARCHAR) - Spotify track ID
- `track_name`, `artist_name`, `album_name` - Track metadata
- `album_image_url` - Album art URL
- `release_year` - Year track was released
- `external_url` - Spotify track URL
- `preview_url` - 30-second preview URL (if available)
- `created_at`, `updated_at` - Timestamps
- **UNIQUE constraint** on `(game_player_id, question_id)` - Allows UPSERT

### Helper Functions (Available in Supabase)

- `player_has_minimum_answers(game_player_id, minimum)` → BOOLEAN
- `get_player_answer_count(game_player_id)` → INTEGER
- `get_game_readiness_status(game_id)` → `{total_players, ready_players, not_ready_players}`

---

## Implementation Approach

### Phase 1: Foundation (Supabase Service Layer)

**Goal:** Extend the service layer to support questions and answers

**Tasks:**
1. Add TypeScript interfaces for `Question` and `PlayerAnswer`
2. Extend `SupabaseService` with new methods:
   - `getActiveQuestions()` - Fetch all active questions
   - `getGamePlayerId(gameId, spotifyUserId)` - Get or create game player record
   - `getPlayerAnswers(gamePlayerId)` - Fetch existing answers
   - `saveAnswer(gamePlayerId, questionId, track)` - Save/update answer (UPSERT)
   - `checkPlayerReadiness(gamePlayerId)` - Check if player has minimum answers
3. Add Spotify search utilities:
   - `searchTracks(query, accessToken)` - Search Spotify API
   - `filterTracksByYear(tracks, yearsAgo)` - Filter to past year

**Files to Modify:**
- `src/lib/supabase.ts` - Add new methods
- `src/types/index.ts` - Add new interfaces
- `src/lib/spotify-search.ts` - New file for Spotify search

### Phase 2: Update Callback Flow

**Goal:** Route players to appropriate screen after authentication

**Tasks:**
1. Modify `callback/page.tsx`:
   - After `joinGame` succeeds, check for existing answers
   - Store access token in `sessionStorage` (temporary, for Spotify API calls)
   - Redirect to `/questions` (if no answers) or `/update-answers` (if answers exist)
   - Remove success message (replaced by new flow)

**Files to Modify:**
- `src/app/callback/page.tsx` - Update routing logic
- `src/lib/browser-storage.ts` - Add sessionStorage helpers if needed

### Phase 3: Question Selection Page

**Goal:** Let players choose which questions to answer (5+ minimum)

**Tasks:**
1. Create `/questions` page:
   - Fetch all active questions from Supabase
   - Display questions in `display_order`
   - Multi-select UI (checkboxes)
   - Progress indicator: "Selected: X/5 minimum"
   - "Continue" button (disabled until 5+ selected)
   - Store selected question IDs in state + localStorage
   - Navigate to `/tracks` with selected question IDs

**Files to Create:**
- `src/app/questions/page.tsx` - Main question selection page
- `src/components/question-selector.tsx` - Reusable question list component

### Phase 4: Track Selection Page

**Goal:** Let players select one track per question

**Tasks:**
1. Create `/tracks` page:
   - Receive selected question IDs from query params or state
   - Show one question at a time (or all with sections)
   - For each question:
     - Track search input (Spotify search API)
     - Filter: Only show tracks from past year
     - Track results display (album art, name, artist, year)
     - "Select" button for each track
   - Progress indicator: "Question X of Y"
   - Save each answer to Supabase immediately on selection
   - "Complete" button when all questions answered
   - Navigate to ready confirmation

**Files to Create:**
- `src/app/tracks/page.tsx` - Main track selection page
- `src/components/track-search.tsx` - Search input with debouncing
- `src/components/track-card.tsx` - Track display card

### Phase 5: Update Answers Page

**Goal:** Let returning players update their existing answers

**Tasks:**
1. Create `/update-answers` page:
   - Fetch existing answers from Supabase
   - Display current answers with option to change
   - Allow adding more questions (if they want to answer more than 5)
   - Allow removing questions (if they want to change selection, minimum 5)
   - Save updates to Supabase incrementally
   - Show readiness status

**Files to Create:**
- `src/app/update-answers/page.tsx` - Update answers page
- `src/components/answer-summary.tsx` - Summary of selected answers

### Phase 6: Ready Confirmation

**Goal:** Confirm player is ready and show summary

**Tasks:**
1. Update or create ready confirmation:
   - Show summary of answers
   - "You're all set!" message
   - Option to "Update Answers" (returns to update screen)
   - Link/QR code to share with host (if needed)

**Files to Modify/Create:**
- `src/app/success/page.tsx` - Update or create new ready page

---

## Technical Implementation Details

### Supabase Queries

#### Fetch Active Questions
```typescript
const { data: questions } = await supabase
  .from('questions')
  .select('*')
  .eq('is_active', true)
  .order('display_order', { ascending: true });
```

#### Check Existing Answers
```typescript
// First, get game_player_id from game_players table
const { data: gamePlayer } = await supabase
  .from('game_players')
  .select('id')
  .eq('game_id', gameId)
  .eq('spotify_user_id', spotifyUserId)
  .single();

// Then fetch answers
const { data: answers } = await supabase
  .from('player_question_answers')
  .select('*, questions(*)')
  .eq('game_player_id', gamePlayer.id);
```

#### Save/Update Answer (UPSERT)
```typescript
const { error } = await supabase
  .from('player_question_answers')
  .upsert({
    game_player_id: gamePlayerId,
    question_id: questionId,
    track_id: track.id,
    track_name: track.name,
    artist_name: track.artists[0].name,
    album_name: track.album.name,
    album_image_url: track.album.images[0]?.url,
    release_year: track.album.release_date?.substring(0, 4),
    external_url: track.external_urls.spotify,
    preview_url: track.preview_url
  }, {
    onConflict: 'game_player_id,question_id'
  });
```

#### Check Player Readiness
```typescript
// Using the helper function
const { data } = await supabase.rpc('player_has_minimum_answers', {
  p_game_player_id: gamePlayerId,
  p_minimum: 5
});
```

### Spotify API Integration

#### Search Tracks (with year filter)
```typescript
// Search tracks
const response = await fetch(
  `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=20`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

// Filter to past year client-side (Spotify API doesn't support date filtering)
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

const tracks = response.data.tracks.items.filter(track => {
  const releaseDate = new Date(track.album.release_date);
  return releaseDate >= oneYearAgo;
});
```

#### Alternative: Fetch User's Saved Tracks (then filter)
```typescript
// Get user's saved tracks
const response = await fetch(
  'https://api.spotify.com/v1/me/tracks?limit=50',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

// Filter to past year
const tracks = response.data.items
  .map(item => item.track)
  .filter(track => {
    const releaseDate = new Date(track.album.release_date);
    return releaseDate >= oneYearAgo;
  });
```

### State Management

**Local State Needed:**
- Selected question IDs (array)
- Answers map: `{ questionId: track }`
- Current question index (if showing one at a time)
- Loading states
- Error states

**Persistence:**
- Store in `localStorage` as backup (in case of refresh)
- Primary source of truth: Supabase
- Access token in `sessionStorage` (temporary, cleared on tab close)

### User Flow Logic

#### Initial Join Flow
1. Player enters game code
2. Authenticate with Spotify
3. Check if `game_player` record exists:
   - If NO → Create `game_player` record → Go to Question Selection
   - If YES → Check if answers exist:
     - If NO → Go to Question Selection
     - If YES → Go to Update Answers screen
4. Question Selection (if new or no answers):
   - Show all 20 questions
   - Player selects 5+
   - Store selected question IDs
5. Track Selection:
   - For each selected question:
     - Show track search/selector
     - Filter to past year
     - Player selects track
     - Save to Supabase immediately
6. Ready Confirmation

#### Returning Player Flow
1. Player enters game code
2. Authenticate with Spotify
3. Check existing answers
4. Show Update Answers screen:
   - Display current answers
   - Allow changing tracks
   - Allow adding more questions
   - Allow removing questions (if > 5)
5. Save updates
6. Ready Confirmation

---

## Validation & Error Handling

### Validation Rules
- ✅ Minimum 5 questions selected
- ✅ One track per selected question
- ✅ Track must be from past year
- ✅ All required fields present before saving

### Error Handling
- Network errors when saving to Supabase
- Spotify API rate limits (429 errors)
- Invalid game code
- Player already in game with different account
- Token expiration during track selection

### Error Recovery
- Retry failed saves
- Show clear error messages
- Allow user to retry operations
- Preserve state on errors (don't lose selections)

---

## UI/UX Considerations

### Question Selection
- Show all questions in a scrollable list
- Clear visual indication of selected questions
- Progress indicator: "Selected: X/5 minimum"
- Responsive design (mobile-friendly)
- Disable "Continue" until minimum met

### Track Selection
- Search with debouncing (300-500ms delay)
- Show loading states during search
- Show "No results" state
- Show track preview (if available)
- Clear indication of selected track per question
- Option to skip a question (if showing one at a time)
- Show release year prominently
- Visual indicator if track is outside date range

### Past Year Filter
- Clear messaging: "Only tracks from the past year"
- Show release year in track results
- Visual indicator if track is outside date range
- Helpful error if no tracks found in date range

### Progress Indicators
- Question selection: "X/5 minimum selected"
- Track selection: "Question X of Y answered"
- Overall: "X of Y questions complete"

---

## File Structure

```
src/
├── app/
│   ├── questions/
│   │   └── page.tsx          # Question selection page
│   ├── tracks/
│   │   └── page.tsx          # Track selection page
│   ├── update-answers/
│   │   └── page.tsx          # Update existing answers
│   ├── callback/
│   │   └── page.tsx          # Updated routing logic
│   └── success/
│       └── page.tsx          # Updated ready confirmation
├── components/
│   ├── question-selector.tsx # Question list with checkboxes
│   ├── track-search.tsx      # Search input with debouncing
│   ├── track-card.tsx        # Track display card
│   └── answer-summary.tsx    # Summary of selected answers
├── lib/
│   ├── supabase.ts           # Extended with new methods
│   ├── spotify-search.ts     # New file for Spotify search
│   └── browser-storage.ts    # Extended if needed
└── types/
    └── index.ts              # Extended with new interfaces
```

---

## Implementation Order

### Step 1: Foundation (Supabase Service Layer)
1. Add TypeScript interfaces to `src/types/index.ts`
2. Extend `SupabaseService` with new methods
3. Create `src/lib/spotify-search.ts` with search utilities
4. Test methods independently

### Step 2: Update Callback Flow
1. Modify `callback/page.tsx` to check for existing answers
2. Add sessionStorage helpers for access token
3. Update routing logic to redirect appropriately
4. Test authentication flow

### Step 3: Question Selection Page
1. Create `src/app/questions/page.tsx`
2. Create `src/components/question-selector.tsx`
3. Implement multi-select UI
4. Add validation (minimum 5)
5. Test question selection flow

### Step 4: Track Selection Page
1. Create `src/app/tracks/page.tsx`
2. Create `src/components/track-search.tsx`
3. Create `src/components/track-card.tsx`
4. Implement Spotify search with debouncing
5. Implement past year filtering
6. Implement incremental saving
7. Test track selection flow

### Step 5: Update Answers Page
1. Create `src/app/update-answers/page.tsx`
2. Create `src/components/answer-summary.tsx`
3. Implement answer fetching and display
4. Implement update functionality
5. Test update flow

### Step 6: Ready Confirmation
1. Update `src/app/success/page.tsx` or create new ready page
2. Show answer summary
3. Add "Update Answers" option
4. Test complete flow

### Step 7: Polish & Testing
1. Add error handling throughout
2. Add loading states
3. Improve mobile responsiveness
4. Test edge cases
5. Test with real Spotify accounts
6. Performance optimization

---

## Technical Decisions

### 1. Token Storage
- **Decision:** Use `sessionStorage` for access token
- **Rationale:** Temporary storage, cleared on tab close, more secure than localStorage
- **Alternative Considered:** localStorage (rejected - tokens should not persist)

### 2. State Persistence
- **Decision:** localStorage for selected questions (backup)
- **Rationale:** Preserve user selections if page refreshes
- **Primary Source:** Supabase (always authoritative)

### 3. Search Debouncing
- **Decision:** 300-500ms delay
- **Rationale:** Balance between responsiveness and API rate limits
- **Implementation:** Use `useDebounce` hook or `setTimeout`

### 4. Save Strategy
- **Decision:** Incremental (save immediately on selection)
- **Rationale:** Don't lose data if user closes browser, better UX
- **Alternative Considered:** Save all at end (rejected - risk of data loss)

### 5. Year Filtering
- **Decision:** Client-side filtering
- **Rationale:** Spotify API doesn't support date filters
- **Implementation:** Filter results after fetching from API

### 6. Progress Tracking
- **Decision:** Show "X of Y questions answered"
- **Rationale:** Clear feedback on progress
- **Implementation:** Track answered questions in state

---

## Testing Checklist

### Functionality
- [ ] Player can select 5+ questions
- [ ] Player can search and select tracks
- [ ] Past year filter works correctly
- [ ] Answers save to Supabase
- [ ] Returning players can update answers
- [ ] Minimum 5 questions validation works
- [ ] Can add more questions after initial 5
- [ ] Can remove questions (if > 5 minimum)
- [ ] UPSERT works correctly (updates existing answers)

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Spotify API rate limits handled
- [ ] Invalid game code handled
- [ ] Token expiration handled
- [ ] Error messages are clear and actionable

### UI/UX
- [ ] Mobile responsive design
- [ ] Loading states display correctly
- [ ] Progress indicators work
- [ ] Search debouncing works
- [ ] Track previews work (if implemented)
- [ ] Visual feedback on selections
- [ ] Clear error messages

### Edge Cases
- [ ] No tracks found in date range
- [ ] Player closes browser mid-selection
- [ ] Multiple tabs open
- [ ] Slow network conditions
- [ ] Very long track/artist names
- [ ] Special characters in search queries

### Integration
- [ ] Works with existing callback flow
- [ ] Supabase RLS policies allow operations
- [ ] Spotify API scopes are sufficient
- [ ] iOS app can read answers correctly

---

## Performance Optimization

### Search Optimization
- Debounce search input (300-500ms)
- Limit search results (20-50 tracks)
- Cache recent searches
- Show loading states

### Data Fetching
- Cache question list (fetch once, store in state)
- Incremental saves (don't wait until end)
- Optimistic UI updates
- Batch Supabase queries where possible

### Rendering
- Virtualize long lists (if needed)
- Lazy load track images
- Memoize expensive computations
- Use React.memo for components

---

## Security Considerations

### Token Handling
- ✅ Access token in sessionStorage (not localStorage)
- ✅ Clear token on tab close
- ✅ Never log tokens to console in production
- ✅ Validate token before API calls

### Input Validation
- ✅ Validate question IDs before saving
- ✅ Validate track data before saving
- ✅ Sanitize search queries
- ✅ Validate game codes

### Supabase RLS
- ✅ Ensure RLS policies allow INSERT/UPDATE/SELECT
- ✅ Verify player can only modify their own answers
- ✅ Verify game_player_id matches authenticated user

---

## Future Enhancements

### Potential Improvements
1. **Track Recommendations:** Suggest tracks based on user's listening history
2. **Batch Selection:** Allow selecting multiple tracks at once
3. **Playlist Import:** Import tracks from user's playlists
4. **Advanced Filters:** Filter by genre, popularity, etc.
5. **Track Preview:** Play 30-second previews before selection
6. **Answer Templates:** Save common answers for reuse
7. **Social Features:** See what friends selected (if privacy allows)

### Analytics
- Track question selection patterns
- Track search query patterns
- Track completion rates
- Track time to complete
- Track most popular questions

---

## Migration Notes

### For Existing Players
- Existing players with tracks will need to answer questions
- Can show migration screen or auto-select questions
- Preserve existing track data if possible

### Database Migrations
- No migrations needed (tables already exist)
- Ensure helper functions are created in Supabase
- Verify RLS policies are configured

---

## Summary

This implementation transforms the website from automatically fetching tracks to a question-based selection system where players:

1. **Select Questions:** Choose 5+ questions from 20 available
2. **Select Tracks:** Pick one track per question (from past year)
3. **Save Answers:** Answers saved incrementally to Supabase
4. **Update Anytime:** Can return to update answers before game starts

The database schema is ready. Focus on:
- UI/UX for question and track selection
- Integration with Supabase and Spotify APIs
- Validation and error handling
- Mobile-responsive design

The iOS app will handle game round generation using this data.

---

## Questions & Decisions Needed

1. **UI Style:** One question at a time or all questions visible?
2. **Search Source:** Search all Spotify or user's saved tracks?
3. **Track Limit:** Maximum tracks per question? (currently 1)
4. **Year Definition:** Calendar year or rolling 12 months?
5. **Preview:** Show 30-second previews before selection?
6. **Mobile App:** How will iOS app know when player is ready?

---

*Last Updated: [Date]*
*Status: Planning Phase*
