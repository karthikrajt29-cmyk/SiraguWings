"""
Demo seed — creates realistic data for owner_test@siraguings.com
  1 center  |  5 teachers  |  45 parents  |  50 students  |  10 batches
Run from the backend directory:
    source venv/bin/activate && python seed_demo.py
"""
import asyncio
import os
import pathlib
import random
import uuid
from datetime import date, time, timedelta

import asyncpg

# ── load .env ─────────────────────────────────────────────────────────────────
for line in pathlib.Path(".env").read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

OWNER_EMAIL = "owner_test@siraguings.com"

# ── Realistic Chennai data ────────────────────────────────────────────────────
TEACHER_DATA = [
    ("Anitha Krishnan",   "9000100001", "anitha.krishnan@demo.com",    "Mathematics",       "B.Ed, M.Sc Mathematics", 8),
    ("Rajesh Kumar",      "9000100002", "rajesh.kumar@demo.com",       "Science",           "M.Sc Physics, B.Ed",     6),
    ("Priya Venkatesh",   "9000100003", "priya.venkatesh@demo.com",    "Bharatanatyam",     "Diploma in Classical Dance", 12),
    ("Suresh Babu",       "9000100004", "suresh.babu@demo.com",        "Keyboard & Music",  "Trinity College Grade 8", 9),
    ("Meena Sundaram",    "9000100005", "meena.sundaram@demo.com",     "Spoken English",    "M.A. English Literature", 5),
]

PARENT_NAMES = [
    "Arun Kumar",      "Deepa Rajan",    "Vijay Shankar",   "Kavitha Murali",  "Sathish Babu",
    "Preethi Nair",    "Manoj Pillai",   "Lakshmi Devi",    "Senthil Nathan",  "Radha Krishnan",
    "Balamurugan",     "Saranya Raj",    "Dinesh Prabhu",   "Mythili Suresh",  "Karthik Rajan",
    "Anbu Selvan",     "Geetha Mohan",   "Murugesan",       "Vasantha Devi",   "Prabhu Kumar",
    "Jeeva Chandran",  "Nithya Srinivas","Thiyagarajan",    "Anuradha Menon",  "Selvam Raj",
    "Chandrika Iyer",  "Balaji Nataraj", "Pavithra Arumugam","Gopal Krishnan", "Ranjitha Menon",
    "Sudhakar Pillai", "Bhuvana Devi",   "Narayanan Kumar", "Sumathi Rajan",   "Venkatesan",
    "Komala Devi",     "Arjun Sharma",   "Usha Ramachandran","Palani Murugan", "Gayathri Nair",
    "Srinivasan",      "Malathi Pillai", "Moorthy Naidu",   "Indira Gandhi",   "Ravi Chandran",
]

STUDENT_FIRST = [
    "Aadhi","Aakash","Aditi","Ananya","Arjun","Ashwin","Bhavana","Deepika",
    "Dhruv","Divya","Gokul","Harini","Ishaan","Janani","Karthik","Kavya",
    "Keerthi","Krish","Lakshmi","Logesh","Madhav","Manasa","Naveen","Nithish",
    "Oviya","Pavithra","Pradeep","Priyadarshini","Rahul","Ramya",
    "Rithika","Rohit","Sanjay","Saraswathi","Shreya","Siddharth","Sneha",
    "Surya","Swetha","Tamil","Tejas","Tharun","Trishna","Vaishnavi","Vikram",
    "Vishal","Yamini","Yashwanth","Zara","Priya",
]

LAST_NAMES = [
    "Kumar","Raj","Krishnan","Murugan","Rajan","Pillai","Nair","Iyer",
    "Sharma","Devi","Babu","Shankar","Nathan","Srinivas","Mohan",
]

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
CLASSES      = ["LKG","UKG","Class 1","Class 2","Class 3","Class 4","Class 5",
                 "Class 6","Class 7","Class 8","Class 9","Class 10"]
SCHOOLS      = [
    "DAV Public School",    "KV Chennai",         "Chettinad Vidyashram",
    "Sri Sankara Vidyalaya","P.S. Senior Secondary","Padma Seshadri Bala Bhavan",
    "Don Bosco Matriculation","Bhavans Rajaji Vidyashram",
]

