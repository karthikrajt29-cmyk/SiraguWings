import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Avatar, Button,
  Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TableContainer,
  Paper, TextField, InputAdornment, Drawer, List, ListItem, ListItemText,
  Divider, Stack, CircularProgress, Alert, IconButton,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChildCareRoundedIcon from '@mui/icons-material/ChildCareRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CakeRoundedIcon from '@mui/icons-material/CakeRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getUsers, getUserDetail, getUserStudents,
  type UserSummary, type ParentStudent,
} from '../../api/users.api';
import AddStudentModal from '../../components/students/AddStudentModal';
import { BRAND } from '../../theme';

const STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  Active: 'success',
  Suspended: 'error',
  Pending: 'warning',
};

const LINK_STATUS_COLOR: Record<string, string> = {
  Active: '#22c55e',
  Removed: '#ef4444',
  Pending: '#f59e0b',
};

// ── Student card inside parent drawer ───────────────────────────────────────

function StudentCard({ student }: { student: ParentStudent }) {
  return (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 2 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{
            width: 36, height: 36, bgcolor: '#ede9fe', color: '#7c3aed',
            fontSize: 15, fontWeight: 700,
          }}>
            {student.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography fontWeight={600} fontSize={14} noWrap>{student.name}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {student.gender && (
                <Typography fontSize={11} color="text.secondary">
                  {student.gender}
                </Typography>
              )}
              {student.date_of_birth && (
                <Typography fontSize={11} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <CakeRoundedIcon sx={{ fontSize: 11 }} />
                  {new Date(student.date_of_birth).toLocaleDateString()}
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>

        {student.centers.length > 0 && (
          <Box sx={{ mt: 1, pl: 0.5 }}>
            {student.centers.map((c) => (
              <Box key={c.center_id} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                py: 0.5,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <BusinessRoundedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                  <Typography fontSize={12} color="text.secondary">{c.center_name}</Typography>
                </Box>
                <Chip
                  size="small"
                  label={c.link_status}
                  sx={{
                    fontSize: 11, height: 20, fontWeight: 600,
                    bgcolor: (LINK_STATUS_COLOR[c.link_status] ?? '#94a3b8') + '22',
                    color: LINK_STATUS_COLOR[c.link_status] ?? '#94a3b8',
                  }}
                />
              </Box>
            ))}
          </Box>
        )}

        {student.centers.length === 0 && (
          <Typography fontSize={11} color="text.secondary" sx={{ mt: 0.5, pl: 0.5 }}>
            Not linked to any center
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ── Parent Detail Drawer ─────────────────────────────────────────────────────

function ParentDrawer({
  parent,
  onClose,
}: {
  parent: UserSummary | null;
  onClose: () => void;
}) {
  const [addStudentOpen, setAddStudentOpen] = useState(false);

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['user', parent?.id],
    queryFn: () => getUserDetail(parent!.id),
    enabled: !!parent,
    staleTime: 30_000,
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['user-students', parent?.id],
    queryFn: () => getUserStudents(parent!.id),
    enabled: !!parent,
    staleTime: 30_000,
  });

  return (
    <Drawer anchor="right" open={!!parent} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 0 } }}>
      {!parent ? null : (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{
            px: 3, py: 2.5,
            background: `linear-gradient(135deg, #2d1b69 0%, #1e3a5f 100%)`,
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <Avatar sx={{
              width: 48, height: 48,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              fontWeight: 700, fontSize: 18,
            }}>
              {parent.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography fontWeight={700} fontSize={16} color="#fff" noWrap>
                {parent.name}
              </Typography>
              <Chip
                size="small"
                label={parent.status}
                color={STATUS_COLOR[parent.status] ?? 'default'}
                sx={{ fontSize: 11, height: 20, mt: 0.3 }}
              />
            </Box>
            <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
            {loadingDetail ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Contact */}
                <Typography variant="overline" color="text.secondary" fontSize={11}>
                  Contact Information
                </Typography>
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

                <Divider sx={{ my: 1.5 }} />

                {/* Centers linked to */}
                {(detail?.center_connections?.length ?? 0) > 0 && (
                  <>
                    <Typography variant="overline" color="text.secondary" fontSize={11}>
                      Linked Centers
                    </Typography>
                    <Stack spacing={0.5} sx={{ mb: 2, mt: 0.5 }}>
                      {detail!.center_connections.map((c) => (
                        <Box key={c.center_id} sx={{
                          display: 'flex', alignItems: 'center', gap: 1,
                          p: 1, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.03)',
                        }}>
                          <BusinessRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                          <Typography fontSize={13}>{c.center_name}</Typography>
                        </Box>
                      ))}
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                  </>
                )}

                {/* Students */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="overline" color="text.secondary" fontSize={11}>
                    Students ({loadingStudents ? '…' : students.length})
                  </Typography>
                  <ChildCareRoundedIcon fontSize="small" color="action" />
                </Box>

                <Button
                  fullWidth size="small" variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setAddStudentOpen(true)}
                  sx={{
                    mb: 1.5,
                    background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                    '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
                    fontSize: 13,
                  }}
                >
                  Add Student
                </Button>

                {loadingStudents ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={20} />
                  </Box>
                ) : students.length === 0 ? (
                  <Alert severity="info" sx={{ fontSize: 13 }}>
                    No students linked to this parent.
                  </Alert>
                ) : (
                  students.map((s) => <StudentCard key={s.id} student={s} />)
                )}
              </>
            )}
          </Box>
        </Box>
      )}

      {parent && (
        <AddStudentModal
          open={addStudentOpen}
          parentId={parent.id}
          onClose={() => setAddStudentOpen(false)}
        />
      )}
    </Drawer>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ParentManagementPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 25;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', { role: 'Parent', search, page }],
    queryFn: () => getUsers({ role: 'Parent', search: search || undefined, page: page + 1, size: PAGE_SIZE }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const parents = data?.items ?? [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Parent Management
        </Typography>
        <Typography color="text.secondary" fontSize={14}>
          View parents and their linked students across the platform.
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Typography color="text.secondary" fontSize={12} fontWeight={600}>
                TOTAL PARENTS
              </Typography>
              <Typography fontSize={28} fontWeight={800} sx={{ color: '#7c3aed' }}>
                {isLoading ? '—' : data?.total ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Typography color="text.secondary" fontSize={12} fontWeight={600}>
                ACTIVE
              </Typography>
              <Typography fontSize={28} fontWeight={800} color="#22c55e">
                {isLoading ? '—' : parents.filter((p) => p.status === 'Active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Typography color="text.secondary" fontSize={12} fontWeight={600}>
                SUSPENDED
              </Typography>
              <Typography fontSize={28} fontWeight={800} color="#ef4444">
                {isLoading ? '—' : parents.filter((p) => p.status === 'Suspended').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Typography color="text.secondary" fontSize={12} fontWeight={600}>
                NEW THIS MONTH
              </Typography>
              <Typography fontSize={28} fontWeight={800} color="#3b82f6">
                {isLoading ? '—' : parents.filter((p) => {
                  const d = new Date(p.created_date);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).length}
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
        <Alert severity="error">Failed to load parents.</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PARENT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>EMAIL</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>MOBILE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>JOINED</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : parents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No parents found.
                  </TableCell>
                </TableRow>
              ) : (
                parents.map((parent) => (
                  <TableRow
                    key={parent.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelected(parent)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{
                          width: 32, height: 32, fontSize: 13, fontWeight: 700,
                          bgcolor: '#ede9fe', color: '#7c3aed',
                        }}>
                          {parent.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography fontSize={13} fontWeight={600}>{parent.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                      {parent.email ?? '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {parent.mobile_number ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={parent.status}
                        color={STATUS_COLOR[parent.status] ?? 'default'}
                        sx={{ fontSize: 12, height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {new Date(parent.created_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
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

      <ParentDrawer parent={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
