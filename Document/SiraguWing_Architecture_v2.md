
**SiraguWing**

System Architecture & Infrastructure Cost Estimate
India Pricing  |  100 – 500 Users  |  Chennai MVP Pilot

# 1. Technology Stack

The following stack reflects the updated architecture — React for the admin web panel, Flutter for mobile, and Python (FastAPI) for the API layer. Background jobs including conflict detection, fee reminders, 24-hour SLA tracking, and 30-day data purge run inside Python using Celery or APScheduler.



# 2. Why This Stack


## React (Admin Web Panel)

A dedicated React frontend (Vite + React) replaces the Flutter Web admin panel. React provides a richer ecosystem for complex data-heavy UIs — bulk approvals, fee ledger views, timetable grids, and reporting dashboards benefit from mature React component libraries. Firebase Hosting continues to serve the React build at zero cost.

## Flutter (Mobile)

Flutter remains the mobile layer for parents, teachers, and center owners on Android-first devices. Flutter's cross-platform capability and offline-capable local state management make it well suited for coaching center workflows on mid-range Android handsets common in Chennai.

## Python (FastAPI)

Python replaces .NET 8 as the API layer. FastAPI provides async request handling with automatic OpenAPI docs. Background jobs run via Celery (with Redis as broker) or APScheduler for simpler deployments:
- Conflict detection — PostgreSQL overlap query across child schedules
- Fee reminders — scheduled notifications to parents and centers
- 24-hour SLA tracking — escalation alerts for admin approval queue
- 30-day data purge — automatic cleanup of suspended center data

## PostgreSQL (via Supabase)

All structured data lives here — centers, students, batches, fees, schedules, enrollment, approval status, and conflict flags. Supabase provides a managed PostgreSQL instance with a generous free tier for the pilot. Python connects via asyncpg or psycopg3.

## Firebase

Four Firebase services remain unchanged, all free at pilot scale:
- Auth — phone OTP login for all roles, role claims in custom tokens
- FCM — push notifications for approval alerts, fee reminders, announcements
- Firestore — real-time structured messaging (batch threads, direct messages, homework threads)
- Hosting — React admin panel deployment, zero cost

# 3. Monthly Cost — 100 Users

Approx. 10–15 coaching centers. Most Firebase services remain on the free tier at this scale.



Note: Supabase free tier is sufficient up to ~200 users. Plan the upgrade to Pro ($25/month = ₹2,075) when you approach that threshold.

# 4. Monthly Cost — 250 Users

Approx. 25–35 coaching centers. Supabase free tier is exhausted — upgrade to Pro plan required.



Note: The Supabase Pro upgrade (₹2,075/month) is the largest single cost jump in this range. All other services scale gradually.

# 5. Monthly Cost — 500 Users

Approx. 50–70 coaching centers — your Chennai pilot target. Infrastructure cost remains very low relative to potential subscription revenue.




# 6. Revenue vs Cost

At 500 users with even conservative center subscription pricing, infrastructure is well under 10% of revenue.


Even at the lowest pricing tier (₹500/center/month), 22 centers at the 500-user stage cover the entire infrastructure cost. Razorpay payment processing fees are fully passed through to centers and do not affect this calculation.

Note: The table above models only center subscription revenue. SiraguWing operates five revenue streams: (1) center subscription fees, (2) per-student platform billing charged to centers (₹10–₹15/student/month), (3) Razorpay payment commission, (4) additional storage purchases above the 2 GB video file limit, and (5) featured listing and ad revenue from admin-approved promotional posts. The combined revenue potential at 500 users is significantly higher than the subscription-only figures shown above.

# 7. Key Cost Decisions


## MSG91 over Twilio

MSG91 charges ₹0.12–0.15 per SMS to Indian numbers. Twilio charges ₹3–4 per SMS. For an OTP-heavy app like SiraguWing (every login triggers an OTP), this saves ₹2,000–5,000/month at 500 users.

## Firebase Storage for Videos

Firebase Storage charges ₹0.026/GB stored with no egress fees for direct Flutter uploads. Since the PRD allows 2 GB video files, keeping uploads direct from Flutter to Firebase avoids routing large files through the Python API, saving both bandwidth and compute cost.

## Supabase over Self-Hosted PostgreSQL

Self-hosting PostgreSQL on a VPS would require managing backups, failover, and security patches. Supabase Pro at ₹2,075/month includes automated backups, monitoring, and a managed connection pool — worth the cost for a small team.

## React for Admin Web Panel

React (Vite) replaces Flutter Web for the admin panel. The React ecosystem offers mature data-grid libraries (AG Grid, TanStack Table), charting components, and form toolkits that accelerate development of the fee ledger, bulk approval queues, and timetable management views. Firebase Hosting serves the React build with zero additional cost.

## Python (FastAPI) for Background Jobs

