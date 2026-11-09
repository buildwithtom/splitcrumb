# splitcrumb.

**Every crumb counts.**

Splitcrumb is a private, browser-based expense sharing app for trips, roommates, couples, and everyday plans. Create a group, add your people, and share expenses fairly. No accounts, backend, credentials, or environment variables are needed.

## Features

- Group and member management, including duplicate display names with distinct IDs.
- Equal, exact-amount, and percentage splits with live allocation previews.
- Seven categories, transaction dates, payer selection, and optional payer participation.
- Expense and settlement editing/deletion with immediate balance recalculation.
- Individual net balances, amounts owed/receivable, and deterministic repayment suggestions.
- Full and partial payment recording, optional notes, and payment dates.
- Dashboard totals separated by currency, expense search, and activity history.
- INR, USD, EUR, GBP, and AED. Each group has one currency, locked once its first transaction is recorded.
- Copyable group settlement summaries, including manual copy fallback.
- Versioned, validated localStorage persistence; validated JSON import/export; corrupt-data recovery download.
- Dark interface, original SVG branding, responsive sidebar/bottom navigation, native accessible dialogs, focus restoration, keyboard tabs, and reduced-motion support.
- Optional sample groups, added only when explicitly selected. The app starts empty.

## Screenshots

_Screenshot gallery placeholder._ The repeatable browser QA command generates actual desktop/mobile captures under `.qa/`, including empty and populated dashboards, group details, and the expense form. That generated directory is excluded from source control.

## Stack

React, strict TypeScript, Vite, Tailwind CSS 4, Lucide React, React Router, Zod, Vitest, and React Testing Library. CSS implements the original design system and responsive layouts; Tailwind is integrated through its Vite plugin. Playwright Core drives an installed Chrome browser for optional end-to-end QA; it does not ship in the production bundle. No external font or image requests are needed.

The committed lockfile pins the tested dependency graph. Vite 8 and Vitest 4 are compatible with the supported local Node version; newer major versions that require a newer Node runtime are deliberately excluded.

## Local setup

Use Node **20.19+**, or a compatible current LTS release (22.13+ / 24+), and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The app works entirely in your browser.

| Command                | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Development server                                  |
| `npm run typecheck`    | Strict TypeScript checks                            |
| `npm run lint`         | ESLint, including React Hooks checks                |
| `npm test`             | Run unit and UI integration tests                   |
| `npm run test:watch`   | Watch tests while editing                           |
| `npm run build`        | Typecheck and build to `dist/`                      |
| `npm run preview`      | Preview production output                           |
| `npm run test:browser` | Run Chrome QA against the existing production build |
| `npm run format`       | Format maintained source files                      |
| `npm run format:check` | Check formatting                                    |

For browser QA, install Google Chrome locally, run `npm run build`, then `npm run test:browser`. The script starts and stops its own preview server on port 4187. It uses a separate temporary browser profile and does not touch your normal browser records. Tests check 320, 375, 768, 1024, and 1440px layouts; dialogs and focus return; nested routes; refresh persistence; import/export; and corrupt-data recovery.

## Structure

```text
public/
  favicon.svg          Original divided-circle mark
  _redirects           Cloudflare Pages SPA fallback
scripts/
  browser-qa.mjs       Repeatable production-browser checks
src/
  components/ui.tsx    Dialogs, avatars, fields, and shared states
  features/
    Dashboard.tsx      Overview, group cards, and onboarding
    GroupDetail.tsx    Expenses, balances, and settlements
    GroupForms.tsx     Group/member management
    TransactionForms.tsx
    OverviewPages.tsx  Cross-group balances and activity
    Settings.tsx      Preferences, backup, import, and recovery
  lib/
    money.ts           Integer money parsing/formatting
    splits.ts          Pure allocation algorithms
    balances.ts        Net balances, repayments, currency totals
    validation.ts      Schema and referential integrity
    storage.ts         Persistence boundary and migration entry
    summary.ts         Settlement summaries and clipboard fallback
    state.ts           App context and shared helpers
    dates.ts           Display-date handling
    demo.ts            Optional sample records
    *.test.ts          Domain/storage tests
  types/index.ts       Domain models
  App.tsx              Routes, state, persistence, and app shell
  App.test.tsx         User interaction tests
  main.tsx
  styles.css           Design system and responsive layouts
```

## Financial behavior

Money is stored as integer paise/cents. Input is parsed as a decimal string using integer arithmetic; values such as scientific notation, commas, negative amounts, zero expenses, more than two decimals, and unsafe numeric values are rejected. Formatting preserves cents even near the safe integer limit.

