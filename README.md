# RevApp

Instagram-style app for cars. One Expo codebase runs as a website, an iPhone app and an Android app, backed by Supabase (accounts, database, photo storage, realtime).

## Features

- **Accounts** — email + password sign-up/sign-in; sessions persist until you sign out; delete your account (and everything in it) from Edit profile
- **Feed** — newest posts first, loads more as you scroll, pull to refresh; the retro banner header slides away as you scroll down and returns when you scroll up; an Everyone / Following switch and a "Car of the week" card (most-liked post of the last 7 days) sit at the top; tap the Feed tab to jump to the top; a "new posts" pill appears when others post
- **Posts** — up to 10 photos (a swipeable carousel with page dots; arrows on desktop web) or one video (up to 60 seconds) + car (year/make/model suggestions from NHTSA) + caption; "…" menu on your own posts to edit the caption or delete
- **Videos** — play muted and loop when they scroll into view, like Instagram; tap for sound (it stays on for the next video), double-tap to like; grids show a play icon; the post page has full playback controls
- **Upload safety** — only real photos (JPEG, PNG, WebP, HEIC) and videos (MP4, MOV, 1–60 s, 50 MB) are accepted, checked by their actual bytes, not the file name. Every photo is re-encoded on the device, which strips GPS location and camera details and turns HEIC into JPEG. Tiny or stretched images are refused. The database enforces the same types, sizes, folders and file names, and rate-limits posts, comments, listings, threads, meets and garage cars
- **Post page** — photo (tap for full screen), car, caption and comments; opened from the feed, grids, Activity and shared links
- **Likes** — tap the heart or double-tap the photo; tap the count to see who liked it
- **Comments** — the car button opens comments; like comments with the heart, reply (one level, starting with @name so they're notified), delete your own (and its replies)
- **Hashtags & mentions** — #tags and @usernames in captions, comments and forum posts are tappable: a tag opens search for it, a mention opens that driver's profile; mentioning someone in a caption or comment notifies them (Activity, toast and push)
- **Saves** — bookmark any post; private "Saved" section on your profile
- **Profile tabs** — Posts, Videos and Saved on your own profile
- **Share** — system share sheet (or copy link on desktop browsers)
- **Profiles** — tap any username to see that person's garage; edit your username, bio and profile picture
- **Follow** — follow drivers from their profile; follower/following counts and lists; an Everyone / Following switch at the top of the feed; "started following you" in Activity, the in-app horn toast and push
- **Report & block** — "…" on any post (and long-press a comment, the flag on forum threads and replies, "Report listing" in the market) to report it with a reason; it disappears for you, and anything 3 people report is hidden for everyone but its owner. Block from a post or a profile: neither of you sees the other's posts, comments, threads, listings or garage, follows end, and they can't like or comment on yours. Manage blocks in Edit profile → Blocked accounts
- **My Garage** — add your cars (year/make/model, nickname, mods) with a photo of each one
- **Car pages** — every garage car has its own page (photo, mods, owner) with a build log of the posts it's tagged in; tag one of your cars when posting and the car name in the feed links to it
- **Search** — magnifier in the feed header finds drivers by username and builds by car or caption; before you type, it shows the week's trending #tags
- **Activity** — heart button in the feed header lists likes, comments, new followers and mentions, with an unread badge
- **Notifications** — car-horn pop-up while the app is open; push notifications with the horn sound when it's closed (development/store builds only)
- **Forums** — threads in General, Builds, Tech Help, Meets and Off-Topic, with replies; search, sort (Active / New / Top / Unanswered), "Mine" and category filters
- **Market** — buy and sell cars, parts, wheels and accessories: 2-column glass grid with price badges, search, category chips, price sorting, sold items; listing pages with seller card and contact line; sellers mark items sold or delete them
- **About** — story, features, community guidelines and a feedback shortcut
- **App colors** — five full palettes previewed live; voting for one also switches your device to it (the app restarts to repaint). The app-wide default is `DEFAULT_THEME_ID` in `constants/Colors.ts`
- **Glass UI** — frosted translucent cards over soft theme-colored glows; real blur on the tab bar, notification banner and menus
- **Events** — car meets on a map (OpenStreetMap tiles, no API key): host a meet with a searchable location, RSVP "going", get directions, and see photos of the garage cars of everyone going

## Project layout

| Path | What's there |
| --- | --- |
| `app/` | Screens (Expo Router). `(tabs)/` = Feed, Events, Forums, Post, Market, About, Profile; `comments/` (post page), `user/`, `follows/` (followers/following), `blocked`, `activity`, `search`, `edit-post/`, `edit-profile`, `likes/`, `events/new`, `events/[id]`, `forums/new`, `forums/[id]`, `garage/edit`, `garage/[carId]` (car page), `themes`, `market/new`, `market/[id]` are stacked screens |
| `components/` | UI pieces: `GarageTabBar` (raised center Post button), `GarageSection`, `PostVideo`, `SafetyActions` (report sheet + block confirm), `FollowStats`, `RichText` (tappable #tags and @mentions), `CarOfTheWeek`, `MediaCarousel`, `ThemePreview`, `PostCard`, `PostGrid`, `FeedHeader` (SVG banner), `TileMap`, `Avatar`, `OptionsSheet`, `CarDetailsInput`, `NotificationToaster`, … |
| `context/` | App state: `AuthContext` (session), `GarageContext` (feed, likes, saves, posting), `ActivityContext` (realtime notifications + unread count), `ProfilesContext` (bio/picture cache) |
| `lib/` | Data + helpers: `supabase`, `posts`, `media` (validated photo/video picker + upload check), `mediaRules` (upload limits, byte sniffing), `videoPoster`, `videoSound`, `safety` (reports, blocks), `follows`, `richText` (tag/mention tokenizer), `comments`, `activity`, `search`, `push`, `vehicles`, `share`, `confirm`, `time`, `layout`, `useNewPostsCount`, `profiles`, `events`, `geo` (map math), `geocode` (place search), `datetime`, `cars`, `forums`, `themeVotes` |
| `constants/` | `themes.ts` (all palettes), `Colors.ts` (picks the active one), `glass.ts` (shared glass card style) |
| `tests/` | Unit tests for pure helpers (`npm test`, Node's built-in runner) |
| `supabase/migrations/` | Database schema, run in order in the Supabase SQL Editor |
| `scripts/deploy-web.mjs` | Publishes the website (see below) |

## Setup

1. `npm install`
2. Create `.env` with your Supabase project's values (Project Settings → API):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>
   # optional: public website, so posts shared from phones link to the web page
   EXPO_PUBLIC_WEB_URL=https://garage.expo.app
   ```
3. In the Supabase SQL Editor, run every file in `supabase/migrations/` in filename order (each one once).

## Run it

```bash
npx expo start        # press w for web, or open on a phone
npm run web           # web only
npm run lint          # ESLint
npx tsc --noEmit      # type-check
npm test              # unit tests for pure helpers
```

`expo-dev-client` is installed, so `expo start` targets a development build by default; press **s** to switch to Expo Go.

## Publish the website

```bash
npm run deploy:web                      # build + deploy once, opens the public link
npm run deploy:web:watch                # redeploy automatically 30s after you stop saving
npm run deploy:web -- --domain=garage   # first deploy only: choose garage.expo.app
```

## CI/CD (GitHub Actions)

| Workflow | Runs on | What it does |
| --- | --- | --- |
| `.github/workflows/ci.yml` | every pull request | `expo lint`, `tsc --noEmit`, `npm test`, and a web export to prove the site builds |
| `.github/workflows/deploy.yml` | push to `main`, or manually | runs CI, then builds the website and publishes it to EAS Hosting (`eas deploy --prod`) |
| `.github/workflows/build.yml` | a `v*` tag (e.g. `v1.2.0`), or manually | runs CI, then starts an EAS build (pick profile/platform when run manually; optional store submit) |

One-time setup, in GitHub → Settings → Secrets and variables → Actions → **New repository secret**:

- `EXPO_TOKEN` — create at expo.dev → Account settings → Access tokens
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and optionally `EXPO_PUBLIC_WEB_URL` — the same values as your `.env` (used for the website build)

Native builds on EAS don't see GitHub secrets: add the `EXPO_PUBLIC_*` values as EAS environment variables (expo.dev → your project → Environment variables) for the profiles you build.

## Phone builds (needed for push notifications)

```bash
npx eas-cli@latest build --profile development --platform android   # or ios
```

Install the build from the link it prints, then `npx expo start`. **Video posts and photo cleaning use `expo-video` and `expo-image-manipulator`, so existing development builds must be rebuilt once.** Android push also needs a Firebase `google-services.json` and FCM V1 credentials uploaded with `npx eas-cli@latest credentials`; iOS needs a paid Apple Developer account. Rebuild only when you add native packages or change `app.json`.
