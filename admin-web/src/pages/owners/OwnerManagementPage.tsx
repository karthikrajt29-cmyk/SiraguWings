import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Avatar,
  Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TableContainer,
  Paper, TextField, InputAdornment, IconButton, Drawer,
  List, ListItem, ListItemText, Divider,
  CircularProgress, Alert, Badge, Button, Stack, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getUsers, getUserDetail, updateUser, removeUserRole, type UserSummary } from '../../api/users.api';
import { getAllCenters, getCenterDetail } from '../../api/centers.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

const STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  Active: 'success',
  Suspended: 'error',
  Pending: 'warning',
};

const REG_COLORS: Record<string, string> = {
  Approved: '#22c55e',
  Pending: '#f59e0b',
  Rejected: '#ef4444',
  Suspended: '#8b5cf6',
  Draft: '#94a3b8',
  UnderReview: '#3b82f6',
};

// ── Clickable center card ────────────────────────────────────────────────────

function CenterCard({ centerId }: { centerId: string }) {
  const navigate = useNavigate();
  const { data: center, isLoading } = useQuery({
    queryKey: ['center', centerId],
    queryFn: () => getCenterDetail(centerId),
    staleTime: 60_000,
  });

  if (isLoading) return <CircularProgress size={16} sx={{ m: 1 }} />;
  if (!center) return null;

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5, borderRadius: 2, cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': { borderColor: BRAND.primary, boxShadow: `0 0 0 1px ${BRAND.primary}22` },
      }}
      onClick={() => navigate(`/centers/${centerId}`)}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box flex={1} minWidth={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Typography fontWeight={600} fontSize={14} noWrap>{center.name}</Typography>
              <OpenInNewRoundedIcon sx={{ fontSize: 13, color: 'text.secondary', flexShrink: 0 }} />
            </Box>
            <Typography fontSize={12} color="text.secondary" sx={{ mt: 0.3 }}>
              {center.category} &middot; {center.city}, {center.state}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={center.registration_status}
            sx={{
              ml: 1, fontSize: 11, height: 22, fontWeight: 600, flexShrink: 0,
              bgcolor: (REG_COLORS[center.registration_status] ?? '#94a3b8') + '22',
              color: REG_COLORS[center.registration_status] ?? '#94a3b8',
            }}
          />
        </Box>
        {center.address && (
          <Typography fontSize={11} color="text.secondary" sx={{ mt: 0.8, display: 'flex', alignItems: 'center', gap: 0.3 }}>
            <LocationOnRoundedIcon sx={{ fontSize: 12 }} />
            {center.address}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ── Owner Drawer ─────────────────────────────────────────────────────────────

function OwnerDrawer({
  owner,
  onClose,
}: {
  owner: UserSummary | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { showSnack } = useSnackbar();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['user', owner?.id],
    queryFn: () => getUserDetail(owner!.id),
    enabled: !!owner,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: () => updateUser(owner!.id, {
      name: editName || undefined,
      email: editEmail || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', owner!.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSnack('Owner details updated.', 'success');
      setEditing(false);
    },
    onError: () => showSnack('Failed to save changes.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => removeUserRole(owner!.id, 'Owner'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', owner!.id] });
      showSnack('Owner role removed.', 'success');
      setConfirmOpen(false);
      onClose();
    },
    onError: () => showSnack('Failed to remove owner role.', 'error'),
  });

  const startEdit = () => {
    setEditName(detail?.name ?? '');
    setEditEmail(detail?.email ?? '');
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const ownedCenterIds = (detail?.center_connections ?? [])
    .filter((c: { role: string; center_id: string }) => c.role === 'Owner')
    .map((c: { role: string; center_id: string }) => c.center_id);

  return (
    <Drawer
      anchor="right"
      open={!!owner}
      onClose={() => { cancelEdit(); onClose(); }}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 0 } }}
    >
      {!owner ? null : (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{
            px: 3, py: 2.5,
            background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, #1e3a5f 100%)`,
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <Avatar sx={{
              width: 48, height: 48,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              fontWeight: 700, fontSize: 18,
            }}>
              {owner.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography fontWeight={700} fontSize={16} color="#fff" noWrap>
                {owner.name}
              </Typography>
              <Chip
                size="small"
                label={owner.status}
                color={STATUS_COLOR[owner.status] ?? 'default'}
                sx={{ fontSize: 11, height: 20, mt: 0.3 }}
              />
            </Box>
            {!editing && (
              <>
                <Tooltip title="Edit details">
                  <IconButton onClick={startEdit} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove owner role">
                  <IconButton onClick={() => setConfirmOpen(true)} sx={{ color: 'rgba(255,100,100,0.8)', '&:hover': { color: '#ff6b6b' } }}>
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <IconButton onClick={() => { cancelEdit(); onClose(); }} sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
            {isLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Contact section */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="overline" color="text.secondary" fontSize={11}>
                    Contact Information
                  </Typography>
                </Box>

                {editing ? (
                  /* ── Edit form ── */
                  <Stack spacing={2} sx={{ mb: 2 }}>
                    <TextField
                      label="Name"
                      size="small"
                      fullWidth
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <TextField
                      label="Email"
                      size="small"
                      fullWidth
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                    <TextField
                      label="Mobile"
                      size="small"
                      fullWidth
                      value={detail?.mobile_number ?? ''}
                      disabled
                      helperText="Mobile number cannot be changed here."
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        startIcon={<CancelRoundedIcon />}
                        onClick={cancelEdit}
                        disabled={saveMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveRoundedIcon />}
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? 'Saving…' : 'Save'}
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  /* ── Read view ── */
                  <List dense disablePadding sx={{ mb: 2 }}>
                    {detail?.email && (
                      <ListItem disableGutters>
                        <EmailRoundedIcon sx={{ fontSize: 16, mr: 1.5, color: 'text.secondary' }} />
                        <ListItemText primary={detail.email} primaryTypographyProps={{ fontSize: 13 }} />
                      </ListItem>
                    )}
                    {detail?.mobile_number && (
                      <ListItem disableGutters>
                        <PhoneRoundedIcon sx={{ fontSize: 16, mr: 1.5, color: 'text.secondary' }} />
                        <ListItemText primary={detail.mobile_number} primaryTypographyProps={{ fontSize: 13 }} />
                      </ListItem>
                    )}
                    <ListItem disableGutters>
                      <PersonRoundedIcon sx={{ fontSize: 16, mr: 1.5, color: 'text.secondary' }} />
                      <ListItemText
                        primary={`Last login: ${detail?.last_login_at
                          ? new Date(detail.last_login_at).toLocaleString()
                          : 'Never'}`}
                        primaryTypographyProps={{ fontSize: 13 }}
                      />
                    </ListItem>
                  </List>
                )}

                <Divider sx={{ my: 1.5 }} />

                {/* Owned Centers */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="overline" color="text.secondary" fontSize={11}>
                    Owned Centers
                  </Typography>
                  <Badge badgeContent={ownedCenterIds.length} color="primary" sx={{ mr: 1 }}>
                    <BusinessRoundedIcon fontSize="small" color="action" />
                  </Badge>
                </Box>

                {ownedCenterIds.length === 0 ? (
                  <Alert severity="info" sx={{ fontSize: 13 }}>
                    No centers assigned to this owner yet.
                  </Alert>
                ) : (
                  ownedCenterIds.map((cid) => (
                    <CenterCard key={cid} centerId={cid} />
                  ))
                )}
              </>
            )}
          </Box>
        </Box>
      )}

      {/* ── Confirm delete dialog ── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <DeleteRoundedIcon sx={{ color: '#ef4444', fontSize: 20 }} />
            <Typography fontWeight={700} fontSize={16}>Remove Owner Role</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText fontSize={14}>
            Remove <strong>{owner?.name}</strong> as an owner? This will unlink them from all
            centers they own. The user account will remain — only the Owner role is removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <DeleteRoundedIcon />}
          >
            {deleteMutation.isPending ? 'Removing…' : 'Remove Owner'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function OwnerManagementPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 25;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', { role: 'Owner', search, page }],
    queryFn: () => getUsers({ role: 'Owner', search: search || undefined, page: page + 1, size: PAGE_SIZE }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const owners = data?.items ?? [];

  const { data: allCenters = [] } = useQuery({
    queryKey: ['centers-all'],
    queryFn: getAllCenters,
    staleTime: 60_000,
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Owner Management
        </Typography>
        <Typography color="text.secondary" fontSize={14}>
          View and manage center owners across the platform.
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Typography color="text.secondary" fontSize={12} fontWeight={600}>TOTAL OWNERS</Typography>
              <Typography fontSize={28} fontWeight={800} color={BRAND.primary}>
                {isLoading ? '—' : data?.total ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Typography color="text.secondary" fontSize={12} fontWeight={600}>ACTIVE</Typography>
              <Typography fontSize={28} fontWeight={800} color="#22c55e">
                {isLoading ? '—' : owners.filter((o) => o.status === 'Active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Typography color="text.secondary" fontSize={12} fontWeight={600}>SUSPENDED</Typography>
              <Typography fontSize={28} fontWeight={800} color="#ef4444">
                {isLoading ? '—' : owners.filter((o) => o.status === 'Suspended').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Typography color="text.secondary" fontSize={12} fontWeight={600}>TOTAL CENTERS</Typography>
              <Typography fontSize={28} fontWeight={800} color="#3b82f6">
                {isLoading ? '—' : allCenters.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by name, email or mobile..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 320 }}
        />
      </Box>

      {/* Table */}
      {isError ? (
        <Alert severity="error">Failed to load owners.</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>OWNER</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>EMAIL</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>MOBILE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>CENTERS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>JOINED</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : owners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No owners found.
                  </TableCell>
                </TableRow>
              ) : (
                owners.map((owner) => {
                  const centerCount = owner.roles.filter(
                    (r) => r.role === 'Owner' && r.center_id,
                  ).length;
                  return (
                    <TableRow
                      key={owner.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelected(owner)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{
                            width: 32, height: 32, fontSize: 13, fontWeight: 700,
                            bgcolor: BRAND.primaryBg, color: BRAND.primary,
                          }}>
                            {owner.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography fontSize={13} fontWeight={600}>{owner.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {owner.email ?? '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{owner.mobile_number ?? '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={`${centerCount} center${centerCount !== 1 ? 's' : ''}`}
                          icon={<BusinessRoundedIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: 12, height: 24 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={owner.status}
                          color={STATUS_COLOR[owner.status] ?? 'default'}
                          sx={{ fontSize: 12, height: 22 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {new Date(owner.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Remove owner role">
                          <IconButton size="small" onClick={() => setSelected(owner)}
                            sx={{ color: '#ef444480', '&:hover': { color: '#ef4444', bgcolor: '#ef444410' } }}>
                            <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!isLoading && (data?.total ?? 0) > PAGE_SIZE && (
            <TablePagination
              component="div"
              count={data?.total ?? 0}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
            />
          )}
        </TableContainer>
      )}

      <OwnerDrawer owner={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
