# CREW - Product Requirements Document
## "Find your people. Race your best." by Grape Labs AI

### Architecture
- **Frontend**: React 18 (CRA + CRACO) + Tailwind CSS + Framer Motion
- **Backend**: Supabase (Auth + PostgreSQL + Storage + Realtime)
- **Auth**: Email magic link via Supabase OTP
- **Hosting**: Emergent preview environment

### User Personas
1. **Hyrox Athletes** - Looking for training partners by station strengths, category, target race
2. **Marathon Runners** - Seeking pace-matched partners for long runs, tempo, race day
3. **Ironman/Triathlon Athletes** - Finding swim/bike/run partners for brick sessions

### Core Requirements (Static)
- Athlete matching by sport, location, level, goals, training time
- Email magic link auth (no password)
- Multi-step onboarding wizard (sport-specific questions)
- Connection request system with WhatsApp integration
- Events listing from Supabase (public, no auth needed)
- Dark/Light theme toggle
- Protected routes for authenticated content
- Grape Labs AI branding throughout

### What's Been Implemented (April 2026)
- [x] Complete home page: hero, stats, sport cards, featured athletes, events teaser, Grape Labs CTA band, marquee
- [x] How It Works page with timeline and FAQ accordion
- [x] Events page (public) with real Supabase data, filter chips, countdown
- [x] About page with Grape Labs AI feature cards
- [x] Get Started onboarding: auth step, sport-select, Hyrox/Marathon/Ironman sport-specific steps, profile details, location, done screen
- [x] Auth Callback for magic link token exchange
- [x] Find a Partner page with filters (sport, city, level, gender) and matching algorithm
- [x] Athlete Profile page with stats grid, sport-specific details, connection actions
- [x] My Connections page with tabs (Matches, Received, Sent, Saved)
- [x] Edit Profile page with photo upload and delete account
- [x] Privacy Policy (full legal text)
- [x] Terms & Conditions (full legal text)
- [x] Sticky nav with wordmark logo, theme toggle, responsive mobile menu
- [x] Footer with Grape Labs AI SVG logo
- [x] Protected route enforcement
- [x] Client-side matching algorithm (calcMatchScore + generateWhyMatched)
- [x] Supabase integration (auth, profiles, events, connect_requests, matches, reports, saved_profiles)
- [x] Seed profiles as static fallback data

### Prioritized Backlog
**P0 (Critical)**
- [ ] Supabase Edge Function code for email notifications (notify-connection-request, notify-connection-accepted)
- [ ] Event sync Edge Function (sync-events)

**P1 (Important)**
- [ ] Profile photo upload with circular crop preview
- [ ] Real-time notification badge for pending requests (Supabase Realtime)
- [ ] Profile completeness scoring and nudges
- [ ] Block user functionality with blocked_users table
- [ ] Auto-flag profiles with 3+ reports

**P2 (Nice to have)**
- [ ] Shareable profile URLs with Open Graph meta tags
- [ ] Post-onboarding invite flow
- [ ] Weekly digest emails
- [ ] Strava verification badge
- [ ] Event deep link pages (/events/:slug)

### Next Tasks
1. Deploy Edge Functions for email notifications
2. Implement real-time connection request notifications
3. Add profile photo circular crop and upload
4. Build event detail pages (/events/:slug)
5. Add profile completeness scoring
