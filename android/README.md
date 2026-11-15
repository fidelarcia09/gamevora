# Gamers Gold Payment Reader (Android)

Private Android prototype for the Samsung Galaxy A05 / Android 15.

## Current scope

- Uses Android's user-granted Notification Listener access. It does not request `READ_SMS` or `RECEIVE_SMS`.
- Observes notification package identifiers so the user can select the messaging app explicitly.
- Processes notifications only from the selected package.
- Recognizes the documented ETECSA and PAGO×MOVIL formats only when the notification title contains the corresponding sender label and the notification body contains the full expected message.
- Persists only parsed payment fields in a private local SQLite database. Raw notification text is not stored or logged.
- No network calls, no Supabase integration, no automatic approval, and no GVR crediting.

## Important limitations

Notification Listener access is not equivalent to SMS access. Android or the messaging app may expose only shortened text, omit the sender label, group messages, or withhold content. The app must be tested on the actual Samsung device before relying on it.

The notification package name and notification title are not proof of the underlying SMS originating address. This prototype does not claim to authenticate the bank/provider sender. Every event remains pending human review.

## Open in Android Studio

Open this `android/` directory as an existing Gradle project. Use JDK 17 and Android SDK Platform 35. Gradle wrapper files are not included yet; generate/attach the wrapper from Android Studio before command-line builds.

## Device test

1. Install a debug build on the Samsung Galaxy A05.
2. Open the app and grant Notification Listener access explicitly in Android settings.
3. Wait for a normal notification from the messaging app.
4. Return to the app and select the package corresponding to Mensajes.
5. Verify the displayed package is the actual messaging app package.
6. Use a harmless test notification with the known sample format and verify that the parsed event appears locally.
7. Confirm unrelated notifications are ignored and raw notification text is not persisted.

Do not add credentials, service-role keys, real recipient account values, or real payment samples to this project.
