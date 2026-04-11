# SiraguWing --- Role-Based User Flows

## All 4 Roles \| Pilot v2.0 \| Chennai

------------------------------------------------------------------------

## Coaching Center Owner Role

    Start
    → Login (Mobile + OTP)
    → OTP Valid?
      → No → Error + Retry
      → Expired → Resend Prompt
      → Yes → Check Role

    → Multiple Roles on This Number?
      → Yes → Role Picker → Select "Owner"
      → No → Continue

    → Load Owner Dashboard

    → Center Exists?
      → No (First-time) → Center Registration Flow
         → Fill Required Fields (name, category, owner, mobile,
            address, map pin, days/timings, age group, description, logo)
         → Category = Daycare / Kids School?
            → Yes → Upload Verification Documents
               (ICDS cert, premises proof, owner ID, safety cert)
               → All docs uploaded? → No → Submit Blocked
            → No → Continue
         → Optional Fields (cover image, fee range, facilities, links)
         → Duplicate Center Detected? → Warning Before Submit
         → Map Pin Missing? → Listing Visibility Warning
         → Submit → Status = Submitted → Show "Pending Approval"
         → Exit (cannot proceed until approved)
      → Yes → Check Center Status

    → Center Approved?
      → Submitted / Under Review → Show "Pending Approval" (Block All Features)
      → Rejected → Show Rejection Reason → Edit & Resubmit (no limit)
      → Suspended → Show "Center Suspended" + Contact Admin
      → Approved → Continue

    → Platform Fee Status?
      → Trial → Show Days Remaining Banner → Continue
      → Active → Continue
      → Expired → Block Features → Renew Prompt

    → Dashboard Ready — Core Operations Below

    ─────────────────────────────────
    STUDENT MANAGEMENT
    ─────────────────────────────────
    → Add Student?
      → Enter: student name, age/DOB, gender
      → Enter parent mobile number
      → Optional: medical/allergy notes
      → Save → Billing starts immediately (₹10–₹15/student/month)
      → System generates unique invite link
      → Share via SMS or WhatsApp
      → Parent already on platform?
         → Yes → In-app notification: "[Center] added [Child]. Confirm?"
         → No → SMS includes app download link + invite code
      → Track invite status: sent / opened / accepted / expired
      → Resend invite option

    → Duplicate Detected on Add?
      → Name + DOB + parent number match?
         → High confidence → Auto-linked → Owner notified
         → Medium confidence → Suggested match → Owner confirms or creates new
      → Student already at this center? → Blocked with error

    → Parent Accepted / Student Linked?
      → Yes → Student appears in center's list
      → Assign Student to Batch
         → Select batch → Confirm
         → Batch strength limit reached? → Warning
      → Reassign Student to Different Batch
      → Remove Student from Center
         → Confirm → Parent notified → Data retained 90 days
         → Billing stops for this student

    → Parent-Added Student Needs Linking?
      → View unlinked students whose parent requested this center
      → Accept → Student linked (billing starts) → Assign to batch
      → Reject → Parent notified

    → View All Students → Filter by batch / status / linked / unlinked

    ─────────────────────────────────
    STAFF MANAGEMENT
    ─────────────────────────────────
    → Manage Staff?
      → Add Teacher
         → Enter name, mobile number (OTP verified), subject/specialisation
         → Mobile already registered as parent? → Flag + Confirm
         → Send App Invite via SMS
         → Assign to one or more batches
      → Edit Teacher Profile
      → Reassign Teacher to Different Batch
      → Deactivate Teacher → Access Removed, Batch Assignments Cleared

    ─────────────────────────────────
    TIMETABLE
    ─────────────────────────────────
    → Setup Timetable?
      → Create Batch
         → Enter: course/subject, batch name, category, assigned teacher,
            class days (multi-select), start/end time, strength limit, fee amount
         → Teacher already booked at this time? → Conflict Warning → Block Save
         → No conflict → Save → Registered with conflict detection engine
      → Modify Batch Timing → Re-runs conflict detection
      → Reassign Teacher
      → Cancel Single Class → Notify Parents
      → View: Weekly grid / teacher-wise / batch-wise
      → Unsaved Changes? → Exit Confirmation Modal

    ─────────────────────────────────
    ATTENDANCE
    ─────────────────────────────────
    → Attendance?
      → Select Batch + Date
      → Student List → Present / Absent Toggle
      → Mark All Present Shortcut
      → Save → Timestamped Audit Trail
      → Already Marked Today? → Edit with Overwrite Confirmation
      → View Attendance History per Batch
      → Save Failed (network)? → Retry Banner
      → Session Timeout Mid-Marking? → Restore Last Unsaved State

    ─────────────────────────────────
    MATERIALS
    ─────────────────────────────────
    → Materials?
      → Upload → Select type (PDF / image / video link / text note)
      → Enter title, description
      → Assign to batch
      → Set publish date (now or scheduled)
      → Admin Review Required? (platform admin controls this setting)
         → Yes → Status = Pending → Awaits owner approval
         → No → Publish immediately
      → Edit Title / Description of Existing Material
      → Delete Material
      → View All Materials Uploaded (filterable by teacher)

    ─────────────────────────────────
    ANNOUNCEMENTS
    ─────────────────────────────────
    → Announcements?
      → Create → Enter title + message body
      → Optional attachment (image or PDF)
      → Select Audience → Specific Batch or All Parents
      → Publish Now or Schedule for Later
      → Edit Published Announcement
      → Resend Push Notification
      → Blank Title/Message? → Validation Error
      → Attachment Failed? → Retry Prompt
      → No Audience Selected? → Blocked

    ─────────────────────────────────
    DIRECT MESSAGES
    ─────────────────────────────────
    → Direct Messages?
      → View All Threads Across All Batches
      → Reply to Parent Message
      → Search by keyword / center / date
      → Filter by topic tag (homework / fee / schedule / general / media)
      → Mark as Read / Unread
      → Message Failed? → Retry

    ─────────────────────────────────
    PAYMENTS — CENTER TUITION FEES
    ─────────────────────────────────
    → Payments?
      → Create Fee Plan
         → Assign to individual student or entire batch
         → Enter: fee amount, due date
      → Send Fee Reminder to Parent (push notification)
      → Generate WhatsApp Payment Link
         → Tap "Send via WhatsApp" → Opens WhatsApp with Pre-filled Message
            (Parent name, amount, student name, center name, due date, link)
         → WhatsApp Not Installed? → Fallback: Copy Link
      → Payment Received (online)?
         → Success → Auto-update Ledger + Auto-generate Receipt
         → Failed → Retry / Choose Another Method
         → Gateway Timeout → Pending State → Auto-reconciliation
      → Mark Fee as Paid Manually (cash / bank transfer)
      → Edit Fee Amount
      → View Payment History per Student
      → Download / Share Payment Receipt
      → Duplicate Fee Entry? → Validation Error
      → Overdue Fee → Red Highlight on Student Card

    ─────────────────────────────────
    PLATFORM FEE (per-student, charged to center)
    ─────────────────────────────────
    → View Platform Fee
      → Current billing: [X] students added × ₹[rate] = ₹[total]/month
      → Student list with add date shown
      → Billing date and next due date
    → Pay Platform Fee
      → Pay via UPI / card / net banking
      → Success → GST invoice/receipt generated → Download
      → Failed → Retry / Choose Another Method
    → Payment History → View all past platform fee payments
    → Overdue?
      → Grace period: 7 days (warning banner on dashboard)
      → After grace: center features restricted
         (attendance, materials, announcements blocked)
      → After 30 days: center suspended → All users notified
    → Trial Period (pilot centers)
      → Show days remaining banner
      → No billing during trial

    ─────────────────────────────────
    EDIT CENTER PROFILE (post-approval)
    ─────────────────────────────────
    → Edit Center Details?
      → Update timings, address, logo, description, facilities
      → Critical field change (category, location, documents)?
         → Yes → Triggers re-review by platform admin
      → Non-critical update → Saves immediately

    End

