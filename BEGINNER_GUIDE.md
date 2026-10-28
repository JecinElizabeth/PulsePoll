# Understand PulsePoll in 30 minutes

Start the local demo using the README. Keep the app and source side by side. You do not need MongoDB, Redis, Docker, or an AI API to follow this guide.

## Minutes 0–5: explain the problem

People often need a simple preference before making a decision: which workshop to arrange, what part of onboarding to improve, or which help channel to invest in. PulsePoll keeps the question, choices, and result together.

Try each sample. The starting counts are labelled synthetic. They make the result view useful before you add your single local vote.

One-sentence explanation: “PulsePoll is a feedback workspace where a person creates a question, records a preference, reviews the totals, and exports a small report.”

## Minutes 5–10: follow one vote

Open `frontend/src/demo/DemoApp.tsx` and find `vote()`.

1. A button provides its answer ID.
2. `castDemoVote()` checks whether the question exists, is open, and has not already received a vote from this saved browser workspace.
3. It returns a new copy of state with one answer count increased.
4. React renders the new state. The total and percentages use the updated counts.
5. `saveDemoState()` writes the same state into localStorage.

Refresh. `loadDemoState()` restores the workspace so the vote remains recorded. Clearing site data removes that memory. This restriction is not proof that one real person voted once.

## Minutes 10–15: understand the data

Open `frontend/src/demo/store.ts`.

- A `DemoPoll` has an ID, question text, context, answer options, a timestamp, and open/closed status.
- Each answer has an ID, label, and count.
- `votes` maps a question ID to the answer selected in this browser.
- `totalVotes()` adds the option counts.
- A percentage is `answer count / total count × 100`. A question with no votes shows zero percent.
- The storage key includes `v1`, so a future data format can be distinguished from this one.

Create a question. Answer choices are trimmed, blank lines are removed, and repeated labels such as “Yes” and “ YES ” are rejected. This avoids presenting two choices with the same meaning.

## Minutes 15–20: test the awkward cases

1. Vote once, then try another answer. Choices are disabled and the data rule also blocks repeat votes.
2. Close a question. It stops accepting votes but still shows its result.
3. Reopen it. An existing browser vote is still remembered.
4. Create a question with two identical choices. Read the error and correct it.
5. Refresh after creating a custom question. The saved question remains.

Run `npm test` from `frontend`. Tests check these behaviors against the store and rendered UI. Passing tests prove the behaviors checked; they do not establish real-customer or heavy-traffic reliability.

## Minutes 20–25: explain the report

Click **Export results**. The CSV has a row for each answer, with its question, count, percentage, and data source.

The export uses the same state as the UI. Commas and quotation marks are escaped. Text that could become a spreadsheet formula is neutralised before export.

Business explanation: “A product or class coordinator can use the result to decide the next action, while remembering that the answers may not represent every person in the group.”

## Minutes 25–30: practise a short walkthrough

Show: sample question → one vote → refresh → create a question → close → export CSV.

Explain the three layers:

```text
React UI: what the person sees and clicks
TypeScript store: validation and data changes
localStorage: what this browser remembers
```

The optional live version has a different path:

```text
React -> Go REST API -> MongoDB
                         |
                    outbox event
                         |
                       Redis -> WebSocket -> connected viewers
```

The repository includes that shared backend; this learning edition focuses on the local workflow. Describe an individual design or implementation contribution as yours only if you made or reviewed it and can explain it.

## Questions to answer in your own words

**What did you work on?** Describe the parts you personally changed, tested, documented, or demonstrated. This edition includes a local interface, state validation, persistent voting, exports, and tests; read those files before discussing them.

**Is this real-time across devices?** The default demo updates immediately in one browser workspace. It does not share a database across devices. The optional backend uses WebSockets for its separate mode.

**Why localStorage?** It simplifies setup and remembers a small workspace after refresh. It is unsuitable as shared, authoritative storage.

**Can someone vote twice?** The demo blocks a repeat vote in stored browser state. Clearing storage or using a private context starts a separate workspace, so it is not a secure election system.

**Does it use AI?** No. The polling flow is deterministic. A future AI feature might summarise free-text feedback, but that needs separate implementation, consent, and testing.

**What would you improve next?** Explain one concrete step, such as question search, a server-backed shared workspace, or export filters. Keep it separate from built features.
