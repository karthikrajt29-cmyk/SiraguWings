import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AssessmentRoundedIcon        from '@mui/icons-material/AssessmentRounded';
import SchoolRoundedIcon            from '@mui/icons-material/SchoolRounded';
import EventAvailableRoundedIcon    from '@mui/icons-material/EventAvailableRounded';
import FamilyRestroomRoundedIcon    from '@mui/icons-material/FamilyRestroomRounded';
import CurrencyRupeeRoundedIcon     from '@mui/icons-material/CurrencyRupeeRounded';
import DownloadRoundedIcon          from '@mui/icons-material/DownloadRounded';
import TrendingUpRoundedIcon        from '@mui/icons-material/TrendingUpRounded';
import WarningAmberRoundedIcon      from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import HourglassEmptyRoundedIcon    from '@mui/icons-material/HourglassEmptyRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOwnerCenter }           from '../../contexts/OwnerCenterContext';
import { useSnackbar }              from '../../contexts/SnackbarContext';
import {
  listOwnerStudents,
  listOwnerParents,
  listOwnerBatches,
  getOwnerBatchAttendanceRange,
  getOwnerFeesSummary,
  type OwnerAttendanceRangeRow,
} from '../../api/owner.api';
import { downloadCsv } from '../../utils/csv';
import { BRAND }       from '../../theme';

// ── helpers ───────────────────────────────────────────────────────────────────

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const fmt   = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtD  = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

// ── Stat card (for Finance tab) ───────────────────────────────────────────────

