# REDA INVEST GAME Mobile

Native Android app built with React Native + Expo. This is not a WebView.

Built with Expo SDK 54 / React Native 0.81 so it can run with Expo tooling while staying aligned with the SDK compatibility check.

## Run

```bash
cd mobile-app
npm install
npx expo start
```

For Android emulator, the default API URL is:

```text
http://10.0.2.2:5000/api
```

For a real Android phone on the same Wi-Fi as your computer, use your computer LAN IP:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.20:5000/api"
npx expo start
```

The backend must already be running on port `5000`.

## Screens

- Login / Register
- Dashboard
- Games: spin wheel, scratch card, lucky box, daily reward
- Investments
- Withdrawals
- Bank info
- Gifts / coupons
- Tasks / earn points with Expo ImagePicker proof upload
- Admin panel for users, invite codes, coupons, tasks, reviews, coin rate, game limits, and activity

## Verification

The source was checked with:

```bash
npx expo install --check
npx expo export --platform android --output-dir dist-mobile-check
```
