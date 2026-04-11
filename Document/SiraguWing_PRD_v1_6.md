
**SiraguWing**

Product Requirements Document (Structured UX PRD)
Version 1.6


# 1. Strategic Positioning


## 1.1 What SiraguWing Is

SiraguWing is not a coaching center management app.

SiraguWing is India's first Parent Super App for managing a child's entire learning life across all activity centers.


**The Shift**

- from: managing one center's operations
- to: managing a child's complete schedule, fees, communication, and growth across every center they attend

## 1.2 Why Features Alone Are Not Enough

Attendance, fees, batch management, and material sharing are table stakes. Any developer can build them. SiraguWing competes on connection — connecting things that others leave disconnected.

## 1.3 The 5 Moat Features


**Parent Super App**

- unified child schedule across all centers
- why hard to copy: requires every center in the city to be on the platform

**Conflict Detection**

- detects and warns about time clashes across different centers
- why hard to copy: requires cross-center schedule data

**Structured Communication**

- replaces WhatsApp with organized, searchable, center-linked messaging
- why hard to copy: requires parent and center adoption simultaneously

**Local Dominance**

- number 1 in Chennai before expanding
- why hard to copy: requires time, trust, and a built local network

**Lead Generation**

- centers receive new student leads from the parent discovery marketplace
- why hard to copy: only valuable once the parent network already exists


# 2. Platform Availability

SiraguWing is a single combined app. All roles — coaching center owners, teachers, and parents — use the same app and are routed to their role-based dashboard on login.

## Access by Role

- Coaching Center Owner / Admin — Web App + Mobile App
- Teacher / Staff — Web App + Mobile App
- Parent — Mobile App only (Android-first)
- Platform Admin — Web App + Mobile App

## Web App Best For

- batch creation and student enrollment tables
- fee ledger management
- timetable setup
- bulk material uploads
- admin approval queue, center review, and bulk approve

## Mobile App Best For

- daily attendance marking
- fee reminders and payment checks
- sending announcements
- posting to feed
- admin on-the-go approvals and notifications


# 3. Product Purpose

SiraguWing is a mobile-first management, parent engagement, and local discovery platform built for small local coaching centers in India.

The platform helps coaching centers replace paper registers, scattered WhatsApp communication, phone calls, and manual fee tracking with one simple digital system. It also helps parents manage their child's entire learning life — across every dance class, tuition center, drawing class, or daycare — from one app.

SiraguWing supports operational workflows for local education and activity providers while giving parents one place to:
- see their child's full daily schedule across all enrolled centers
- get automatic alerts when class times conflict
- manage fees and payments per center
- communicate with each center in an organized, searchable way
- access materials and live class links
- receive announcements
- discover verified nearby centers
- see admin-moderated promotional feeds and offers


# 4. Product Decisions

All open questions resolved. These decisions are locked and applied throughout this document.

- Separate apps or one combined app? → One combined app — single app for all roles
- Pilot city? → Chennai first, then Tamil Nadu state-wide
- Discovery visible to all or login required? → Login required
- Extra verification for daycare and kids school? → Yes — additional documents required
- Ad moderation policy? → Admin moderation required before any post goes live
- Payment gateway charges absorbed or passed on? → Passed on to centers
- Approval turnaround time? → 24 hours — admin SLA
- Bulk approve on web dashboard? → Yes
- Resubmission limit for rejected centers? → No limit
- Suspended center data retention? → 30 days, then purged
- Teacher video upload size limit? → 2 GB per file; additional storage purchasable
- Teacher material approval before parents see it? → Admin-controlled platform setting
- Center switcher UI for 3+ centers? → Dropdown
- Parent unlink from center? → Admin approval required


# 5. Primary Objectives

- digitize daily coaching center operations
- simplify attendance, fees, and payments
- improve communication through structured, searchable messaging
- centralize materials, notices, and live class links
- give parents a unified view of their child's full schedule across all centers
- automatically detect and warn parents about conflicting class times
- help parents discover verified nearby local centers — login required
- give centers an advertising channel with admin-moderated posts
- generate new student leads for centers through the discovery marketplace
- support a single parent account connected to multiple coaching centers
- require admin approval (24-hour SLA) before any center goes live
- dominate Chennai deeply before expanding to Tamil Nadu


# 6. Supported Segments

- tuition centers
- play schools
- daycare centers — extra verification required
- kids schools — extra verification required
- music classes
- dance classes
- painting / art classes
- abacus / Vedic maths centers
- spoken English classes
- yoga and activity centers


# 7. Pilot Plan

- Phase 1 city: Chennai
- Phase 2 expansion: Tamil Nadu state-wide
- target: onboard 50–100 centers in Chennai before expanding to any other city
- focus on depth in one city rather than breadth across many — local dominance strategy
- identify 3–5 pilot centers in Chennai across at least 3 categories including daycare and kids school
- discovery, feed, and conflict detection seeded with Chennai-area centers first
- all onboarding, support, and feedback loops run in Chennai before state-wide rollout


# 8. Role-Based Login Behaviour


## Login Screen

- user enters mobile number
- OTP is sent for verification
- system identifies the user role
- all roles use the same app — dashboard displayed matches the role
- if parent role: system loads all center connections and full child schedule data
- user is redirected to the appropriate dashboard

## Supported Roles

- Coaching Center Owner / Admin
- Teacher / Staff
- Parent (may be linked to one or more coaching centers)
- Platform Admin

## Negative Scenarios

- invalid OTP → inline error message
- expired OTP → resend option
- unregistered mobile number → sign-up or invite-required state
- role not assigned → "Contact Coaching Center / Administrator"
- session expired → auto logout and redirect to login


# 9. Center Registration & Admin Approval Flow

Every coaching center must complete registration and receive explicit approval from the Platform Admin before going live. Admin SLA is 24 hours. No center can onboard students, create batches, or appear in discovery until they are Approved.

## 9.1 Center Status Lifecycle

- Draft — registration started but not yet submitted
- Submitted — form submitted, awaiting admin review
- Under Review — admin has opened and is actively reviewing
- Approved — center is fully live; all features unlocked
- Rejected — returned to owner with reason; owner can edit and resubmit (no resubmission limit)
- Suspended — center locked; data retained 30 days then purged

