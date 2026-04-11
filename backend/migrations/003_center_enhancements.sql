-- ============================================================================
-- MIGRATION 003: Add state + pincode to center; seed rejection_category master data
-- ============================================================================
SET search_path TO siraguwin, public;

-- ── Soft-delete old schema seed centers (c7e000XX UUIDs) — they were
--    inserted before several columns existed and cause 500 errors on detail load.
--    The new sample centers (center-seed-NNN) replace them.
UPDATE siraguwin.center SET is_deleted = TRUE
WHERE id IN (
    'c7e00001-aaaa-bbbb-cccc-dddddddddddd'::uuid,
    'c7e00002-aaaa-bbbb-cccc-dddddddddddd'::uuid,
    'c7e00003-aaaa-bbbb-cccc-dddddddddddd'::uuid
);

-- ── Drop old hardcoded CHECK constraints that are too restrictive
--    rejection_category: was limited to 6 values; master data drives this now
--    category: was limited to 10 types; many new categories have been added
ALTER TABLE siraguwin.center
    DROP CONSTRAINT IF EXISTS ck_center_rejection_cat,
    DROP CONSTRAINT IF EXISTS ck_center_category;

-- ── Make logo_url nullable (optional field; admin portal doesn't require it)
ALTER TABLE siraguwin.center
    ALTER COLUMN logo_url DROP NOT NULL;

-- ── Make owner_id nullable so admin-created centers don't need a user FK
ALTER TABLE siraguwin.center
    ALTER COLUMN owner_id DROP NOT NULL;

-- Add state + pincode columns if not present
ALTER TABLE siraguwin.center
    ADD COLUMN IF NOT EXISTS state   VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu',
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);

-- ============================================================================
-- SEED: rejection_category  (used by RejectReasonModal & SuspendModal)
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  ('rejection_category', 'Incomplete Documents',      'IncompleteDocuments',   1),
  ('rejection_category', 'Invalid / Forged Documents','InvalidDocuments',       2),
  ('rejection_category', 'Location Mismatch',         'LocationMismatch',       3),
  ('rejection_category', 'Duplicate Registration',    'DuplicateRegistration',  4),
  ('rejection_category', 'Category Mismatch',         'CategoryMismatch',       5),
  ('rejection_category', 'Policy Violation',          'PolicyViolation',        6),
  ('rejection_category', 'Unverifiable Information',  'UnverifiableInfo',       7),
  ('rejection_category', 'Missing Owner ID Proof',    'MissingOwnerID',         8),
  ('rejection_category', 'Other',                     'Other',                  9)
ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- SEED: suspension_reason  (used by SuspendModal category dropdown)
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  ('suspension_reason', 'Fee Non-Payment',           'FeeNonPayment',      1),
  ('suspension_reason', 'Safety Concern',            'SafetyConcern',      2),
  ('suspension_reason', 'Policy Violation',          'PolicyViolation',    3),
  ('suspension_reason', 'Fraudulent Activity',       'FraudulentActivity', 4),
  ('suspension_reason', 'Owner Request',             'OwnerRequest',       5),
  ('suspension_reason', 'Regulatory Compliance',     'Regulatory',         6),
  ('suspension_reason', 'Inactivity',                'Inactivity',         7),
  ('suspension_reason', 'Other',                     'Other',              8)
ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- SEED: Sample centers  (15 realistic Tamil Nadu coaching centers)
-- Uses the first admin user in the system for created_by.
-- Safe to re-run — ON CONFLICT (id) DO NOTHING.
-- ============================================================================

