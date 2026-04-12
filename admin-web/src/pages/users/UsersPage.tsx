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
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchRoundedIcon             from '@mui/icons-material/SearchRounded';
import PeopleRoundedIcon             from '@mui/icons-material/PeopleRounded';
import PersonOffRoundedIcon          from '@mui/icons-material/PersonOffRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SchoolRoundedIcon             from '@mui/icons-material/SchoolRounded';
import FamilyRestroomRoundedIcon     from '@mui/icons-material/FamilyRestroomRounded';
import FilterListRoundedIcon         from '@mui/icons-material/FilterListRounded';
import CloseRoundedIcon              from '@mui/icons-material/CloseRounded';
import EditRoundedIcon               from '@mui/icons-material/EditRounded';
import BlockRoundedIcon              from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon        from '@mui/icons-material/CheckCircleRounded';
import LockResetRoundedIcon          from '@mui/icons-material/LockResetRounded';
import ContentCopyRoundedIcon        from '@mui/icons-material/ContentCopyRounded';
import PersonAddRoundedIcon          from '@mui/icons-material/PersonAddRounded';
import DeleteRoundedIcon             from '@mui/icons-material/DeleteRounded';
import AddRoundedIcon                from '@mui/icons-material/AddRounded';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUsers, getUserStats, updateUserStatus, updateUser,
  resetUserPassword, createUser, deleteUser,
  addUserRole, removeUserRole,
  type UserRole, type UserSummary,
} from '../../api/users.api';
import { getAllCenters } from '../../api/centers.api';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND, STATUS_COLORS } from '../../theme';

// ── constants ───────────────────────────────────────────────────────────────
const ALL_ROLES = ['Admin', 'Owner', 'Teacher', 'Parent', 'Staff'] as const;
const CENTER_SCOPED_ROLES = new Set(['Owner', 'Teacher', 'Staff']);
const PAGE_SIZES = [10, 25, 50];

const ROLE_COLORS: Record<string, string> = {
  Admin:   STATUS_COLORS.verified,
  Owner:   BRAND.primary,
  Teacher: STATUS_COLORS.approved,
  Parent:  STATUS_COLORS.underReview,
  Staff:   STATUS_COLORS.slaWarning,
};

// ── helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
const AVATAR_COLORS = ['#E85D04','#3B82F6','#22C55E','#7C3AED','#F59E0B','#0EA5E9','#EF4444'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: {
  label: string; value: number | undefined; icon: React.ReactNode; color: string;
}) {
  return (
    <Box sx={{
      flex: '1 1 140px', minWidth: 130,
      bgcolor: '#fff', borderRadius: 3,
      border: `1px solid ${BRAND.divider}`,
      p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
    }}>
      <Box sx={{
        width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
        bgcolor: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        '& svg': { fontSize: 18, color },
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: BRAND.textPrimary, lineHeight: 1.1 }}>
          {value ?? '—'}
        </Typography>
        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, fontWeight: 500 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Role chips ──────────────────────────────────────────────────────────────
function RoleChips({ roles, onRemove }: {
  roles: UserRole[];
  onRemove?: (r: UserRole) => void;
}) {
  if (!roles.length)
    return <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>—</Typography>;
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      {roles.map((r, i) => {
        const color = ROLE_COLORS[r.role] ?? BRAND.textSecondary;
        return (
          <Chip
            key={`${r.role}-${r.center_id ?? 'global'}-${i}`}
            label={r.role}
            size="small"
            onDelete={onRemove ? () => onRemove(r) : undefined}
            sx={{
              fontSize: 11, fontWeight: 600, height: 22,
              bgcolor: color + '18', color,
              border: `1px solid ${color}40`,
              '& .MuiChip-deleteIcon': { fontSize: 13, color: color + 'AA', '&:hover': { color } },
            }}
          />
        );
      })}
    </Stack>
  );
}

// ── Add User Modal ──────────────────────────────────────────────────────────
function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', mobile_number: '', role: '', center_id: '' });
  const [resetLink, setResetLink] = useState<string | null>(null);
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  const { data: centers = [] } = useQuery({
    queryKey: ['centers-all'],
    queryFn: getAllCenters,
    staleTime: 60_000,
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => createUser({
      name: form.name.trim(),
      email: form.email.trim(),
      mobile_number: form.mobile_number.trim(),
      role: form.role || undefined,
      center_id: form.center_id.trim() || undefined,
    }),
    onSuccess: (data) => {
      setResetLink(data.data.reset_link);
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user-stats'] });
      showSnack('User created', 'success');
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleClose = () => {
    setForm({ name: '', email: '', mobile_number: '', role: '', center_id: '' });
    setResetLink(null);
    onClose();
  };

  const valid = form.name.trim() && form.email.trim() && form.mobile_number.trim();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PersonAddRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>Add User</Typography>
              <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>Create a new platform account</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose}><CloseRoundedIcon fontSize="small" /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        {resetLink ? (
          /* Success state — show reset link */
          <Stack gap={2}>
            <Typography sx={{ fontSize: 13, color: BRAND.textPrimary, fontWeight: 600 }}>
              User created! Share this one-time setup link:
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: BRAND.surface, border: `1px solid ${BRAND.divider}`, borderRadius: 2 }}>
              <Stack direction="row" alignItems="flex-start" gap={1}>
                <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, flex: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {resetLink}
                </Typography>
                <Tooltip title="Copy">
                  <IconButton size="small" onClick={() => { navigator.clipboard.writeText(resetLink); showSnack('Link copied', 'success'); }}>
                    <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
            <Button variant="contained" onClick={handleClose}
              sx={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
              Done
            </Button>
          </Stack>
        ) : (
          <Stack gap={2}>
            <TextField label="Full Name *" size="small" fullWidth value={form.name} onChange={(e) => set('name', e.target.value)} />
            <TextField label="Email *" size="small" fullWidth value={form.email} onChange={(e) => set('email', e.target.value)} type="email" />
            <TextField label="Mobile Number *" size="small" fullWidth value={form.mobile_number} onChange={(e) => set('mobile_number', e.target.value)} />

            <Divider />

            <FormControl size="small" fullWidth>
              <InputLabel>Initial Role (optional)</InputLabel>
              <Select value={form.role} label="Initial Role (optional)" onChange={(e) => set('role', e.target.value)}>
                <MenuItem value=""><em>— None —</em></MenuItem>
                {ALL_ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>

            {CENTER_SCOPED_ROLES.has(form.role) && (
              <Autocomplete
                size="small"
                options={centers}
                getOptionLabel={(c) => `${c.name} — ${c.city}`}
                value={centers.find((c) => c.id === form.center_id) ?? null}
                onChange={(_, val) => set('center_id', val?.id ?? '')}
                renderInput={(params) => (
                  <TextField {...params} label="Center *" placeholder="Search center…" />
                )}
                renderOption={(props, c) => (
                  <Box component="li" {...props} key={c.id}>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{c.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{c.city}</Typography>
                    </Box>
                  </Box>
                )}
                noOptionsText="No centers found"
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
            )}

            <Button
              variant="contained" fullWidth
              onClick={() => mut.mutate()}
              disabled={!valid || mut.isPending}
              startIcon={mut.isPending ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <PersonAddRoundedIcon />}
              sx={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, mt: 0.5 }}
            >
              {mut.isPending ? 'Creating…' : 'Create User'}
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Drawer ──────────────────────────────────────────────────────────────
function EditDrawer({ user, onClose }: { user: UserSummary | null; onClose: () => void }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [newRole, setNewRole]   = useState('');
  const [newCenterId, setNewCenterId] = useState('');
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  const { data: centers = [] } = useQuery({
    queryKey: ['centers-all'],
    queryFn: getAllCenters,
    staleTime: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['user-stats'] });
  };

  const updateMut = useMutation({
    mutationFn: () => updateUser(user!.id, {
      name:  name.trim()  !== user!.name         ? name.trim()  : undefined,
      email: email.trim() !== (user!.email ?? '') ? email.trim() : undefined,
    }),
    onSuccess: () => { showSnack('User updated', 'success'); invalidate(); onClose(); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const resetMut = useMutation({
    mutationFn: () => resetUserPassword(user!.id),
    onSuccess: (d) => { setResetLink(d.data.reset_link); showSnack('Reset link generated', 'success'); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteUser(user!.id),
    onSuccess: () => { showSnack('User deleted', 'success'); invalidate(); setConfirmDelete(false); onClose(); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const addRoleMut = useMutation({
    mutationFn: () => addUserRole(user!.id, {
      role: newRole,
      center_id: newCenterId.trim() || undefined,
    }),
    onSuccess: () => { showSnack('Role added', 'success'); setNewRole(''); setNewCenterId(''); invalidate(); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const removeRoleMut = useMutation({
    mutationFn: (r: UserRole) => removeUserRole(user!.id, r.role, r.center_id),
    onSuccess: () => { showSnack('Role removed', 'success'); invalidate(); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleOpen = () => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setResetLink(null);
    setNewRole('');
    setNewCenterId('');
  };

  const dirty = name.trim() !== (user?.name ?? '') || email.trim() !== (user?.email ?? '');

  return (
    <>
      <Drawer
        anchor="right" open={!!user} onClose={onClose}
        SlideProps={{ onEnter: handleOpen }}
        PaperProps={{ sx: { width: 440, display: 'flex', flexDirection: 'column' } }}
      >
        {user && (
          <>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between"
              sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${BRAND.divider}`, flexShrink: 0 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: avatarColor(user.name), fontSize: 14, fontWeight: 700 }}>
                  {initials(user.name)}
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>{user.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>{user.mobile_number ?? 'No mobile'}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={onClose}><CloseRoundedIcon fontSize="small" /></IconButton>
            </Stack>

            {/* Body */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
              <Stack gap={3}>

                {/* Profile fields */}
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, mb: 1.5 }}>
                    Profile
                  </Typography>
                  <Stack gap={2}>
                    <TextField label="Full Name" size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
                    <TextField label="Email Address" size="small" fullWidth value={email} onChange={(e) => setEmail(e.target.value)}
                      helperText="Updates Firebase Auth + database." />
                  </Stack>
                </Box>

                <Divider />

                {/* Roles */}
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, mb: 1.5 }}>
                    Roles
                  </Typography>
                  <RoleChips
                    roles={user.roles}
                    onRemove={(r) => removeRoleMut.mutate(r)}
                  />

                  {/* Add role */}
                  <Stack direction="row" gap={1} mt={1.5} flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel>Add Role</InputLabel>
                      <Select value={newRole} label="Add Role" onChange={(e) => { setNewRole(e.target.value); setNewCenterId(''); }}>
                        <MenuItem value=""><em>—</em></MenuItem>
                        {ALL_ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </Select>
                    </FormControl>

                    {CENTER_SCOPED_ROLES.has(newRole) && (
                      <Autocomplete
                        size="small"
                        sx={{ flex: 1, minWidth: 200 }}
                        options={centers}
                        getOptionLabel={(c) => `${c.name} — ${c.city}`}
                        value={centers.find((c) => c.id === newCenterId) ?? null}
                        onChange={(_, val) => setNewCenterId(val?.id ?? '')}
                        renderInput={(params) => (
                          <TextField {...params} label="Center" placeholder="Search…" />
                        )}
                        renderOption={(props, c) => (
                          <Box component="li" {...props} key={c.id}>
                            <Box>
                              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{c.name}</Typography>
                              <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{c.city}</Typography>
                            </Box>
                          </Box>
                        )}
                        noOptionsText="No centers found"
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                      />
                    )}

                    {newRole && (
                      <Button
                        size="small" variant="outlined"
                        onClick={() => addRoleMut.mutate()}
                        disabled={addRoleMut.isPending || (CENTER_SCOPED_ROLES.has(newRole) && !newCenterId.trim())}
                        startIcon={addRoleMut.isPending ? <CircularProgress size={12} /> : <AddRoundedIcon />}
                        sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, whiteSpace: 'nowrap' }}
                      >
                        Add
                      </Button>
                    )}
                  </Stack>
                </Box>

                <Divider />

                {/* Password reset */}
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>
                    Password Reset
                  </Typography>
                  <Button
                    variant="outlined" size="small"
                    startIcon={resetMut.isPending ? <CircularProgress size={13} /> : <LockResetRoundedIcon />}
                    onClick={() => resetMut.mutate()}
                    disabled={resetMut.isPending}
                    sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 13 }}
                  >
                    {resetMut.isPending ? 'Generating…' : 'Generate Reset Link'}
                  </Button>
                  {resetLink && (
                    <Box sx={{ mt: 1.5, p: 1.5, bgcolor: BRAND.surface, border: `1px solid ${BRAND.divider}`, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="flex-start" gap={1}>
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, flex: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>
                          {resetLink}
                        </Typography>
                        <Tooltip title="Copy">
                          <IconButton size="small" onClick={() => { navigator.clipboard.writeText(resetLink); showSnack('Copied', 'success'); }}>
                            <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* Danger zone */}
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS.rejected, textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>
                    Danger Zone
                  </Typography>
                  <Button
                    variant="outlined" size="small" color="error"
                    startIcon={<DeleteRoundedIcon />}
                    onClick={() => setConfirmDelete(true)}
                    sx={{ borderColor: STATUS_COLORS.rejected + '60', color: STATUS_COLORS.rejected }}
                  >
                    Delete User
                  </Button>
                  <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, mt: 0.75 }}>
                    Permanently removes account and all role assignments. Firebase login is revoked.
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Footer */}
            <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${BRAND.divider}`, display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexShrink: 0 }}>
              <Button variant="outlined" size="small" onClick={onClose}
                sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary }}>
                Cancel
              </Button>
              <Button
                variant="contained" size="small"
                onClick={() => updateMut.mutate()}
                disabled={!dirty || updateMut.isPending}
                startIcon={updateMut.isPending ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : null}
                sx={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` } }}
              >
                {updateMut.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </Box>
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete User"
        message={`Permanently delete ${user?.name}? This cannot be undone. Their Firebase login will be revoked.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [search, setSearch]           = useState('');
  const [role, setRole]               = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(25);
  const [editUser, setEditUser]       = useState<UserSummary | null>(null);
  const [actionUser, setActionUser]   = useState<UserSummary | null>(null);
  const [addOpen, setAddOpen]         = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, role, statusFilter, page, pageSize],
    queryFn: () => getUsers({
      search: search || undefined,
      role:   role   || undefined,
      status: statusFilter || undefined,
      page:   page - 1,
      size:   pageSize,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: getUserStats,
    staleTime: 30_000,
  });

  const statusMut = useMutation({
    mutationFn: (u: UserSummary) =>
      updateUserStatus(u.id, { status: u.status === 'Active' ? 'Suspended' : 'Active' }),
    onSuccess: () => {
      showSnack('Status updated', 'success');
      setActionUser(null);
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user-stats'] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const users      = data?.items ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const activeFiltersCount = [role, statusFilter].filter(Boolean).length;
  const clearFilters = () => { setRole(''); setStatus(''); setPage(1); };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>

      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.textPrimary }}>Users</Typography>
          <Typography sx={{ fontSize: 13, color: BRAND.textSecondary, mt: 0.25 }}>
            {stats ? `${stats.total.toLocaleString()} registered users` : 'Manage all platform users'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddRoundedIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, fontWeight: 700, fontSize: 13 }}
        >
          Add User
        </Button>
      </Stack>

      {/* ── Stat cards ── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <StatCard label="Total"     value={stats?.total}                    icon={<PeopleRoundedIcon />}               color={BRAND.primary} />
        <StatCard label="Admins"    value={stats?.by_role['Admin']}         icon={<AdminPanelSettingsRoundedIcon />}    color={STATUS_COLORS.verified} />
        <StatCard label="Owners"    value={stats?.by_role['Owner']}         icon={<SchoolRoundedIcon />}                color={BRAND.primary} />
        <StatCard label="Teachers"  value={stats?.by_role['Teacher']}       icon={<SchoolRoundedIcon />}                color={STATUS_COLORS.approved} />
        <StatCard label="Parents"   value={stats?.by_role['Parent']}        icon={<FamilyRestroomRoundedIcon />}        color={STATUS_COLORS.underReview} />
        <StatCard label="Suspended" value={stats?.suspended}                icon={<PersonOffRoundedIcon />}             color={STATUS_COLORS.suspended} />
      </Box>

      {/* ── Filter bar ── */}
      <Box sx={{ bgcolor: '#fff', border: `1px solid ${BRAND.divider}`, borderRadius: 3, p: 2, mb: 1.5 }}>
        <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Search name, email or mobile…"
            size="small" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            sx={{ flex: 1, minWidth: 220 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setSearch(''); setPage(1); }}><CloseRoundedIcon sx={{ fontSize: 14 }} /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Button
            variant={filtersOpen ? 'contained' : 'outlined'}
            startIcon={<FilterListRoundedIcon />}
            size="small"
            onClick={() => setFiltersOpen((v) => !v)}
            sx={{
              borderColor: BRAND.divider,
              color: filtersOpen ? '#fff' : BRAND.textPrimary,
              bgcolor: filtersOpen ? BRAND.primary : 'transparent',
              '&:hover': { bgcolor: filtersOpen ? BRAND.primaryDark : BRAND.surface },
              fontWeight: 600, fontSize: 13, px: 2,
            }}
          >
            Filters
            {activeFiltersCount > 0 && (
              <Chip label={activeFiltersCount} size="small" sx={{
                ml: 0.75, height: 18, fontSize: 10, fontWeight: 700,
                bgcolor: filtersOpen ? 'rgba(255,255,255,0.3)' : BRAND.primary + '22',
                color: filtersOpen ? '#fff' : BRAND.primary,
              }} />
            )}
          </Button>
          {activeFiltersCount > 0 && (
            <Button size="small" onClick={clearFilters} startIcon={<CloseRoundedIcon />}
              sx={{ color: BRAND.textSecondary, fontSize: 12 }}>Clear</Button>
          )}
        </Stack>

        {filtersOpen && (
          <Stack direction="row" gap={2} mt={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Role</InputLabel>
              <Select value={role} label="Role" onChange={(e) => { setRole(e.target.value); setPage(1); }}>
                <MenuItem value="">All Roles</MenuItem>
                {ALL_ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Per page</InputLabel>
              <Select value={pageSize} label="Per page" onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {PAGE_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        )}
      </Box>

      {/* ── Table ── */}
      <Box sx={{ bgcolor: '#fff', border: `1px solid ${BRAND.divider}`, borderRadius: 3, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={34} sx={{ color: BRAND.primary }} />
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <PeopleRoundedIcon sx={{ fontSize: 38, color: BRAND.textSecondary + '50' }} />
            <Typography sx={{ color: BRAND.textSecondary, fontSize: 14 }}>No users found.</Typography>
            {activeFiltersCount > 0 && (
              <Button size="small" onClick={clearFilters} sx={{ color: BRAND.primary }}>Clear filters</Button>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: BRAND.surface }}>
                  {['User', 'Email', 'Mobile', 'Roles', 'Status', 'Joined', ''].map((h) => (
                    <TableCell key={h} sx={{
                      fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      py: 1.25, borderBottom: `1px solid ${BRAND.divider}`, whiteSpace: 'nowrap',
                    }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user, idx) => {
                  const isActive = user.status === 'Active';
                  return (
                    <TableRow key={user.id} sx={{
                      bgcolor: idx % 2 === 0 ? '#fff' : '#FAFBFC',
                      '&:hover': { bgcolor: BRAND.primaryBg },
                      transition: 'background 0.1s',
                    }}>
                      <TableCell sx={{ py: 1.25 }}>
                        <Stack direction="row" alignItems="center" gap={1.25}>
                          <Avatar sx={{ width: 30, height: 30, bgcolor: avatarColor(user.name), fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {initials(user.name)}
                          </Avatar>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>{user.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: BRAND.textSecondary, py: 1.25 }}>{user.email ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: BRAND.textSecondary, py: 1.25, whiteSpace: 'nowrap' }}>{user.mobile_number ?? '—'}</TableCell>
                      <TableCell sx={{ py: 1.25 }}><RoleChips roles={user.roles} /></TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Chip label={user.status} size="small" sx={{
                          fontSize: 11, fontWeight: 700, height: 20,
                          bgcolor: (isActive ? STATUS_COLORS.approved : STATUS_COLORS.suspended) + '18',
                          color: isActive ? STATUS_COLORS.approved : STATUS_COLORS.suspended,
                          border: `1px solid ${(isActive ? STATUS_COLORS.approved : STATUS_COLORS.suspended)}40`,
                        }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: BRAND.textSecondary, py: 1.25, whiteSpace: 'nowrap' }}>
                        {new Date(user.created_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Stack direction="row" gap={0.5}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setEditUser(user)}
                              sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: BRAND.primary + '14', color: BRAND.primary, '&:hover': { bgcolor: BRAND.primary + '28' } }}>
                              <EditRoundedIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isActive ? 'Suspend' : 'Activate'}>
                            <IconButton size="small" onClick={() => setActionUser(user)}
                              sx={{
                                width: 26, height: 26, borderRadius: '7px',
                                bgcolor: (isActive ? STATUS_COLORS.rejected : STATUS_COLORS.approved) + '14',
                                color: isActive ? STATUS_COLORS.rejected : STATUS_COLORS.approved,
                                '&:hover': { bgcolor: (isActive ? STATUS_COLORS.rejected : STATUS_COLORS.approved) + '28' },
                              }}>
                              {isActive ? <BlockRoundedIcon sx={{ fontSize: 13 }} /> : <CheckCircleRoundedIcon sx={{ fontSize: 13 }} />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderTop: `1px solid ${BRAND.divider}` }}>
            <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)}
              color="primary" shape="rounded" size="small"
              sx={{ '& .MuiPaginationItem-root': { fontWeight: 600 } }} />
          </Box>
        )}
      </Box>

      {/* ── Modals & Drawers ── */}
      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EditDrawer user={editUser} onClose={() => setEditUser(null)} />
      <ConfirmDialog
        open={!!actionUser}
        title={actionUser?.status === 'Active' ? 'Suspend User' : 'Activate User'}
        message={actionUser?.status === 'Active'
          ? `Suspend ${actionUser?.name}? They will lose access immediately.`
          : `Activate ${actionUser?.name}?`}
        confirmLabel={actionUser?.status === 'Active' ? 'Suspend' : 'Activate'}
        confirmColor={actionUser?.status === 'Active' ? 'error' : 'primary'}
        loading={statusMut.isPending}
        onConfirm={() => actionUser && statusMut.mutate(actionUser)}
        onCancel={() => setActionUser(null)}
      />
    </Box>
  );
}
