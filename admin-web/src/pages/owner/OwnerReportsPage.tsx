import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AssessmentRoundedIcon  from '@mui/icons-material/AssessmentRounded';
import SchoolRoundedIcon      from '@mui/icons-material/SchoolRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import FamilyRestroomRoundedIcon from '@mui/icons-material/FamilyRestroomRounded';
import DownloadRoundedIcon    from '@mui/icons-material/DownloadRounded';
import { useQueryClient } from '@tanstack/react-query';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  listOwnerStudents,
  listOwnerParents,
  listOwnerBatches,
  getOwnerBatchAttendanceRange,
} from '../../api/owner.api';
import { downloadCsv } from '../../utils/csv';
import { BRAND } from '../../theme';

const todayIso = () => new Date().toISOString().slice(0, 10);
const sevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
};

function ReportCard({
  icon, color, title, description, children,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ borderRadius: '16px', height: '100%' }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Stack direction="row" gap={1.5} alignItems="center" mb={1.5}>
          <Avatar sx={{
            width: 36, height: 36, bgcolor: color + '15', color,
            borderRadius: '10px',
          }}>
            {icon}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.textPrimary }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
              {description}
            </Typography>
          </Box>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export default function OwnerReportsPage() {
  const { centerId, centers } = useOwnerCenter();
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const centerName = centers.find((c) => c.id === centerId)?.name ?? 'center';

  const [busy, setBusy] = useState<string | null>(null);

  // Attendance report state
  const [batchId, setBatchId] = useState('');
  const [start, setStart]   = useState(sevenDaysAgo());
  const [end, setEnd]       = useState(todayIso());

  /* Batches list, lazily fetched once user lands on this page */
  const fetchBatches = () =>
    qc.fetchQuery({
      queryKey: ['owner', 'batches', centerId],
      queryFn: () => listOwnerBatches(centerId!),
    });

  const downloadStudentRoster = async () => {
    if (!centerId) return;
    setBusy('students');
    try {
      const data = await qc.fetchQuery({
        queryKey: ['owner', 'students', centerId],
        queryFn: () => listOwnerStudents(centerId),
      });
      downloadCsv(
        ['Name', 'Date of birth', 'Gender', 'Parent name', 'Parent mobile', 'Status', 'Enrolled'],
        data.map((s) => [
          s.name,
          s.date_of_birth ?? '',
          s.gender ?? '',
          s.parent_name ?? '',
          s.parent_mobile ?? '',
          s.status,
          s.added_at,
        ]),
        `students-${centerName}-${todayIso()}`,
      );
      showSnack(`Exported ${data.length} students`, 'success');
    } catch (e) {
      showSnack((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const downloadParentDirectory = async () => {
    if (!centerId) return;
    setBusy('parents');
    try {
      const data = await qc.fetchQuery({
        queryKey: ['owner', 'parents', centerId],
        queryFn: () => listOwnerParents(centerId),
      });
      downloadCsv(
        ['Name', 'Mobile', 'Email', 'Status', 'Students'],
        data.map((p) => [p.name, p.mobile_number, p.email ?? '', p.status, p.student_count]),
        `parents-${centerName}-${todayIso()}`,
      );
      showSnack(`Exported ${data.length} parents`, 'success');
    } catch (e) {
      showSnack((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const downloadAttendanceRange = async () => {
    if (!centerId || !batchId) return;
    if (start > end) {
      showSnack('Start date must be before end date', 'error');
      return;
    }
    setBusy('attendance');
    try {
      const data = await getOwnerBatchAttendanceRange(centerId, batchId, start, end);
      const batches = qc.getQueryData<Awaited<ReturnType<typeof listOwnerBatches>>>(['owner', 'batches', centerId]);
      const batchName = batches?.find((b) => b.id === batchId)?.batch_name ?? 'batch';
      downloadCsv(
        ['Date', 'Student', 'Status'],
        data.map((r) => [r.attendance_date, r.student_name, r.status]),
        `attendance-${batchName}-${start}-to-${end}`,
      );
      showSnack(`Exported ${data.length} attendance records`, 'success');
    } catch (e) {
      showSnack((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography sx={{ color: BRAND.textSecondary }}>
            Select a center to generate reports.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const batches = qc.getQueryData<Awaited<ReturnType<typeof listOwnerBatches>>>(['owner', 'batches', centerId]) ?? [];

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
          Reports
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
          {centerName} &middot; download CSV exports for spreadsheets and audits
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <ReportCard
            icon={<SchoolRoundedIcon sx={{ fontSize: 20 }} />}
            color={BRAND.primary}
            title="Student roster"
            description="Every enrolled student at this center"
          >
            <Button
              variant="contained"
              fullWidth
              startIcon={<DownloadRoundedIcon />}
              onClick={downloadStudentRoster}
              disabled={busy === 'students'}
              sx={{ mt: 1 }}
            >
              {busy === 'students' ? 'Preparing…' : 'Download CSV'}
            </Button>
          </ReportCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ReportCard
            icon={<FamilyRestroomRoundedIcon sx={{ fontSize: 20 }} />}
            color="#06B6D4"
            title="Parent directory"
            description="Linked parents, mobile numbers, and student counts"
          >
            <Button
              variant="contained"
              fullWidth
              startIcon={<DownloadRoundedIcon />}
              onClick={downloadParentDirectory}
              disabled={busy === 'parents'}
              sx={{ mt: 1 }}
            >
              {busy === 'parents' ? 'Preparing…' : 'Download CSV'}
            </Button>
          </ReportCard>
        </Grid>

        <Grid item xs={12}>
          <ReportCard
            icon={<EventAvailableRoundedIcon sx={{ fontSize: 20 }} />}
            color="#22C55E"
            title="Attendance range"
            description="All Present/Absent records for one batch over a date range"
          >
            <Grid container spacing={2} mt={0}>
              <Grid item xs={12} sm={5}>
                <TextField
                  select
                  fullWidth
                  label="Batch"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  onFocus={() => batches.length === 0 && fetchBatches()}
                  helperText={batches.length === 0 ? 'Click to load batches' : undefined}
                >
                  {batches.length === 0 && (
                    <MenuItem value="" disabled>Loading…</MenuItem>
                  )}
                  {batches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.course_name} — {b.batch_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="End"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  inputProps={{ max: todayIso() }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<DownloadRoundedIcon />}
                  onClick={downloadAttendanceRange}
                  disabled={!batchId || busy === 'attendance'}
                  sx={{ height: '100%' }}
                >
                  {busy === 'attendance' ? '…' : 'Export'}
                </Button>
              </Grid>
            </Grid>
          </ReportCard>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ borderRadius: '16px', bgcolor: BRAND.surface, border: `1px dashed ${BRAND.divider}` }}>
            <CardContent sx={{ p: '20px !important', display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar sx={{
                width: 36, height: 36, bgcolor: BRAND.primaryBg, color: BRAND.primary,
                borderRadius: '10px',
              }}>
                <AssessmentRoundedIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: BRAND.textPrimary }}>
                  More reports coming
                </Typography>
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                  PDF exports and revenue summaries land in the next release. CSVs above open
                  cleanly in Excel, Google Sheets, and Numbers.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