function StatTile({
  label, value, icon, color, sub,
}: {
  label: string; value: string; icon: React.ReactNode; color: string; sub?: string;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
      <CardContent sx={{ py: 2, px: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography fontSize={12} color="text.secondary" fontWeight={600} sx={{ mb: 0.5 }}>
              {label}
            </Typography>
            <Typography fontSize={22} fontWeight={800} color={color}>{value}</Typography>
            {sub && <Typography fontSize={11} color="text.secondary" sx={{ mt: 0.3 }}>{sub}</Typography>}
          </Box>
          <Box sx={{ bgcolor: color + '18', color, borderRadius: '10px', p: 1, display: 'flex' }}>
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Attendance pivot ──────────────────────────────────────────────────────────

function AttendancePivot({ data }: { data: OwnerAttendanceRangeRow[] }) {
  if (data.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No attendance records for this batch and date range.
      </Alert>
    );
  }

  const dates    = [...new Set(data.map((r) => r.attendance_date))].sort();
  const students = [...new Set(data.map((r) => r.student_name))].sort();

  // pivot[student][date] = status
  const pivot: Record<string, Record<string, string>> = {};
  students.forEach((s) => (pivot[s] = {}));
  data.forEach((r) => (pivot[r.student_name][r.attendance_date] = r.status));

  // per-student summary
  const studentSummary = students.map((s) => {
    const present = dates.filter((d) => pivot[s][d] === 'Present').length;
    const total   = dates.filter((d) => pivot[s][d]).length;
    return { name: s, present, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  });

  // per-date summary
  const dateSummary = dates.map((d) => {
    const present = students.filter((s) => pivot[s][d] === 'Present').length;
    const marked  = students.filter((s) => pivot[s][d]).length;
    return { date: d, present, marked };
  });

  const cellSx = { py: 0.75, px: 1, fontSize: 12, textAlign: 'center' as const, borderLeft: '1px solid #f0f0f0' };

  return (
    <TableContainer sx={{ mt: 2, maxHeight: 420, overflowX: 'auto', borderRadius: 2, border: '1px solid #e8e8e8' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, fontSize: 11, color: 'text.secondary' } }}>
            <TableCell sx={{ minWidth: 160, position: 'sticky', left: 0, bgcolor: '#f8fafc', zIndex: 3 }}>
              STUDENT
            </TableCell>
            {dates.map((d) => (
              <TableCell key={d} sx={{ ...cellSx, minWidth: 56 }}>{fmtD(d)}</TableCell>
            ))}
            <TableCell sx={{ ...cellSx, minWidth: 80, bgcolor: '#f0f9f0', color: '#15803d', fontWeight: 700 }}>
              % PRESENT
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {studentSummary.map((s) => (
            <TableRow key={s.name} hover sx={{ '&:hover td': { bgcolor: BRAND.primaryBg } }}>
              <TableCell sx={{
                position: 'sticky', left: 0, zIndex: 1,
                bgcolor: 'white', fontWeight: 600, fontSize: 13,
                borderRight: '1px solid #e8e8e8',
              }}>
                {s.name}
              </TableCell>
              {dates.map((d) => {
                const status = pivot[s.name][d];
                return (
                  <TableCell key={d} sx={{ ...cellSx }}>
                    {status === 'Present' && (
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: '6px',
                        bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 11,
                      }}>P</Box>
                    )}
                    {status === 'Absent' && (
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: '6px',
                        bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 11,
                      }}>A</Box>
                    )}
                    {!status && (
                      <Typography fontSize={12} color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                );
              })}
              <TableCell sx={{ ...cellSx, bgcolor: '#f0f9f0' }}>
                <Typography fontSize={12} fontWeight={700} color={s.pct >= 75 ? '#15803d' : s.pct >= 50 ? '#d97706' : '#dc2626'}>
                  {s.total > 0 ? `${s.pct}%` : '—'}
                </Typography>
                <Typography fontSize={10} color="text.secondary">{s.present}/{s.total}</Typography>
              </TableCell>
            </TableRow>
          ))}

          {/* Summary row */}
          <TableRow sx={{ bgcolor: '#f8fafc' }}>
            <TableCell sx={{
              position: 'sticky', left: 0, zIndex: 1,
              bgcolor: '#f8fafc', fontWeight: 700, fontSize: 12, color: 'text.secondary',
              borderRight: '1px solid #e8e8e8',
            }}>
              Present / Marked
            </TableCell>
            {dateSummary.map((ds) => (
              <TableCell key={ds.date} sx={{ ...cellSx }}>
                <Typography fontSize={11} fontWeight={600}>
                  {ds.present}/{ds.marked}
                </Typography>
              </TableCell>
            ))}
            <TableCell sx={{ ...cellSx, bgcolor: '#f0f9f0' }} />
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OwnerReportsPage() {
  const { centerId, centers } = useOwnerCenter();
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const centerName = centers.find((c) => c.id === centerId)?.name ?? 'Center';

  const [tab, setTab] = useState(0);

  // ── Attendance state ──
  const [batchId, setBatchId]       = useState('');
  const [start, setStart]           = useState(daysAgoIso(29));
  const [end, setEnd]               = useState(todayIso());
  const [attendEnabled, setAttendEnabled] = useState(false);

  // ── Queries ──
  const { data: batches = [] } = useQuery({
    queryKey: ['owner', 'batches', centerId],
    queryFn: () => listOwnerBatches(centerId!),
    enabled: !!centerId,
    staleTime: 60_000,
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['owner', 'students', centerId, 'all'],
    queryFn: () => listOwnerStudents(centerId!, { size: 500 }),
    enabled: !!centerId && tab === 1,
    staleTime: 60_000,
  });
  const students = studentsData?.items ?? [];

  const { data: parents = [], isLoading: parentsLoading } = useQuery({
    queryKey: ['owner', 'parents', centerId],
    queryFn: () => listOwnerParents(centerId!),
    enabled: !!centerId && tab === 2,
    staleTime: 60_000,
  });

  const { data: feeSummary, isLoading: feeLoading } = useQuery({
    queryKey: ['owner', 'fees-summary', centerId],
    queryFn: () => getOwnerFeesSummary(centerId!),
    enabled: !!centerId && tab === 3,
    staleTime: 60_000,
  });

  const { data: attendData, isFetching: attendFetching, refetch: loadAttend, error: attendError } = useQuery({
    queryKey: ['owner', 'attend-range', centerId, batchId, start, end],
    queryFn: () => getOwnerBatchAttendanceRange(centerId!, batchId, start, end),
    enabled: attendEnabled && !!centerId && !!batchId,
    staleTime: 0,
  });

  // ── CSV helpers ──
  const downloadStudentCsv = async () => {
    const list = students.length
      ? students
      : (await qc.fetchQuery({ queryKey: ['owner', 'students', centerId, 'all'], queryFn: () => listOwnerStudents(centerId!, { size: 500 }) }))?.items ?? [];
    downloadCsv(
      ['Name', 'Date of birth', 'Gender', 'Parent name', 'Parent mobile', 'Status', 'Enrolled'],
      list.map((s) => [s.name, s.date_of_birth ?? '', s.gender ?? '', s.parent_name ?? '', s.parent_mobile ?? '', s.status, s.added_at]),
      `students-${centerName}-${todayIso()}`,
    );
    showSnack(`Exported ${list.length} students`, 'success');
  };

  const downloadParentCsv = async () => {
    const data = parents.length
      ? parents
      : await qc.fetchQuery({ queryKey: ['owner', 'parents', centerId], queryFn: () => listOwnerParents(centerId!) });
    downloadCsv(
      ['Name', 'Mobile', 'Email', 'Status', 'Students'],
      data.map((p) => [p.name, p.mobile_number, p.email ?? '', p.status, p.student_count]),
      `parents-${centerName}-${todayIso()}`,
    );
    showSnack(`Exported ${data.length} parents`, 'success');
  };

  const downloadAttendCsv = () => {
    if (!attendData?.length) return;
    const batchName = batches.find((b) => b.id === batchId)?.batch_name ?? 'batch';
    downloadCsv(
      ['Date', 'Student', 'Status'],
      attendData.map((r) => [r.attendance_date, r.student_name, r.status]),
      `attendance-${batchName}-${start}-to-${end}`,
    );
    showSnack(`Exported ${attendData.length} records`, 'success');
  };

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography color="text.secondary">Select a center to view reports.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography fontSize={22} fontWeight={700} color={BRAND.textPrimary}>Reports</Typography>
          <Typography fontSize={13.5} color={BRAND.textSecondary} mt={0.5}>
            {centerName}
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': { fontSize: 13, fontWeight: 600, textTransform: 'none', minHeight: 42 },
          '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
          borderBottom: `1px solid ${BRAND.divider}`,
        }}
      >
        <Tab icon={<EventAvailableRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Attendance" />
        <Tab icon={<SchoolRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Students" />
        <Tab icon={<FamilyRestroomRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Parents" />
        <Tab icon={<CurrencyRupeeRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Finance" />
      </Tabs>

      {/* ── TAB 0: ATTENDANCE ── */}
      {tab === 0 && (
        <Box>
          <Card variant="outlined" sx={{ borderRadius: 2.5, mb: 2.5 }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography fontWeight={700} fontSize={14} mb={2}>Filter</Typography>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={4}>
                  <TextField
                    select fullWidth size="small" label="Batch"
                    value={batchId}
                    onChange={(e) => { setBatchId(e.target.value); setAttendEnabled(false); }}
                  >
                    {batches.length === 0 && <MenuItem value="" disabled>No batches</MenuItem>}
                    {batches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.course_name} — {b.batch_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth size="small" type="date" label="From"
                    value={start}
                    onChange={(e) => { setStart(e.target.value); setAttendEnabled(false); }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth size="small" type="date" label="To"
                    value={end}
                    onChange={(e) => { setEnd(e.target.value); setAttendEnabled(false); }}
                    inputProps={{ max: todayIso() }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth variant="contained"
                    startIcon={attendFetching ? <CircularProgress size={14} color="inherit" /> : <AssessmentRoundedIcon />}
                    disabled={!batchId || attendFetching}
                    onClick={() => { setAttendEnabled(true); loadAttend(); }}
                  >
                    {attendFetching ? 'Loading…' : 'Load Report'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {attendError && (
            <Alert severity="error" sx={{ mb: 2 }}>Failed to load attendance data.</Alert>
          )}

          {attendData && (
            <>
              {/* Summary chips */}
              <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap">
                {(() => {
                  const total   = attendData.length;
                  const present = attendData.filter((r) => r.status === 'Present').length;
                  const absent  = total - present;
                  const pct     = total > 0 ? Math.round((present / total) * 100) : 0;
                  const students = new Set(attendData.map((r) => r.student_name)).size;
                  const dates    = new Set(attendData.map((r) => r.attendance_date)).size;
                  return (
                    <>
                      <Chip size="small" label={`${students} students`} sx={{ fontWeight: 600 }} />
                      <Chip size="small" label={`${dates} sessions`} sx={{ fontWeight: 600 }} />
                      <Chip size="small" label={`${present} Present`} color="success" sx={{ fontWeight: 600 }} />
                      <Chip size="small" label={`${absent} Absent`} color="error" sx={{ fontWeight: 600 }} />
                      <Chip size="small" label={`${pct}% overall`}
                        sx={{ fontWeight: 700, bgcolor: pct >= 75 ? '#dcfce7' : pct >= 50 ? '#fef3c7' : '#fee2e2',
                          color: pct >= 75 ? '#15803d' : pct >= 50 ? '#b45309' : '#dc2626' }} />
                    </>
                  );
                })()}
                <Box flex={1} />
                <Button
                  size="small" variant="outlined"
                  startIcon={<DownloadRoundedIcon />}
                  onClick={downloadAttendCsv}
                  disabled={!attendData.length}
                >
                  Export CSV
                </Button>
              </Stack>

              <AttendancePivot data={attendData} />
            </>
          )}

          {!attendData && !attendFetching && (
            <Box textAlign="center" py={6}>
              <EventAvailableRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">Select a batch and date range, then click Load Report.</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ── TAB 1: STUDENTS ── */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: BRAND.primaryBg, color: BRAND.primary, borderRadius: '10px', width: 36, height: 36 }}>
                <SchoolRoundedIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography fontWeight={700} fontSize={15}>Student Roster</Typography>
                <Typography fontSize={12} color="text.secondary">
                  {studentsLoading ? 'Loading…' : `${students.length} enrolled students`}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadRoundedIcon />}
              onClick={downloadStudentCsv}
              disabled={studentsLoading}
            >
              Export CSV
            </Button>
          </Stack>

          {studentsLoading ? (
            <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
          ) : students.length === 0 ? (
            <Alert severity="info">No students enrolled at this center.</Alert>
          ) : (
            <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, fontSize: 11, color: 'text.secondary' } }}>
                      <TableCell>NAME</TableCell>
                      <TableCell>GENDER</TableCell>
                      <TableCell>DATE OF BIRTH</TableCell>
                      <TableCell>PARENT</TableCell>
                      <TableCell>MOBILE</TableCell>
                      <TableCell>STATUS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{s.name}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{s.gender ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{s.date_of_birth ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{s.parent_name ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{s.parent_mobile ?? '—'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={s.status}
                            color={s.status === 'Active' ? 'success' : 'default'}
                            sx={{ fontSize: 11, height: 20 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </Box>
      )}

      {/* ── TAB 2: PARENTS ── */}
      {tab === 2 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: '#e0f7fa', color: '#06b6d4', borderRadius: '10px', width: 36, height: 36 }}>
                <FamilyRestroomRoundedIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography fontWeight={700} fontSize={15}>Parent Directory</Typography>
                <Typography fontSize={12} color="text.secondary">
                  {parentsLoading ? 'Loading…' : `${parents.length} linked parents`}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadRoundedIcon />}
              onClick={downloadParentCsv}
              disabled={parentsLoading}
            >
              Export CSV
            </Button>
          </Stack>

          {parentsLoading ? (
            <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
          ) : parents.length === 0 ? (
            <Alert severity="info">No parents linked at this center.</Alert>
          ) : (
            <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, fontSize: 11, color: 'text.secondary' } }}>
                      <TableCell>NAME</TableCell>
                      <TableCell>MOBILE</TableCell>
                      <TableCell>EMAIL</TableCell>
                      <TableCell align="center">STUDENTS</TableCell>
                      <TableCell>STATUS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parents.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{p.name}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{p.mobile_number}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{p.email ?? '—'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={p.student_count}
                            sx={{ fontSize: 11, height: 20, bgcolor: BRAND.primaryBg, color: BRAND.primary, fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={p.status}
                            color={p.status === 'Active' ? 'success' : 'default'}
                            sx={{ fontSize: 11, height: 20 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </Box>
      )}

      {/* ── TAB 3: FINANCE ── */}
      {tab === 3 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: '#fef3c7', color: '#d97706', borderRadius: '10px', width: 36, height: 36 }}>
                <CurrencyRupeeRoundedIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography fontWeight={700} fontSize={15}>Fee Summary</Typography>
                <Typography fontSize={12} color="text.secondary">All-time fee collection status</Typography>
              </Box>
            </Box>
          </Stack>

          {feeLoading ? (
            <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
          ) : !feeSummary ? (
            <Alert severity="error">Failed to load fee summary.</Alert>
          ) : (
            <>
              {/* Stat tiles */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatTile
                    label="Total Billed"
                    value={fmt(feeSummary.total_billed)}
                    icon={<AssessmentRoundedIcon />}
                    color={BRAND.primary}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatTile
                    label="Collected"
                    value={fmt(feeSummary.collected)}
                    icon={<TrendingUpRoundedIcon />}
                    color="#22c55e"
                    sub={`${feeSummary.collection_pct}% collection rate`}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatTile
                    label="Outstanding"
                    value={fmt(feeSummary.outstanding)}
                    icon={<HourglassEmptyRoundedIcon />}
                    color="#f59e0b"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatTile
                    label="Overdue"
                    value={fmt(feeSummary.overdue_amount)}
                    icon={<WarningAmberRoundedIcon />}
                    color="#ef4444"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2.5 }} />

              {/* Count breakdown */}
              <Typography fontWeight={700} fontSize={13} mb={1.5} color="text.secondary">
                Fee Count Breakdown
              </Typography>
              <Grid container spacing={1.5}>
                {[
                  { label: 'Paid',          count: feeSummary.paid_count,    color: '#22c55e', bg: '#dcfce7' },
                  { label: 'Pending',       count: feeSummary.pending_count, color: '#f59e0b', bg: '#fef3c7' },
                  { label: 'Partially Paid',count: feeSummary.partial_count, color: '#6366f1', bg: '#ede9fe' },
                  { label: 'Overdue',       count: feeSummary.overdue_count, color: '#ef4444', bg: '#fee2e2' },
                ].map((s) => (
                  <Grid item xs={6} sm={3} key={s.label}>
                    <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', py: 1.5 }}>
                      <Typography fontSize={26} fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                      <Chip
                        size="small"
                        label={s.label}
                        sx={{ mt: 0.5, fontSize: 11, bgcolor: s.bg, color: s.color, fontWeight: 600, height: 20 }}
                      />
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Collection progress bar */}
              <Card variant="outlined" sx={{ borderRadius: 2, mt: 2.5, px: 2.5, py: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16, color: '#22c55e' }} />
                    <Typography fontSize={13} fontWeight={600}>Collection Progress</Typography>
                  </Box>
                  <Typography fontSize={14} fontWeight={800} color={feeSummary.collection_pct >= 80 ? '#22c55e' : feeSummary.collection_pct >= 50 ? '#f59e0b' : '#ef4444'}>
                    {feeSummary.collection_pct}%
                  </Typography>
                </Stack>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                  <Box sx={{
                    height: '100%',
                    width: `${feeSummary.collection_pct}%`,
                    borderRadius: 4,
                    bgcolor: feeSummary.collection_pct >= 80 ? '#22c55e' : feeSummary.collection_pct >= 50 ? '#f59e0b' : '#ef4444',
                    transition: 'width 0.5s ease',
                  }} />
                </Box>
                <Stack direction="row" justifyContent="space-between" mt={0.5}>
                  <Typography fontSize={11} color="text.secondary">{fmt(feeSummary.collected)} collected</Typography>
                  <Typography fontSize={11} color="text.secondary">{fmt(feeSummary.total_billed)} total</Typography>
                </Stack>
              </Card>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
