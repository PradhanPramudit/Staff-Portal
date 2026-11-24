# Staff Attendance & Payroll Web App (Nepal)

A production-grade, fast, and polished SaaS application designed for small to medium businesses in Nepal to manage daily employee attendance, salary advances, monthly payroll calculations, and printable A4 payslips.

Built with **React 18 + TypeScript + Vite + Tailwind CSS**.

---

## Key Features

1. **Dashboard**
   - 4 summary KPI cards: Active Staff, Today's Attendance Rate, Advances Issued This Month, Estimated Payroll Payout.
   - Today's marked attendance list + real-time **Not marked yet** panel with quick-action marking.
   - Live activity feed showing the last 10 organizational events.
   - Saturday weekly-off awareness banner.

2. **Employees Management**
   - Fast searchable table with department filters, active/inactive toggles, and column sorting.
   - Side drawer form for adding and editing staff members (full name, phone, department, designation, base salary in Rs., joining date, status).
   - Employee detail page: profile overview, monthly attendance calendar, advance history with remaining balances, and past finalized payslip archive.
   - Soft archiving with an immediate "Undo" notification toast.

3. **Attendance Tracking**
   - **Daily Marking Sheet**: Date picker defaulting to today with fast single-key keyboard shortcuts:
     - `P` : Present
     - `A` : Absent
     - `H` : Half-day (50% pay)
     - `L` : Paid leave (no deduction)
     - `↑` / `↓` : Move between employee rows
   - "Mark all present" button with instant exception adjustments.
   - Remarks/notes support per attendance record (e.g. "Doctor visit", "Late 30 mins").
   - **Monthly Grid View**: Color-coded employees × days matrix with sticky name column, monthly counters (P/A/H/L), and legend.

4. **Salary Advances**
   - Record staff advances with date, amount, note, and optional installment plan over $N$ months.
   - Status tracking: *Pending*, *Approved*, *Deducted*, *Rejected*.
   - Outstanding balance tracked per employee.
   - Scheduled monthly installment deductions capped automatically to protect employee net pay.

5. **Payroll Engine & Payslips**
   - Month-by-month calculation engine respecting Nepali business standards.
   - Pure calculation functions implemented in `src/lib/payroll.ts` and tested with **Vitest**.
   - Inline editable bonuses and other deductions with instantaneous net pay recomputation.
   - **Finalize Month**: Takes an immutable snapshot of all rows and deducts approved advances.
   - **Unlock Month**: Reverts advance deductions safely under confirmation.
   - **Export to CSV**: RFC 4180 compliant CSV export with UTF-8 BOM for Microsoft Excel compatibility in South Asia.
   - **Printable A4 Payslips**: Clean printable view with company header, earnings, deductions, net pay in numbers and words, and official signature blocks.

6. **Business Settings & Backups**
   - Business name, currency symbol (default `Rs.`), and number formatting (Nepali/Indian `1,00,000` vs international `100,000`).
   - Customizable daily rate divisor: **30 days** (Nepali standard), **calendar days in month** (28–31), or **custom working days** (e.g. 26 days).
   - Weekly off day selector (default Saturday = 6).
   - JSON export and import for complete data backups.
   - Danger zone: Wipe data (requires typing `RESET` to confirm).
   - "Load sample data" button: Seeds 8 realistic Nepali staff members with 3 months of complete attendance, advance, and payroll history.

---

## Exact Payroll Calculation Formulas

All monetary values are stored internally as integer **paisa** ($1\text{ Rupee} = 100\text{ Paisa}$) to eliminate floating-point precision issues. Rounding to whole paisa occurs deterministically at each deduction line.

1. **Daily Rate**:
   $$\text{daily\_rate} = \frac{\text{base\_salary}}{\text{divisor}}$$
   - $\text{divisor} = 30$ (Default standard in Nepal)
   - or $\text{divisor} = \text{days\_in\_month}$ (28, 29, 30, or 31)
   - or $\text{divisor} = \text{custom\_number}$ (e.g. 26 working days)

