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
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon       from '@mui/icons-material/CloseRounded';
import PersonAddRoundedIcon   from '@mui/icons-material/PersonAddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PhoneRoundedIcon       from '@mui/icons-material/PhoneRounded';
import EmailRoundedIcon       from '@mui/icons-material/EmailRounded';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addCenterUser } from '../../api/centers.api';
import { getUsers, type UserSummary } from '../../api/users.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  centerId: string;
  onClose: () => void;
}

const ROLES = ['Teacher', 'Staff', 'Owner'] as const;
type Role = typeof ROLES[number];

const ROLE_META: Record<Role, { color: string; bg: string; desc: string }> = {
  Owner:   { color: BRAND.primary,  bg: `${BRAND.primary}12`,  desc: 'Full center management access' },
  Teacher: { color: '#3B82F6',      bg: '#EFF6FF',             desc: 'Manages batches and attendance' },
  Staff:   { color: '#8B5CF6',      bg: '#F5F3FF',             desc: 'View-only access' },
};

export default function AddUserModal({ open, centerId, onClose }: Props) {
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<UserSummary | null>(null);
  const [role, setRole]               = useState<Role>('Teacher');
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  /* live user search */
  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ['user-search-add', search],
    queryFn: () => getUsers({ search, status: 'Active', size: 20 }).then(r => r.items),
    enabled: search.length >= 2,
  });

  const mut = useMutation({
    mutationFn: () => {
      if (!selected?.mobile_number) throw new Error('Selected user has no mobile number');
      return addCenterUser(centerId, { mobile_number: selected.mobile_number, role });
    },
    onSuccess: (data: { message: string }) => {
      showSnack(data.message ?? 'User added', 'success');
      qc.invalidateQueries({ queryKey: ['center-users', centerId] });
      handleClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleClose = () => {
    setSearch(''); setSelected(null); setRole('Teacher');
    onClose();
  };

  const meta = ROLE_META[role];
  const initials = selected
    ? selected.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>

      {/* ── Header ── */}
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px',
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PersonAddRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>
                Add User to Center
              </Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                Search and assign a role
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose} disabled={mut.isPending}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 3 }}>
        <Stack spacing={2.5}>

          {/* ── User search ── */}
          <Autocomplete
            options={results}
            getOptionLabel={(u) => u.name}
            filterOptions={(x) => x}
            loading={searching}
            value={selected}
            onChange={(_, v) => { setSelected(v); setSearch(v?.name ?? ''); }}
            inputValue={search}
            onInputChange={(_, v, reason) => {
              if (reason !== 'reset') { setSearch(v); if (!v) setSelected(null); }
            }}
            noOptionsText={search.length < 2 ? 'Type 2+ chars to search…' : 'No active users found'}
            renderOption={(props, u) => {
              const inits = u.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <Box component="li" {...props} key={u.id}>
                  <Stack direction="row" alignItems="center" gap={1.25} py={0.25}>
                    <Avatar sx={{
                      width: 28, height: 28, fontSize: 11, fontWeight: 700,
                      background: `linear-gradient(135deg, ${BRAND.navyDark}, ${BRAND.navyLight})`,
                      color: '#fff',
                    }}>
                      {inits}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                        {u.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                        {u.mobile_number ?? u.email ?? '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search User *"
                size="small"
                placeholder="Name, mobile or email…"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searching && <CircularProgress size={13} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {/* ── Selected user preview ── */}
          {selected && (
            <Box sx={{
              p: 1.75, borderRadius: 2,
              border: `1.5px solid ${BRAND.primary}40`,
              bgcolor: BRAND.primaryBg,
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <Avatar sx={{
                width: 40, height: 40, fontSize: 14, fontWeight: 700, flexShrink: 0,
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                color: '#fff',
              }}>
                {initials}
              </Avatar>
              <Box flex={1} minWidth={0}>
                <Stack direction="row" alignItems="center" gap={0.75}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: BRAND.textPrimary }}>
                    {selected.name}
                  </Typography>
                  <CheckCircleRoundedIcon sx={{ fontSize: 14, color: '#22C55E' }} />
                </Stack>
                <Stack direction="row" gap={1.5} mt={0.3} flexWrap="wrap">
                  {selected.mobile_number && (
                    <Stack direction="row" alignItems="center" gap={0.4}>
                      <PhoneRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary }} />
                      <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
                        {selected.mobile_number}
                      </Typography>
                    </Stack>
                  )}
                  {selected.email && (
                    <Stack direction="row" alignItems="center" gap={0.4}>
                      <EmailRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary }} />
                      <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }} noWrap>
                        {selected.email}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
              <IconButton size="small" onClick={() => { setSelected(null); setSearch(''); }}
                sx={{ color: BRAND.textSecondary, flexShrink: 0 }}>
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          )}

          {/* ── Role selector ── */}
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: BRAND.textSecondary, mb: 1 }}>
              Role *
            </Typography>
            <Stack direction="row" gap={1}>
              {ROLES.map((r) => {
                const m = ROLE_META[r];
                const active = role === r;
                return (
                  <Box
                    key={r}
                    onClick={() => setRole(r)}
                    sx={{
                      flex: 1, py: 1, px: 0.5, borderRadius: 2, textAlign: 'center', cursor: 'pointer',
                      border: `1.5px solid ${active ? m.color : BRAND.divider}`,
                      bgcolor: active ? m.bg : '#fff',
                      transition: 'all .15s',
                      '&:hover': { borderColor: m.color, bgcolor: m.bg },
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: active ? m.color : BRAND.textSecondary }}>
                      {r}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
            {/* role description */}
            <Box sx={{ mt: 1.25, px: 1.5, py: 1, borderRadius: 1.5, bgcolor: meta.bg }}>
              <Typography sx={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>
                {role} — {meta.desc}
              </Typography>
            </Box>
          </Box>

          {/* ── Existing roles on selected user ── */}
          {selected && selected.roles.length > 0 && (
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: BRAND.surface, border: `1px solid ${BRAND.divider}` }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: BRAND.textSecondary, mb: 0.75 }}>
                Existing roles
              </Typography>
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                {selected.roles.map((ur, i) => (
                  <Chip
                    key={i}
                    label={ur.center_id ? ur.role : `${ur.role} (Global)`}
                    size="small"
                    sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* ── Actions ── */}
          <Stack direction="row" gap={1.5} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleClose} disabled={mut.isPending}
              sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 13 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !selected}
              startIcon={
                mut.isPending
                  ? <CircularProgress size={13} sx={{ color: '#fff' }} />
                  : <PersonAddRoundedIcon />
              }
              sx={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
                fontSize: 13,
              }}
            >
              {mut.isPending ? 'Adding…' : 'Add User'}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