def t(h, m=0): return time(h, m)

BATCH_DATA = [
    ("Mathematics",    "Primary Batch",    "Mon,Wed,Fri", t(16),    t(17),     800,  20, 0),
    ("Mathematics",    "Secondary Batch",  "Mon,Wed,Fri", t(17),    t(18),    1000,  20, 1),
    ("Science",        "Primary Batch",    "Tue,Thu,Sat", t(16),    t(17),     800,  20, 1),
    ("Science",        "Secondary Batch",  "Tue,Thu,Sat", t(17),    t(18),    1000,  20, 1),
    ("Bharatanatyam",  "Beginners",        "Sat,Sun",     t(9),     t(10),    1200,  15, 2),
    ("Bharatanatyam",  "Intermediate",     "Sat,Sun",     t(10),    t(11,30), 1500,  15, 2),
    ("Keyboard",       "Beginners",        "Sat,Sun",     t(11),    t(12),    1000,  12, 3),
    ("Keyboard",       "Advanced",         "Sat,Sun",     t(12),    t(13),    1200,  12, 3),
    ("Spoken English", "Morning Batch",    "Mon,Wed,Fri", t(7),     t(8),      900,  25, 4),
    ("Spoken English", "Evening Batch",    "Tue,Thu",     t(18),    t(19),     900,  25, 4),
]

# ── helpers ───────────────────────────────────────────────────────────────────
def rnd_dob_child() -> date:
    today = date.today()
    age_days = random.randint(4 * 365, 16 * 365)
    return today - timedelta(days=age_days)

def rnd_past_date(days_back_max=365) -> date:
    return date.today() - timedelta(days=random.randint(30, days_back_max))