2. **Absence Deduction**:
   $$\text{absence\_deduction} = \text{absent\_days} \times \text{daily\_rate}$$
   *Unmarked working days in past dates are treated as absent to prevent unintentional payment of unrecorded days.*

3. **Half-day Deduction**:
   $$\text{half\_day\_deduction} = \text{half\_days} \times \text{daily\_rate} \times 0.5$$

4. **Mid-Month Joiner Deduction**:
   For an employee who joins on day $D > 1$, days in that month prior to joining date are unpaid:
   $$\text{mid\_month\_deduction} = \text{days\_before\_joining} \times \text{daily\_rate}$$

5. **Exempt Days (No Deduction)**:
   - **Paid Leave** ($\text{status} = \text{paid\_leave}$)
   - **Holidays** ($\text{status} = \text{holiday}$)
   - **Weekly Off** (Saturdays)

6. **Gross Earnings**:
   $$\text{gross\_earnings} = \text{base\_salary} + \text{bonus}$$

7. **Advance Recovery & Net Pay Floor**:
   $$\text{net\_before\_advance} = \max\Big(0, \text{gross\_earnings} - (\text{absence\_deduction} + \text{half\_day\_deduction} + \text{mid\_month\_deduction} + \text{other\_deductions})\Big)$$
   
   $$\text{advance\_recovery} = \min\big(\text{scheduled\_monthly\_installment}, \text{net\_before\_advance}\big)$$

   $$\text{advance\_carry\_forward} = \text{scheduled\_monthly\_installment} - \text{advance\_recovery}$$

   $$\text{net\_pay} = \max(0, \text{net\_before\_advance} - \text{advance\_recovery})$$
   *Net pay is strictly guaranteed never to become negative.*

---

## Local Development & Setup

### Prerequisites
- Node.js 18+ (tested on Node v20 / v24)
- npm 9+

### Commands to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests (Vitest)
npm test

# 3. Start the local Vite development server
npm run dev
```

Open your browser and navigate to the printed local URL:
```
http://localhost:5173/
```

*Note: On your first visit, the portal automatically bootstraps with 8 realistic Nepali staff members across Administration, Accounts, Sales, Support, Operations, and Logistics with 3 months of historical data.*

---

## Deploying Built `dist/` to Linux with Nginx

### 1. Build the Production Bundle
On your build machine or CI:
```bash
npm run build
```
This produces an optimized production folder at `./dist`.

### 2. Copy the Files to Your Linux Server
```bash
# Replace user@your-server-ip with your SSH details
rsync -avz --delete ./dist/ user@your-server-ip:/var/www/staff-portal/
```

On the Linux server, ensure proper permissions:
```bash
sudo chown -R www-data:www-data /var/www/staff-portal
sudo chmod -R 755 /var/www/staff-portal
```

### 3. Nginx Server Configuration
Create a new Nginx server block:
```bash
sudo nano /etc/nginx/sites-available/staff-portal.conf
```

Paste the following production configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name staff.yourdomain.com; # Replace with your domain or IP

    root /var/www/staff-portal;
    index index.html;

    # Gzip compression for static assets
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Browser caching for immutable hashed assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform, immutable";
    }

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Disable access logs for favicon and robots
    location = /favicon.svg {
        log_not_found off;
        access_log off;
    }
}
```

