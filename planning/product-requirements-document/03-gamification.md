# PRD-03: Gamification System

**Version:** 1.0  
**Date:** 2026-02-02  
**Status:** Draft

## Overview

The Gamification System motivates human participants to answer questions consistently and thoughtfully. It uses points, badges, streaks, and leaderboards to create engagement without requiring user accounts.

### Key Principles

1. **Reward participation** - Every answer earns points
2. **Encourage quality** - Bonuses for thoughtful responses
3. **Build habits** - Streaks reward consistency
4. **Create community** - Leaderboards show collective effort
5. **No pay-to-win** - All rewards are earned through participation

---

## Core Mechanics

### Points System

**Base Points:**

| Action | Points |
|--------|--------|
| Answer a text question | 10 |
| Answer a multiple choice question | 5 |
| Provide confidence rating | +2 |

**Quality Bonuses:**

| Bonus | Points | Criteria |
|-------|--------|----------|
| Thoughtful response | +5 | Text answer > 100 characters |
| Quick response | +3 | Answer within 5 minutes of notification |
| In-demand question | +5 | Question had < 50% of needed responses |

**Daily Limits:**
- Maximum 500 points per day (prevents grinding)
- Points earned after limit still count for badges/streaks

---

### Streak System

**Definition:** A streak is maintained by answering at least one question per calendar day.

**Streak Rewards:**

| Streak Length | Reward |
|---------------|--------|
| 3 days | +10 bonus points, "On a Roll" badge |
| 7 days | +25 bonus points, "Week Warrior" badge |
| 30 days | +100 bonus points, "Monthly Maven" badge |
| 100 days | +500 bonus points, "Centurion" badge |

**Streak Rules:**
- Streak resets to 0 if a day is missed
- Streak is based on user's local timezone (derived from browser)
- Streak count shown in UI

---

### Badge System

Badges are permanent achievements that showcase participation history.

**Participation Badges:**

| Badge | Name | Criteria |
|-------|------|----------|
| 🎯 | First Steps | Submit your first answer |
| 🔟 | Getting Started | Submit 10 answers |
| 💯 | Century | Submit 100 answers |
| 🎖️ | Veteran | Submit 500 answers |
| 🏆 | Legend | Submit 1000 answers |

**Streak Badges:**

| Badge | Name | Criteria |
|-------|------|----------|
| 🔥 | On a Roll | 3-day streak |
| 📅 | Week Warrior | 7-day streak |
| 🌙 | Monthly Maven | 30-day streak |
| ⭐ | Centurion | 100-day streak |

**Category Badges:**

| Badge | Name | Criteria |
|-------|------|----------|
| 🧠 | Tech Expert | 25 answers in technical category |
| 📊 | Product Pro | 25 answers in product category |
| ⚖️ | Ethics Advocate | 25 answers in ethics category |
| 🎨 | Creative Mind | 25 answers in creative category |
| 🌍 | Generalist | 25 answers in general category |

**Special Badges:**

| Badge | Name | Criteria |
|-------|------|----------|
| 🌅 | Early Bird | Answer a question within 2 minutes of creation |
| 🦉 | Night Owl | Answer 10 questions between midnight and 6am |
| ⚡ | Speed Demon | Answer 5 questions in under 30 seconds each |
| 🎯 | Confident | 10 answers with max confidence rating |

---

### Leaderboard System

**Leaderboard Types:**

| Type | Reset Frequency | Purpose |
|------|-----------------|---------|
| Daily | Every midnight UTC | Short-term competition |
| Weekly | Every Monday midnight UTC | Medium-term engagement |
| All-Time | Never | Long-term prestige |

**Leaderboard Display:**
- Top 10 shown with rank, points, and answer count
- User's own rank shown regardless of position
- Anonymous display (no usernames)

**Leaderboard Entry:**
```json
{
  "rank": 1,
  "points": 520,
  "answers": 45,
  "is_current_user": false
}
```

---

## Data Model

### UserStats Table

Stored in DynamoDB, keyed by fingerprint hash.