------------------------------------------------------------------------

## Teacher Role

    Start
    → Login (Mobile + OTP)
    → OTP Valid?
      → No → Error + Retry
      → Yes → Check Role

    → Multiple Roles on This Number?
      → Yes → Role Picker Screen → Select "Teacher"
      → No → Continue

    → Role = Teacher → Load Teacher Dashboard

    → Assigned Batches Exist?
      → No → Show "No batches assigned. Contact your center owner."
         → Upload + Attendance Blocked
      → Yes → Continue

    → Access Restriction (enforced on every screen)
      → Teacher sees ONLY assigned batches
      → Cannot see other teachers' batches or student records
      → Cannot create or delete batches
      → Cannot add or manage students

    ─────────────────────────────────
    TIMETABLE (view only)
    ─────────────────────────────────
    → View Timetable
      → See assigned batches with days, times, student count

    ─────────────────────────────────
    ATTENDANCE
    ─────────────────────────────────
    → Attendance
      → Select Batch + Date
      → Mark Present / Absent per student
      → Mark All Present Shortcut
      → Save → Timestamped
      → Already Marked? → Overwrite Confirmation
      → View Attendance History per Batch
      → Network Error? → Retry Banner
      → Session Timeout? → Restore Unsaved State

    ─────────────────────────────────
    MATERIALS
    ─────────────────────────────────
    → Materials Upload
      → Select Batch (only assigned batches appear in dropdown)
      → Select Type (PDF / image / video link / text note)
      → Enter title, description
      → Visibility Mode shown at top of screen
         → "Requires Center Review" → Status = Pending after upload
         → "Immediate" → Published on upload
      → Edit Title / Description of Own Uploads
      → Delete Own Materials
      → View All Materials Uploaded by This Teacher
      → Unsupported File Format? → Error with accepted format list
      → Invalid Video Link? → URL Validation Error

    ─────────────────────────────────
    ANNOUNCEMENTS
    ─────────────────────────────────
    → Announcements
      → Create → Enter title + message
      → Optional attachment
      → Select Batch (only assigned batches)
      → Publish Now or Schedule
      → Edit Own Announcements

    ─────────────────────────────────
    DIRECT MESSAGES
    ─────────────────────────────────
    → Direct Messages
      → View threads from parents in assigned batches only
      → Reply to messages
      → Search / filter by keyword, date, topic tag
      → Message Failed? → Retry

    → Deactivated by Owner?
      → Login Attempt → "Access denied. Contact your center administrator."

    End

