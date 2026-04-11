import uuid
from typing import Optional

import asyncpg


async def execute_merge(
    db: asyncpg.Connection,
    student_kept_id: uuid.UUID,
    student_merged_id: uuid.UUID,
    match_priority: str,
    matched_fields: str,
    actioned_by: uuid.UUID,
    notes: Optional[str] = None,
) -> None:
    """
    Merge student_merged_id into student_kept_id:
    1. Reassign batch_student rows
    2. Reassign attendance rows
    3. Reassign fee rows
    4. Reassign center_student rows (skip duplicates)
    5. Soft-delete the merged student record
    6. Insert merge_log entry
    """
    async with db.transaction():
        # 1. Reassign batch_student — skip if kept student already in the same batch
        await db.execute(
            """
            UPDATE batch_student
            SET student_id = $1,
                modified_by = $3, modified_date = NOW() AT TIME ZONE 'UTC', version_number = version_number + 1
            WHERE student_id = $2
              AND batch_id NOT IN (
                  SELECT batch_id FROM batch_student WHERE student_id = $1 AND is_deleted = FALSE
              )
            """,
            student_kept_id, student_merged_id, actioned_by,
        )

        # 2. Reassign attendance
        await db.execute(
            """
            UPDATE attendance
            SET student_id = $1,
                modified_by = $3, modified_date = NOW() AT TIME ZONE 'UTC', version_number = version_number + 1
            WHERE student_id = $2
            """,
            student_kept_id, student_merged_id, actioned_by,
        )

        # 3. Reassign fee
        await db.execute(
            """
            UPDATE fee
            SET student_id = $1,
                modified_by = $3, modified_date = NOW() AT TIME ZONE 'UTC', version_number = version_number + 1
            WHERE student_id = $2
            """,
            student_kept_id, student_merged_id, actioned_by,
        )

        # 4. Reassign center_student — skip duplicates
        await db.execute(
            """
            UPDATE center_student
            SET student_id = $1,
                modified_by = $3, modified_date = NOW() AT TIME ZONE 'UTC', version_number = version_number + 1
            WHERE student_id = $2
              AND center_id NOT IN (
                  SELECT center_id FROM center_student WHERE student_id = $1 AND is_deleted = FALSE
              )
            """,
            student_kept_id, student_merged_id, actioned_by,
        )

        # 5. Soft-delete merged student
        await db.execute(
            """
            UPDATE student
            SET is_deleted = TRUE, is_active = FALSE,
                modified_by = $2, modified_date = NOW() AT TIME ZONE 'UTC', version_number = version_number + 1
            WHERE id = $1
            """,
            student_merged_id, actioned_by,
        )

        # 6. Insert merge_log
        await db.execute(
            """
            INSERT INTO merge_log
                (id, student_kept_id, student_merged_id, match_priority,
                 matched_fields, action, actioned_by, actioned_at, notes,
                 created_by, created_date)
            VALUES
                (gen_random_uuid(), $1, $2, $3, $4, 'Merged', $5,
                 NOW() AT TIME ZONE 'UTC', $6, $5, NOW() AT TIME ZONE 'UTC')
            """,
            student_kept_id, student_merged_id, match_priority,
            matched_fields, actioned_by, notes,
        )