## 9.2 Extra Verification — Daycare and Kids School


**Required Documents**

- valid registration certificate (ICDS or municipal registration)
- proof of premises (lease or ownership document)
- owner or operator ID proof
- safety or childcare compliance certificate if applicable

- admin must confirm all documents before approving
- approved centers marked with a Verified badge visible to parents in discovery

## 9.3 Registration Flow


**Step 1 — Center Owner Registers (Web or Mobile)**

- owner enters mobile number and verifies via OTP
- fills the center registration form
- if daycare or kids school: extra verification documents section shown and required
- submits form — status changes to Submitted
- confirmation: Your application has been submitted. We aim to review within 24 hours.


**Step 2 — Admin Reviews (Web or Mobile)**

- admin receives push notification: New center registration — [Center Name]
- admin has a 24-hour SLA to review
- admin opens Approval Queue and views full registration detail
- admin can mark status as Under Review to signal active review
- for daycare and kids school: admin validates all additional documents before approving


**Step 3 — Admin Approves or Rejects**

- Approve → center status becomes Approved
- owner receives push + SMS: Your center has been approved
- center immediately live for internal operations
- center appears in discovery — login required to view
- Reject → admin must select a reason and enter notes before confirming
- owner receives push + SMS with rejection reason
- owner can edit and resubmit — no resubmission limit
- resubmission re-enters admin queue with 24-hour SLA


**Step 4 — Center Goes Live**

- owner accesses full dashboard on web and mobile
- center timetable data feeds into the conflict detection engine
- center profile visible to logged-in parents in nearby discovery

## 9.4 Registration Form Fields


**Required**

- center name
- category
- owner name
- mobile number (OTP verified)
- address, city
- map pin — GPS or manual drop (required for discovery listing)
- operating days and timings
- age group served
- short description (minimum 50 characters)
- logo upload


**Required for Daycare and Kids School Only**

- registration certificate
- proof of premises
- owner ID proof
- safety or childcare compliance certificate if applicable


**Optional**

- center cover image
- fee range
- facilities
- additional verification documents
- social media or website link

## 9.5 Rejection Reason Categories

Admin must select one before confirming a rejection:
- incomplete or incorrect information
- unverifiable location or map pin
- duplicate or conflicting registration
- inappropriate or misleading description
- missing required documents
- missing daycare / kids school verification documents
- category mismatch
- other — requires free text

## 9.6 Pre-Approval State — Center Owner View

- registration status card — Submitted / Under Review / Rejected
- estimated review time: within 24 hours
- if Rejected: rejection reason shown with Edit and Resubmit button
- if Approved: full dashboard unlocked with a welcome banner
- if Suspended: dashboard locked with contact admin message and 30-day data retention notice
- no access to batch, students, attendance, fees, or operations until approved

## 9.7 Admin Approval Screen — Web


**Layout**

- left panel: approval queue list — tabs: All / Submitted / Under Review / Rejected / Approved / Suspended
- right panel: selected center detail view
- top bar: summary counts — Pending / Under Review / Approved today
- SLA indicator: centers approaching 24 hours highlighted


**Queue List Columns**

- center name, category, city, submitted date, hours since submission, status badge, action button


**Center Detail View**

- all registration fields in read-only format
- map preview showing pinned location
- logo and cover image thumbnails
- document viewer for all uploaded verification docs
- daycare and kids school: checklist of required verification documents
- owner mobile number with OTP verified badge
- previous submission history if this is a resubmission
- admin notes field — internal, not visible to center owner
- action buttons: Mark Under Review / Approve / Reject
- reject modal: reason category dropdown + free text, confirmation before sending
- bulk approve multiple centers at once (web only) — confirmation dialog required
- export center list to CSV (web only)

## 9.8 Admin Approval Screen — Mobile

- approval queue accessible from admin bottom navigation
- pending count badge shown on queue icon
- SLA alert badge for centers nearing 24-hour limit
- card list layout for submitted centers
- full center detail scrollable view
- Approve (green) and Reject (red) buttons at bottom of detail
- reject reason entered via a modal sheet before confirming
- push notification triggers instant queue refresh

## 9.9 Center Suspension

- admin opens an approved center and taps Suspend Center
- must enter suspension reason before confirming
- owner receives push + SMS + email with reason
- all operations locked — no new enrollments, no parent-facing activity
- center removed from discovery listing and excluded from conflict detection engine
- data retained for 30 days from suspension date, then permanently purged
- owner notified at 7-day mark and 1-day mark before purge
- admin can reinstate within 30 days — after 30 days center must register fresh

## 9.10 Notification Triggers — Approval Flow

- center submits → admin: push + in-app badge
- center approaching 24-hour SLA without review → admin: escalation alert
- admin marks Under Review → owner: push + SMS
- admin approves → owner: push + SMS + email
- admin rejects → owner: push + SMS with reason
- owner resubmits → admin: push + in-app badge
- admin suspends → owner: push + SMS + email
- admin reinstates → owner: push + SMS
- 7 days before data purge → owner: push + email warning
- 1 day before data purge → owner: final push + email warning

## Negative Scenarios

- admin approves with missing map pin → warning shown; discovery withheld until pin added
- daycare or kids school submitted without required documents → submit blocked
- duplicate center detected → flag shown before approval
- admin rejects without selecting reason → submit blocked
- network error during approval → retry prompt; status unchanged until confirmed
- two admins reviewing same center simultaneously → collision warning
- admin misses 24-hour SLA → escalation notification to senior admin


# 10. Coaching Center Owner UX Flow

Available on Web App and Mobile App. Same account, same data, real-time sync across platforms.

## 10.1 Center Dashboard Screen


**Components**

- home dashboard
- KPI cards
- quick action buttons
- recent activity list
- navigation to core modules


**KPI Cards**

- total students
- active batches
- today's attendance status
- pending fee amount
- recent notices sent
- ad/feed reach summary
- payment collection summary
- new leads from discovery this month


**Quick Actions**

- add student
- create batch
- mark attendance
- upload material
- send announcement
- post feed / ad
- check payments
- view enquiries from discovery


**Negative Scenarios**

- no students → empty state with CTA "Add Student"
- no batches → empty state with CTA "Create Batch"
- network issue → retry banner
- unauthorized access → permission denied state

