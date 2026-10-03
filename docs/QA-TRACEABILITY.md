# QA Traceability Matrix

Maps every **manual** test case to its **automated** Playwright coverage, and records what
is deliberately left to a person.

## ID conventions

| Prefix | Meaning | Where it lives |
|---|---|---|
| `TC-AUTH-nnn` | Manual test case, executed by a person | This document / QA catalogue |
| `PW-nnn` | Automated Playwright test | `tests/*.spec.ts` |

The two sets are numbered independently on purpose: dropping a manual case, or adding an
automated one, never forces a renumber of the other.

## Automation status

| Status | Meaning |
|---|---|
| **Automated** | Covered by a Playwright test that runs in CI |
| **Planned** | Automatable in Playwright, not yet written |
| **Manual** | Not a good fit for UI automation — needs database inspection, visual judgement, or belongs to a different suite |

## The automated suites

| File | Tests |
|---|---|
| `tests/pw-01-registration.spec.ts` | PW-001 … PW-011 |
| `tests/pw-02-login.spec.ts` | PW-012 … PW-014 |
| `tests/pw-03-session.spec.ts` | PW-015 … PW-017 |
| `tests/api-errors.spec.ts` | PW-018 … PW-022 (transport-layer failure handling) |

```bash
npm test
npx playwright test tests/pw-02-login.spec.ts   # one area
npx playwright test --ui                          # interactive debugger
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for how to set up a database for local runs, and
for the testing conventions the suite follows.

## Coverage summary

| Status | Count |
|---|---|
| Automated | 48 |
| Planned | 16 |
| Manual | 4 |
| **Total manual cases** | **68** |

The 68 manual cases are covered by **22** automated tests, because several manual cases
exercise the same rule from different angles — TC-AUTH-005 through 011, for example, are
all covered by `PW-002`.

---

## Registration (TC-AUTH-001 … 034)

| Manual TC | Case | Playwright | Status |
|---|---|---|---|
| TC-AUTH-001 | Full Name with apostrophe, dash, umlaut | PW-003 | Automated |
| TC-AUTH-002 | Full Name below minimum length | PW-003 | Automated |
| TC-AUTH-003 | Full Name at minimum length boundary | PW-003 | Automated |
| TC-AUTH-004 | Full Name with digits / punctuation | PW-003 | Automated |
| TC-AUTH-005 | Username below minimum length | PW-002 | Automated |
| TC-AUTH-006 | Username at minimum length boundary | PW-002 | Automated |
| TC-AUTH-007 | Username at maximum length boundary | PW-002 | Automated |
| TC-AUTH-008 | Username above maximum length | PW-002 | Automated |
| TC-AUTH-009 | Username of only digits/underscores | PW-002 | Automated |
| TC-AUTH-010 | Username with spaces / non-Latin / symbols | PW-002 | Automated |
| TC-AUTH-011 | Username with umlauts / accents | PW-002 | Automated |
| TC-AUTH-012 | Email missing local-part | PW-004 | Automated |
| TC-AUTH-013 | Email missing `@` | PW-004 | Automated |
| TC-AUTH-014 | Email missing domain / TLD | PW-004 | Automated |
| TC-AUTH-015 | Password below minimum length | PW-005 | Automated |
| TC-AUTH-016 | Password at minimum length boundary | PW-005 | Automated |
| TC-AUTH-017 | Password / Confirmation mismatch | PW-005 | Automated |
| TC-AUTH-018 | Outer whitespace trimmed before validation | PW-007 | Automated |
| TC-AUTH-019 | Script / SQL payload as literal input | — | Planned |
| TC-AUTH-020 | Error beside field, valid fields preserved | PW-006 | Automated |
| TC-AUTH-021 | Password visibility toggle (sign-up) | — | Planned |
| TC-AUTH-022 | Block Step 1 → 2 when field invalid | PW-009 | Automated |
| TC-AUTH-023 | Advance to Step 2 when Step 1 valid | PW-009 | Automated |
| TC-AUTH-024 | Block submit when Target Language unselected | PW-009 | Automated |
| TC-AUTH-025 | Block submit when Daily Goal unselected | PW-009 | Automated |
| TC-AUTH-026 | Multiple Target Languages, modifiable | PW-010 | Automated |
| TC-AUTH-027 | Daily Goal mutually exclusive | PW-010 | Automated |
| TC-AUTH-028 | Data preserved across step navigation | — | Planned |
| TC-AUTH-029 | Form resets after browser refresh | — | Planned |
| TC-AUTH-030 | Account created, onboarding shown | PW-001 | Automated |
| TC-AUTH-031 | Duplicate Username rejected | PW-008 | Automated |
| TC-AUTH-032 | Duplicate Email rejected | PW-008 | Automated |
| TC-AUTH-033 | Rapid duplicate submit clicks blocked | — | Planned |
| TC-AUTH-034 | Backend unavailable during registration | PW-011 | Automated |

## Login (TC-AUTH-035 … 043)

| Manual TC | Case | Playwright | Status |
|---|---|---|---|
| TC-AUTH-035 | Authenticate with valid credentials | PW-012 | Automated |
| TC-AUTH-036 | Reject empty / whitespace Email | PW-013 | Automated |
| TC-AUTH-037 | Reject empty / whitespace Password | PW-013 | Automated |
| TC-AUTH-038 | Reject unregistered Email (non-revealing) | PW-013 | Automated |
| TC-AUTH-039 | Reject incorrect Password (non-revealing) | PW-013 | Automated |
| TC-AUTH-040 | Failed attempts below lockout threshold | PW-014 | Automated |
| TC-AUTH-041 | Lockout activates at threshold | PW-014 | Automated |
| TC-AUTH-042 | Script payload in Email | — | Planned |
| TC-AUTH-043 | Script payload in Password | — | Planned |

## Session & routing (TC-AUTH-044 … 056)

| Manual TC | Case | Playwright | Status |
|---|---|---|---|
| TC-AUTH-044 | Session persists across in-app navigation | PW-016 | Automated |
| TC-AUTH-045 | Session persists after browser refresh | PW-016 | Automated |
| TC-AUTH-046 | Library routed to active / last language | PW-016 | Automated |
| TC-AUTH-047 | Personalised metrics and vocabulary init | — | Manual |
| TC-AUTH-048 | At most 4 lessons in Continue Studying | — | Manual |
| TC-AUTH-049 | Empty state in Continue Studying | — | Manual |
| TC-AUTH-050 | Content filtered by active language | — | Manual |
| TC-AUTH-051 | `/login` bypassed when authenticated | PW-016 | Automated |
| TC-AUTH-052 | Back button while authenticated | — | Planned |
| TC-AUTH-053 | Expired token on protected route | PW-015 | Automated |
| TC-AUTH-054 | Corrupted token on protected route | PW-015 | Automated |
| TC-AUTH-055 | Duplicate Login blocked while in flight | — | Planned |
| TC-AUTH-056 | Backend unavailable during Login | PW-018, PW-019, PW-020 | Automated |

TC-AUTH-056 is covered by three tests: the gateway error is reported clearly, the entered
Email survives so the user can retry, and no session is fabricated.

## Logout (TC-AUTH-057 … 068)

| Manual TC | Case | Playwright | Status |
|---|---|---|---|
| TC-AUTH-057 | Logout terminates the session | PW-017 | Automated |
| TC-AUTH-058 | Duplicate Logout blocked while in flight | — | Planned |
| TC-AUTH-059 | Cached user context purged after Logout | PW-017 | Automated |
| TC-AUTH-060 | Logout with corrupted credentials | — | Planned |
| TC-AUTH-061 | Logout while backend unreachable | — | Planned |
| TC-AUTH-062 | Refresh during Logout transit | — | Planned |
| TC-AUTH-063 | No sensitive diagnostics in Logout errors | — | Planned |
| TC-AUTH-064 | Routed to Login after Logout | PW-017 | Automated |
| TC-AUTH-065 | Back button cannot restore protected view | PW-017 | Automated |
| TC-AUTH-066 | Clean re-authentication after Logout | PW-017 | Automated |
| TC-AUTH-067 | Email trimmed before authentication | — | Planned |
| TC-AUTH-068 | Password mask ⇄ plain toggle (login) | — | Planned |

## Transport-layer (no direct manual counterpart)

| Playwright | Case | Status |
|---|---|---|
| PW-018 | Gateway failure is logged with status/content-type and reported as unavailable | Automated |
| PW-021 | A 200 with a non-JSON body does not crash the screen | Automated |
| PW-022 | A dead lockout check never blocks signing in | Automated |

These are defensive regressions guarding the API client rather than catalogue items.

---

## Why the not-automated cases are not automated

**Manual (4)** — TC-AUTH-047 … 050 assert on widget *content* in the Library and Reader
(streak values, lesson counts, per-language filtering). Those belong to the
Library/Reader suites, not the authentication suite, and several need a populated fixture
database. Keep them manual until those suites exist.

**Planned (16)** — all automatable, but deliberately not written yet to keep the suite
small and fast:

- **Deterministic but lower value** — TC-AUTH-021, 028, 029, 033, 055, 067, 068.
  Straightforward UI assertions; add when a related defect recurs. The password-visibility
  toggle (021, 068) is the most obvious gap here — it is a documented defect fix with no
  automated guard.
- **Need induced conditions** — TC-AUTH-042, 043, 058, 060, 061, 062, 063. These need
  backend outages or corrupt responses, which require route interception and careful
  teardown to avoid destabilising other specs.
- **Need database inspection** — TC-AUTH-019. Playwright can prove no script executes and
  the app stays stable, but "no database manipulation occurred" needs database access,
  which this suite deliberately avoids.
- **TC-AUTH-052** needs a navigation-history setup that is more brittle than it is
  valuable today.

## Known limitations of the automated suite

- **TC-AUTH-019 is only partly automatable.** The UI-level half is checked (no dialog
  fires, the app stays responsive); the database half is not.
- **The availability endpoint is rate limited** (30 requests/min per IP). `PW-008` stubs it
  so it never depends on that budget; other tests type usernames, which triggers debounced
  lookups. A substantially larger suite would need that limit revisited.
- **`PW-014` reads `MAX_LOGIN_ATTEMPTS` from the test process's environment.** It agrees
  with the server only because CI does not set it and the server defaults to 5. If one is
  changed without the other the test miscounts its attempts. Exposing the threshold via a
  test-only endpoint would remove the coupling.
- **`PW-021` and `PW-022` have no manual counterpart.** They guard transport behaviour that
  the catalogue does not yet describe.