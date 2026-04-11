-- ============================================================================
-- MIGRATION 002: Master data table for configurable dropdown values
-- ============================================================================
SET search_path TO siraguwin, public;

CREATE TABLE IF NOT EXISTS siraguwin.master_data (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    group_name    VARCHAR(50)  NOT NULL,   -- e.g. 'category', 'age_group'
    label         VARCHAR(100) NOT NULL,   -- display label
    value         VARCHAR(100) NOT NULL,   -- stored value
    sort_order    INTEGER      NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by    UUID,
    created_date  TIMESTAMPTZ  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by   UUID,
    modified_date TIMESTAMPTZ,
    version_number INTEGER     NOT NULL DEFAULT 1,

    CONSTRAINT pk_master_data PRIMARY KEY (id),
    CONSTRAINT uq_master_data_group_value UNIQUE (group_name, value)
);

CREATE INDEX IF NOT EXISTS idx_md_group ON siraguwin.master_data (group_name, is_active, is_deleted, sort_order);

-- ============================================================================
-- SEED: category
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  ('category', 'Tuition',            'Tuition',           1),
  ('category', 'Daycare',            'Daycare',            2),
  ('category', 'Kids School',        'KidsSchool',         3),
  ('category', 'Play School',        'PlaySchool',         4),
  ('category', 'Dance',              'Dance',              5),
  ('category', 'Music',              'Music',              6),
  ('category', 'Art & Painting',     'ArtPainting',        7),
  ('category', 'Abacus',             'Abacus',             8),
  ('category', 'Spoken English',     'SpokenEnglish',      9),
  ('category', 'Yoga / Activity',    'YogaActivity',      10),
  ('category', 'Karate / Martial Arts', 'Karate',         11),
  ('category', 'Swimming',           'Swimming',          12),
  ('category', 'Chess',              'Chess',             13),
  ('category', 'Drawing & Sketching','DrawingSketching',  14),
  ('category', 'Handwriting',        'Handwriting',       15),
  ('category', 'Vedic Maths',        'VedicMaths',        16),
  ('category', 'Robotics & Coding',  'RoboticsCoding',    17),
  ('category', 'Phonics',            'Phonics',           18),
  ('category', 'Carnatic Music',     'CarnaticMusic',     19),
  ('category', 'Western Music',      'WesternMusic',      20),
  ('category', 'Bharatanatyam',      'Bharatanatyam',     21),
  ('category', 'Keyboard / Piano',   'KeyboardPiano',     22),
  ('category', 'Guitar',             'Guitar',            23),
  ('category', 'Violin',             'Violin',            24),
  ('category', 'Tabla / Mridangam',  'TablaMridangam',    25),
  ('category', 'Theatre / Drama',    'TheatreDrama',      26),
  ('category', 'Cooking Classes',    'CookingClasses',    27),
  ('category', 'Craft & DIY',        'CraftDIY',          28),
  ('category', 'Language Classes',   'LanguageClasses',   29),
  ('category', 'Montessori',         'Montessori',        30)

ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- SEED: age_group
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  ('age_group', '0 – 2 years',    '0-2years',    1),
  ('age_group', '2 – 4 years',    '2-4years',    2),
  ('age_group', '4 – 6 years',    '4-6years',    3),
  ('age_group', '6 – 8 years',    '6-8years',    4),
  ('age_group', '8 – 10 years',   '8-10years',   5),
  ('age_group', '10 – 12 years',  '10-12years',  6),
  ('age_group', '12 – 14 years',  '12-14years',  7),
  ('age_group', '14 – 16 years',  '14-16years',  8),
  ('age_group', '16 – 18 years',  '16-18years',  9),
  ('age_group', '18+ years',      '18+years',   10),
  ('age_group', 'All Ages',       'AllAges',    11)

ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- SEED: operating_days
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  ('operating_days', 'Monday Only',        'MondayOnly',       1),
  ('operating_days', 'Mon – Wed – Fri',    'MonWedFri',        2),
  ('operating_days', 'Tue – Thu – Sat',    'TueThuSat',        3),
  ('operating_days', 'Mon – Fri',          'MonFri',           4),
  ('operating_days', 'Mon – Sat',          'MonSat',           5),
  ('operating_days', 'Mon – Sun',          'MonSun',           6),
  ('operating_days', 'Sat – Sun',          'SatSun',           7),
  ('operating_days', 'Weekdays Only',      'WeekdaysOnly',     8),
  ('operating_days', 'Weekends Only',      'WeekendsOnly',     9),
  ('operating_days', 'All Days',           'AllDays',         10),
  ('operating_days', 'By Appointment',     'ByAppointment',   11)

ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- SEED: city  (Tamil Nadu – major + tier-2 towns)
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  -- Metros & major cities
  ('city', 'Chennai',          'Chennai',          1),
  ('city', 'Coimbatore',       'Coimbatore',       2),
  ('city', 'Madurai',          'Madurai',          3),
  ('city', 'Tiruchirappalli',  'Tiruchirappalli',  4),
  ('city', 'Salem',            'Salem',            5),
  ('city', 'Tirunelveli',      'Tirunelveli',      6),
  ('city', 'Vellore',          'Vellore',          7),
  ('city', 'Erode',            'Erode',            8),
  ('city', 'Thoothukudi',      'Thoothukudi',      9),
  ('city', 'Tiruppur',         'Tiruppur',        10),
  -- Tier-2 cities
  ('city', 'Dindigul',         'Dindigul',        11),
  ('city', 'Thanjavur',        'Thanjavur',       12),
  ('city', 'Ranipet',          'Ranipet',         13),
  ('city', 'Sivakasi',         'Sivakasi',        14),
  ('city', 'Karur',            'Karur',           15),
  ('city', 'Nagercoil',        'Nagercoil',       16),
  ('city', 'Kumbakonam',       'Kumbakonam',      17),
  ('city', 'Kancheepuram',     'Kancheepuram',    18),
  ('city', 'Hosur',            'Hosur',           19),
  ('city', 'Namakkal',         'Namakkal',        20),
  ('city', 'Cuddalore',        'Cuddalore',       21),
  ('city', 'Villupuram',       'Villupuram',      22),
  ('city', 'Puducherry',       'Puducherry',      23),
  ('city', 'Ooty',             'Ooty',            24),
  ('city', 'Kodaikanal',       'Kodaikanal',      25),
  ('city', 'Pollachi',         'Pollachi',        26),
  ('city', 'Karaikudi',        'Karaikudi',       27),
  ('city', 'Rajapalayam',      'Rajapalayam',     28),
  ('city', 'Ambattur',         'Ambattur',        29),
  ('city', 'Tambaram',         'Tambaram',        30),
  ('city', 'Avadi',            'Avadi',           31),
  ('city', 'Chromepet',        'Chromepet',       32),
  ('city', 'Porur',            'Porur',           33),
  ('city', 'Sholinganallur',   'Sholinganallur',  34),
  ('city', 'Perambur',         'Perambur',        35),
  ('city', 'Anna Nagar',       'AnnaNagar',       36),
  ('city', 'T. Nagar',         'TNagar',          37),
  ('city', 'Adyar',            'Adyar',           38),
  ('city', 'Velachery',        'Velachery',       39),
  ('city', 'OMR / Sholinganallur', 'OMR',         40)

ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- SEED: facilities
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  ('facilities', 'AC Classroom',       'ACClassroom',      1),
  ('facilities', 'Parking',            'Parking',          2),
  ('facilities', 'Online Classes',     'OnlineClasses',    3),
  ('facilities', 'Library',            'Library',          4),
  ('facilities', 'CCTV Surveillance',  'CCTV',             5),
  ('facilities', 'Drinking Water',     'DrinkingWater',    6),
  ('facilities', 'Restroom',           'Restroom',         7),
  ('facilities', 'Separate Boys & Girls Restroom', 'SeparateRestroom', 8),
  ('facilities', 'Waiting Area',       'WaitingArea',      9),
  ('facilities', 'Smart Board',        'SmartBoard',      10),
  ('facilities', 'Projector',          'Projector',       11),
  ('facilities', 'Lift / Elevator',    'Lift',            12),
  ('facilities', 'Wheelchair Access',  'WheelchairAccess',13),
  ('facilities', 'Play Area',          'PlayArea',        14),
  ('facilities', 'Canteen / Snacks',   'Canteen',         15),
  ('facilities', 'First Aid Kit',      'FirstAidKit',     16),
  ('facilities', 'Wi-Fi',              'WiFi',            17),
  ('facilities', 'Computer Lab',       'ComputerLab',     18),
  ('facilities', 'Music Room',         'MusicRoom',       19),
  ('facilities', 'Dance Studio',       'DanceStudio',     20),
  ('facilities', 'Sports Ground',      'SportsGround',    21),
  ('facilities', 'Swimming Pool',      'SwimmingPool',    22),
  ('facilities', 'Transport / Pickup', 'Transport',       23),
  ('facilities', 'Study Material Provided', 'StudyMaterial', 24),
  ('facilities', 'Uniform Provided',   'Uniform',         25)

ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- SEED: fee_range  (new group — monthly fee brackets)
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  ('fee_range', 'Free',                    'Free',             1),
  ('fee_range', 'Under ₹500 / month',      'Under500',         2),
  ('fee_range', '₹500 – ₹1,000 / month',  '500-1000',         3),
  ('fee_range', '₹1,000 – ₹2,000 / month','1000-2000',        4),
  ('fee_range', '₹2,000 – ₹3,500 / month','2000-3500',        5),
  ('fee_range', '₹3,500 – ₹5,000 / month','3500-5000',        6),
  ('fee_range', '₹5,000 – ₹8,000 / month','5000-8000',        7),
  ('fee_range', 'Above ₹8,000 / month',    'Above8000',        8),
  ('fee_range', 'One-time fee',            'OneTimeFee',       9),
  ('fee_range', 'Per Session',             'PerSession',      10)

ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- SEED: board  (school / curriculum board)
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  ('board', 'State Board (Tamil Nadu)', 'StateBoard',       1),
  ('board', 'CBSE',                     'CBSE',             2),
  ('board', 'ICSE / ISC',               'ICSE',             3),
  ('board', 'Matriculation',            'Matriculation',    4),
  ('board', 'Anglo-Indian',             'AngloIndian',      5),
  ('board', 'IB (International)',       'IB',               6),
  ('board', 'IGCSE (Cambridge)',        'IGCSE',            7),
  ('board', 'All Boards',               'AllBoards',        8)

ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- SEED: language  (medium of instruction)
-- ============================================================================
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
  ('language', 'Tamil',          'Tamil',        1),
  ('language', 'English',        'English',      2),
  ('language', 'Tamil & English','TamilEnglish', 3),
  ('language', 'Hindi',          'Hindi',        4),
  ('language', 'Telugu',         'Telugu',       5),
  ('language', 'Malayalam',      'Malayalam',    6),
  ('language', 'Kannada',        'Kannada',      7)

ON CONFLICT (group_name, value) DO NOTHING;