------------------------------------------------------------------------

## Parent Role

    Start
    → Login (Mobile + OTP)
    → OTP Valid?
      → No → Error + Retry
      → Yes → Check Role

    → Multiple Roles on This Number?
      → Yes → Role Picker Screen → Select "Parent"
      → No → Continue

    → Role = Parent → Load Parent Dashboard
    → All center connections and child data loaded on login

    ─────────────────────────────────
    JOINING A CENTER (invite from center)
    ─────────────────────────────────
    → Received Invite Link from Center?
      → New to App
         → Open link → App download prompt → Sign up (mobile + OTP)
         → Student auto-linked to parent account on sign-up
      → Existing User
         → Open link → Confirmation: "[Center] wants to link [Child] to your account"
         → Confirm → Student linked → Center connection established
         → Reject → "This is not my child" → Link cancelled, center notified
      → Invalid / Expired Link? → Error + "Contact your center for a new invite."

    ─────────────────────────────────
    CHILD PROFILE MANAGEMENT (parent-managed)
    ─────────────────────────────────
    → Add Child (parent-initiated)
      → Enter: child name, age/DOB, gender
      → Medical / allergy notes (required for daycare/kids school, optional otherwise)
      → Save → Child exists in parent account
      → Child NOT linked to any center yet
      → Request to link to a center?
         → Search for center by name or area
         → Send link request → Center owner accepts or rejects
         → Accepted → Student linked to center (center billing starts)

    → Edit Child Profile (name, DOB, medical notes — parent always has edit rights)
    → Multiple Children → Each child managed separately
    → View Child Status per Center
      → Linked, batch assigned → Active
      → Linked, no batch yet → "Pending batch assignment"
      → Not linked to any center → "Add to a center to get started"

    → Duplicate Detected?
      → Center added same child independently?
         → Auto-merge (name + DOB + parent number match) → Parent notified
         → Suggested merge → Parent confirms or rejects
         → Parent rejects → Records kept separate (could be different child)

    ─────────────────────────────────
    ATTENDANCE (read-only)
    ─────────────────────────────────
    → Attendance View
      → Daily attendance status per center
      → Monthly attendance summary per center
      → Absent history per center
      → Attendance percentage per center
      → No Data Yet? → Empty State

    ─────────────────────────────────
    MATERIALS (read-only)
    ─────────────────────────────────
    → Materials
      → View materials from all connected centers or filter per center
      → Center name + teacher name shown on each material card
      → Open PDFs and images inline
      → Open video links in browser / YouTube
      → Search by keyword or subject
      → Material pending center review? → Hidden (not visible to parent)

    ─────────────────────────────────
    ANNOUNCEMENTS (read-only)
    ─────────────────────────────────
    → Announcements
      → Receive push notification: [Center Name]: [Title]
      → View center notices labeled with center name
      → View optional attachments
      → See scheduled holidays or events
      → No Announcements Yet? → Empty State

    ─────────────────────────────────
    DIRECT MESSAGES
    ─────────────────────────────────
    → Direct Messages
      → Select Center → Select Recipient (teacher or owner)
      → Select Topic Tag (homework / fee / schedule / general / media)
      → Send Message with optional attachment (photo / document)
      → View own threads only (per center)
      → Search messages by keyword, center, or date
      → Mark as Read / Unread
      → Message Failed? → Retry with network error message
      → Attachment Too Large? → Upload Blocked
      → Center Suspended? → Messaging Disabled with Status Notice

    ─────────────────────────────────
    PAYMENTS
    ─────────────────────────────────
    → Payments
      → Total Outstanding Across All Centers shown at top of fee screen
      → Fee Summary per Center
      → View Fee Details → Amount, due date, status
      → Pay Online → Select method (UPI / card / net banking)
         → Success → Receipt Auto-generated → Download Receipt
         → Failed → Retry / Choose Another Method
         → Gateway Timeout → Payment Pending State
      → Payment History per Center
      → Overdue Fee → Red Highlight

    → WhatsApp Payment Link (received outside app)
      → Open Link in Browser → Pay via Gateway
      → No App Required to Complete Payment

    → Unregistered Number Tries Login?
      → "Sign up or ask your coaching center for an invite link."

    End