Equal allocation sorts participant IDs and distributes one smallest unit at a time to the first IDs for any remainder. ₹100 between three members yields ₹33.34, ₹33.33, and ₹33.33. Input ordering and duplicate names do not affect the result.

Exact allocations must total the expense amount exactly. Percentages accept two decimal places and must total 100.00%. Allocation uses integer basis points, `BigInt` multiplication, and largest remainders; ties are broken by stable member ID. Every split reconciles exactly.

An expense credits its payer for the total and debits each selected participant for their share. Alex paying ₹900 equally for Alex, Sam, and Tom produces +₹600, −₹300, −₹300. A ₹200 payment from Sam to Alex produces +₹400, −₹100, −₹300. Payments are not included in expense totals.

Repayment suggestions greedily match the largest debtors with the largest creditors, with stable ID tie breaking. This reduces unnecessary transfers in many cases; it does **not** guarantee the mathematically smallest number of transfers. Suggestions never modify transactions.

Schema validation bounds combined transaction amounts to `Number.MAX_SAFE_INTEGER`, validates allocation sums/methods and dates, and rejects missing/duplicate/cross-group references. Calculations are derived from current records, rather than persisted balance caches.

## Persistence and privacy

**Your data stays in this browser. Splitcrumb doesn't sync between devices.**

The storage boundary in `src/lib/storage.ts` is the place to add a future IndexedDB or backend adapter. Stored documents include `version: 1`; `migrate()` is the explicit entry point for future migrations. Unsupported versions and corrupt records are preserved. The app blocks ordinary writes in recovery mode and provides a raw-data download in Settings. You can restore a valid export or explicitly clear data after confirmation.

Writes validate before saving and update React state only after localStorage succeeds. Storage quota/permission failures produce a visible error and leave the last saved data intact. If another tab changes storage, a stale tab blocks its next write and asks you to reload, preventing silent replacement of newer records.

Import replaces the entire dataset after validation and confirmation; it does not merge records. Export a backup before importing or clearing. Browser storage is local, unencrypted, and available to anyone using the same browser profile. Clearing site data or using temporary/private browsing can remove records. There are no cloud backups or collaboration links.

## Cloudflare Pages deployment

This project is ready for a static Cloudflare Pages deployment. It has **not** been automatically deployed or pushed to GitHub.

1. Create a Pages project from your repository, or build locally for direct upload.
2. Set the build command to **`npm run build`**.
3. Set the output directory to **`dist`**.
4. Use a compatible Node runtime, such as Node 22.13+ or 24+.
5. No application environment variables, bindings, secrets, or backend are required.

`public/_redirects` is copied into `dist/_redirects` and rewrites nested routes to `index.html`, so refreshing `/groups/:id`, `/balances`, or `/settings` works. If using a different host, configure an equivalent SPA fallback.

## Verification results

The completed implementation was checked locally with the committed dependency graph:

| Check                          | Actual result                      |
| ------------------------------ | ---------------------------------- |
| Strict TypeScript              | Passed                             |
| ESLint                         | Passed, no warnings                |
| Vitest / React Testing Library | 70 tests passed across 4 files     |
| Production build               | Passed; `dist/` generated          |
| Prettier                       | Passed                             |
| Chrome browser QA              | Passed at all five required widths |

Chrome QA checked both empty and populated pages and found no horizontal overflow or browser errors. It also verified dialogs, initial focus and focus restoration, actual expense persistence after refresh, JSON download/import with confirmation, invalid import handling, and corrupt localStorage preservation. Generated screenshots were visually inspected. Mobile hardware and other browser engines have not been tested.

## Known limitations

- No authentication, cross-device sync, shared editing, payment processing, recurring expenses, or currency conversion.
- All supported currencies use two decimal minor units; other currency conventions are outside this MVP.
- Amount entry uses a decimal point and no grouping separators. Display uses Indian digit grouping.
- Groups currently need at least two initial members. Referenced members cannot be removed; rename them to preserve history.
- Settlements record real payments; the app permits overpayments and reverse payments because those can occur in practice. Review the suggested amount before recording.
- Copy availability depends on browser permissions; a selectable summary is offered when automatic copy fails.
- Browser QA runs in desktop Chrome with resized viewports. Real iOS/Android and Safari/Firefox device testing remains a useful pre-release check.

## Possible future improvements

An optional IndexedDB adapter, additional currency conventions, richer accessible activity filters, receipt attachments, and an explicitly opt-in synchronization service. None is required for the current app to work.
# splitcrumb
