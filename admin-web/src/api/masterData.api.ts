import apiClient from './client';

export interface MasterDataItem {
  id: string;
  group_name: string;
  label: string;
  value: string;
  sort_order: number;
  is_active: boolean;
}

export type MasterDataGroup =
  | 'category'
  | 'age_group'
  | 'operating_days'
  | 'city'
  | 'facilities'
  | 'fee_range'
  | 'board'
  | 'language'
  | 'rejection_category'
  | 'suspension_reason';

export const GROUP_LABELS: Record<MasterDataGroup, string> = {
  category:           'Category',
  age_group:          'Age Group',
  operating_days:     'Operating Days',
  city:               'City',
  facilities:         'Facilities',
  fee_range:          'Fee Range',
  board:              'School Board',
  language:           'Language / Medium',
  rejection_category: 'Rejection Category',
  suspension_reason:  'Suspension Reason',
};

export const ALL_GROUPS: MasterDataGroup[] = [
  'category',
  'age_group',
  'operating_days',
  'city',
  'facilities',
  'fee_range',
  'board',
  'language',
  'rejection_category',
  'suspension_reason',
];

export const getMasterData = (group?: MasterDataGroup, includeInactive = false) =>
  apiClient
    .get<MasterDataItem[]>('/admin/master-data', {
      params: {
        ...(group ? { group } : {}),
        include_inactive: includeInactive,
      },
    })
    .then((r) => r.data);

export const createMasterDataItem = (body: {
  group_name: MasterDataGroup;
  label: string;
  value: string;
  sort_order?: number;
}) => apiClient.post<MasterDataItem>('/admin/master-data', body).then((r) => r.data);

export const updateMasterDataItem = (
  id: string,
  body: { label?: string; value?: string; sort_order?: number; is_active?: boolean },
) =>
  apiClient.patch<MasterDataItem>(`/admin/master-data/${id}`, body).then((r) => r.data);

export const deleteMasterDataItem = (id: string) =>
  apiClient.delete(`/admin/master-data/${id}`).then((r) => r.data);

export const reorderMasterData = (items: { id: string; sort_order: number }[]) =>
  apiClient.post('/admin/master-data/reorder', items).then((r) => r.data);
