# Clean-browser smoke — 2026-09-07

Status: **passed for the public synthetic path**.

This is a redacted UI evidence note. It contains no workspace identifier,
cookie, token, API key, private prompt, or response body.

## Scope

- URL: <https://noah-nvidia-web.onrender.com/>
- Browser: new named Chrome session, no prior Noah local storage
- Runtime observed: public scheduled synthetic mode
- Model calls: none
- External effects: none

## Observed sequence

1. The initial page loaded in English and displayed `PUBLIC RUNTIME`,
   `Scheduled synthetic demo`, and the scheduled opening date.
2. The onboarding page displayed `Start setup` and `Skip and explore`.
3. `Skip and explore` opened the warning dialog explaining that Atlas Services
   is fictional and no external action will run.
4. `I understand, skip` completed successfully and displayed `Skip
   understood.` with the explicit synthetic-data and no-Neon-write notice.
5. `Explore playground` entered `Playground · synthetic Atlas`, displayed the
   fictional-data banner, and opened the final guided-tour entry point.
6. Closing the tour returned to the workspace with `Replay guided tour` and
   the expected synthetic Atlas metrics and pending approval count.
7. A full reload/cold-start returned to the same public workspace state,
   preserved the synthetic banner, and did not expose a credential or trigger
   an external call.

## Result

The public no-cost path is reviewable from a clean browser, the skip warning is
honest, the ephemeral synthetic fixture is visible, and a reload does not
break the workspace. The future Nebius window and live quota behavior remain
covered by deterministic tests and must be checked on the scheduled date
without spending credit during this rehearsal.
