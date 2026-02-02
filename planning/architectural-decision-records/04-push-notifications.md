# ADR-04: Push Notification Strategy

**Status:** Accepted  
**Date:** 2026-02-02  
**Deciders:** Project Team

## Context

The Ask-a-Human platform needs to notify human participants when new questions are available. Key requirements:

- Work on both Android and iOS mobile browsers
- No native app required (PWA only)
- Users control notification frequency
- Must handle iOS PWA limitations gracefully
- Scale to thousands of concurrent users

## Decision

### Technology Choice: Firebase Cloud Messaging (FCM)

We will use **Firebase Cloud Messaging** for web push notifications, despite the rest of our stack being AWS.

**Rationale:**
- Best-in-class web push support
- Handles platform differences (Android/iOS) transparently
- Free at our expected scale
- Well-documented, reliable service
- Already have Firebase project configured (`ask-a-human-poc`)

**Firebase SDK Version:** 12.8.0 ([Release Notes](https://firebase.google.com/support/release-notes/js))

**Credentials:** Service account key stored at `secrets/ask-a-human-poc-firebase-adminsdk-fbsvc-3a666671a0.json` (see [Infrastructure Accounts](../fundamentals/01-available-infrastructure-accounts-and-services.md))

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Lambda    │────►│     FCM     │────►│   Browser   │
│ (Dispatcher)│     │   (Google)  │     │ (PWA + SW)  │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲
       │
┌─────────────┐
│     SQS     │
│ (Job Queue) │
└─────────────┘
```

### Platform Support

| Platform | Support | Requirements |
|----------|---------|--------------|
| Android (Chrome) | Full | Service worker, HTTPS |
| Android (Firefox) | Full | Service worker, HTTPS |
| iOS (Safari) | Partial | PWA installed to home screen, iOS 16.4+ |
| Desktop (Chrome/Firefox/Edge) | Full | Service worker, HTTPS |

### iOS Limitations

iOS web push has specific requirements:
1. User must "Add to Home Screen" (installed PWA)
2. Only works on iOS 16.4 and later
3. Safari-specific implementation

**UX Mitigation:**
- Clear onboarding explaining the home screen requirement
- Visual guide showing how to add to home screen
- Graceful fallback messaging for unsupported browsers

---

## Subscription Flow

### 1. User Opts In (Frontend)

```javascript
// Check support
const supported = 'Notification' in window && 'serviceWorker' in navigator;

// Request permission
const permission = await Notification.requestPermission();

// Register service worker
const registration = await navigator.serviceWorker.register('/sw.js');

// Get FCM token
const token = await getToken(messaging, {
  vapidKey: 'YOUR_VAPID_KEY',
  serviceWorkerRegistration: registration
});

// Send to backend
await fetch('/human/push/subscribe', {
  method: 'POST',
  body: JSON.stringify({
    fcm_token: token,
    min_interval_minutes: 30
  })
});
```

### 2. Backend Stores Subscription

```
Subscriptions Table:
- subscription_id: uuid
- fcm_token: string
- min_interval_minutes: number
- last_notified_at: timestamp
- active: boolean
```

### 3. Token Refresh Handling

FCM tokens can expire or change. The service worker handles refresh:

```javascript
// In service worker
onTokenRefresh(messaging, async (newToken) => {
  await fetch('/human/push/subscribe', {
    method: 'PUT',
    body: JSON.stringify({ fcm_token: newToken })
  });
});
```

---

## Notification Dispatch

### Trigger Conditions

Notifications are dispatched when:
1. New question is created (immediate fan-out)
2. Question is under-answered after N minutes (catch-up)
3. Periodic check finds users due for notification

### Dispatch Algorithm

```python
def dispatch_notifications(question):
    # 1. Find eligible subscriptions
    eligible = subscriptions.query(
        active=True,
        last_notified_at < now() - min_interval
    )
    
    # 2. Over-notify (humans are flaky)
    # Target 3x required responses
    target_count = question.required_responses * 3
    
    # 3. Randomly sample eligible users
    selected = random.sample(eligible, min(target_count, len(eligible)))
    
    # 4. Send notifications
    for sub in selected:
        fcm.send(sub.fcm_token, notification_payload)
        sub.update(last_notified_at=now())
```

### Notification Payload

```json
{
  "notification": {
    "title": "Help an AI decide",
    "body": "A quick question needs your opinion (30s)",
    "icon": "/icons/notification-icon.png",
    "badge": "/icons/badge-icon.png"
  },
  "data": {
    "question_id": "q_abc123",
    "url": "/q/abc123",
    "type": "text"
  },
  "webpush": {
    "fcm_options": {
      "link": "https://ask-a-human.com/q/abc123"
    }
  }
}
```

### Rate Limiting

Per-user rate limiting respects `min_interval_minutes`:
- Default: 30 minutes
- Minimum: 5 minutes
- Maximum: 1440 minutes (24 hours)

---

## Service Worker

### Registration

```javascript
// sw.js
// Firebase JS SDK v12.8.0 - https://firebase.google.com/support/release-notes/js
importScripts('https://www.gstatic.com/firebasejs/12.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "...",
  projectId: "ask-a-human-poc",
  messagingSenderId: "...",
  appId: "..."
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification;
  const { url } = payload.data;
  
  self.registration.showNotification(title, {
    body,
    icon,
    data: { url }
  });
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(clients.openWindow(url));
});
```

---

## Unsubscribe Flow

### User-Initiated

1. User clicks "Turn off notifications" in settings
2. Frontend calls `DELETE /human/push/subscribe/{subscription_id}`
3. Backend marks subscription as inactive

### Token Invalidation

FCM returns specific errors for invalid tokens:
- `messaging/registration-token-not-registered`
- `messaging/invalid-registration-token`

Backend automatically deactivates these subscriptions.

---

## Monitoring

### Metrics to Track

| Metric | Description |
|--------|-------------|
| `notifications_sent` | Total notifications dispatched |
| `notifications_failed` | Failed deliveries |
| `token_refresh_count` | Token refresh events |
| `unsubscribe_count` | Unsubscriptions |
| `click_through_rate` | Notification → answer conversion |

### Error Handling

| FCM Error | Action |
|-----------|--------|
| `messaging/registration-token-not-registered` | Deactivate subscription |
| `messaging/invalid-registration-token` | Deactivate subscription |
| `messaging/message-rate-exceeded` | Retry with backoff |
| `messaging/server-unavailable` | Retry with backoff |

---

## Alternatives Considered

### AWS SNS + Web Push
- **Pros:** All-AWS, no external dependency
- **Cons:** Web push support is limited, manual VAPID key management
- **Decision:** FCM provides significantly better developer experience

### OneSignal
- **Pros:** Good web push support, analytics
- **Cons:** Additional third-party, potential costs at scale
- **Decision:** FCM is free and sufficient

### Email Notifications (Instead of Push)
- **Pros:** Universal reach, no PWA requirements
- **Cons:** Higher latency, lower engagement, email fatigue
- **Decision:** Push for v1, email can be added later

### Native App
- **Pros:** Full push support on all platforms
- **Cons:** App store approval, development cost, distribution friction
- **Decision:** PWA reduces friction for anonymous participation

## Consequences

### Positive
- Push notifications increase engagement
- User-controlled frequency reduces fatigue
- FCM handles platform complexity
- Free at expected scale

### Negative
- iOS requires PWA installation (friction)
- External dependency on Google/FCM
- Service worker complexity

### Risks
- iOS market share may require native app eventually
- FCM terms of service changes
- Token management at scale

## Related Documents

- [ADR-01: System Architecture](01-system-architecture.md)
- [ADR-06: Infrastructure as Code](06-infrastructure-as-code.md) - FCM credentials in Secrets Manager
- [PRD-01: Human Web Application](../product-requirements-document/01-human-web-app.md)
- [Infrastructure Accounts](../fundamentals/01-available-infrastructure-accounts-and-services.md) - Firebase project details
