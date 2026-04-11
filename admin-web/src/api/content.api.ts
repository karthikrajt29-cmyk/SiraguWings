import apiClient from './client';
import type { PagedResponse } from './centers.api';

export interface FeedPostSummary {
  id: string;
  center_id: string;
  center_name: string;
  title: string;
  description: string;
  image_url: string | null;
  category_tag: string;
  cta_url: string | null;
  validity_date: string | null;
  status: string;
  created_date: string;
}

export const getFeedPosts = (params: { status?: string; page?: number; size?: number }) =>
  apiClient
    .get<PagedResponse<FeedPostSummary>>('/admin/content/feed-posts', { params })
    .then((r) => r.data);

export const approveFeedPost = (id: string) =>
  apiClient.patch(`/admin/content/feed-posts/${id}/approve`).then((r) => r.data);

export const rejectFeedPost = (
  id: string,
  body: { rejection_category: string; rejection_reason: string },
) => apiClient.patch(`/admin/content/feed-posts/${id}/reject`, body).then((r) => r.data);

export const deleteFeedPost = (id: string) =>
  apiClient.delete(`/admin/content/feed-posts/${id}`).then((r) => r.data);
