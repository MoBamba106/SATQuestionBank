# SAT Nexus — Roadmap (web)

These are intentionally **not implemented** yet. Approve before building.

1. **Spaced-repetition study plans** — schedule vocabulary and missed skills by recall strength.
2. **Email notifications** — weekly goals, streak reminders (CloudBase / Resend / etc.).
3. **Payments & subscriptions** — premium plans via Stripe (or CloudBase pay).
4. **AI coach** — explanations, study plans, and weak-skill drills (server route + provider key).
5. **Official score calibration tables** — if CB publishes enough conversion data.
6. **Teacher / tutor view** — shared reports without exposing private notes.
7. **Cloud file uploads** — avatars and custom materials via CloudBase Storage helpers.
8. **Accessibility audit mode** — contrast reports, dyslexia-friendly font, keyboard walkthroughs.
9. **Import/export backups** — portable JSON for progress, notes, collections.
10. **Parent/guardian summaries** — high-level goals only; answers stay private.

Architecture already supports these via:

- Multi-user Postgres rows (`user_id`)
- CloudBase auth + storage stubs
- Vercel serverless route handlers