## 10.2 Center Onboarding Screen


**Fields**

- center name
- category
- owner name
- mobile number
- address
- city
- map location
- operating timings
- logo upload
- center cover image
- short description
- age group served
- facilities
- fee range
- verification documents — required for daycare and kids school; optional for all others


**Supported Categories**

- tuition
- daycare — extra verification required
- kids school — extra verification required
- play school
- dance
- music
- art / painting
- abacus
- spoken English
- yoga / activity


**System Validation**

- required fields must be completed
- mobile number must be OTP verified
- one category must be selected
- map location must be valid for discovery listing and conflict detection
- daycare and kids school: all verification documents must be uploaded before submission


**Negative Scenarios**

- incomplete form → submit blocked
- daycare / kids school missing verification documents → submit blocked with checklist
- duplicate center profile detected → warning
- invalid mobile number → inline error
- map pin missing → listing visibility warning
- upload failure → retry prompt

## 10.3 Batch & Course Creation Screen


**Fields**

- course / subject name
- batch name
- category type
- assigned teacher
- class days
- start time
- end time
- batch strength limit
- fee amount


**System Behaviour**

- when a batch time is saved, it is registered with the conflict detection engine
- if the new batch time overlaps with an existing enrolled student's class at another center, alert triggered


**Actions**

- create batch
- edit batch
- assign teacher
- attach students
- deactivate batch


**Negative Scenarios**

- overlapping batch timings for the same teacher → conflict warning
- missing course name → inline validation
- duplicate batch name → alert
- invalid schedule time → blocking validation

## 10.4 Student Enrollment Screen


**Fields**

- student name
- age
- gender
- academic class / level
- parent name
- parent mobile number
- assigned batch
- admission date
- active / inactive status


**Multi-Center Parent Handling**

When enrolling a student whose parent mobile number already exists in the platform:
- system detects the existing parent account automatically
- links the new enrollment to the same parent account — no duplicate account created
- adds this center as an additional connection in the parent's dashboard
- new batch time registered with the conflict detection engine
- if new batch time conflicts with existing class from another center, conflict alert shown during enrollment
- confirmation: Parent account found — this center will be added to their existing dashboard


**Actions**

- add student
- edit student
- link parent
- change batch
- deactivate student


**Negative Scenarios**

- parent mobile already mapped to another center → auto-link with confirmation (not a blocking error)
- conflict detected with another center's batch time → warning shown during enrollment
- missing required fields → validation
- invalid mobile number → error
- batch not selected → submit blocked
- save failed → retry prompt

## 10.5 Timetable Management Screen


**Components**

- weekly schedule view
- batch-wise timetable
- teacher-wise allocation
- add/edit schedule modal


**Actions**

- create recurring class schedule
- modify timing
- reassign teacher
- cancel class
- notify parents about changes


**Negative Scenarios**

- overlapping time slots for same teacher → warning
- missing batch selection → validation error
- teacher double-booked → conflict message
- unsaved changes → exit confirmation modal

## 10.6 Attendance Tracking Screen


**Layout**

- date selector
- batch selector
- student list
- present / absent toggle
- save action


**Attendance Actions**

- mark batch attendance
- mark all present
- edit same-day attendance
- view attendance history


**System Goal**

- full batch attendance should be marked in less than 1 minute


**Negative Scenarios**

- no batch selected → blocking state
- attendance already marked → edit confirmation
- save failed due to network → retry banner
- duplicate submission → overwrite confirmation
- session timeout → restore last unsaved attendance if possible

## 10.7 Fee Management & Payment Screen


**Components**

- fee summary
- student-wise ledger list
- due date filter
- status tabs: paid / pending / overdue
- payment method summary


**Fields**

- student name
- batch
- fee plan
- amount
- due date
- payment status
- payment mode
- transaction ID
- payment notes


**Actions**

- create fee plan
- assign fee
- mark as paid
- collect online payment
- send fee reminder
- edit amount
- view payment history
- download receipt


**Payment Gateway Support**

- UPI
- debit / credit card
- net banking
- wallet support if enabled


**Payment Gateway Charges**

- charges passed on to the coaching center
- charges displayed transparently at point of payment setup


**Negative Scenarios**

- no fee plan assigned → warning state
- duplicate payment entry → validation error
- payment failed → retry or alternate payment option
- invalid amount → inline error
- webhook / payment sync delay → pending verification state
- overdue fee → red highlight

## 10.8 Study Material Sharing Screen


**Supported Types**

- PDF
- image
- DOC file
- text note
- video link


**Fields**

- title
- description
- upload type
- file / link
- batch assignment
- publish date


**Actions**

- upload material
- assign to batch
- edit material
- delete material


**Negative Scenarios**

- unsupported file format → validation error
- file size too large → upload blocked
- no batch selected → submit blocked
- upload interrupted → retry prompt
- broken video link → invalid URL warning

## 10.9 Announcements Screen


**Fields**

- title
- message
- optional attachment
- target batch or all parents
- schedule now / later


**Actions**

- publish announcement
- schedule notification
- resend push notification
- edit announcement


**Negative Scenarios**

- blank announcement → validation error
- attachment upload failed → retry
- push delivery failed → resend option
- no audience selected → blocking validation

## 10.10 Feed / Advertisement Posting Screen

Allow centers to publish promotional posts in the parent feed. All promotional posts require admin review and approval before they are visible to parents.


**Supported Content**

- course advertisement
- new batch opening
- summer camp promotion
- daycare admission notice
- event highlights
- achievements
- festive offers
- workshops and competitions


**Fields**

- post title
- description
- image / video
- category tag
- location
- CTA button
- validity date
- sponsored / featured toggle — admin controlled


**Actions**

- create feed post — enters admin moderation queue
- edit post — re-enters moderation queue
- boost post (future)
- archive post


**Moderation Flow**

- center submits post → status: Pending Review
- admin reviews post in moderation queue
- if approved → post goes live in parent feed
- if rejected → center notified with rejection reason
- edited posts re-enter the moderation queue


**Negative Scenarios**

- missing media on ad type that requires image → validation warning
- expired validity date → auto-hide
- ad rejected by admin → rejection reason shown with edit option
- promotional content policy violation → blocked with explanation

