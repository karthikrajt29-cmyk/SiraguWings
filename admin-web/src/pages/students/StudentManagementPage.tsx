import { useMemo, useState } from 'react';
import {
  Avatar, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress,
  Grid, IconButton, InputAdornment, MenuItem, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
  Pagination,
} from '@mui/material';
import SearchRoundedIcon        from '@mui/icons-material/SearchRounded';
import SchoolRoundedIcon        from '@mui/icons-material/SchoolRounded';
import PersonRoundedIcon        from '@mui/icons-material/PersonRounded';
import HowToRegRoundedIcon      from '@mui/icons-material/HowToRegRounded';
import PersonOffRoundedIcon     from '@mui/icons-material/PersonOffRounded';
import AddRoundedIcon           from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon        from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon          from '@mui/icons-material/EditRounded';
import VisibilityRoundedIcon    from '@mui/icons-material/VisibilityRounded';
import AddBusinessRoundedIcon   from '@mui/icons-material/AddBusinessRounded';
import ClearRoundedIcon         from '@mui/icons-material/ClearRounded';
import CakeRoundedIcon          from '@mui/icons-material/CakeRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getStudents, getStudentStats, bulkDeleteStudents, deleteStudent,
  type Student,
} from '../../api/students.api';
import { getAllCenters } from '../../api/centers.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';
import AddStudentModal      from '../../components/students/AddStudentModal';
import EnrollStudentModal   from '../../components/students/EnrollStudentModal';
import StudentDetailDrawer  from '../../components/students/StudentDetailDrawer';

const PAGE_SIZE = 50;

type ParentFilter = 'all' | 'with' | 'without';

function calcAge(dob: string): string {
  const ms = Date.now() - new Date(dob).getTime();
  const years = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  return `${years} yr${years === 1 ? '' : 's'}`;
}

