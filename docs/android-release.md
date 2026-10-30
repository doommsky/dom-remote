# Android Release Build

## Required GitHub Secrets
- ANDROID_KEYSTORE_BASE64
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD

## Generate Keystore
keytool -genkeypair -v -keystore release.keystore -alias myalias -keyalg RSA -keysize 2048 -validity 10000

## Trigger
Push to feature/p0-session-expiry or run workflow_dispatch.

## Artifact
Download `app-release` from workflow artifacts.