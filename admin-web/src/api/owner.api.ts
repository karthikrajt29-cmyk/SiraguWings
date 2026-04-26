import apiClient from './client';
import type { CenterDetail, CenterUpdatePayload } from './centers.api';

// ── Centers ──────────────────────────────────────────────────────────────────

export const updateOwnerCenter = (id: string, payload: CenterUpdatePayload) =>
  apiClient.patch<CenterDetail>(`/owner/centers/${id}`, payload).then((r) => r.data);

// ── Students (owner-scoped) ──────────────────────────────────────────────────

export interface OwnerStudent {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  parent_id: string | null;
  parent_name: string | null;
  parent_mobile: string | null;
  medical_notes: string | null;
  profile_image_url: string | null;
  invite_status: string;
  status: string;
  added_at: string;
}

export interface OwnerStudentCreatePayload {
  name: string;
  date_of_birth: string;
  gender: string;
  parent_mobile?: string | null;
  medical_notes?: string | null;
}

export interface OwnerStudentUpdatePayload {
  name?: string;
  date_of_birth?: string;
  gender?: string;
  medical_notes?: string | null;
}

export const listOwnerStudents = (centerId: string) =>
  apiClient.get<OwnerStudent[]>(`/owner/centers/${centerId}/students`).then((r) => r.data);

export const createOwnerStudent = (centerId: string, payload: OwnerStudentCreatePayload) =>
  apiClient
    .post<OwnerStudent>(`/owner/centers/${centerId}/students`, payload)
    .then((r) => r.data);

export const updateOwnerStudent = (
  centerId: string,
  studentId: string,
  payload: OwnerStudentUpdatePayload,
) =>
  apiClient
    .patch<{ message: string }>(`/owner/centers/${centerId}/students/${studentId}`, payload)
    .then((r) => r.data);

export const removeOwnerStudent = (centerId: string, studentId: string) =>
  apiClient
    .delete<{ message: string }>(`/owner/centers/${centerId}/students/${studentId}`)
    .then((r) => r.data);

// ── Teachers (owner-scoped) ──────────────────────────────────────────────────

export interface OwnerTeacher {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  mobile_number: string;
  specialisation: string | null;
  joined_at: string;
  is_active: boolean;
}

export interface OwnerTeacherCreatePayload {
  mobile_number: string;
  specialisation?: string | null;
}

export interface OwnerTeacherUpdatePayload {
  specialisation?: string | null;
  is_active?: boolean;
}

export const listOwnerTeachers = (centerId: string) =>
  apiClient.get<OwnerTeacher[]>(`/owner/centers/${centerId}/teachers`).then((r) => r.data);

export const createOwnerTeacher = (centerId: string, payload: OwnerTeacherCreatePayload) =>
  apiClient
    .post<OwnerTeacher>(`/owner/centers/${centerId}/teachers`, payload)
    .then((r) => r.data);

export const updateOwnerTeacher = (
  centerId: string,
  teacherId: string,
  payload: OwnerTeacherUpdatePayload,
) =>
  apiClient
    .patch<{ message: string }>(`/owner/centers/${centerId}/teachers/${teacherId}`, payload)
    .then((r) => r.data);

export const removeOwnerTeacher = (centerId: string, teacherId: string) =>
  apiClient
    .delete<{ message: string }>(`/owner/centers/${centerId}/teachers/${teacherId}`)
    .then((r) => r.data);

// ── Batches (owner-scoped) ───────────────────────────────────────────────────

export interface OwnerBatch {
  id: string;
  course_name: string;
  batch_name: string;
  category_type: string | null;
  class_days: string;
  start_time: string;
  end_time: string;
  strength_limit: number | null;
  fee_amount: number;
  is_active: boolean;
  teacher_name: string | null;
  teacher_id: string | null;
  created_date: string;
}

export interface OwnerBatchCreatePayload {
  course_name: string;
  batch_name: string;
  category_type?: string | null;
  class_days: string;
  start_time: string;
  end_time: string;
  strength_limit?: number | null;
  fee_amount: number;
  teacher_id?: string | null;
}

export interface OwnerBatchUpdatePayload {
  course_name?: string;
  batch_name?: string;
  category_type?: string | null;
  class_days?: string;
  start_time?: string;
  end_time?: string;
  strength_limit?: number | null;
  fee_amount?: number;
  teacher_id?: string | null;
  is_active?: boolean;
}

export const listOwnerBatches = (centerId: string) =>
  apiClient.get<OwnerBatch[]>(`/owner/centers/${centerId}/batches`).then((r) => r.data);

export const createOwnerBatch = (centerId: string, payload: OwnerBatchCreatePayload) =>
  apiClient
    .post<OwnerBatch>(`/owner/centers/${centerId}/batches`, payload)
    .then((r) => r.data);

export const updateOwnerBatch = (
  centerId: string,
  batchId: string,
  payload: OwnerBatchUpdatePayload,
) =>
  apiClient
    .patch<{ message: string }>(`/owner/centers/${centerId}/batches/${batchId}`, payload)
    .then((r) => r.data);

export const removeOwnerBatch = (centerId: string, batchId: string) =>
  apiClient
    .delete<{ message: string }>(`/owner/centers/${centerId}/batches/${batchId}`)
    .then((r) => r.data);