## 10.11 Lead Generation & Enquiry Management Screen

Centers receive inbound enquiries from parents browsing the discovery marketplace. This is the key retention feature — centers stay on SiraguWing because it brings them new students.


**Enquiry Fields — Parent Submitted**

- parent name
- child name and age
- category of interest
- preferred timing
- message — optional


**Center View — Lead Card**

- parent name and mobile number
- child details and interest category
- enquiry date and time
- status: New / Contacted / Enrolled / Not Interested
- notes field for center owner


**Actions**

- view lead details
- update lead status
- call parent directly from lead card
- mark as enrolled — auto-creates student enrollment if confirmed
- add notes to lead


**System Behaviour**

- new enquiry → center receives push: New enquiry from [Parent Name]
- leads sorted by date; new leads shown at top
- filter by status: All / New / Contacted / Enrolled / Not Interested
- conversion rate shown: enquiries received vs enrolled this month


**Negative Scenarios**

- parent submits enquiry for suspended center → enquiry blocked
- center does not respond within 48 hours → reminder nudge to center
- lead marked as enrolled but no batch assigned → prompt to complete enrollment

## 10.12 Live Classes Screen

Enable coaching centers to schedule and share online live classes using Zoom, Google Meet, or Microsoft Teams.
Product Recommendation: Live Classes included in Phase 2 as a lightweight scheduling and join module — not a native built-in video system.


**Fields**

- class title
- batch name
- teacher name
- class date
- start time
- end time
- meeting link
- optional description
- status


**Actions**

- schedule live class
- edit class
- cancel class
- resend reminder
- mark completed


**System Behaviour**

- live class times are registered with the conflict detection engine
- live classes visible only to assigned batch users
- reminder notification sent before class starts
- class moves to history after completion


**Negative Scenarios**

- missing meeting link → submit blocked
- past date/time selected → invalid schedule error
- teacher already assigned at that time → conflict warning
- broken meeting URL → validation error
- class cancelled → join disabled with notice
- notification delivery failed → retry option

## 10.13 Discovery Listing Management Screen

Allow centers to appear in parent-side nearby discovery. Discovery accessible to logged-in users only.


**Fields**

- center name
- category
- geo-location
- service radius
- age group
- fee range
- facilities
- photos
- verification badge status — especially visible for daycare and kids school
- trial availability — future
- advertisement status


**Actions**

- enable/disable discovery listing
- update location
- edit public profile
- upload gallery
- manage offers


**Negative Scenarios**

- missing map location → cannot appear in discovery
- unverified center → limited visibility
- incomplete public profile → low ranking warning
- daycare or kids school without verified badge → limited trust indicators shown

## 10.14 Archive / Inactive Records Screen


**Archived Entities**

- inactive students
- completed batches
- expired announcements
- old materials
- expired ads


**Negative Scenarios**

- archive blocked due to active dependency
- restore failed due to deleted parent batch
- missing data → warning message


# 11. Teacher / Staff UX Flow

Teachers access SiraguWing on both Web App and Mobile App. Mobile preferred for daily attendance; web for uploads and schedule management.

## 11.1 Teacher Dashboard

Shows:
- today's assigned classes
- pending attendance tasks
- upcoming live classes
- recent materials
- latest announcements

## 11.2 Attendance Screen


**Capabilities**

- select assigned batch
- mark attendance quickly
- edit same-day entry

## 11.3 Material Upload Screen

Teachers can upload learning materials directly for their assigned batches.


**Supported Upload Types**

- handwritten or typed notes — PDF or DOC
- images — class photos, worksheets, diagrams (JPG, PNG)
- video files — recorded lessons or demos (MP4, uploaded directly)
- video links — YouTube, Google Drive, or any external video URL
- text notes — typed summaries or instructions


**File Size Limit**

- maximum 2 GB per video file on the free tier
- additional storage purchasable from SiraguWing
- storage usage indicator shown in the upload screen


**Fields**

- title
- description
- upload type — note / image / video file / video link / text
- file upload or URL
- batch assignment — select which batch this material is for
- publish date — publish now or schedule for later


**Actions**

- upload material
- assign to batch
- edit material title or description
- delete material
- view list of all materials uploaded by this teacher


**Material Visibility Setting**

- controlled by Platform Admin — center owners cannot override
- Immediate: materials go live to parents as soon as uploaded
- Requires Center Review: center owner must approve each upload before parents can see it
- current setting shown to teachers at top of the upload screen


**System Behaviour**

- materials visible to all students in the assigned batch (subject to visibility setting)
- center owner / admin can always see and manage teacher-uploaded materials
- parents see materials in the Materials section of their child's dashboard
- video files show upload progress bar with percentage
- video links validated for a working URL before saving


**Negative Scenarios**

- unsupported file format → validation error with accepted format list shown
- file exceeds 2 GB → upload blocked: File exceeds the 2 GB limit. Purchase more storage.
- teacher not assigned to selected batch → batch not shown in dropdown
- video link is broken or invalid → URL validation error before save
- upload interrupted due to weak network → retry with progress resume where possible
- duplicate file name in same batch → overwrite confirmation
- no batch assigned to teacher → upload blocked with message to contact center admin

## 11.4 Live Class Management Screen


**Capabilities**

- schedule live session for assigned batch
- attach Zoom / Google Meet / Teams link
- notify parents
- cancel or edit class


**Negative Scenarios**

- teacher not assigned to batch → access denied
- attendance already submitted → edit confirmation
- invalid meeting link → validation error
- duplicate content upload → overwrite warning
- upload failure → retry state


# 12. Parent UX Flow

Parents use the Mobile App only (same combined app, parent dashboard shown on login). Android-first launch.

Multi-Center Parent Account: A single parent account connects to multiple coaching centers simultaneously. Example — child in dance class and drawing class — both visible in one app, one schedule, one fee summary. Parents auto-connect when a center enrolls their child.

Discovery is login-gated: parents must be logged in to browse nearby centers.

## 12.1 Parent Dashboard Screen

The dashboard is the control center for a child's learning life. Shows:
- child profile with all center enrollment badges
- Today's Schedule card — all classes for the day sorted by time across all centers
- conflict alert banner — shown if any classes overlap today
- unified attendance summary across all centers
- total fee due across all centers
- recent materials from all centers
- latest notices from all centers
- upcoming live classes from all centers
- local nearby center suggestions — login required
- sponsored advertisements in feed