### 4. Enable the Site and Restart Nginx
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/staff-portal.conf /etc/nginx/sites-enabled/

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. (Optional) Enable HTTPS via Let's Encrypt Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d staff.yourdomain.com
```

---

## Architecture & Codebase Organization

```
staff-portal/
├─ index.html                     # Entry HTML with early dark mode detection script
├─ package.json                   # Dependencies (React 18, lucide-react, date-fns, Tailwind, Vitest)
├─ tailwind.config.js             # Custom zinc palette, deep teal accent, tabular-nums
├─ vite.config.ts                 # Vite + Vitest configuration
├─ src/
│  ├─ main.tsx                    # Entry point with sample data auto-bootstrap
│  ├─ App.tsx                     # Route switch, theme and toast providers
│  ├─ index.css                   # Tailwind styles, print media rules for A4 payslips
│  ├─ types/
│  │  └─ index.ts                 # Full domain TypeScript types (Paisa, Employee, Advance, PayrollRow)
│  ├─ lib/
│  │  ├─ storage.ts               # SINGLE storage module: the only file touching localStorage
│  │  ├─ payroll.ts               # Pure functions for daily rate, deductions, and advance recoveries
│  │  ├─ payroll.test.ts          # Vitest suite covering edge cases (zero attendance, joiners, caps)
│  │  ├─ money.ts                 # Integer Paisa conversions, Indian grouping (1,00,000), rupees in words
│  │  ├─ dates.ts                 # Date-fns month intervals, Saturday weekly-off helpers
│  │  ├─ csv.ts                   # Payroll CSV export with BOM for Excel
│  │  ├─ router.ts                # Lightweight hash router without external dependencies
│  │  └─ sampleData.ts            # 8 realistic Nepali staff records with 3 months of history
│  ├─ hooks/
│  │  ├─ useToast.tsx             # Toast notification context with undo support
│  │  └─ useTheme.ts              # Light / Dark mode manager (respects system preference)
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ Sidebar.tsx           # Fixed left sidebar with branding & mobile drawer
│  │  │  ├─ Topbar.tsx            # Sticky header with page titles and primary actions
│  │  │  └─ AppShell.tsx          # Main shell layout with mobile navigation context
│  │  ├─ ui/                      # Self-built accessible UI components
│  │  │  ├─ Button.tsx            # Primary, secondary, outline, destructive, ghost
│  │  │  ├─ Input.tsx             # Inputs with prefixes, labels, validation errors
│  │  │  ├─ Select.tsx            # Dropdown selects
│  │  │  ├─ Badge.tsx             # Restrained status badges (Present, Absent, Approved, etc.)
│  │  │  ├─ Drawer.tsx            # Slide-out side drawer with backdrop and Esc key support
│  │  │  ├─ Dialog.tsx            # Confirmation dialog for destructive actions
│  │  │  ├─ ToastContainer.tsx    # Toast rendering container
│  │  │  ├─ EmptyState.tsx        # Minimalist empty states
│  │  │  └─ Skeleton.tsx          # Pulse placeholder loaders
│  │  ├─ employees/
│  │  │  ├─ EmployeeForm.tsx      # Add/edit staff drawer form
│  │  │  └─ EmployeeTable.tsx     # Filterable and sortable employee table with mobile cards
│  │  ├─ attendance/
│  │  │  ├─ MarkingSheet.tsx      # Keyboard-driven daily attendance table (P/A/H/L)
│  │  │  └─ MonthlyGrid.tsx       # Employee × Day grid matrix with summary counters
│  │  ├─ advances/
│  │  │  ├─ AdvanceForm.tsx       # Advance issuance drawer with installment schedule
│  │  │  └─ AdvanceTable.tsx      # Advances list with status change and outstanding balance
│  │  └─ payroll/
│  │     └─ PayrollTable.tsx      # Monthly payroll sheet with inline editable bonuses/deductions
│  └─ pages/
│     ├─ Dashboard.tsx            # 4 KPI cards, today's attendance, not marked yet, recent activity
│     ├─ Employees.tsx            # Staff directory page
│     ├─ EmployeeDetail.tsx       # Staff profile, monthly calendar, advances, payslip history
│     ├─ Attendance.tsx           # Daily sheet vs monthly grid view
│     ├─ Advances.tsx             # Advance management page
│     ├─ Payroll.tsx              # Monthly payroll review, finalization, unlock, CSV export
│     ├─ PayslipPage.tsx          # Printable A4 payslip with print stylesheet
│     └─ Settings.tsx             # Business settings, divisor formula, weekly off, JSON backup/restore
```
