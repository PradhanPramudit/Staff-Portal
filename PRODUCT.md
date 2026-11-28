# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is an owner or accounts clerk at a small to medium business in Nepal. They work on one shared desktop or laptop. Every working day they mark attendance for all staff. Once a month they review payroll, finalize it, and print payslips for signing. Phone use is occasional, not the main case.

## Product Purpose

Staff Portal replaces the paper register and the monthly salary spreadsheet. It records daily attendance, salary advances and their installment recovery, and monthly payroll. It produces printable A4 payslips and a CSV export. Success means the daily marking sheet takes a minute, and the month-end payroll is correct, explainable line by line, and ready to hand to staff to sign.

## Positioning

It is built for Nepali payroll practice and for fast daily attendance entry. A generic HR or payroll SaaS does not claim either of these.

- **Nepal-specific defaults.** The daily rate divisor defaults to 30, Saturday is the weekly off, amounts show as `Rs.` with 1,00,000 grouping, and payslips write the net pay in words.
- **Keyboard-fast marking.** P / A / H / L keys, arrow-key row movement and "Mark all present" let one person mark a whole roster without touching the mouse.

## Operating Context

- Attendance is marked every working day, usually in one sitting, against a roster of roughly 8 to 50 staff.
- Payroll is reviewed and finalized monthly. Finalizing snapshots every row and applies advance recoveries. Unlocking reverts them.
- Payslips are printed on A4 and signed by three parties: preparer, authorized signatory, and employee.
- Data lives in the browser. The user's safety net is JSON export/import, and the Settings page also offers a wipe (type `RESET` to confirm) and a sample-data loader.

## Capabilities and Constraints

- **Modules:** Dashboard, Employees (with detail page), Attendance (daily sheet and monthly grid), Advances, Payroll, Payslip, Settings and backups.
- **Money:** All amounts are stored as integer paisa. The pure formulas in `src/lib/payroll.ts` are covered by Vitest. Net pay is never negative. Unmarked past working days count as absent.
- **No backend:** Persistence goes through `src/lib/storage.ts` only, so a REST backend can replace it later without touching UI components.
- **Language and calendar:** English only. Dates are Gregorian ISO. No Nepali-language UI and no Bikram Sambat calendar is planned.
- **Print:** The A4 payslip is a real document that is printed and signed. Its structure must stay faithful: company header, earnings and deductions, net pay in numbers and words, three signature blocks.
- **Money logic is off-limits to design work.** Design must not change payroll formulas, paisa storage, or finalize/unlock behavior.
- **Undecided:** Whether the product will ever be multi-user or multi-business. Whether it is deployed as the Docker/Nginx static bundle or elsewhere (a Dockerfile and Nginx instructions exist; no deploy target is confirmed).

## Evidence on Hand

- Sample data: 8 fictional Nepali staff with 3 months of history (`src/lib/sampleData.ts`).
- Default business name "Himalayan Enterprises" is a placeholder, not a real customer.
- There are no real customers, testimonials, logos or usage numbers. Do not invent any.

## Product Principles

1. **The daily task is the product.** Marking attendance must stay faster than the paper register, keyboard first.
2. **Every rupee is explainable.** Any figure on screen or on a payslip can be traced to a visible rule: days, rate, deduction line.
3. **Local and recoverable.** Data stays on the user's machine, and backup, restore and undo are visible and trustworthy.
4. **Nepal first, by default.** Currency, number grouping, weekly off, divisor and payslip wording follow local practice without configuration.
5. **Print is a first-class output.** The signed payslip is part of the product, not an afterthought.