**Center Switcher**

- for 2 centers: tab bar with both center names
- for 3 or more centers: dropdown selector
- per-center view shows only that center's data
- All Centers option at top of dropdown returns to unified summary
- each entry shows center name, category badge, and child's batch name


**Negative Scenarios**

- no center linked → prompt to contact center for enrollment
- only one center linked → switcher hidden
- center deactivated → shown as inactive in switcher with last known data
- sync error for one center → that center shows refresh warning; others load normally

## 12.2 Child Daily Schedule Screen

Show the parent a complete, accurate picture of their child's day — across every center — in one glance.


**Schedule View**

- timeline view of the full day — morning to evening
- each class shown as a card: center name, class name, teacher, start time, end time
- color-coded by center
- today shown by default; parent can scroll to any day of the week
- classes from all linked centers appear in the same timeline
- live class entries appear with a join button if the class is active


**Conflict Alert**

- if two classes overlap in time across different centers, red conflict banner appears
- conflict card shows: Class A at Center X and Class B at Center Y overlap at [time]
- parent can tap to see details and take action


**Weekly Overview**

- small dot calendar at top showing which days have classes
- tap any day to see its full schedule
- empty days shown with: No classes today. Explore nearby centers.


**Smart Reminders**

- push notification 30 minutes before each class: [Child Name] has [Class Name] at [Center Name] in 30 minutes
- if parent has not acknowledged a conflict, reminder sent the morning of the conflicting day


**Negative Scenarios**

- no classes scheduled → empty state
- center timing data not synced → class shown with Timing update pending label
- conflict not resolved after 3 days → escalation reminder to parent

## 12.3 Conflict Detection Screen

Automatically detect when a child's classes at different centers overlap and present this clearly to the parent.


**How It Works**

- system continuously checks all batch times for every enrolled child
- if batch A at Center X and batch B at Center Y overlap on the same day and time, conflict detected
- conflict surfaced on dashboard, in the schedule, and as a push notification


**Conflict Card**

- conflict type: Time Overlap
- child name
- Center A — class name, time
- Center B — class name, time
- overlap duration
- suggested action: contact center or change batch


**Actions**

- view both class details
- open communication thread with either center to discuss rescheduling
- request batch change at one center — sent as request to center owner


**System Behaviour**

- conflict detection runs whenever a new batch is added or timetable updated
- resolved conflicts (batch time changed or student moved) automatically cleared


**Negative Scenarios**

- conflict detected but one center has not synced timetable → shown as Possible conflict — timing not confirmed
- parent dismisses conflict without resolving → re-surfaced every 3 days until resolved

## 12.4 Structured Communication Screen

Replace scattered WhatsApp conversations with organized, searchable, center-linked communication. Every message is tied to a specific center, batch, or student.


**Communication Types**

- Center Announcements — one-way broadcast from center to all parents
- Batch Group Thread — all parents and teacher in a batch; only center/teacher can post
- Direct Message — parent to teacher or center owner; one-on-one thread
- Homework Thread — teacher posts homework; parent acknowledges; linked to student and subject
- Media Sharing — teacher uploads photos, videos, notes; tagged by batch and date


**Fields — New Message**

- recipient: center / teacher / batch
- subject / topic tag: homework / fee / schedule / general / media
- message body
- attachment — photo, video, document


**Actions**

- send message
- reply to thread
- search messages by keyword, center, or date
- filter by topic tag
- mark as read / unread
- view all media shared in a thread — media gallery view


**System Behaviour**

- all messages stored per center — switching center also switches communication view
- parents see their own threads only
- teachers see all threads for their assigned batches
- center owner sees all communication across all batches
- messages archived and remain searchable when a batch ends
- push notification for every new message, labeled with center name


**Negative Scenarios**

- message delivery failed → retry with network error message
- attachment too large → upload blocked
- parent tries to message suspended center → messaging disabled with status notice
- search returns no results → suggest broadening filters

## 12.5 Attendance View Screen


**Capabilities**

- daily attendance status per center
- monthly summary per center
- absent history per center
- attendance percentage per center


**Negative Scenarios**

- no attendance available → empty state
- sync delay → refresh warning

## 12.6 Fee & Payment Screen


**Capabilities**

- fee summary per center
- total outstanding across all centers shown at top
- online fee payment per center individually
- payment history per center
- transaction status
- receipt download


**Payment Gateway Features**

- UPI payment
- card payment
- net banking
- payment success / failure states
- receipt generation
- pending verification state


**Note on Charges**

- gateway charges borne by the center, not the parent
- parents pay only the fee amount set by the center


**Negative Scenarios**

- payment failed → retry / choose another method
- duplicate payment attempt → warning
- gateway timeout → payment pending state
- receipt not generated → retry sync

## 12.7 Materials Screen


**Capabilities**

- view materials from all connected centers or filter per center
- center name and teacher name label shown on each material card
- open notes and PDFs
- view images uploaded by teacher
- play or open video files and video links
- filter by child, center, or batch
- search materials by keyword or subject


**Negative Scenarios**

- no materials available → empty state
- broken file link → error message
- restricted material → hidden access — pending center review if visibility setting active

## 12.8 Announcements Screen


**Capabilities**

- read center notices labeled by center name
- view attachments
- see scheduled holidays or events
- receive push notifications labeled by center name


**Negative Scenarios**

- no notices available → empty state
- failed attachment load → retry option

## 12.9 Live Classes Screen


**Capabilities**

- view upcoming live classes from all connected centers
- center name shown per class entry
- live classes also appear in the Daily Schedule view
- see teacher, date, time, and title
- receive class reminder
- tap join button
- view class status: scheduled / live now / completed / cancelled


**Negative Scenarios**

- no live classes scheduled → empty state
- expired meeting link → invalid join message
- class cancelled → cancellation notice
- network issue while opening class → retry prompt

## 12.10 Nearby Local Centers Discovery Screen

Accessible to logged-in users only. Unauthenticated users see a login prompt.


**Supported Categories**

- tuition centers
- daycare — verified badge shown
- kids schools — verified badge shown
- play schools
- music classes
- dance classes
- painting / art
- abacus
- spoken English
- yoga / activity centers