export default function StudentManagementPage() {
  const [search, setSearch]         = useState('');
  const [centerId, setCenterId]     = useState('');
  const [parentFilter, setParentFilter] = useState<ParentFilter>('all');
  const [genderFilter, setGenderFilter] = useState('');
  const [page, setPage]             = useState(0);
  const [selected, setSelected]     = useState<string[]>([]);

  const [addOpen, setAddOpen]       = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [enrollIds, setEnrollIds]   = useState<string[]>([]);
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);

  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  const queryParams = useMemo(() => ({
    search: search || undefined,
    center_id: centerId || undefined,
    has_parent:
      parentFilter === 'with' ? true :
      parentFilter === 'without' ? false : undefined,
    gender: genderFilter || undefined,
    page,
    size: PAGE_SIZE,
  }), [search, centerId, parentFilter, genderFilter, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['students', queryParams],
    queryFn: () => getStudents(queryParams),
  });

  const { data: stats } = useQuery({
    queryKey: ['student-stats'],
    queryFn: getStudentStats,
  });

  const { data: centers = [] } = useQuery({
    queryKey: ['all-centers'],
    queryFn: getAllCenters,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const allSelected = items.length > 0 && items.every((s) => selected.includes(s.id));
  const someSelected = selected.length > 0;

  const toggleAll = () => {
    if (allSelected) setSelected((s) => s.filter((id) => !items.some((i) => i.id === id)));
    else setSelected((s) => [...new Set([...s, ...items.map((i) => i.id)])]);
  };

  const toggleOne = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteStudents(ids),
    onSuccess: (data) => {
      showSnack(data.message || 'Deleted', 'success');
      setSelected([]);
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student-stats'] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const deleteOneMut = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      showSnack('Student deleted', 'success');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student-stats'] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={2.5}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.textPrimary }}>
            Student Management
          </Typography>
          <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
            {(stats?.total ?? 0).toLocaleString()} students · {(stats?.without_parent ?? 0).toLocaleString()} without a parent
          </Typography>
        </Box>
        <Button
          variant="contained" size="medium" startIcon={<AddRoundedIcon />}
          onClick={() => { setEditStudent(null); setAddOpen(true); }}
          sx={{
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
            fontSize: 13, px: 2.25,
          }}
        >
          Add Student
        </Button>
      </Stack>

      {/* KPI strip */}
      <Grid container spacing={2} mb={2.5}>
        <Kpi label="Total Students" value={stats?.total ?? 0}
          color="#3B82F6" icon={<SchoolRoundedIcon />} />
        <Kpi label="Active" value={stats?.active ?? 0}
          color="#10B981" icon={<HowToRegRoundedIcon />} />
        <Kpi label="With Parent" value={stats?.with_parent ?? 0}
          color="#7C3AED" icon={<PersonRoundedIcon />} />
        <Kpi label="Without Parent" value={stats?.without_parent ?? 0}
          color="#F59E0B" icon={<PersonOffRoundedIcon />} />
      </Grid>

      {/* Filters bar */}
      <Card sx={{ borderRadius: 2.5, mb: 2 }}>
        <CardContent sx={{ p: '14px !important' }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth size="small" placeholder="Search by name, parent, or mobile"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth size="small" select label="Center"
                value={centerId} onChange={(e) => { setCenterId(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All centers</MenuItem>
                {centers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name} · {c.city}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2.5}>
              <TextField
                fullWidth size="small" select label="Parent"
                value={parentFilter}
                onChange={(e) => { setParentFilter(e.target.value as ParentFilter); setPage(0); }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="with">With Parent</MenuItem>
                <MenuItem value="without">Without Parent</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} md={2.5}>
              <TextField
                fullWidth size="small" select label="Gender"
                value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">Any gender</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {someSelected && (
        <Card sx={{
          borderRadius: 2.5, mb: 2,
          border: `1px solid ${BRAND.primary}`, bgcolor: `${BRAND.primary}08`,
        }}>
          <CardContent sx={{ p: '12px 16px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: BRAND.primary }}>
              {selected.length} selected
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" startIcon={<AddBusinessRoundedIcon />}
              onClick={() => setEnrollIds(selected)}>
              Enroll in Center
            </Button>
            <Button
              size="small" variant="outlined" color="error" startIcon={<DeleteRoundedIcon />}
              disabled={bulkDeleteMut.isPending}
              onClick={() => {
                if (confirm(`Delete ${selected.length} student(s)? This is a soft-delete.`)) {
                  bulkDeleteMut.mutate(selected);
                }
              }}
            >
              Bulk Delete
            </Button>
            <Button size="small" startIcon={<ClearRoundedIcon />} onClick={() => setSelected([])}>
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card sx={{ borderRadius: 2.5 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someSelected && !allSelected}
                    checked={allSelected} onChange={toggleAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>DOB · Age</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Gender</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Parent</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Centers</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: BRAND.textSecondary }}>
                    No students found.
                  </TableCell>
                </TableRow>
              ) : items.map((s) => (
                <TableRow
                  key={s.id} hover
                  selected={selected.includes(s.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.includes(s.id)} onChange={() => toggleOne(s.id)} />
                  </TableCell>
                  <TableCell onClick={() => setDrawerStudent(s)}>
                    <Stack direction="row" alignItems="center" gap={1.25}>
                      <Avatar sx={{
                        width: 32, height: 32, fontSize: 13, fontWeight: 700,
                        bgcolor: '#EDE9FE', color: '#7C3AED',
                      }}>
                        {s.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.name}</Typography>
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                          Added {new Date(s.added_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell onClick={() => setDrawerStudent(s)}>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <CakeRoundedIcon sx={{ fontSize: 13, color: BRAND.textSecondary }} />
                      <Box>
                        <Typography sx={{ fontSize: 12 }}>
                          {new Date(s.date_of_birth).toLocaleDateString()}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                          {calcAge(s.date_of_birth)}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell onClick={() => setDrawerStudent(s)}>
                    <Chip size="small" label={s.gender} sx={{
                      fontWeight: 600, fontSize: 11, height: 20,
                      bgcolor: s.gender === 'Male' ? '#DBEAFE' : s.gender === 'Female' ? '#FCE7F3' : '#F3F4F6',
                      color:   s.gender === 'Male' ? '#1E40AF' : s.gender === 'Female' ? '#9D174D' : '#374151',
                    }} />
                  </TableCell>
                  <TableCell onClick={() => setDrawerStudent(s)}>
                    {s.parent_id ? (
                      <Box>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{s.parent_name}</Typography>
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{s.parent_mobile}</Typography>
                      </Box>
                    ) : (
                      <Chip size="small" label="No parent" sx={{
                        fontSize: 11, height: 20, fontWeight: 600,
                        bgcolor: '#FEF3C7', color: '#92400E',
                      }} />
                    )}
                  </TableCell>
                  <TableCell onClick={() => setDrawerStudent(s)}>
                    {s.centers.length === 0 ? (
                      <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, fontStyle: 'italic' }}>
                        Not enrolled
                      </Typography>
                    ) : (
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {s.centers.slice(0, 2).map((c) => (
                          <Chip key={c.center_id} size="small" label={c.center_name} sx={{
                            fontSize: 11, height: 20, maxWidth: 140,
                          }} />
                        ))}
                        {s.centers.length > 2 && (
                          <Chip size="small" label={`+${s.centers.length - 2}`} sx={{ fontSize: 11, height: 20 }} />
                        )}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => setDrawerStudent(s)} title="View">
                      <VisibilityRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => { setEditStudent(s); setAddOpen(true); }} title="Edit">
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small" sx={{ color: '#DC2626' }} title="Delete"
                      disabled={deleteOneMut.isPending}
                      onClick={() => {
                        if (confirm(`Delete student "${s.name}"?`)) deleteOneMut.mutate(s.id);
                      }}
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination
              page={page + 1} count={totalPages}
              onChange={(_, p) => setPage(p - 1)} size="small" color="primary"
            />
          </Box>
        )}
      </Card>

      {/* Modals */}
      <AddStudentModal
        open={addOpen}
        editStudent={editStudent}
        onClose={() => { setAddOpen(false); setEditStudent(null); }}
      />
      <EnrollStudentModal
        open={enrollIds.length > 0}
        studentIds={enrollIds}
        onClose={() => setEnrollIds([])}
        onSuccess={() => setSelected([])}
      />
      <StudentDetailDrawer
        open={!!drawerStudent}
        student={drawerStudent}
        onClose={() => setDrawerStudent(null)}
        onEdit={() => {
          if (drawerStudent) {
            setEditStudent(drawerStudent);
            setAddOpen(true);
            setDrawerStudent(null);
          }
        }}
        onEnroll={() => {
          if (drawerStudent) {
            setEnrollIds([drawerStudent.id]);
            setDrawerStudent(null);
          }
        }}
      />
    </Box>
  );
}

function Kpi({
  label, value, color, icon,
}: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <Grid item xs={6} sm={3}>
      <Card sx={{ borderRadius: 2.5, height: '100%' }}>
        <CardContent sx={{ p: '16px !important' }}>
          <Avatar sx={{
            width: 36, height: 36, borderRadius: '10px',
            bgcolor: `${color}18`, color, mb: 1,
          }}>
            {icon}
          </Avatar>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.textPrimary, lineHeight: 1.1 }}>
            {value.toLocaleString()}
          </Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: BRAND.textSecondary }}>
            {label}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
