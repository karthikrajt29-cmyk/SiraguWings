import apiClient from './client';
import type { PagedResponse } from './centers.api';

export interface StudentInfo {
  id: string;
  name: string;
  dob: string | null;
  gender: string | null;
  center_name: string;
  batch_name: string | null;
  enrolled_date: string | null;
}

export interface DuplicatePair {
  id: string;
  student_a: StudentInfo;
  student_b: StudentInfo;
  match_score: number;
  priority: string;
  detected_at: string;
}

export interface MergeHistoryEntry {
  id: string;
  kept_student_name: string;
  merged_student_name: string;
  action: string;
  reviewed_by_name: string;
  reviewed_at: string;
}

export const getDuplicates = (params: { page?: number; size?: number }) =>
  apiClient
    .get<PagedResponse<DuplicatePair>>('/admin/students/duplicates', { params })
    .then((r) => r.data);

export const mergeStudents = (body: { kept_student_id: string; merged_student_id: string }) =>
  apiClient.post('/admin/students/merge', body).then((r) => r.data);

export const keepSeparate = (body: { student_a_id: string; student_b_id: string }) =>
  apiClient.post('/admin/students/keep-separate', body).then((r) => r.data);

export const getMergeHistory = (params: { page?: number; size?: number }) =>
  apiClient
    .get<PagedResponse<MergeHistoryEntry>>('/admin/students/merge-history', { params })
    .then((r) => r.data);

// ── Student CRUD ─────────────────────────────────────────────────────────────

export interface StudentCenterLink {
  center_id: string;
  center_name: string;
  link_status: string;
  invite_status: string;
  enrolled_at: string;
}

export interface Student {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  parent_id: string | null;
  parent_name: string | null;
  parent_mobile: string | null;
  medical_notes: string | null;
  profile_image_url: string | null;
  invite_status: string;
  status: string;
  added_at: string;
  centers: StudentCenterLink[];
}

export interface StudentStats {
  total: number;
  active: number;
  with_parent: number;
  without_parent: number;
  by_gender: Record<string, number>;
}

export interface StudentCreatePayload {
  name: string;
  date_of_birth: string;        // ISO YYYY-MM-DD
  gender: string;
  parent_mobile?: string | null;
  medical_notes?: string | null;
}

export interface StudentUpdatePayload {
  name?: string;
  date_of_birth?: string;
  gender?: string;
  medical_notes?: string | null;
}

export const getStudents = (params: {
  search?: string;
  center_id?: string;
  gender?: string;
  has_parent?: boolean;
  page?: number;
  size?: number;
}) =>
  apiClient
    .get<PagedResponse<Student>>('/admin/students', { params })
    .then((r) => r.data);

export const getStudentStats = () =>
  apiClient.get<StudentStats>('/admin/students/stats').then((r) => r.data);

export const getStudentDetail = (id: string) =>
  apiClient.get<Student>(`/admin/students/${id}`).then((r) => r.data);

export const createStudent = (payload: StudentCreatePayload) =>
  apiClient.post<Student>('/admin/students', payload).then((r) => r.data);

export const updateStudent = (id: string, payload: StudentUpdatePayload) =>
  apiClient.patch<Student>(`/admin/students/${id}`, payload).then((r) => r.data);

export const deleteStudent = (id: string) =>
  apiClient.delete<{ message: string }>(`/admin/students/${id}`).then((r) => r.data);

export const bulkDeleteStudents = (student_ids: string[]) =>
  apiClient
    .post<{ message: string }>('/admin/students/bulk-delete', { student_ids })
    .then((r) => r.data);

export const enrollStudents = (body: { center_id: string; student_ids: string[] }) =>
  apiClient
    .post<{ message: string }>('/admin/students/enroll', body)
    .then((r) => r.data);

export const unenrollStudent = (student_id: string, center_id: string) =>
  apiClient
    .delete<{ message: string }>(`/admin/students/${student_id}/centers/${center_id}`)
    .then((r) => r.data);