**Components**

- search bar
- location permission
- category filters
- distance filter
- fee range filter
- age group filter
- rating / featured badge
- verified badge for daycare and kids school
- map/list view
- promoted center cards


**Listing Information**

- center name
- category
- distance
- location
- fee range
- age group
- photos
- verified badge — daycare and kids school only
- rating/review placeholder — future
- advertisement / featured tag


**Actions**

- view center profile
- call center
- open map
- save favorite
- submit enquiry — name, child details, preferred timing, message
- visit feed ad


**Enquiry Flow**

- parent taps Enquire on a center card
- fills short form: child name, age, category of interest, preferred timing, optional message
- center receives enquiry as new lead in their Lead Generation screen
- parent confirmation: Your enquiry has been sent. The center will contact you soon.


**Negative Scenarios**

- unauthenticated user attempts to browse → login prompt shown
- location permission denied → manual location entry
- no centers found → broad search suggestion
- incomplete listing → limited info state
- invalid map data → listing hidden

## 12.11 Feed / Advertisement View Screen

All posts in this feed have been reviewed and approved by admin before appearing.


**Feed Content Types**

- announcements from all linked centers
- nearby center advertisements — admin-approved
- new admission offers
- summer camps
- daycare promotions
- events and competitions
- achievements and highlights


**Actions**

- view details
- open center profile
- save post
- share post
- hide irrelevant ad


**Negative Scenarios**

- ad image failed → placeholder shown
- expired ad → auto removed
- invalid CTA → hidden button

## 12.12 Child Profile Screen


**Capabilities**

- view child details
- switch between multiple children under one parent account
- see all center enrollments for each child
- see batch mapping per center


**Unlink Flow**

- parent taps Unlink from Center on the child profile
- request logged and sent to Platform Admin for review
- admin reviews and approves or rejects the unlink request
- if approved: center removed from parent's dashboard and schedule
- if rejected: parent notified with a reason
- parent cannot remove the center themselves without admin approval


**Negative Scenarios**

- no child linked → contact center message
- incorrect mapping → support state
- unlink request pending → center shown with Pending Removal label


# 13. Platform Admin UX Flow

Platform Admin accesses SiraguWing on both Web App (primary) and Mobile App (on-the-go). All admin screens available on both platforms.

## 13.1 Admin Dashboard

Shows:
- total registered centers
- pending approval count — highlighted when greater than 0
- centers approaching 24-hour SLA — highlighted
- approved centers
- rejected / resubmitted centers
- suspended centers — with days remaining before data purge
- parents onboarded
- students onboarded
- parents with multi-center connections
- conflicts detected this week
- flagged issues
- ad/feed moderation queue — posts pending review
- total enquiries submitted through discovery this month
- payment summary
- app usage summary
- pending parent unlink requests

## 13.2 Center Approval Screen

Full approval flow covered in Section 9. Available on both web and mobile.


**Capabilities**

- view full approval queue — web and mobile
- approve center registration
- reject registration with reason
- mark center as Under Review
- bulk approve multiple centers at once (web only) — confirmation dialog required
- export center list to CSV (web only)
- suspend and reinstate approved centers
- review all registration fields including verification documents
- extra document checklist for daycare and kids school categories
- manage verification status and verified badge
- 24-hour SLA tracking and escalation alerts


**Negative Scenarios**

- duplicate center detected → warning flag before approval
- daycare / kids school missing required documents → approval blocked
- admin misses 24-hour SLA → escalation alert to senior admin

## 13.3 User Management Screen


**Capabilities**

- search users by mobile number or name
- activate / deactivate account
- view all center connections for a parent account
- review and approve or reject parent unlink requests
- manually link or unlink parent-center connections if needed
- resolve access issues
- manage admin team permissions


**Negative Scenarios**

- unauthorized admin action
- invalid account mapping
- inactive user access attempt

## 13.4 Content & Advertisement Oversight Screen

All promotional posts from coaching centers pass through this screen before going live.


**Capabilities**

- review incoming posts from the moderation queue
- approve post → post goes live in parent feed
- reject post → center notified with rejection reason
- remove previously approved posts if reported or in violation
- moderate misuse or spam


**Rejection Reason Categories**

- misleading or false claims
- inappropriate content
- unrelated to center's registered category
- spam or repetitive posting
- content policy violation
- other — free text required


**Negative Scenarios**

- ad policy violation → rejected with reason
- repeated spam from same center → center flagged; admin can escalate to suspension
- unresolved flagged content → escalation alert

## 13.5 Platform Settings Screen


**Teacher Material Visibility Setting**

- option 1: Immediate — materials visible to parents as soon as uploaded
- option 2: Requires Center Review — center owner must approve each upload
- global platform setting — center owners cannot override
- current setting displayed to teachers in their upload screen


**Conflict Detection Settings**

- enable or disable conflict detection platform-wide
- set minimum overlap threshold — default: any overlap
- set reminder frequency for unresolved conflicts — default: every 3 days


**Communication Settings**

- enable or disable direct messaging between parents and teachers
- enable or disable homework thread feature
- set message retention period


**Other Settings**

- data retention period for suspended centers — currently 30 days
- storage tier thresholds and purchasable storage plan configuration
- platform-wide notification defaults

## 13.6 Payment Monitoring Screen


**Capabilities**

- monitor successful transactions
- review failed transactions
- verify pending payments
- manage refund requests — future phase


**Negative Scenarios**

- payment mismatch
- delayed webhook update
- duplicate transaction reported


# 14. Data Model — Key Relationships

The platform uses a many-to-many model for parents and centers. One parent can connect to many centers; one center has many parents.

