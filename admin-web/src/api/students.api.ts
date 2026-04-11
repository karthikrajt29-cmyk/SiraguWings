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
