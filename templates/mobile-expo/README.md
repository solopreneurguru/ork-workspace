# {{APP_NAME}} - Mobile App

{{DESCRIPTION}}

## Template Variables

- `{{APP_NAME}}` - Application name
- `{{APP_NAME_LOWER}}` - Lowercase app name for package/bundle IDs
- `{{BUNDLE_ID}}` - Bundle identifier prefix
- `{{DESCRIPTION}}` - App description
- `{{AUTH_PROVIDER}}` - Auth provider
- `{{HAS_MONETIZATION}}` - Monetization flag
- `{{MONETIZATION_TYPE}}` - Monetization type
- `{{PRICE_USD}}` - Price

## Stack

- **Framework:** Expo ~51.0.0
- **React Native:** 0.74.0
- **Auth:** {{AUTH_PROVIDER}}
- **Push Notifications:** expo-notifications
- **IAP:** expo-in-app-purchases (stub)

## Development

```bash
npm install
npm start
```

## Build & Deploy

```bash
# Android
eas build --platform android

# iOS
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

## Features

- Push notifications (expo-notifications)
- In-app purchases stub (expo-in-app-purchases)
- {{AUTH_PROVIDER}} authentication
{{#HAS_MONETIZATION}}
- {{MONETIZATION_TYPE}} monetization
{{/HAS_MONETIZATION}}
