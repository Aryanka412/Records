# Records

**A music review platform** — rate songs, albums, and artists, share reviews with a community, and keep a personal music diary.

Built as a full-stack web project for internship applications, Records combines a cinematic dark UI with real music data from Spotify and Last.fm, plus auth, profiles, and social features powered by Supabase.

---

## Features

- **Search** — Find songs, albums, and artists with live results
- **Dynamic music pages** — Dedicated song, album, and artist pages with metadata, artwork, and community reviews
- **Authentication** — Sign up / log in with Supabase Auth
- **Public profiles** — View other users’ reviews, followers, and following
- **Reviews** — Create, edit, and delete song, album, and artist reviews with ratings
- **Likes** — Like reviews from the community
- **Comments** — Discuss reviews with threaded comments
- **Avatar upload** — Profile photos stored with Supabase Storage
- **API integrations** — Spotify (catalog, covers, search) and Last.fm (trending, artist info, stats)

---

## Tech Stack

| Layer | Tools |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript |
| Styling / motion | Tailwind CSS, Framer Motion |
| Backend / auth | Supabase Auth, Supabase Database (Postgres), Supabase Storage |
| Music data | Spotify Web API, Last.fm API |

---


## Environment Variables

Copy `.env.example` to `.env.local` and fill in your own credentials. **Never commit real keys.**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: newer publishable key if your project uses it
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Spotify (Client Credentials)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Last.fm
LASTFM_API_KEY=your_lastfm_api_key

# Optional
# SPOTIFY_MARKET=CA
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon / publishable key (safe for the browser with RLS) |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Server-side Spotify auth for search & catalog |
| `LASTFM_API_KEY` | Trending charts, artist bios, and stats |

Where to get keys:

- **Supabase** → Project Settings → API  
- **Spotify** → [Developer Dashboard](https://developer.spotify.com/dashboard) → create an app  
- **Last.fm** → [API account](https://www.last.fm/api/account/create)

---

## Local Setup

### Prerequisites

- Node.js 18+ (recommended: current LTS)
- npm
- A Supabase project
- Spotify and Last.fm API credentials

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/musicbox.git
cd musicbox
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your keys (see above).

### 3. Set up the database

In the Supabase SQL Editor, run the schema in:

```text
supabase/schema.sql
```

That creates tables for profiles, reviews, likes, comments, follows, and notifications, plus storage-related setup as defined in the file. Enable Row Level Security policies as documented in that schema.

### 4. Configure Storage (avatars)

In Supabase → Storage, ensure an avatars (or equivalent) bucket exists and matches the policies in `supabase/schema.sql` so authenticated users can upload profile images.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

```bash
npm run dev    # development server
npm run build  # production build
npm run start  # run production build
npm run lint   # ESLint
```

---

## Project Structure (high level)

```text
app/                 # Next.js App Router pages & API routes
  album|artist|song/ # Dynamic music pages
  discover/          # Search
  profile|user/      # Private & public profiles
  api/               # Backend route handlers (Spotify, Last.fm, reviews, etc.)
  components/        # Shared UI (shell, sidebar, reviews, etc.)
lib/                 # Spotify, Supabase, DB helpers
supabase/schema.sql  # Database schema
```

---

## Future Improvements

- Personalized feed based on follows and listening taste
- Lists / “listen later” collections (Letterboxd-style)
- Stronger recommendation surface (similar artists / albums)
- Email digests or richer in-app notification preferences
- Deployed production build with CI and environment separation
- Accessibility and performance audits (Lighthouse, keyboard flows)
- Optional Redis / edge caching for Spotify & Last.fm responses

---

## What I Learned

Building Records pushed me past tutorial-level Next.js into a real product shape. I learned how to wire third-party music APIs into a clean App Router backend, keep secrets on the server, and still ship a fast search and detail experience. On the product side, designing auth, profiles, reviews, likes, and comments forced me to think about data models, RLS, and storage — not just UI. I also spent a lot of time on visual consistency: making home, discover, and entity pages feel like one app instead of a pile of screens. Most importantly, I got better at scoping features, debugging API failures (expired tokens, empty stats, auth edge cases), and shipping something I’d actually want to show in an internship interview.