- Parent — identified uniquely by mobile number; one account per mobile number
- Center — each coaching center; requires admin approval before going live
- Student — linked to one parent; can be enrolled at multiple centers
- ParentCenterLink — junction: ParentID + CenterID + StudentID + Status + LinkedDate
- Enrollment — StudentID + BatchID + CenterID + AdmissionDate + Status
- Batch — belongs to one center; includes Day + StartTime + EndTime for schedule
- Fee — scoped to CenterID + StudentID + BatchID
- Attendance — scoped to CenterID + BatchID + StudentID + Date
- Material — scoped to CenterID + BatchID; includes UploaderRole field
- Announcement — scoped to CenterID; delivered to all linked parent accounts
- CenterApproval — CenterID + Status + ReviewedBy + ReviewDate + RejectionReason + SLADeadline
- FeedPost — CenterID + Status (Pending / Approved / Rejected) + ReviewedBy + ReviewDate
- UnlinkRequest — ParentID + CenterID + RequestDate + Status + ReviewedBy
- ScheduleConflict — StudentID + BatchID_A + BatchID_B + OverlapDay + OverlapTime + Status
- Enquiry — ParentID + CenterID + ChildDetails + PreferredTiming + Status + Notes
- Message — SenderID + RecipientID + CenterID + BatchID + TopicTag + Body + Timestamp
- MessageThread — ThreadType + CenterID + BatchID + Participants


**Multi-Center Auto-Link Logic**

When a center enrolls a student with a mobile number that already exists:
- look up the existing parent account by mobile number
- create a new ParentCenterLink record — do not create a duplicate parent account
- create a new Enrollment record for the student at the new center
- send a push notification to the parent about the new center connection


# 15. Data & Versioning Behaviour

- draft center setup changes → no version milestone
- attendance update → timestamped audit trail
- fee status update → payment activity entry
- payment transaction → unique ledger record
- announcement edit → updated record timestamp
- material replacement → overwrite or new upload record
- live class edit → updated schedule history
- ad/feed update → re-enters moderation queue; new publish timestamp on approval
- discovery listing update → refreshed listing data
- parent-center link created → logged with timestamp and center ID
- parent-center link removed → requires admin approval; archived connection record created
- center approval status change → logged with admin ID, timestamp, and reason
- suspended center → 30-day retention timer starts; purge logged with timestamp
- batch time change → triggers re-run of conflict detection for all enrolled students
- conflict detected → new ScheduleConflict record created with Active status
- conflict resolved → ScheduleConflict record updated to Resolved with timestamp
- enquiry submitted → new Enquiry record; center notified
- message sent → new Message record; recipient notified


# 16. Notifications


## Coaching Center Notifications

- registration submitted confirmation
- status change: Under Review / Approved / Rejected / Suspended / Reinstated
- SLA reminder: application under review — response within 24 hours
- rejection reason with edit and resubmit prompt
- new enquiry received: New enquiry from [Parent Name]
- enquiry not responded to in 48 hours → nudge reminder
- overdue fee alert summary
- payment received
- failed payment alert
- batch has no timetable
- feed post approved → post is now live
- feed post rejected → reason shown with edit option
- data purge warning (if suspended) — 7 days and 1 day before deletion
- new message from parent in communication thread

## Teacher Notifications

- batch assigned
- live class scheduled
- timetable change
- pending attendance reminder
- material upload confirmed
- material rejected by center owner (if review setting active)
- new message in batch thread or direct thread

## Parent Notifications

All notifications labeled with center name when connected to multiple centers.
- student linked successfully — includes center name
- new center connected to your account
- class reminder — [Child Name] has [Class Name] at [Center Name] in 30 minutes
- conflict detected — [Child Name] has overlapping classes today
- conflict reminder — unresolved conflict still active after 3 days
- attendance marked — [Center Name]
- fee due reminder — [Center Name]
- payment success / failure — [Center Name]
- announcement published — [Center Name]
- material uploaded — [Center Name]
- live class scheduled / reminder / cancelled — [Center Name]
- new message from teacher or center — [Center Name]
- homework posted — [Center Name] / [Batch Name]
- enquiry sent confirmation
- center replied to your enquiry
- unlink request submitted — pending admin review
- unlink request approved — center removed from your dashboard
- unlink request rejected — reason shown
- nearby promoted center / ad updates — optional

## Admin Notifications

- new center registration submitted — push + in-app badge
- center nearing 24-hour SLA — escalation alert
- center resubmitted after rejection — push + in-app badge
- new feed post awaiting moderation — push + in-app badge
- flagged content reported
- verification pending — daycare / kids school documents
- payment failure spike alert
- parent unlink request submitted — requires admin review


# 17. Design System


## Primary Colors

- Primary Blue: #4F46E5
- Deep Blue: #2C5A85
- Background: #F5F7FA
- Card Border: #E5E7EB

## Status Colors

- Pending / Draft: #FACC15
- Under Review: #3B82F6
- SLA Warning (approaching 24h): #F97316
- Approved / Active / Success: #22C55E
- Overdue / Rejected / Error: #EF4444
- Archived / Inactive: #9CA3AF
- Suspended: #7C3AED
- Sponsored / Featured: #F97316
- Multi-Center Badge: #8B5CF6
- Verified Badge — daycare / kids school: #0EA5E9
- Conflict Alert: #EF4444
- Schedule Card — per-center color: assigned dynamically from a palette of 6 colors

## Buttons

- Primary → blue fill with white text
- Secondary → grey outline
- Danger → red accent
- Approve → green fill
- Reject → red with reason modal
- Sponsored CTA → orange accent
- Conflict Action → red outline with icon

## Typography

- Heading → SemiBold
- Body → Regular
- Meta / Labels → Muted Grey

## Cards

- white background
- soft shadow
- 12px border radius

## Responsive Layout

- web: sidebar navigation, full-width tables for enrollment / fee ledger / approval queues
- mobile: bottom tab bar, card layouts, swipe gestures
- admin approval queue: 2-panel on web (list + detail), single-panel drilldown on mobile
- center switcher: tab bar for 2 centers; dropdown for 3 or more
- daily schedule: vertical timeline on mobile; weekly grid on web


# 18. Non-Functional Requirements

- one combined app — single codebase serving all roles based on login
- mobile-first UX
- Android-first launch
- fast loading on average Indian networks — Chennai pilot optimised first
- low-data usage mode where possible
- OTP-based secure authentication
- role-based access control
- secure storage of parent and child data
- discovery accessible only to authenticated users
- secure payment gateway integration — charges passed on to centers
- reliable payment status reconciliation
- easy UI for non-technical users
- scalable backend for many-to-many parent-center relationships
- conflict detection engine must run in real time on every batch or timetable change
- communication layer must support threaded messages with attachment storage
- reliable push notifications with center-name labeling for multi-center parents
- location-based discovery support
- all promotional feed posts moderated by admin before display
- file uploads stable under weak mobile networks — notes, images, and video files
- video uploads up to 2 GB with progress bar and resume on interrupted upload
- admin approval flow works fully on web and mobile with 24-hour SLA tracking
- suspended center data purged after 30 days with advance notifications
- platform settings configurable by admin only
- lead and enquiry data retained for centers for at least 12 months