# ── main seed ─────────────────────────────────────────────────────────────────
async def seed():
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])

    # -- owner -----------------------------------------------------------------
    owner = await conn.fetchrow(
        'SELECT id FROM siraguwin."user" WHERE email=$1 AND is_deleted=FALSE',
        OWNER_EMAIL,
    )
    if not owner:
        raise SystemExit(f"Owner {OWNER_EMAIL!r} not found in DB.")
    owner_id = owner["id"]
    print(f"Owner id: {owner_id}")

    # -- check / create center -------------------------------------------------
    existing_center = await conn.fetchrow(
        "SELECT id FROM siraguwin.center WHERE owner_id=$1 AND is_deleted=FALSE LIMIT 1",
        owner_id,
    )
    if existing_center:
        center_id = existing_center["id"]
        print(f"Using existing center: {center_id}")
    else:
        center_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO siraguwin.center (
                id, owner_id, name, category, owner_name, mobile_number,
                address, city, state, pincode,
                operating_days, operating_timings, age_group,
                description, fee_range,
                registration_status, subscription_status,
                trial_ends_at,
                created_by, created_date, is_active, is_deleted, version_number, source_system
            ) VALUES (
                $1, $2,
                'SiraguWings Demo Center', 'Education', 'Test Center Owner', '9000000000',
                'No. 12, Anna Nagar, Chennai', 'Chennai', 'Tamil Nadu', '600040',
                'Mon-Sat', '08:00 AM – 07:00 PM', '4-18 years',
                'A premier education and activity center in Chennai.',
                '₹800 – ₹1500 per month',
                'Approved', 'Active',
                NOW() AT TIME ZONE 'UTC' + INTERVAL '30 days',
                $3, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'Seed'
            )
            """,
            center_id, owner_id, owner_id,
        )
        # owner role
        await conn.execute(
            """
            INSERT INTO siraguwin.user_role
                (id, user_id, role, center_id, assigned_at, created_by, created_date,
                 is_active, is_deleted, version_number, source_system)
            VALUES (gen_random_uuid(), $1, 'Owner', $2, NOW() AT TIME ZONE 'UTC',
                    $3, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'Seed')
            ON CONFLICT DO NOTHING
            """,
            owner_id, center_id, owner_id,
        )
        print(f"Created center: {center_id}")

    # -- teachers (5) ----------------------------------------------------------
    teacher_ct_ids = []
    for name, mobile, email, spec, qual, exp in TEACHER_DATA:
        existing_user = await conn.fetchrow(
            'SELECT id FROM siraguwin."user" WHERE mobile_number=$1 AND is_deleted=FALSE', mobile,
        )
        if existing_user:
            t_uid = existing_user["id"]
        else:
            t_uid = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO siraguwin."user"
                    (id, name, email, mobile_number, status, preferred_language,
                     created_by, created_date, is_active, is_deleted, version_number, source_system)
                VALUES ($1,$2,$3,$4,'Active','en',$5,NOW() AT TIME ZONE 'UTC',TRUE,FALSE,1,'Seed')
                """,
                t_uid, name, email, mobile, owner_id,
            )

        existing_ct = await conn.fetchrow(
            "SELECT id FROM siraguwin.center_teacher WHERE center_id=$1 AND user_id=$2 AND is_deleted=FALSE",
            center_id, t_uid,
        )
        if existing_ct:
            ct_id = existing_ct["id"]
        else:
            ct_id = uuid.uuid4()
            joined = rnd_past_date(730)
            await conn.execute(
                """
                INSERT INTO siraguwin.center_teacher
                    (id, center_id, user_id, specialisation, qualification, experience_years,
                     joined_at, created_by, created_date, is_active, is_deleted, version_number, source_system)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW() AT TIME ZONE 'UTC',TRUE,FALSE,1,'Seed')
                """,
                ct_id, center_id, t_uid, spec, qual, exp, joined, owner_id,
            )
            try:
                await conn.execute(
                    """
                    INSERT INTO siraguwin.user_role
                        (id, user_id, role, center_id, assigned_at, created_by, created_date,
                         is_active, is_deleted, version_number, source_system)
                    VALUES (gen_random_uuid(),$1,'Teacher',$2,NOW() AT TIME ZONE 'UTC',
                            $3,NOW() AT TIME ZONE 'UTC',TRUE,FALSE,1,'Seed')
                    """,
                    t_uid, center_id, owner_id,
                )
            except asyncpg.UniqueViolationError:
                pass

        teacher_ct_ids.append(ct_id)

    print(f"Teachers ready: {len(teacher_ct_ids)}")

    # -- batches (10) ----------------------------------------------------------
    batch_ids = []
    for course, bname, days, start, end, fee, strength, t_idx in BATCH_DATA:
        existing_b = await conn.fetchrow(
            "SELECT id FROM siraguwin.batch WHERE center_id=$1 AND course_name=$2 AND batch_name=$3 AND is_deleted=FALSE",
            center_id, course, bname,
        )
        if existing_b:
            batch_ids.append(existing_b["id"])
        else:
            b_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO siraguwin.batch
                    (id, center_id, teacher_id, course_name, batch_name, class_days,
                     start_time, end_time, fee_amount, strength_limit,
                     created_by, created_date, is_active, is_deleted, version_number, source_system)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                        $11,NOW() AT TIME ZONE 'UTC',TRUE,FALSE,1,'Seed')
                """,
                b_id, center_id, teacher_ct_ids[t_idx], course, bname, days,
                start, end, fee, strength, owner_id,
            )
            batch_ids.append(b_id)

    print(f"Batches ready: {len(batch_ids)}")

    # -- parents (45) ----------------------------------------------------------
    parent_ids = []
    for i, pname in enumerate(PARENT_NAMES):
        mobile = f"91001{i+1:05d}"
        existing_p = await conn.fetchrow(
            'SELECT id FROM siraguwin."user" WHERE mobile_number=$1 AND is_deleted=FALSE', mobile,
        )
        if existing_p:
            p_uid = existing_p["id"]
        else:
            p_uid = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO siraguwin."user"
                    (id, name, mobile_number, status, preferred_language,
                     created_by, created_date, is_active, is_deleted, version_number, source_system)
                VALUES ($1,$2,$3,'Active','en',$4,NOW() AT TIME ZONE 'UTC',TRUE,FALSE,1,'Seed')
                """,
                p_uid, pname, mobile, owner_id,
            )

        # map parent to center via user_role
        try:
            await conn.execute(
                """
                INSERT INTO siraguwin.user_role
                    (id, user_id, role, center_id, assigned_at, created_by, created_date,
                     is_active, is_deleted, version_number, source_system)
                VALUES (gen_random_uuid(),$1,'Parent',$2,NOW() AT TIME ZONE 'UTC',
                        $3,NOW() AT TIME ZONE 'UTC',TRUE,FALSE,1,'Seed')
                """,
                p_uid, center_id, owner_id,
            )
        except asyncpg.UniqueViolationError:
            pass

        parent_ids.append(p_uid)

    print(f"Parents ready: {len(parent_ids)}")

    # -- students (50) ---------------------------------------------------------
    # 40 parents → 1 child, 5 parents → 2 children  (40 + 10 = 50)
    student_names = [f"{STUDENT_FIRST[i]} {random.choice(LAST_NAMES)}" for i in range(50)]
    random.shuffle(parent_ids)

    parent_assignments = []  # (parent_id, student_name)
    for i in range(40):
        parent_assignments.append((parent_ids[i], student_names[i]))
    for i in range(10):  # 5 parents × 2 children
        parent_assignments.append((parent_ids[40 + (i // 2)], student_names[40 + i]))

    student_ids = []
    for s_idx, (p_id, s_name) in enumerate(parent_assignments):
        gender = random.choice(["Male", "Female"])
        dob = rnd_dob_child()
        blood = random.choice(BLOOD_GROUPS)
        cls   = random.choice(CLASSES)
        school = random.choice(SCHOOLS)
        join_date = rnd_past_date(400)

        existing_s = await conn.fetchrow(
            "SELECT s.id FROM siraguwin.student s "
            "JOIN siraguwin.center_student cs ON cs.student_id=s.id AND cs.is_deleted=FALSE "
            "WHERE s.parent_id=$1 AND s.name=$2 AND cs.center_id=$3 AND s.is_deleted=FALSE",
            p_id, s_name, center_id,
        )
        if existing_s:
            student_ids.append(existing_s["id"])
            continue

        s_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO siraguwin.student
                (id, parent_id, name, date_of_birth, gender,
                 blood_group, current_class, school_name,
                 created_by_path, created_by, created_date,
                 is_active, is_deleted, version_number, source_system)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Center',$9,NOW() AT TIME ZONE 'UTC',TRUE,FALSE,1,'Seed')
            """,
            s_id, p_id, s_name, dob, gender, blood, cls, school, owner_id,
        )
        await conn.execute(
            """
            INSERT INTO siraguwin.center_student
                (id, center_id, student_id, invite_status, status, added_at,
                 created_by, created_date, is_active, is_deleted, version_number, source_system)
            VALUES (gen_random_uuid(),$1,$2,'Linked','Active',$3,
                    $4,NOW() AT TIME ZONE 'UTC',TRUE,FALSE,1,'Seed')
            """,
            center_id, s_id, join_date, owner_id,
        )
        student_ids.append(s_id)

    print(f"Students ready: {len(student_ids)}")

    # -- enroll students into batches ------------------------------------------
    # Spread students across batches evenly (each student gets 1–2 batches)
    enrolled = 0
    for idx, s_id in enumerate(student_ids):
        b_id = batch_ids[idx % len(batch_ids)]
        existing = await conn.fetchrow(
            "SELECT 1 FROM siraguwin.batch_student WHERE batch_id=$1 AND student_id=$2 AND is_deleted=FALSE",
            b_id, s_id,
        )
        if not existing:
            await conn.execute(
                """
                INSERT INTO siraguwin.batch_student
                    (id, batch_id, student_id, assigned_at, created_by, created_date,
                     is_active, is_deleted, version_number, source_system)
                VALUES (gen_random_uuid(),$1,$2,NOW() AT TIME ZONE 'UTC',
                        $3,NOW() AT TIME ZONE 'UTC',TRUE,FALSE,1,'Seed')
                """,
                b_id, s_id, owner_id,
            )
            enrolled += 1

    print(f"Batch enrollments: {enrolled}")

    await conn.close()
    print("\n✓ Demo seed complete.")
    print(f"  Center  : {center_id}")
    print(f"  Teachers: 5  |  Batches: {len(batch_ids)}")
    print(f"  Parents : {len(parent_ids)}  |  Students: {len(student_ids)}")

asyncio.run(seed())