-- We use INSERT … ON CONFLICT DO NOTHING so re-running is safe.
-- center table PK is id (UUID); we generate deterministic UUIDs via md5.
-- created_by uses the first active admin/superadmin user found in the DB.
DO $$
DECLARE v_admin_id UUID;
BEGIN
    SELECT u.id INTO v_admin_id
    FROM siraguwin."user" u
    JOIN siraguwin.user_role ur ON ur.user_id = u.id
    WHERE ur.role = 'Admin'
      AND ur.is_active  = TRUE
      AND ur.is_deleted = FALSE
      AND u.is_deleted  = FALSE
    ORDER BY u.created_date ASC
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE NOTICE 'No admin user found — skipping sample center seed.';
        RETURN;
    END IF;

    INSERT INTO siraguwin.center (
        id, name, category, owner_name, mobile_number,
        address, city, state, pincode,
        operating_days, operating_timings, age_group,
        description, fee_range, facilities,
        registration_status, subscription_status,
        latitude, longitude,
        created_by, created_date
    ) VALUES
    ( md5('center-seed-001')::uuid, 'Bright Minds Tuition Centre', 'Tuition', 'Rajesh Kumar', '9884001234',
      '14, Gandhi Street, Adyar', 'Chennai', 'Tamil Nadu', '600020',
      'MonFri', '4:00 PM – 8:00 PM', '10-12years',
      'CBSE & State Board tuition for Grades 6–10. Small batches, personalised attention, monthly tests.',
      '1000-2000', 'ACClassroom,Parking,DrinkingWater,CCTV,WiFi',
      'Approved', 'Active', 13.0057, 80.2565, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-002')::uuid, 'Little Stars Daycare', 'Daycare', 'Priya Suresh', '9500112233',
      '7/A, Anna Nagar West, 5th Main Road', 'Chennai', 'Tamil Nadu', '600040',
      'MonSat', '7:30 AM – 7:30 PM', '0-2years',
      'Safe and nurturing full-day daycare for infants and toddlers. CCTV-monitored, trained caregivers.',
      '2000-3500', 'ACClassroom,CCTV,DrinkingWater,Restroom,PlayArea,WaitingArea,FirstAidKit',
      'Approved', 'Active', 13.0850, 80.2101, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-003')::uuid, 'Nataraj Dance Academy', 'Bharatanatyam', 'Meenakshi Ravi', '9444055678',
      '23, Luz Church Road, Mylapore', 'Chennai', 'Tamil Nadu', '600004',
      'TueThuSat', '5:00 PM – 8:00 PM', 'AllAges',
      'Classical Bharatanatyam from beginner to advanced. Annual Arangetram training. Govt-certified faculty.',
      '500-1000', 'DanceStudio,Parking,DrinkingWater,Restroom,StudyMaterial',
      'Approved', 'Trial', 13.0337, 80.2680, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-004')::uuid, 'CodeKids Robotics Lab', 'RoboticsCoding', 'Arjun Venkat', '9789034567',
      '56, OMR, Perungudi', 'Chennai', 'Tamil Nadu', '600096',
      'SatSun', '9:00 AM – 1:00 PM', '8-10years',
      'Weekend STEM workshops: Scratch, Python, Arduino & Lego Robotics. Project-based learning for kids.',
      '3500-5000', 'ACClassroom,ComputerLab,SmartBoard,WiFi,DrinkingWater,Restroom',
      'Submitted', 'Trial', 12.9675, 80.2461, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-005')::uuid, 'Harmony Music School', 'CarnaticMusic', 'Subramaniam Pillai', '9345678901',
      '8, Pycrofts Road, Royapettah', 'Chennai', 'Tamil Nadu', '600014',
      'MonSat', '6:00 AM – 9:00 AM', '6-8years',
      'Carnatic vocal & veena classes. Morning batches. Bharatiya Vidya Bhavan syllabus. Graded exams.',
      'Under500', 'MusicRoom,DrinkingWater,Restroom,StudyMaterial',
      'UnderReview', 'Trial', 13.0538, 80.2623, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-006')::uuid, 'Alpha Abacus & Vedic Maths', 'Abacus', 'Kavitha Mohan', '9677890123',
      '34, Bharathi Salai, Tambaram', 'Chennai', 'Tamil Nadu', '600045',
      'SatSun', '10:00 AM – 12:00 PM', '4-6years',
      'Abacus mental arithmetic and Vedic Maths for kids aged 4–12. International curriculum. 8-level program.',
      '500-1000', 'ACClassroom,SmartBoard,DrinkingWater,Restroom,StudyMaterial,Uniform',
      'Approved', 'Active', 12.9249, 80.1000, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-007')::uuid, 'Veltech Play School', 'PlaySchool', 'Anitha Krishnan', '9842123456',
      '12, Gandhi Road, RS Puram', 'Coimbatore', 'Tamil Nadu', '641002',
      'MonFri', '9:00 AM – 1:00 PM', '2-4years',
      'Montessori-inspired play school for ages 2–5. Activity-based learning, storytelling, art & craft.',
      '1000-2000', 'PlayArea,ACClassroom,DrinkingWater,Restroom,WaitingArea,CCTV,FirstAidKit,Canteen',
      'Approved', 'Active', 11.0148, 76.9558, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-008')::uuid, 'Champion Karate Dojo', 'Karate', 'Sensei Muthukumar', '9751234567',
      '5, Stadium Road, Madurai', 'Madurai', 'Tamil Nadu', '625001',
      'TueThuSat', '6:00 PM – 8:00 PM', '6-8years',
      'Shotokan karate for ages 6–18. District-level competition coaching. Belt grading every 3 months.',
      'Under500', 'SportsGround,DrinkingWater,Restroom,FirstAidKit',
      'Submitted', 'Trial', 9.9252, 78.1198, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-009')::uuid, 'Rainbow Art Studio', 'ArtPainting', 'Deepika Shankar', '9962345678',
      '45, Krishnaswamy Avenue, Velachery', 'Chennai', 'Tamil Nadu', '600042',
      'WeekdaysOnly', '4:00 PM – 7:00 PM', '6-8years',
      'Drawing, sketching, oil painting and craft for kids & adults. International art exam preparation.',
      '500-1000', 'ACClassroom,DrinkingWater,Restroom,StudyMaterial',
      'Rejected', 'Trial', 12.9785, 80.2209, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-010')::uuid, 'Spoken Wings English Academy', 'SpokenEnglish', 'Feroz Khan', '9841456789',
      '78, Arcot Road, Porur', 'Chennai', 'Tamil Nadu', '600116',
      'MonSat', '7:00 AM – 10:00 AM', '14-16years',
      'Spoken English, Group Discussion and Interview skills. Morning & evening batches. Corporate trainers.',
      '1000-2000', 'ACClassroom,Projector,WiFi,DrinkingWater,Restroom',
      'Approved', 'Active', 13.0359, 80.1569, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-011')::uuid, 'Bliss Yoga & Wellness Centre', 'YogaActivity', 'Saranya Balaji', '9600567890',
      '19, Lake View Road, Nungambakkam', 'Chennai', 'Tamil Nadu', '600034',
      'AllDays', '6:00 AM – 9:00 AM', 'AllAges',
      'Hatha & Pranayama yoga for all ages. Diet counselling, meditation. 200-hr certified instructors.',
      '2000-3500', 'ACClassroom,DrinkingWater,Restroom,WaitingArea,WiFi,Parking',
      'Approved', 'Active', 13.0569, 80.2425, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-012')::uuid, 'Pixel Jr. Kids School', 'KidsSchool', 'Ramya Sundarajan', '9444987654',
      '3, TNHB Layout, Hosur Road', 'Salem', 'Tamil Nadu', '636004',
      'MonFri', '8:30 AM – 3:30 PM', '4-6years',
      'Full-time kids school (LKG–Grade 2) with CBSE curriculum, activity lab and outdoor play area.',
      '2000-3500', 'ACClassroom,SmartBoard,PlayArea,Canteen,CCTV,Transport,DrinkingWater,Restroom,Library',
      'Submitted', 'Trial', 11.6643, 78.1460, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-013')::uuid, 'Piano Palace Music Academy', 'KeyboardPiano', 'Christo Paul', '9176543210',
      '27, South Usman Road, T. Nagar', 'Chennai', 'Tamil Nadu', '600017',
      'TueThuSat', '4:00 PM – 8:00 PM', '6-8years',
      'Western keyboard, piano and guitar. Trinity & ABRSM exam preparation. Sound-proof practice rooms.',
      '1000-2000', 'ACClassroom,MusicRoom,DrinkingWater,Restroom,StudyMaterial,Parking',
      'Approved', 'Active', 13.0418, 80.2341, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-014')::uuid, 'Vivekananda Chess Academy', 'Chess', 'Mohan Lal', '9840321098',
      '11, Kamarajar Street, Trichy', 'Tiruchirappalli', 'Tamil Nadu', '620001',
      'SatSun', '8:00 AM – 12:00 PM', '8-10years',
      'FIDE-rated coaching. Beginner to advanced. National-level tournament preparation. Online classes available.',
      'Under500', 'ACClassroom,SmartBoard,WiFi,DrinkingWater,Restroom,OnlineClasses',
      'UnderReview', 'Trial', 10.7905, 78.7047, v_admin_id, NOW() AT TIME ZONE 'UTC' ),

    ( md5('center-seed-015')::uuid, 'Bright Futures Montessori', 'Montessori', 'Lakshmi Prabhu', '9884765432',
      '6, 1st Cross, Neelankarai', 'Chennai', 'Tamil Nadu', '600041',
      'MonFri', '9:00 AM – 2:00 PM', '2-4years',
      'AMI-certified Montessori program for ages 2.5–6. Sensorial, language, math & cultural activities.',
      '3500-5000', 'ACClassroom,PlayArea,CCTV,DrinkingWater,Restroom,WaitingArea,SeparateRestroom,FirstAidKit,Library',
      'Suspended', 'Restricted', 12.9421, 80.2574, v_admin_id, NOW() AT TIME ZONE 'UTC' )

    ON CONFLICT (id) DO NOTHING;

    -- Set rejection reason for the rejected center (seed-009)
    UPDATE siraguwin.center
    SET rejection_category = 'IncompleteDocuments',
        rejection_reason   = 'Registration certificate and premises proof were missing. Please re-submit with valid documents.'
    WHERE id = md5('center-seed-009')::uuid;

    -- Set suspension note for the suspended center (seed-015)
    UPDATE siraguwin.center
    SET admin_notes = 'Suspended due to fee non-payment for 2 consecutive months. Owner has been notified.'
    WHERE id = md5('center-seed-015')::uuid;

END;
$$;