# 19. MVP Scope


## Included in MVP

- one combined app — single app for all roles
- role-based login and role-based dashboard routing
- center registration form — web and mobile
- admin approval queue with 24-hour SLA tracking — web and mobile
- center status lifecycle: Draft → Submitted → Under Review → Approved / Rejected → Suspended
- extra verification flow for daycare and kids school categories
- verified badge for approved daycare and kids school listings
- center onboarding
- batch and course creation
- student enrollment with automatic multi-center parent linking
- timetable management
- attendance tracking
- fee tracking with payment gateway — charges passed to centers
- announcements
- study material sharing — owner and teacher upload: notes, images, video files up to 2 GB, video links
- admin-controlled platform setting for teacher material visibility
- Child Daily Schedule — unified cross-center schedule view for parents
- Conflict Detection Engine — automatic detection and alert for overlapping class times
- Structured Communication Layer — batch threads, direct messages, homework threads, media gallery
- Lead Generation & Enquiry Management — discovery enquiries routed to centers as leads
- parent mobile dashboard — multi-center view with tab bar (2 centers) or dropdown (3+ centers)
- discovery — login-gated, verified badges for daycare and kids school
- feed with admin-moderated advertisements
- admin content moderation queue for all promotional posts
- admin bulk approve — web only
- parent unlink request flow with admin approval
- coaching center web + mobile access
- platform admin web + mobile access
- Chennai as pilot city — deep coverage of 50–100 centers before any expansion

## Phase 2

- live class scheduling with external meeting links
- improved payment and receipt automation
- promoted listings and featured center placement
- better discovery filters — rating, review, availability
- reporting enhancements and center analytics dashboard
- trial booking from discovery listing
- Tamil Nadu state-wide expansion after Chennai pilot validates moat

## Out of Scope for MVP

- built-in video conferencing
- formal ratings and reviews system
- in-app chat (replaced by structured communication layer)
- advanced analytics
- AI-powered schedule suggestions
- franchise / multi-branch advanced controls
- complex refunds automation


# 20. Success Metrics


## Product Metrics

- number of centers registered and approved in Chennai pilot
- approval turnaround time — average hours; target under 24 hours
- rejection rate and top rejection reasons
- daycare / kids school verification completion rate
- number of active parents
- number of students added
- daily schedule views per parent per week
- conflicts detected and resolved
- daily attendance usage rate
- fee payment completion rate
- material access rate — breakdown by type: PDF / image / video
- messages sent per parent per week — communication layer engagement
- enquiries submitted through discovery per month
- enquiry-to-enrollment conversion rate per center
- nearby discovery usage rate — login-gated
- ad/feed post approval rate and average moderation time
- percentage of parents connected to 2 or more centers

## Business Metrics

- pilot-to-paid conversion rate
- monthly recurring revenue from Chennai pilot
- payment commission revenue
- additional storage purchase revenue
- featured listing revenue
- ad revenue from admin-approved posts
- cost per acquired center
- churn rate
- number of centers that received at least one lead from discovery

## Engagement Metrics

- weekly active parents
- announcement open rate
- daily schedule opens per day
- conflict alert acknowledgement rate
- repeat center usage
- study material views — PDF / image / video breakdown
- nearby center profile views
- advertisement interaction rate — admin-approved posts only
- multi-center parent session depth
- communication thread messages per batch per week
- homework acknowledgement rate
- unlink request rate — indicator of parent dissatisfaction


# 21. Immediate Next Steps

- finalize MVP scope and sprint plan
- create UI wireframes — admin approval queue, daycare verification checklist, parent daily schedule timeline, conflict detection alert card, communication thread view, lead management screen
- define database schema — CenterApproval, ParentCenterLink, Enrollment, Batch (with time fields), ScheduleConflict, Message, MessageThread, Enquiry, Material (UploaderRole), FeedPost, UnlinkRequest
- select payment gateway partner — confirm charge pass-through structure
- define conflict detection algorithm — overlap logic, minimum threshold, resolution flow
- define location and discovery logic for Chennai pilot
- identify 3–5 pilot centers in Chennai including at least one daycare and one kids school
- define admin moderation policy document for feed posts
- set up 24-hour SLA tracking and escalation alerts for admin
- define purchasable storage tiers and pricing above 2 GB
- define communication layer message retention and search indexing strategy
- prepare Phase 2 plan — live classes and Tamil Nadu expansion


# 22. Product Recommendation Summary

SiraguWing is not a coaching management app. It is India's first Parent Super App for managing a child's entire learning life across all activity centers. The positioning, the moat, and the path to dominance are all designed around this idea.

## Build First

- one combined app for all roles
- admin center approval with 24-hour SLA — web and mobile
- extra verification for daycare and kids school
- attendance, batches, students, fees, payments
- announcements and materials — notes, images, videos up to 2 GB
- Child Daily Schedule — the single most useful thing for any parent
- Conflict Detection — detect and warn when classes overlap across centers
- Structured Communication — replace WhatsApp with organized, searchable, center-linked messaging
- Lead Generation — enquiries from discovery go directly to centers as leads
- admin-moderated feed and advertisements
- Chennai-first — 50–100 centers deep before expanding

## Build Next

- live classes via Zoom / Google Meet
- promoted and featured listings
- better reporting and analytics for centers
- trial booking from discovery
- Tamil Nadu state-wide expansion

## Do Not Build Early

- native live streaming
- formal ratings system
- AI schedule suggestions
- heavy analytics
- complex refund systems


The five moat features — Parent Super App, Conflict Detection, Structured Communication, Local Dominance, and Lead Generation — reinforce each other. A parent stays because the schedule view is useful. A center stays because they are getting new students. A new center joins because parents in Chennai already use the app. A competitor cannot copy the network — only the code.


**The shift: from managing centers → to managing a child's entire learning life.**
