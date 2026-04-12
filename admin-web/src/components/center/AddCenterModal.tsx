import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCenter, assignOwner, type CreateCenterPayload } from '../../api/centers.api';
import { getMasterData } from '../../api/masterData.api';
import { getUsers, type UserSummary } from '../../api/users.api';
import MapPicker    from '../common/MapPicker';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND }    from '../../theme';

const EMPTY: CreateCenterPayload = {
  name: '', category: '', owner_name: '', mobile_number: '',
  address: '', city: '', state: 'Tamil Nadu', pincode: '',
  operating_days: '', operating_timings: '', age_group: '',
  description: '', fee_range: '', facilities: '',
  social_link: '', website_link: '',
  latitude: null, longitude: null,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: BRAND.textPrimary }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.25 }}>{subtitle}</Typography>}
    </Box>
  );
}

export default function AddCenterModal({ open, onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [form, setForm] = useState<CreateCenterPayload>({ ...EMPTY });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateCenterPayload, string>>>({});

  /* ── Owner search ── */
  const [ownerSearch, setOwnerSearch]     = useState('');
  const [selectedOwner, setSelectedOwner] = useState<UserSummary | null>(null);
  const { data: ownerResults = [], isFetching: ownerLoading } = useQuery({
    queryKey: ['user-search', ownerSearch],
    queryFn: () => getUsers({ search: ownerSearch, status: 'Active', role: 'Owner', size: 20 }).then(r => r.items),
    enabled: ownerSearch.length >= 2,
  });

  /* ── Master data dropdowns ── */
  const { data: mdCategories  = [] } = useQuery({ queryKey: ['master-data', 'category',       false], queryFn: () => getMasterData('category') });
  const { data: mdOpDays      = [] } = useQuery({ queryKey: ['master-data', 'operating_days', false], queryFn: () => getMasterData('operating_days') });
  const { data: mdAgeGroups   = [] } = useQuery({ queryKey: ['master-data', 'age_group',      false], queryFn: () => getMasterData('age_group') });
  const { data: mdCities      = [] } = useQuery({ queryKey: ['master-data', 'city',           false], queryFn: () => getMasterData('city') });
  const { data: mdFeeRanges   = [] } = useQuery({ queryKey: ['master-data', 'fee_range',      false], queryFn: () => getMasterData('fee_range') });
  const { data: mdFacilities  = [] } = useQuery({ queryKey: ['master-data', 'facilities',     false], queryFn: () => getMasterData('facilities') });

  const set = (key: keyof CreateCenterPayload, value: string | number | null) =>
    setForm((f) => ({ ...f, [key]: value }));

  const clearError = (key: keyof CreateCenterPayload) =>
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });

  /* Facilities multi-select */
  const selectedFacilities: string[] = (form.facilities ?? '').split(',').map(s => s.trim()).filter(Boolean);

  const validate = (): boolean => {
    const required: (keyof CreateCenterPayload)[] = [
      'name', 'category', 'owner_name', 'mobile_number',
      'address', 'city', 'operating_days', 'operating_timings', 'age_group',
      'description',
    ];
    const next: typeof errors = {};
    required.forEach((k) => { if (!String(form[k] ?? '').trim()) next[k] = 'Required'; });
    if (form.mobile_number && !/^\+?[\d\s\-]{7,15}$/.test(form.mobile_number))
      next.mobile_number = 'Invalid phone number';
    if (form.pincode && !/^\d{6}$/.test(form.pincode))
      next.pincode = 'Must be 6 digits';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const data = await createCenter(form);
      // If a user was selected, link them as owner immediately after creation
      if (selectedOwner?.id) {
        await assignOwner(data.id, selectedOwner.id);
      }
      return data;
    },
    onSuccess: (data) => {
      showSnack('Center created successfully', 'success');
      qc.invalidateQueries({ queryKey: ['centers'] });
      onCreated(data.id);
      handleClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleClose = () => {
    setForm({ ...EMPTY });
    setErrors({});
    setOwnerSearch('');
    setSelectedOwner(null);
    onClose();
  };

  const field = (key: keyof CreateCenterPayload, label: string, opts?: { multiline?: boolean; rows?: number; type?: string; maxLength?: number }) => (
    <TextField
      label={label}
      value={(form[key] as string) ?? ''}
      onChange={(e) => { set(key, e.target.value); clearError(key); }}
      error={!!errors[key]}
      helperText={errors[key]}
      fullWidth size="small"
      type={opts?.type}
      multiline={opts?.multiline}
      rows={opts?.rows}
      inputProps={opts?.maxLength ? { maxLength: opts.maxLength } : undefined}
    />
  );

  const dropdown = (
    key: keyof CreateCenterPayload,
    label: string,
    items: { label: string; value: string }[],
    required = false,
  ) => (
    <Autocomplete
      options={items}
      getOptionLabel={(o) => o.label}
      value={items.find(i => i.value === (form[key] as string)) ?? null}
      onChange={(_, v) => { set(key, v?.value ?? ''); clearError(key); }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={`${label}${required ? ' *' : ''}`}
          size="small"
          error={!!errors[key]}
          helperText={errors[key]}
        />
      )}
    />
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '92vh' } }}>

      {/* ── Header ── */}
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AddLocationAltRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: BRAND.textPrimary }}>Add New Center</Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>Manually register a coaching center</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose} sx={{ color: BRAND.textSecondary }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      {/* ── Body ── */}
      <DialogContent sx={{ px: 3, py: 3, overflowY: 'auto' }}>
        <Stack gap={3}>

          {/* ─── Basic Info ─── */}
          <Box>
            <SectionHead title="Basic Information" subtitle="Center name, category and owner details" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>{field('name', 'Center Name *')}</Grid>
              <Grid item xs={12} sm={4}>{dropdown('category', 'Category', mdCategories, true)}</Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={ownerResults}
                  getOptionLabel={(u) => `${u.name}${u.mobile_number ? ` · ${u.mobile_number}` : ''}`}
                  filterOptions={(x) => x}
                  loading={ownerLoading}
                  value={selectedOwner}
                  onChange={(_, v) => {
                    setSelectedOwner(v);
                    set('owner_name', v?.name ?? '');
                    set('mobile_number', v?.mobile_number ?? '');
                    clearError('owner_name');
                    clearError('mobile_number');
                  }}
                  inputValue={ownerSearch}
                  onInputChange={(_, v, reason) => { if (reason !== 'reset') setOwnerSearch(v); }}
                  noOptionsText={ownerSearch.length < 2 ? 'Type 2+ chars to search…' : 'No users found'}
                  renderOption={(props, u) => (
                    <Box component="li" {...props} key={u.id}>
                      <Stack direction="row" alignItems="center" gap={1.25} py={0.25}>
                        <Avatar sx={{ width: 26, height: 26, fontSize: 10, fontWeight: 700,
                          background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                          {u.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{u.name}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {u.mobile_number ?? u.email ?? '—'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Owner Name *"
                      size="small"
                      error={!!errors.owner_name}
                      helperText={errors.owner_name}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {ownerLoading && <CircularProgress size={13} />}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>{field('mobile_number', 'Phone Number *', { type: 'tel' })}</Grid>
            </Grid>
          </Box>

          <Divider />

          {/* ─── Location ─── */}
          <Box>
            <SectionHead title="Location" subtitle="Full address including state and pincode" />
            <Grid container spacing={2}>
              <Grid item xs={12}>{field('address', 'Street Address *', { multiline: true, rows: 2 })}</Grid>
              <Grid item xs={12} sm={4}>{dropdown('city', 'City *', mdCities, true)}</Grid>
              <Grid item xs={12} sm={4}>{field('state', 'State')}</Grid>
              <Grid item xs={12} sm={4}>{field('pincode', 'Pincode', { maxLength: 6 })}</Grid>
            </Grid>

            {/* Map */}
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, border: `1px solid ${BRAND.divider}`, bgcolor: BRAND.surface }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>Pin Location on Map</Typography>
                {form.latitude && form.longitude && (
                  <Button size="small" variant="text"
                    onClick={() => { set('latitude', null); set('longitude', null); }}
                    sx={{ fontSize: 11, color: BRAND.textSecondary, minWidth: 0, p: '2px 8px' }}>
                    Clear pin
                  </Button>
                )}
              </Stack>
              <MapPicker
                lat={form.latitude ?? null}
                lng={form.longitude ?? null}
                onChange={(lat, lng) => { set('latitude', lat); set('longitude', lng); }}
                height={260}
              />
            </Box>
          </Box>

          <Divider />

          {/* ─── Operations ─── */}
          <Box>
            <SectionHead title="Operations" subtitle="Schedule, age group, fees and facilities" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>{dropdown('operating_days', 'Operating Days', mdOpDays, true)}</Grid>
              <Grid item xs={12} sm={6}>{field('operating_timings', 'Operating Timings *', { type: 'text' })}</Grid>
              <Grid item xs={12} sm={6}>{dropdown('age_group', 'Age Group', mdAgeGroups, true)}</Grid>
              <Grid item xs={12} sm={6}>{dropdown('fee_range', 'Fee Range', mdFeeRanges)}</Grid>

              {/* Facilities multi-select */}
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={mdFacilities}
                  getOptionLabel={(o) => o.label}
                  value={mdFacilities.filter(f => selectedFacilities.includes(f.value))}
                  onChange={(_, vals) => {
                    set('facilities', vals.map(v => v.value).join(','));
                  }}
                  renderTags={(vals, getTagProps) =>
                    vals.map((v, i) => (
                      <Chip
                        {...getTagProps({ index: i })}
                        key={v.value}
                        label={v.label}
                        size="small"
                        sx={{ height: 20, fontSize: 11, '.MuiChip-label': { px: 0.8 } }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Facilities" size="small" />
                  )}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* ─── Description & Links ─── */}
          <Box>
            <SectionHead title="Description & Links" subtitle="Optional details shown to parents" />
            <Grid container spacing={2}>
              <Grid item xs={12}>{field('description', 'Description *', { multiline: true, rows: 3 })}</Grid>
              <Grid item xs={12} sm={6}>{field('website_link', 'Website URL')}</Grid>
              <Grid item xs={12} sm={6}>{field('social_link', 'Social Media Link')}</Grid>
            </Grid>
          </Box>

        </Stack>
      </DialogContent>

      {/* ── Footer ── */}
      <Box sx={{
        px: 3, py: 2,
        borderTop: `1px solid ${BRAND.divider}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        bgcolor: BRAND.surface,
      }}>
        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
          Center will be created with <strong>Submitted</strong> status
        </Typography>
        <Stack direction="row" gap={1.5}>
          <Button variant="outlined" onClick={handleClose} disabled={createMut.isPending}
            sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => { if (validate()) createMut.mutate(); }}
            disabled={createMut.isPending}
            startIcon={createMut.isPending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : undefined}
            sx={{
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
              minWidth: 140,
            }}
          >
            {createMut.isPending ? 'Creating…' : 'Create Center'}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