------------------------------------------------------------------------

## Platform Admin Role

    Start
    → Login (Mobile + OTP)
    → OTP Valid?
      → No → Error + Retry
      → Yes → Load Admin Control Panel

    ─────────────────────────────────
    CENTER APPROVAL QUEUE
    ─────────────────────────────────
    → New Center Submission?
      → Push notification received on every new submission
      → Added to approval queue

    → Queue View
      → Tabs: All / Submitted / Under Review / Rejected / Approved / Suspended
      → SLA indicator: centers approaching 24 hours highlighted
      → SLA breached? → Escalation Alert

    → Open Center Detail View
      → All registration fields (read-only)
      → Map preview of pinned location
      → Logo and cover image thumbnails
      → Document viewer for all uploaded verification files
      → Daycare / Kids School? → Checklist of required documents with
         completion status shown
      → Previous submission history (if resubmission)
      → Admin Notes Field (internal — NOT visible to center owner)

    → Action?
      → Mark Under Review → Hold
      → Approve
         → Center immediately live
         → Owner notified: push + SMS + email
         → Center unlocks all core operation screens
      → Reject
         → Must select rejection reason from categories:
            - Incomplete or incorrect information
            - Unverifiable location or map pin
            - Duplicate or conflicting registration
            - Missing required documents / daycare-kids school verification
            - Category mismatch
            - Other (requires free text)
         → Owner notified with reason
         → Owner can resubmit (no limit)
      → Suspend
         → Admin enters reason
         → Center locked
         → Data retained 30 days then purged

    → Reinstatement?
      → Within 30-Day Window → Restore Center
      → After 30 Days → Center must register fresh

    ─────────────────────────────────
    MATERIAL VISIBILITY CONTROL (global setting)
    ─────────────────────────────────
    → Set Material Visibility Mode
      → Option A: Immediate — materials visible to parents on upload
      → Option B: Requires Center Review — owner must approve each upload
      → This is a global setting — center owners cannot override
      → Current setting reflected on teacher upload screens

    ─────────────────────────────────
    CENTER BILLING & PLATFORM REVENUE
    ─────────────────────────────────
    → View Platform Revenue Dashboard
      → Total students added across all centers (billed)
      → Total centers paying
      → Monthly recurring revenue
      → Outstanding / overdue payments

    → Center Billing Management
      → View all center accounts with billing status
      → Filter by: active / trial / grace period / restricted / suspended
      → View per-center: total students added, billing amount, payment history
      → Manually waive platform fee for specific centers (pilot concessions)
      → Manually extend trial or grace period

    → Set Platform Fee Rate
      → Current rate: ₹[X] per student per month
      → Adjust rate (applies to new billing cycle, not retroactive)

    ─────────────────────────────────
    DUPLICATE STUDENT RESOLUTION
    ─────────────────────────────────
    → View Flagged Duplicate Student Records (Priority 3 — manual review)
      → Review matched fields (name, DOB, parent number)
      → Merge or Keep Separate
      → View Merge History / Audit Log

    → Pilot Simplification
      → Single-panel mobile-first review (no bulk approve)
      → Bulk approve deferred to Phase 2 (20+ centers)
      → CSV export deferred to Phase 2

    End

------------------------------------------------------------------------

*SiraguWing --- Role Flows \| Pilot v2.0 \| Chennai* *All corrections
from PRD review included: student management, dual-path creation,
per-student billing (center-paid), duplicate detection, multi-role
login, edit-center-post-approval, platform admin billing controls*
