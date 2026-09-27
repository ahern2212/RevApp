# Garage

Instagram-style app for cars. One Expo codebase runs as a website and as an iPhone app.

## What this first version does

- Pick a handle
- Scroll a feed of car photos
- Like posts
- Post a photo with a car name and caption
- See your posts on a profile

Posts and likes are stored on the device for now. A real backend (accounts, cloud photos, following) comes later.

## Run it

```bash
npm install
npm run web
```

On an iPhone, install the [Expo Go](https://expo.dev/go) app, then run `npx expo start` and scan the QR code. Shipping to the App Store needs a Mac, an [Apple Developer](https://developer.apple.com) account, and `npx eas build`.