```
{
  "fingerprint_hash": "sha256...",
  "total_points": 1250,
  "total_answers": 98,
  "streak_days": 7,
  "streak_last_date": "2026-02-02",
  "badges": [
    {"id": "first_steps", "earned_at": "2026-01-15T..."},
    {"id": "on_a_roll", "earned_at": "2026-01-20T..."},
    {"id": "tech_expert", "earned_at": "2026-02-01T..."}
  ],
  "answers_by_category": {
    "technical": 35,
    "product": 28,
    "creative": 20,
    "general": 15
  },
  "daily_points": {
    "2026-02-02": 45,
    "2026-02-01": 120
  },
  "created_at": "2026-01-15T...",
  "updated_at": "2026-02-02T..."
}
```

---

## User Experience

### Points Feedback

After each answer submission:
1. Show points earned with breakdown
2. Animate point counter increment
3. Show progress toward next badge
4. Display new badge with celebration if earned

**Example UI:**
```
┌─────────────────────────────────┐
│           ✓ Thanks!             │
│                                 │
│         +10 base points         │
│         +5 thoughtful response  │
│         +2 confidence bonus     │
│         ─────────────────       │
│         +17 total               │
│                                 │
│  Progress: 83/100 to Century 💯 │
│                                 │
└─────────────────────────────────┘
```

### Streak Display

In header or settings:
```
🔥 7-day streak
   Answer today to keep it going!
```

After missing a day:
```
💔 Streak lost
   Start a new streak today!
```

### Badge Collection

In settings/profile:
```
Badges (7/15)

🎯 First Steps      ✓
🔟 Getting Started  ✓
💯 Century          ○  (83/100)
🔥 On a Roll        ✓
📅 Week Warrior     ✓
🧠 Tech Expert      ✓
📊 Product Pro      ○  (18/25)
```

---

## Badge Award Logic

### On Answer Submission

```python
def check_badges(user_stats, new_answer):
    new_badges = []
    
    # Participation badges
    total = user_stats.total_answers + 1
    if total == 1:
        new_badges.append("first_steps")
    elif total == 10:
        new_badges.append("getting_started")
    elif total == 100:
        new_badges.append("century")
    # ...
    
    # Category badges
    category = new_answer.question.audience[0]  # Primary category
    category_count = user_stats.answers_by_category.get(category, 0) + 1
    if category_count == 25:
        new_badges.append(f"{category}_expert")
    
    # Streak badges
    if user_stats.streak_days == 3:
        new_badges.append("on_a_roll")
    elif user_stats.streak_days == 7:
        new_badges.append("week_warrior")
    # ...
    
    return new_badges
```

---

## Fingerprint Persistence

Gamification data is tied to browser fingerprint:

**Pros:**
- No account required
- Works immediately
- Privacy-preserving

**Cons:**
- Fingerprint can change (browser update, settings change)
- Lost data if fingerprint changes
- Potential for multiple fingerprints per person

**Mitigation:**
- Show "Your progress is tied to this browser" notice
- Future: Optional account linking to preserve progress

---

## Anti-Gaming Measures

| Abuse | Prevention |
|-------|------------|
| Rapid-fire answering | Points capped at 500/day |
| Farming easy questions | Quality bonuses encourage thoughtfulness |
| Multi-device gaming | Each fingerprint has independent stats |
| Bot answering | Response time heuristics (see ADR-05) |

---

## Future Enhancements (Not v1)

### Opt-In Identity
- Link fingerprint to email/account
- Preserve progress across devices
- Enable social features

### Quality Scoring
- Weight answers by agreement with others
- Bonus points for "consensus" answers
- Penalize consistent outliers

### Achievement Milestones
- "Answer 100 questions in a week" challenges
- Time-limited events with special badges
- Seasonal leaderboard resets

### Social Features
- Share badges on social media
- Compare stats with friends
- Team competitions

---

## Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Return visitor rate | > 30% | Gamification drives retention |
| Avg answers per session | > 3 | Points encourage more answers |
| Streak holders (3+ days) | > 20% of actives | Streaks build habits |
| Badge collectors (5+) | > 15% of actives | Badges provide goals |

---

## Related Documents

- [PRD-01: Human Web App](01-human-web-app.md)
- [ADR-02: Database Schema](../architectural-decision-records/02-database-schema.md)
- [ADR-05: Abuse Prevention](../architectural-decision-records/05-abuse-prevention.md)
