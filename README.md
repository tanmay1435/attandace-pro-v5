# Attandace Pro V10

Major-generation rebuild of the V5 web/Capacitor attendance app.

## Key V10 features
- Smart dashboard
- Batch-aware timetable (S1/S2/S3)
- Manual timetable editor
- Timetable photo upload/review flow
- One-tap attendance
- Holidays
- Semester profile
- Attendance analytics
- 14-day trend
- What-if planner
- Safe absence margin
- V5/V6/V10 JSON backup migration
- Dark/light theme
- Offline-first service worker
- Mobile-first UI

## Data migration
V10 automatically checks for `attandace_pro_v10` and then legacy `attandace_pro_v5` / `attandace_pro_v6` localStorage data. You can also use Settings → Import V5/V6/V10 backup.

## Signing
The included workflow builds a debug APK for easy testing. For future V10→V11 updates, configure a permanent Android release keystore in GitHub Actions secrets and sign every release with the same key. Do not commit a private keystore to a public repository.
