# Question Seeder Agent

Seeds the Ask-a-Human platform with a diverse set of UX, design, and product questions. Useful for:

- **Testing:** Populate the platform with realistic questions
- **Demo:** Show off the human inference network in action
- **Research:** Collect human opinions on common product decisions

## How It Works

The seeder runs in a loop:

1. **Submit** a random question from curated templates
2. **Check** for responses on all active questions
3. **Display** new responses and insights in real-time
4. **Wait** for the configured interval
5. **Repeat**

Questions span multiple categories:
- UX Copy (error messages, empty states, confirmations)
- Design Decisions (UI patterns, layouts)
- Tone & Voice (brand personality, notifications)
- Ethics & UX (dark patterns, data retention)
- Product Decisions (pricing, onboarding, features)
- Open-ended (free-form human opinions)

## Setup

```bash
cd examples/question-seeder
pip install -r requirements.txt
```

Set your agent ID:
```bash
export ASK_A_HUMAN_AGENT_ID="question-seeder"
# Or use a custom one
export ASK_A_HUMAN_AGENT_ID="my-seeder-agent"
```

## Usage

```bash
# Default: submit a question every 10 seconds, unlimited
python seeder.py

# Custom interval (every 30 seconds)
python seeder.py --interval 30

# Limit to 20 questions, then just monitor responses
python seeder.py --max-questions 20

# Both
python seeder.py --interval 15 --max-questions 50
```

## Output

The seeder shows:
- Real-time question submissions with category tags
- Incoming responses as they arrive
- Running totals (questions, responses, insights)
- Sample insights extracted from text responses

Example output:
```
📤 Submitted [ux_copy]: A user just deleted their account. What should the confirmation...
📥 +2 response(s) on: User's payment failed. How should we tell them?
   ✓ Selected option 2
   ✓ Selected option 2

┌──────────────────────────────────────────────────────────────────────────────┐
│                            Question Seeder Status                            │
├────────────────────┬─────────────────────────────────────────────────────────┤
│ Metric             │ Value                                                   │
├────────────────────┼─────────────────────────────────────────────────────────┤
│ Questions Submitted│ 15                                                      │
│ Total Responses    │ 23                                                      │
│ Active Questions   │ 8                                                       │
│ Insights Collected │ 4                                                       │
└────────────────────┴─────────────────────────────────────────────────────────┘
```

## Question Templates

See `seeder.py` for all templates. Feel free to add your own!

The structure is:
```python
QUESTION_TEMPLATES = {
    "category_name": [
        {
            "prompt": "Your question text",
            "type": "multiple_choice",  # or "text"
            "options": ["Option A", "Option B", "Option C"],  # for multiple_choice
        },
        # ...
    ],
}
```

## Use Cases

### Demo Mode
Quick demo with 10 questions:
```bash
python seeder.py --max-questions 10 --interval 5
```

### Stress Test
High-frequency seeding (careful with rate limits):
```bash
python seeder.py --interval 2 --max-questions 50
```

### Long-running Research
Slow drip over hours:
```bash
python seeder.py --interval 300  # Every 5 minutes
```
