# RevApp

Instagram-style app for cars. One Expo codebase runs as a website, an iPhone app and an Android app, backed by Supabase (accounts, database, photo storage, realtime).

## Features

- **Accounts** — email + password sign-up/sign-in; sessions persist until you sign out; delete your account (and everything in it) from Edit profile
- **Feed** — newest posts first, loads more as you scroll, pull to refresh; the retro banner header slides away as you scroll down and returns when you scroll up; tap the Feed tab to jump to the top; a "new posts" pill appears when others post
- **Posts** — photo + car (year/make/model suggestions from NHTSA) + caption; "…" menu on your own posts to edit the caption or delete
- **Post page** — photo (tap for full screen), car, caption and comments; opened from the feed, grids, Activity and shared links
- **Likes** — tap the heart or double-tap the photo; tap the count to see who liked it
- **Comments** — the car button opens comments; delete your own
- **Saves** — bookmark any post; private "Saved" section on your profile
- **Share** — system share sheet (or copy link on desktop browsers)
- **Profiles** — tap any username to see that person's garage; edit your username, bio and profile picture
- **My Garage** — add your cars (year/make/model, nickname, mods, photo) and get a 2D side-view render in 11 model-style silhouettes (911-style, muscle, roadster, JDM, supercar, off-roader, coupe, sedan, hatch, SUV, truck), auto-matched from the make/model, with your paint, wheels and stance
- **Search** — magnifier in the feed header finds drivers by username and builds by car or caption
- **Activity** — heart button in the feed header lists likes and comments on your posts, with an unread badge
- **Notifications** — car-horn pop-up while the app is open; push notifications with the horn sound when it's closed (development/store builds only)
- **Forums** — threads in General, Builds, Tech Help, Meets and Off-Topic, with replies; search, sort (Active / New / Top / Unanswered), "Mine" and category filters
- **Marketplace** — placeholder tab
- **App colors** — five full palettes previewed live; voting for one also switches your device to it (the app restarts to repaint). The app-wide default is `DEFAULT_THEME_ID` in `constants/Colors.ts`
- **Glass UI** — frosted translucent cards over soft theme-colored glows; real blur on the tab bar, notification banner and menus
- **Events** — car meets on a map (OpenStreetMap tiles, no API key): host a meet with a searchable location, RSVP "going", get directions

## Project layout

| Path | What's there |
| --- | --- |
| `app/` | Screens (Expo Router). `(tabs)/` = Feed, Events, Post, Profile; `comments/` (post page), `user/`, `activity`, `search`, `edit-post/`, `edit-profile`, `likes/`, `events/new`, `events/[id]`, `forums/new`, `forums/[id]`, `garage/edit`, `themes` are stacked screens |
| `components/` | UI pieces: `GarageTabBar` (raised center Post button), `CarRender`, `GarageSection`, `ThemePreview`, `PostCard`, `PostGrid`, `FeedHeader` (SVG banner), `TileMap`, `Avatar`, `OptionsSheet`, `CarDetailsInput`, `NotificationToaster`, … |
| `context/` | App state: `AuthContext` (session), `GarageContext` (feed, likes, saves, posting), `ActivityContext` (realtime notifications + unread count), `ProfilesContext` (bio/picture cache) |
| `lib/` | Data + helpers: `supabase`, `posts`, `comments`, `activity`, `search`, `push`, `vehicles`, `share`, `confirm`, `time`, `layout`, `useNewPostsCount`, `profiles`, `events`, `geo` (map math), `geocode` (place search), `datetime`, `cars`, `forums`, `themeVotes` |
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

## Phone builds (needed for push notifications)

```bash
npx eas-cli@latest build --profile development --platform android   # or ios
```

Install the build from the link it prints, then `npx expo start`. Android push also needs a Firebase `google-services.json` and FCM V1 credentials uploaded with `npx eas-cli@latest credentials`; iOS needs a paid Apple Developer account. Rebuild only when you add native packages or change `app.json`.