Running conflict detection and scheduled jobs inside FastAPI using Celery or APScheduler keeps the Python deployment self-contained on Railway. Celery workers share the same codebase as the API, simplifying deployment during the pilot phase and avoiding a separate job service.
SiraguWing  |  System Architecture Document  |  Chennai MVP Pilot

---

## Tables from Architecture Document

| Technology | Service / Tool | Purpose in SiraguWing |
| --- | --- | --- |
| React | Vite + React (Admin Web Panel) | Owner bulk approvals, fee ledger, timetable management — dedicated web frontend |
| Flutter | Mobile — Android-first | Parent, teacher, and owner mobile apps |
| Python | FastAPI + Celery / APScheduler | API, background jobs, conflict detection, SLA tracking, data purge |
| PostgreSQL | Supabase managed PostgreSQL | All structured data — centers, fees, schedules, enrollment, approval status |
| Firebase | Auth + FCM + Firestore + Hosting | OTP login, push notifications, messaging, React web hosting |
| Razorpay | Payment gateway | Fee collection — 2% per txn passed to centers |
| MSG91 | SMS provider (India) | OTP backup + approval notifications |

| Minimum / month  ₹830  ~$10 USD | Average / month  ₹1,660  ~$20 USD | Maximum / month  ₹2,490  ~$30 USD |
| --- | --- | --- |


| Service | What it handles | Cost / month (INR) |
| --- | --- | --- |
| Railway (Python API) | FastAPI + Celery worker — Starter plan | ₹415 – ₹830 |
| Supabase PostgreSQL | Free tier — 500 MB DB, 2 GB file storage | ₹0 (Free) |
| Firebase Auth | Phone OTP — free up to 10,000/month | ₹0 (Free) |
| Firebase FCM | Push notifications — always free | ₹0 (Free) |
| Firebase Firestore | Messaging — within free tier at this scale | ₹0 (Free) |
| Firebase Storage | ~10 GB videos + PDFs | ₹25 – ₹50 |
| Firebase Hosting | React admin panel | ₹0 (Free) |
| MSG91 SMS | ~500 OTP + approval SMS | ₹75 – ₹100 |
| Razorpay | Payment gateway — passed to centers | ₹0 (Free) |
| Total |  | ₹830 – ₹2,490 |

| Minimum / month  ₹2,490  ~$30 USD | Average / month  ₹3,735  ~$45 USD | Maximum / month  ₹5,810  ~$70 USD |
| --- | --- | --- |


| Service | What it handles | Cost / month (INR) |
| --- | --- | --- |
| Railway (Python API) | Starter — may need 2 service instances | ₹830 – ₹1,660 |
| Supabase PostgreSQL | Pro plan — 8 GB DB | ₹2,075 |
| Firebase Auth | Phone OTP — still within free tier | ₹0 (Free) |
| Firebase FCM | Push notifications — always free | ₹0 (Free) |
| Firebase Firestore | Active messaging — light paid usage begins | ₹50 – ₹100 |
| Firebase Storage | ~30 GB videos + PDFs | ₹65 – ₹150 |
| Firebase Hosting | React admin panel | ₹0 (Free) |
| MSG91 SMS | ~1,200 OTP + approval SMS | ₹180 – ₹250 |
| Razorpay | Payment gateway — passed to centers | ₹0 (Free) |
| Total |  | ₹2,490 – ₹5,810 |

| Minimum / month  ₹4,980  ~$60 USD | Average / month  ₹7,470  ~$90 USD | Maximum / month  ₹10,790  ~$130 USD |
| --- | --- | --- |


| Service | What it handles | Cost / month (INR) |
| --- | --- | --- |
| Railway (Python API) | 2 instances for reliability | ₹1,660 – ₹2,490 |
| Supabase PostgreSQL | Pro plan — 8 GB DB | ₹2,075 |
| Firebase Auth | Phone OTP — free up to 10,000/month | ₹0 (Free) |
| Firebase FCM | Push notifications — always free | ₹0 (Free) |
| Firebase Firestore | Active messaging threads across centers | ₹200 – ₹400 |
| Firebase Storage | ~60 GB videos + PDFs | ₹130 – ₹300 |
| Firebase Hosting | React admin panel | ₹0 (Free) |
| MSG91 SMS | ~2,500 OTP + approval SMS | ₹375 – ₹500 |
| Razorpay | Payment gateway — passed to centers | ₹0 (Free) |
| Total |  | ₹4,980 – ₹10,790 |

| Users | Infra Cost / month | Revenue (₹500/center/mo) | Revenue (₹1,000/center/mo) |
| --- | --- | --- | --- |
| 100 | ₹830 – ₹2,490 | ₹5,000 – ₹7,500 | ₹10,000 – ₹15,000 |
| 250 | ₹2,490 – ₹5,810 | ₹12,500 – ₹17,500 | ₹25,000 – ₹35,000 |
| 500 | ₹4,980 – ₹10,790 | ₹25,000 – ₹35,000 | ₹50,000 – ₹70,000 |

