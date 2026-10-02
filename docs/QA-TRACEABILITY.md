# QA Traceability Matrix

Maps every **manual** test case to its **automated** Playwright coverage.

## ID conventions

| Prefix | Meaning | Where it lives |
|---|---|---|
| `TC-AUTH-nnn` | Manual test case, executed by a person | This document / QA catalogue |
| `PW-nnn` | Automated Playwright test | `tests/pw-*.spec.ts` |

The two sets are numbered independently on purpose: dropping a manual case, or
adding an automated one, never forces a renumber of the other.

## Automation status

| Status | Meaning |
|---|---|
| **Automated** | Covered by a Playwright test that runs in CI |
| **Planned** | Automatable in Playwright, not yet written |
| **Manual** | Not a good fit for UI automation — needs DB inspection, visual judgement, or belongs to a different suite |

## Running the suite

```bash
npm test                                   # all automated suites
npx playwright test tests/pw-02-login.spec.ts   # one area
npx playwright test --ui                   # interactive debugger
```

## Coverage summary

| Status | Count |
|---|---|
| Automated | 47 |
| Planned | 17 |
| Manual | 4 |
| **Total manual cases** | **68** |

The 68 manual cases map onto **17** automated tests (`PW-001` … `PW-017`),
because several manual cases exercise the same rule from different angles —
for example TC-AUTH-005 through 011 are all covered by `PW-002`.

---

## Registration (TC-AUTH-001 .. 034)

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
| TC-AUTH-021 | Password visibility toggle | — | Planned |
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

## Login (TC-AUTH-035 .. 043)

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

## Session & routing (TC-AUTH-044 .. 056)

| Manual TC | Case | Playwright | Status |
|---|---|---|---|
| TC-AUTH-044 | Session persists across in-app navigation | PW-016 | Automated |
| TC-AUTH-045 | Session persists after browser refresh | PW-016 | Automated |
| TC-AUTH-046 | Library routed to active / last language | PW-016 | Automated |
| TC-AUTH-047 | Personalised metrics and vocabulary init | — | Manual |
| TC-AUTH-048 | At most 4 lessons in Continue Studying | — | Manual |
| TC-AUTH-049 | Empty state in Continue Studying | — | Manual |
| TC-AUTH-050 | Content filtered by active language | — | Manual |
| TC-AUTH-051 | /login bypassed when authenticated | PW-016 | Automated |
| TC-AUTH-052 | Back button while authenticated | — | Planned |
| TC-AUTH-053 | Expired token on protected route | PW-015 | Automated |
| TC-AUTH-054 | Corrupted token on protected route | PW-015 | Automated |
| TC-AUTH-055 | Duplicate Login blocked while in flight | — | Planned |
| TC-AUTH-056 | Backend unavailable during Login | — | Planned |

## Logout (TC-AUTH-057 .. 068)

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
| TC-AUTH-068 | Password mask ⇄ plain toggle | — | Planned |

---

## Why the not-automated cases are not automated

**Manual (4)** — TC-AUTH-047 … 050 assert on widget *content* in the Library
and Reader (streak values, lesson counts, per-language filtering). These belong
to the Library/Reader suites, not the authentication suite, and several need a
populated fixture database. Keep them manual until those suites exist.

**Planned (17)** — all automatable, but deliberately not written yet to keep
the suite small and fast. They fall into three groups:

- **Deterministic but lower value** — TC-AUTH-021, 028, 029, 033, 055, 058,
  067, 068. Straightforward UI assertions; add when a related defect recurs.
- **Need induced conditions** — TC-AUTH-042, 043, 056, 060, 061, 063. These
  need backend outages or corrupt responses, which require route interception
  and careful teardown to avoid destabilising other specs.
- **Need DB inspection** — TC-AUTH-019. Playwright can prove no script executes
  and the app stays stable, but "no database manipulation occurred" needs
  database access, which this suite deliberately avoids.

TC-AUTH-052 is also listed as Planned: the authenticated Back-button case needs
a navigation-history setup that is more brittle than it is valuable today.