import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import AddRoundedIcon       from '@mui/icons-material/AddRounded';
import ClassRoundedIcon     from '@mui/icons-material/ClassRounded';
import MapPicker                from '../common/MapPicker';
import EditRoundedIcon          from '@mui/icons-material/EditRounded';
import SaveRoundedIcon          from '@mui/icons-material/SaveRounded';
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded';
import LocationOnRoundedIcon    from '@mui/icons-material/LocationOnRounded';
import PhoneRoundedIcon         from '@mui/icons-material/PhoneRounded';
import EmailRoundedIcon         from '@mui/icons-material/EmailRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ScheduleRoundedIcon      from '@mui/icons-material/ScheduleRounded';
import PeopleRoundedIcon        from '@mui/icons-material/PeopleRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import LanguageRoundedIcon      from '@mui/icons-material/LanguageRounded';
import ShareRoundedIcon         from '@mui/icons-material/ShareRounded';
import ArticleRoundedIcon       from '@mui/icons-material/ArticleRounded';
import WarningAmberRoundedIcon  from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon   from '@mui/icons-material/CheckCircleRounded';
import OpenInNewRoundedIcon     from '@mui/icons-material/OpenInNewRounded';
import StickyNote2RoundedIcon   from '@mui/icons-material/StickyNote2Rounded';
import CameraAltRoundedIcon     from '@mui/icons-material/CameraAltRounded';
import MarkunreadMailboxRoundedIcon from '@mui/icons-material/MarkunreadMailboxRounded';
import SchoolRoundedIcon           from '@mui/icons-material/SchoolRounded';
import PersonRemoveRoundedIcon     from '@mui/icons-material/PersonRemoveRounded';
import ExpandMoreRoundedIcon       from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon       from '@mui/icons-material/ExpandLessRounded';
import PersonSearchRoundedIcon     from '@mui/icons-material/PersonSearchRounded';
import EventNoteRoundedIcon        from '@mui/icons-material/EventNoteRounded';
import CheckRoundedIcon            from '@mui/icons-material/CheckRounded';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveCenter,
  assignOwner,
  getCenterBatches,
  getCenterParents,
  getCenterStudents,
  getCenterUsers,
  getBatchStudents,
  addBatchStudent,
  removeBatchStudent,
  getBatchAttendance,
  markBatchAttendance,
  rejectCenter,
  reinstateCenter,
  reviewCenter,
  suspendCenter,
  updateCenter,
  uploadCenterLogo,
  type AttendanceRecord,
  type Batch,
  type BatchStudent,
  type CenterDetail,
  type CenterParent,
  type CenterUpdatePayload,
} from '../../api/centers.api';
import { unenrollStudent } from '../../api/students.api';
import AddUserModal      from './AddUserModal';
import AddBatchModal     from './AddBatchModal';
import MapStudentModal   from './MapStudentModal';
import { getMasterData } from '../../api/masterData.api';
import { getUsers, type UserSummary } from '../../api/users.api';
import StatusChip        from '../common/StatusChip';
import ImageCropModal    from '../common/ImageCropModal';
import RejectReasonModal from './RejectReasonModal';
import { useSnackbar }   from '../../contexts/SnackbarContext';
import { BRAND }         from '../../theme';

interface Props {
  center: CenterDetail;
  onActionComplete?: () => void;
}

/* ── Category → cover gradient ── */
const CATEGORY_COLORS: Record<string, [string, string]> = {
  Tuition:         ['#1E3A5F', '#2D5282'],
  Daycare:         ['#065F46', '#0D7857'],
  KidsSchool:      ['#4C1D95', '#6D28D9'],
  PlaySchool:      ['#7C3AED', '#A855F7'],
  Dance:           ['#9D174D', '#DB2777'],
  Bharatanatyam:   ['#9D174D', '#DB2777'],
  Music:           ['#1E40AF', '#3B82F6'],
  CarnaticMusic:   ['#1E40AF', '#2563EB'],
  WesternMusic:    ['#1D4ED8', '#3B82F6'],
  KeyboardPiano:   ['#0F172A', '#1E3A5F'],
  Guitar:          ['#78350F', '#D97706'],
  ArtPainting:     ['#92400E', '#D97706'],
  DrawingSketching:['#92400E', '#B45309'],
  Abacus:          ['#1F2937', '#374151'],
  VedicMaths:      ['#1F2937', '#4B5563'],
  SpokenEnglish:   ['#0369A1', '#0EA5E9'],
  LanguageClasses: ['#0369A1', '#0284C7'],
  YogaActivity:    ['#065F46', '#059669'],
  Karate:          ['#7F1D1D', '#DC2626'],
  Swimming:        ['#0C4A6E', '#0284C7'],
  Chess:           ['#1C1917', '#44403C'],
  RoboticsCoding:  ['#1E1B4B', '#4338CA'],
  Phonics:         ['#164E63', '#0891B2'],
  Montessori:      ['#14532D', '#16A34A'],
  CookingClasses:  ['#7C2D12', '#EA580C'],
  CraftDIY:        ['#4A1D96', '#7C3AED'],
  TheatreDrama:    ['#831843', '#BE185D'],
};

/* ── small info row ── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <Stack direction="row" alignItems="flex-start" gap={1.5}>
      <Box sx={{ color: BRAND.textSecondary, mt: 0.15, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: 10, color: BRAND.textSecondary, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 13, color: BRAND.textPrimary, mt: 0.2 }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

/* ── section heading ── */
function SectionTitle({ children }: { children: string }) {
  return (
    <Typography sx={{
      fontSize: 10, fontWeight: 700, color: BRAND.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5,
    }}>
      {children}
    </Typography>
  );
}

/* ── document card ── */
function DocCard({ label, url }: { label: string; url: string }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      p: 1.5, borderRadius: 1.5,
      border: `1px solid ${BRAND.divider}`, bgcolor: '#FAFCFF',
    }}>
      <Stack direction="row" alignItems="center" gap={1.25}>
        <Box sx={{
          width: 30, height: 30, borderRadius: 1,
          bgcolor: 'rgba(34,197,94,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ArticleRoundedIcon sx={{ fontSize: 15, color: '#16A34A' }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: BRAND.textPrimary }}>{label}</Typography>
          <Stack direction="row" alignItems="center" gap={0.4}>
            <CheckCircleRoundedIcon sx={{ fontSize: 11, color: '#16A34A' }} />
            <Typography sx={{ fontSize: 11, color: '#16A34A' }}>Uploaded</Typography>
          </Stack>
        </Box>
      </Stack>
      <Tooltip title="Open document">
        <IconButton size="small" component="a" href={url} target="_blank" rel="noopener"
          sx={{ color: BRAND.primary }}>
          <OpenInNewRoundedIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

/* ── facilities chips display ── */
function FacilityChips({ value }: { value: string | null }) {
  if (!value) return null;
  const items = value.split(',').map((s) => s.trim()).filter(Boolean);
  if (!items.length) return null;
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75}>
      {items.map((f) => (
        <Chip key={f} label={f.replace(/([A-Z])/g, ' $1').trim()} size="small"
          sx={{
            height: 22, fontSize: 11, fontWeight: 500,
            bgcolor: `${BRAND.primary}0F`, color: BRAND.textPrimary,
            border: `1px solid ${BRAND.divider}`,
          }} />
      ))}
    </Stack>
  );
}

/* ─────────────────────────────────────────────────
   BATCH CARD  (self-contained: fetches + manages its own students + attendance)
───────────────────────────────────────────────── */
function BatchCard({ batch, centerId }: { batch: Batch; centerId: string }) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  // ── section panel: 'students' | 'attendance' | null
  const [panel, setPanel]               = useState<'students' | 'attendance' | null>(null);
  const [editOpen, setEditOpen]         = useState(false);
  const [addOpen, setAddOpen]           = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<BatchStudent | null>(null);

  // ── Attendance state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [attDate, setAttDate]           = useState(todayStr);
  // local map: student_id → 'Present' | 'Absent'
  const [attMap, setAttMap]             = useState<Record<string, 'Present' | 'Absent'>>({});
  const [attDirty, setAttDirty]         = useState(false);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['batch-students', batch.id],
    queryFn: () => getBatchStudents(centerId, batch.id),
    enabled: panel === 'students',
  });

  const { data: centerStudents = [], isFetching: searching } = useQuery({
    queryKey: ['center-students-search', centerId, studentSearch],
    queryFn: () => getCenterStudents(centerId, studentSearch),
    enabled: addOpen && studentSearch.length >= 2,
  });

  const { data: attRecords = [], isFetching: attLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['batch-attendance', batch.id, attDate],
    queryFn: () => getBatchAttendance(centerId, batch.id, attDate),
    enabled: panel === 'attendance',
  });

  // Sync fetched records into local attMap whenever the date or records change
  useEffect(() => {
    if (panel !== 'attendance') return;
    const next: Record<string, 'Present' | 'Absent'> = {};
    attRecords.forEach((r) => {
      if (r.attendance_status) next[r.student_id] = r.attendance_status;
    });
    setAttMap(next);
    setAttDirty(false);
  }, [attRecords, panel]);

  const addMut = useMutation({
    mutationFn: () => addBatchStudent(centerId, batch.id, selectedStudent!.student_id),
    onSuccess: (d) => {
      showSnack(d.message, 'success');
      qc.invalidateQueries({ queryKey: ['batch-students', batch.id] });
      setSelectedStudent(null); setStudentSearch(''); setAddOpen(false);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const removeMut = useMutation({
    mutationFn: (studentId: string) => removeBatchStudent(centerId, batch.id, studentId),
    onSuccess: (d) => {
      showSnack(d.message, 'success');
      qc.invalidateQueries({ queryKey: ['batch-students', batch.id] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const saveAttMut = useMutation({
    mutationFn: () =>
      markBatchAttendance(centerId, batch.id, {
        date: attDate,
        records: attRecords.map((r) => ({
          student_id: r.student_id,
          status: attMap[r.student_id] ?? 'Absent',
        })),
      }),
    onSuccess: (d) => {
      showSnack(d.message, 'success');
      qc.invalidateQueries({ queryKey: ['batch-attendance', batch.id, attDate] });
      setAttDirty(false);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const markAll = (status: 'Present' | 'Absent') => {
    const next: Record<string, 'Present' | 'Absent'> = {};
    attRecords.forEach((r) => { next[r.student_id] = status; });
    setAttMap(next);
    setAttDirty(true);
  };

  const togglePanel = (p: 'students' | 'attendance') =>
    setPanel((prev) => (prev === p ? null : p));

  const presentCount = attRecords.filter((r) => attMap[r.student_id] === 'Present').length;
  const absentCount  = attRecords.length - presentCount;

  return (
    <Box sx={{
      borderRadius: 2.5, border: `1px solid ${BRAND.divider}`, bgcolor: '#FAFBFC',
      overflow: 'hidden',
      '&:hover': { borderColor: `${BRAND.primary}40`, boxShadow: '0 2px 10px rgba(15,30,53,0.07)' },
      transition: 'all .15s',
    }}>
      {/* ── Batch header ── */}
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="flex-start" gap={1}>
          <Box flex={1} minWidth={0}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: BRAND.textPrimary }}>
                {batch.course_name}
              </Typography>
              <Chip label={batch.batch_name} size="small" sx={{ height: 18, fontSize: 11, fontWeight: 600, bgcolor: BRAND.primaryBg, color: BRAND.primary }} />
              {batch.category_type && (
                <Chip label={batch.category_type} size="small" sx={{ height: 18, fontSize: 11, bgcolor: 'rgba(139,92,246,0.1)', color: '#7C3AED' }} />
              )}
              {!batch.is_active && (
                <Chip label="Inactive" size="small" sx={{ height: 18, fontSize: 11, bgcolor: 'rgba(156,163,175,0.15)', color: '#6B7280' }} />
              )}
            </Stack>
            <Stack direction="row" gap={2.5} mt={0.75} flexWrap="wrap">
              <Stack direction="row" alignItems="center" gap={0.5}>
                <CalendarMonthRoundedIcon sx={{ fontSize: 12, color: BRAND.textSecondary }} />
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>{batch.class_days.split(',').join(' · ')}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" gap={0.5}>
                <ScheduleRoundedIcon sx={{ fontSize: 12, color: BRAND.textSecondary }} />
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>{batch.start_time} – {batch.end_time}</Typography>
              </Stack>
              {batch.teacher_name && (
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <PeopleRoundedIcon sx={{ fontSize: 12, color: BRAND.textSecondary }} />
                  <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>{batch.teacher_name}</Typography>
                </Stack>
              )}
            </Stack>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" gap={0.5} justifyContent="flex-end" mb={0.5}>
              <Tooltip title="Edit batch">
                <IconButton size="small" onClick={() => setEditOpen(true)}
                  sx={{ color: BRAND.textSecondary, '&:hover': { bgcolor: BRAND.primaryBg, color: BRAND.primary } }}>
                  <EditRoundedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.25} justifyContent="flex-end">
              <CurrencyRupeeRoundedIcon sx={{ fontSize: 13, color: BRAND.textPrimary }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.textPrimary }}>
                {batch.fee_amount.toLocaleString('en-IN')}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 10, color: BRAND.textSecondary, mt: 0.2 }}>per month</Typography>
            {batch.strength_limit && (
              <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, mt: 0.5 }}>
                Max {batch.strength_limit}
              </Typography>
            )}
          </Box>
        </Stack>

        {/* ── Toggle buttons row ── */}
        <Stack direction="row" gap={1} mt={1.5}>
          <Box
            onClick={() => togglePanel('students')}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer',
              color: panel === 'students' ? BRAND.primary : BRAND.textSecondary,
              fontWeight: panel === 'students' ? 700 : 500,
            }}
          >
            <SchoolRoundedIcon sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 'inherit', color: 'inherit' }}>
              Students
            </Typography>
            {panel === 'students'
              ? <ExpandLessRoundedIcon sx={{ fontSize: 16 }} />
              : <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />}
          </Box>

          <Box sx={{ width: 1, bgcolor: BRAND.divider, mx: 0.5 }} />

          <Box
            onClick={() => togglePanel('attendance')}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer',
              color: panel === 'attendance' ? BRAND.primary : BRAND.textSecondary,
              fontWeight: panel === 'attendance' ? 700 : 500,
            }}
          >
            <EventNoteRoundedIcon sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 'inherit', color: 'inherit' }}>
              Attendance
            </Typography>
            {panel === 'attendance'
              ? <ExpandLessRoundedIcon sx={{ fontSize: 16 }} />
              : <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />}
          </Box>
        </Stack>
      </Box>

      {/* ── Students section ── */}
      <Collapse in={panel === 'students'}>
        <Divider sx={{ borderColor: BRAND.divider }} />
        <Box sx={{ p: 2, bgcolor: '#F8FAFC' }}>

          {addOpen ? (
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, border: `1px solid ${BRAND.divider}`, bgcolor: '#fff' }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <PersonSearchRoundedIcon sx={{ fontSize: 16, color: BRAND.primary }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: BRAND.textPrimary }}>
                  Add student to batch
                </Typography>
                <Box flex={1} />
                <IconButton size="small" onClick={() => { setAddOpen(false); setSelectedStudent(null); setStudentSearch(''); }}>
                  <CloseRoundedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Stack>
              <Stack direction="row" gap={1} alignItems="flex-start">
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={centerStudents}
                  getOptionLabel={(s) => s.name}
                  filterOptions={(x) => x}
                  loading={searching}
                  value={selectedStudent}
                  onChange={(_, v) => { setSelectedStudent(v); setStudentSearch(v?.name ?? ''); }}
                  inputValue={studentSearch}
                  onInputChange={(_, v, reason) => { if (reason !== 'reset') { setStudentSearch(v); if (!v) setSelectedStudent(null); } }}
                  noOptionsText={studentSearch.length < 2 ? 'Type 2+ chars…' : 'No students found'}
                  renderOption={(props, s) => (
                    <Box component="li" {...props} key={s.student_id}>
                      <Stack direction="row" alignItems="center" gap={1} py={0.25}>
                        <Avatar sx={{ width: 26, height: 26, fontSize: 10, fontWeight: 700, bgcolor: BRAND.primaryBg, color: BRAND.primary }}>
                          {s.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.name}</Typography>
                          {s.parent_name && <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>Parent: {s.parent_name}</Typography>}
                        </Box>
                      </Stack>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Search student name…"
                      InputProps={{ ...params.InputProps, endAdornment: <>{searching && <CircularProgress size={12} />}{params.InputProps.endAdornment}</> }}
                    />
                  )}
                />
                <Button
                  variant="contained" size="small"
                  disabled={!selectedStudent || addMut.isPending}
                  onClick={() => addMut.mutate()}
                  startIcon={addMut.isPending ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <PersonAddRoundedIcon sx={{ fontSize: 14 }} />}
                  sx={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, fontSize: 12, py: 0.75, whiteSpace: 'nowrap' }}
                >
                  Add
                </Button>
              </Stack>
            </Box>
          ) : (
            <Button size="small" startIcon={<PersonAddRoundedIcon sx={{ fontSize: 14 }} />}
              onClick={() => setAddOpen(true)}
              sx={{ mb: 1.5, fontSize: 12, color: BRAND.primary, fontWeight: 600, p: '4px 10px',
                border: `1px dashed ${BRAND.primary}60`, borderRadius: 1.5,
                '&:hover': { bgcolor: BRAND.primaryBg } }}>
              Add Student
            </Button>
          )}

          {studentsLoading ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={22} sx={{ color: BRAND.primary }} />
            </Box>
          ) : students.length === 0 ? (
            <Box sx={{ py: 2.5, textAlign: 'center' }}>
              <SchoolRoundedIcon sx={{ fontSize: 28, color: BRAND.divider, mb: 0.5 }} />
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>No students assigned to this batch yet</Typography>
            </Box>
          ) : (
            <Stack gap={1}>
              {students.map((s) => (
                <Box key={s.batch_student_id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  p: 1.25, borderRadius: 1.5, bgcolor: '#fff',
                  border: `1px solid ${BRAND.divider}`,
                }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700,
                    bgcolor: BRAND.primaryBg, color: BRAND.primary, flexShrink: 0 }}>
                    {s.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }} noWrap>
                      {s.name}
                    </Typography>
                    <Stack direction="row" gap={1.5} flexWrap="wrap">
                      {s.parent_name && (
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                          Parent: {s.parent_name}
                        </Typography>
                      )}
                      {s.gender && (
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{s.gender}</Typography>
                      )}
                      {s.date_of_birth && (
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                          DOB: {new Date(s.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                  <Tooltip title="Remove from batch">
                    <IconButton size="small" onClick={() => removeMut.mutate(s.student_id)}
                      disabled={removeMut.isPending}
                      sx={{ color: '#EF4444', '&:hover': { bgcolor: '#FEE2E2' }, flexShrink: 0 }}>
                      <PersonRemoveRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
              <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, mt: 0.5, textAlign: 'right' }}>
                {students.length} student{students.length !== 1 ? 's' : ''} enrolled
                {batch.strength_limit ? ` · ${batch.strength_limit - students.length} seat${batch.strength_limit - students.length !== 1 ? 's' : ''} remaining` : ''}
              </Typography>
            </Stack>
          )}
        </Box>
      </Collapse>

      {/* ── Attendance section ── */}
      <Collapse in={panel === 'attendance'}>
        <Divider sx={{ borderColor: BRAND.divider }} />
        <Box sx={{ p: 2, bgcolor: '#F8FAFC' }}>

          {/* Date picker + Mark All row */}
          <Stack direction="row" alignItems="center" gap={1.5} mb={2} flexWrap="wrap">
            <TextField
              type="date"
              size="small"
              value={attDate}
              onChange={(e) => {
                setAttDate(e.target.value);
                setAttDirty(false);
              }}
              inputProps={{ max: todayStr }}
              sx={{ width: 170 }}
            />
            {attRecords.length > 0 && !attLoading && (
              <>
                <Button size="small" variant="outlined"
                  onClick={() => markAll('Present')}
                  sx={{ fontSize: 11, borderColor: '#16A34A', color: '#16A34A',
                    '&:hover': { bgcolor: 'rgba(22,163,74,0.06)', borderColor: '#16A34A' }, py: 0.5 }}>
                  All Present
                </Button>
                <Button size="small" variant="outlined"
                  onClick={() => markAll('Absent')}
                  sx={{ fontSize: 11, borderColor: '#EF4444', color: '#EF4444',
                    '&:hover': { bgcolor: 'rgba(239,68,68,0.06)', borderColor: '#EF4444' }, py: 0.5 }}>
                  All Absent
                </Button>
              </>
            )}
            <Box flex={1} />
            {attRecords.length > 0 && !attLoading && (
              <Stack direction="row" gap={1} alignItems="center">
                <Typography sx={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>
                  {presentCount} P
                </Typography>
                <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>·</Typography>
                <Typography sx={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>
                  {absentCount} A
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Student attendance rows */}
          {attLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={22} sx={{ color: BRAND.primary }} />
            </Box>
          ) : attRecords.length === 0 ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <EventNoteRoundedIcon sx={{ fontSize: 28, color: BRAND.divider, mb: 0.5 }} />
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                No students in this batch yet
              </Typography>
            </Box>
          ) : (
            <Stack gap={0.75}>
              {attRecords.map((r) => {
                const status = attMap[r.student_id] ?? null;
                const isPresent = status === 'Present';
                const isAbsent  = status === 'Absent';
                return (
                  <Box key={r.student_id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    p: 1.25, borderRadius: 1.5, bgcolor: '#fff',
                    border: `1px solid ${
                      isPresent ? 'rgba(22,163,74,0.3)'
                      : isAbsent ? 'rgba(239,68,68,0.25)'
                      : BRAND.divider
                    }`,
                    transition: 'border-color .12s',
                  }}>
                    <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 700, flexShrink: 0,
                      bgcolor: isPresent ? 'rgba(22,163,74,0.12)'
                        : isAbsent ? 'rgba(239,68,68,0.1)'
                        : BRAND.primaryBg,
                      color: isPresent ? '#16A34A' : isAbsent ? '#EF4444' : BRAND.primary,
                    }}>
                      {isPresent ? <CheckRoundedIcon sx={{ fontSize: 15 }} /> : r.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: BRAND.textPrimary }} noWrap>
                        {r.name}
                      </Typography>
                      {r.parent_name && (
                        <Typography sx={{ fontSize: 10.5, color: BRAND.textSecondary }}>
                          {r.parent_name}
                        </Typography>
                      )}
                    </Box>
                    {/* Present / Absent toggle */}
                    <Stack direction="row" gap={0.5}>
                      <Button size="small"
                        variant={isPresent ? 'contained' : 'outlined'}
                        onClick={() => { setAttMap(p => ({ ...p, [r.student_id]: 'Present' })); setAttDirty(true); }}
                        sx={{
                          fontSize: 11, py: 0.3, px: 1.25, minWidth: 0,
                          ...(isPresent
                            ? { bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, color: '#fff', borderColor: '#16A34A' }
                            : { borderColor: 'rgba(22,163,74,0.4)', color: '#16A34A',
                                '&:hover': { bgcolor: 'rgba(22,163,74,0.06)', borderColor: '#16A34A' } }),
                        }}
                      >
                        P
                      </Button>
                      <Button size="small"
                        variant={isAbsent ? 'contained' : 'outlined'}
                        onClick={() => { setAttMap(p => ({ ...p, [r.student_id]: 'Absent' })); setAttDirty(true); }}
                        sx={{
                          fontSize: 11, py: 0.3, px: 1.25, minWidth: 0,
                          ...(isAbsent
                            ? { bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, color: '#fff', borderColor: '#EF4444' }
                            : { borderColor: 'rgba(239,68,68,0.35)', color: '#EF4444',
                                '&:hover': { bgcolor: 'rgba(239,68,68,0.06)', borderColor: '#EF4444' } }),
                        }}
                      >
                        A
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}

          {/* Save button */}
          {attRecords.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="small"
                disabled={!attDirty || saveAttMut.isPending}
                onClick={() => saveAttMut.mutate()}
                startIcon={saveAttMut.isPending
                  ? <CircularProgress size={12} sx={{ color: '#fff' }} />
                  : <SaveRoundedIcon sx={{ fontSize: 14 }} />}
                sx={{
                  background: attDirty
                    ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`
                    : undefined,
                  fontSize: 12, px: 2,
                }}
              >
                {saveAttMut.isPending ? 'Saving…' : 'Save Attendance'}
              </Button>
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Edit batch modal */}
      <AddBatchModal
        open={editOpen}
        centerId={centerId}
        onClose={() => setEditOpen(false)}
        editBatch={batch}
      />
    </Box>
  );
}

export default function CenterDetailPanel({ center, onActionComplete }: Props) {
  const qc = useQueryClient();
  const { showSnack }   = useSnackbar();
  const [tab, setTab]                     = useState(0);
  const [editing, setEditing]             = useState(false);
  const [rejectOpen, setRejectOpen]       = useState(false);
  const [suspendOpen, setSuspendOpen]     = useState(false);
  const [addUserOpen, setAddUserOpen]     = useState(false);
  const [addBatchOpen, setAddBatchOpen]   = useState(false);
  const [mapStudentOpen, setMapStudentOpen] = useState(false);
  const [form, setForm]                   = useState<CenterUpdatePayload>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoProgress, setLogoProgress]   = useState(0);
  const [logoPreview, setLogoPreview]     = useState<string | null>(null);
  const [cropSrc, setCropSrc]             = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Master data for dropdowns ── */
  const { data: mdCategories   = [] } = useQuery({ queryKey: ['master-data', 'category',       false], queryFn: () => getMasterData('category') });
  const { data: mdAgGroups     = [] } = useQuery({ queryKey: ['master-data', 'age_group',      false], queryFn: () => getMasterData('age_group') });
  const { data: mdOpDays       = [] } = useQuery({ queryKey: ['master-data', 'operating_days', false], queryFn: () => getMasterData('operating_days') });
  const { data: mdFeeRanges    = [] } = useQuery({ queryKey: ['master-data', 'fee_range',      false], queryFn: () => getMasterData('fee_range') });
  const { data: mdFacilities   = [] } = useQuery({ queryKey: ['master-data', 'facilities',     false], queryFn: () => getMasterData('facilities') });
  const { data: mdCities       = [] } = useQuery({ queryKey: ['master-data', 'city',           false], queryFn: () => getMasterData('city') });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['centers'] });
    qc.invalidateQueries({ queryKey: ['center', center.id] });
    onActionComplete?.();
  };

  const reviewMut    = useMutation({ mutationFn: () => reviewCenter(center.id),    onSuccess: () => { showSnack('Moved to Under Review', 'success'); invalidate(); } });
  const approveMut   = useMutation({
    mutationFn: () => approveCenter(center.id),
    onSuccess: () => { showSnack('Center approved', 'success'); invalidate(); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });
  const reinstateMut = useMutation({ mutationFn: () => reinstateCenter(center.id), onSuccess: () => { showSnack('Center reinstated', 'success'); invalidate(); } });
  const rejectMut    = useMutation({
    mutationFn: (d: { rejection_category: string; rejection_reason: string }) => rejectCenter(center.id, d),
    onSuccess: () => { showSnack('Center rejected'); invalidate(); setRejectOpen(false); },
  });
  const suspendMut   = useMutation({
    mutationFn: (reason: string) => suspendCenter(center.id, { reason }),
    onSuccess: () => { showSnack('Center suspended'); invalidate(); setSuspendOpen(false); },
  });
  const updateMut    = useMutation({
    mutationFn: async () => {
      await updateCenter(center.id, form);
      // If a new owner was selected in the edit form, also link them as owner
      if (selectedOwner?.id) {
        await assignOwner(center.id, selectedOwner.id);
      }
    },
    onSuccess: () => {
      showSnack('Center updated', 'success');
      setEditing(false);
      setSelectedOwner(null);
      setOwnerSearch('');
      qc.invalidateQueries({ queryKey: ['center', center.id] });
      qc.invalidateQueries({ queryKey: ['centers'] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  // ── Assign owner dialog ──
  const [ownerDialogOpen, setOwnerDialogOpen]     = useState(false);
  const [dialogSearch, setDialogSearch]           = useState('');
  const [dialogOwner, setDialogOwner]             = useState<UserSummary | null>(null);

  useEffect(() => {
    if (ownerDialogOpen) { setDialogSearch(''); setDialogOwner(null); }
  }, [ownerDialogOpen]);

  const { data: dialogResults = [], isFetching: dialogLoading } = useQuery({
    queryKey: ['user-search-dialog', dialogSearch],
    queryFn: () => getUsers({ search: dialogSearch, status: 'Active', role: 'Owner', size: 20 }).then(r => r.items),
    enabled: dialogSearch.length >= 2,
  });

  // ── Edit form owner search (separate state) ──
  const [ownerSearch, setOwnerSearch]           = useState('');
  const [selectedOwner, setSelectedOwner]       = useState<UserSummary | null>(null);

  const { data: ownerSearchResults = [], isFetching: ownerSearchLoading } = useQuery({
    queryKey: ['user-search-edit', ownerSearch],
    queryFn: () => getUsers({ search: ownerSearch, status: 'Active', role: 'Owner', size: 20 }).then(r => r.items),
    enabled: ownerSearch.length >= 2,
  });

  const assignOwnerMut = useMutation({
    mutationFn: () => {
      if (!dialogOwner?.id) throw new Error('No user selected');
      return assignOwner(center.id, dialogOwner.id);
    },
    onSuccess: (d) => {
      showSnack(d.message, 'success');
      setOwnerDialogOpen(false);
      // Invalidate and let the page re-render with updated owner — do NOT navigate away
      qc.invalidateQueries({ queryKey: ['center', center.id] });
      qc.invalidateQueries({ queryKey: ['centers'] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['center-users', center.id],
    queryFn: () => getCenterUsers(center.id),
    enabled: tab === 1,
  });

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['center-batches', center.id],
    queryFn: () => getCenterBatches(center.id),
    enabled: tab === 2,
  });

  const { data: enrolledStudents = [], isLoading: enrolledLoading } = useQuery({
    queryKey: ['center-enrolled-students', center.id],
    queryFn: () => getCenterStudents(center.id),
    enabled: tab === 3,
  });

  const unenrollMut = useMutation({
    mutationFn: (studentId: string) => unenrollStudent(studentId, center.id),
    onSuccess: (d) => {
      showSnack(d.message, 'success');
      qc.invalidateQueries({ queryKey: ['center-enrolled-students', center.id] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const { data: centerParents = [], isLoading: parentsLoading } = useQuery({
    queryKey: ['center-parents', center.id],
    queryFn: () => getCenterParents(center.id),
    enabled: tab === 4,
  });

  const isActionLoading =
    reviewMut.isPending || approveMut.isPending || rejectMut.isPending ||
    suspendMut.isPending || reinstateMut.isPending;

  const startEdit = () => {
    setForm({
      name:              center.name,
      category:          center.category,
      owner_name:        center.owner_name,
      mobile_number:     center.mobile_number,
      address:           center.address,
      city:              center.city,
      state:             center.state ?? 'Tamil Nadu',
      pincode:           center.pincode ?? '',
      operating_days:    center.operating_days,
      operating_timings: center.operating_timings,
      age_group:         center.age_group,
      fee_range:         center.fee_range ?? '',
      facilities:        center.facilities ?? '',
      description:       center.description ?? '',
      website_link:      center.website_link ?? '',
      social_link:       center.social_link ?? '',
      admin_notes:       center.admin_notes ?? '',
      latitude:          center.latitude,
      longitude:         center.longitude,
    });
    // Pre-fill owner search with current owner name so it's visible in the field
    if (center.owner_user_name || center.owner_name) {
      setOwnerSearch(center.owner_user_name ?? center.owner_name);
    }
    setSelectedOwner(null);
    setEditing(true);
  };

  /* ── Logo handlers ── */
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showSnack('Please select an image file', 'error'); return; }
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleCropDone = async (file: File, preview: string, sizeKb: number) => {
    setCropSrc(null);
    setLogoPreview(preview);
    setLogoUploading(true);
    setLogoProgress(0);
    try {
      const timer = setInterval(() => setLogoProgress((p) => Math.min(p + 25, 90)), 120);
      const url   = await uploadCenterLogo(center.id, file);
      clearInterval(timer);
      setLogoProgress(100);
      setLogoPreview(url);
      qc.invalidateQueries({ queryKey: ['center', center.id] });
      qc.invalidateQueries({ queryKey: ['centers'] });
      showSnack(`Logo saved · ${sizeKb} KB`, 'success');
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : 'Upload failed', 'error');
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  };

  /* ── Facilities helper (Autocomplete multi-select) ── */
  const selectedFacilities: string[] = (form.facilities ?? '').split(',').map(s => s.trim()).filter(Boolean);

  const status = center.registration_status;
  const [c1, c2] = CATEGORY_COLORS[center.category] ?? [BRAND.navyDark, BRAND.navyLight];
  const initials = center.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const docs = [
    { label: 'Registration Certificate', url: center.registration_cert_url },
    { label: 'Premises Proof',           url: center.premises_proof_url },
    { label: 'Owner ID Proof',           url: center.owner_id_proof_url },
    { label: 'Safety Certificate',       url: center.safety_cert_url },
  ].filter((d) => d.url) as { label: string; url: string }[];

  // ══════════════════════════════════════════════════════
  return (
    <Box>

      {/* ════ COVER BANNER ════ */}
      <Box sx={{
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
        px: 3, pt: 2.5, pb: 5.5, position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <Box sx={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.07)', top: -55, right: -55, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)', bottom: 8, left: 16, pointerEvents: 'none' }} />

        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <StatusChip status={status} />
            {center.subscription_status && center.subscription_status !== status && (
              <StatusChip status={center.subscription_status} />
            )}
            {center.is_approaching_sla && (
              <Chip
                icon={<WarningAmberRoundedIcon sx={{ fontSize: 12, color: '#F59E0B !important' }} />}
                label={`${center.hours_since_submission}h`}
                size="small"
                sx={{ bgcolor: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontWeight: 700, fontSize: 11 }}
              />
            )}
          </Stack>

          {/* Edit / Save / Cancel */}
          {!editing ? (
            <Tooltip title="Edit center details">
              <IconButton size="small" onClick={startEdit}
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}>
                <EditRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Stack direction="row" gap={1}>
              <Button size="small" variant="contained"
                startIcon={updateMut.isPending ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <SaveRoundedIcon />}
                onClick={() => updateMut.mutate()} disabled={updateMut.isPending}
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }, boxShadow: 'none', fontSize: 12 }}>
                {updateMut.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button size="small" variant="outlined"
                startIcon={<CloseRoundedIcon />} onClick={() => { setEditing(false); setSelectedOwner(null); setOwnerSearch(''); }}
                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' }, fontSize: 12 }}>
                Cancel
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* ════ LOGO + NAME ROW ════ */}
      <Box sx={{ px: 3, mt: -4 }}>
        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" gap={2}>
          {/* Clickable logo avatar */}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
          <Tooltip title="Click to change logo" placement="right">
            <Box onClick={() => !logoUploading && fileInputRef.current?.click()}
              sx={{ position: 'relative', width: 72, height: 72, cursor: logoUploading ? 'wait' : 'pointer',
                '&:hover .logo-overlay': { opacity: 1 }, flexShrink: 0 }}>
              <Avatar sx={{
                width: 72, height: 72, border: '3px solid #fff',
                boxShadow: '0 4px 16px rgba(15,30,53,0.18)',
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                fontSize: 22, fontWeight: 800, color: '#fff',
              }}>
                {logoUploading
                  ? <CircularProgress size={26} sx={{ color: '#fff' }} />
                  : (logoPreview || center.logo_url)
                    ? <img src={logoPreview ?? center.logo_url!} alt={center.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : initials}
              </Avatar>
              {!logoUploading && (
                <Box className="logo-overlay" sx={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  bgcolor: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.18s', border: '3px solid #fff',
                }}>
                  <CameraAltRoundedIcon sx={{ fontSize: 16, color: '#fff' }} />
                  <Typography sx={{ fontSize: 8, color: '#fff', fontWeight: 700, letterSpacing: 0.3, mt: 0.25 }}>CHANGE</Typography>
                </Box>
              )}
              {logoUploading && (
                <Box sx={{
                  position: 'absolute', inset: -3, borderRadius: '50%',
                  background: `conic-gradient(${BRAND.primary} ${logoProgress * 3.6}deg, transparent 0deg)`,
                  zIndex: -1,
                }} />
              )}
            </Box>
          </Tooltip>
        </Stack>

        {/* Center name + meta */}
        <Box mt={1.5}>
          <Typography sx={{ fontSize: 19, fontWeight: 700, color: BRAND.textPrimary, lineHeight: 1.2 }}>
            {center.name}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
            <Chip label={center.category} size="small" sx={{
              fontSize: 11, fontWeight: 600, height: 22,
              bgcolor: BRAND.primaryBg, color: BRAND.primary,
            }} />
            <Stack direction="row" alignItems="center" gap={0.4}>
              <LocationOnRoundedIcon sx={{ fontSize: 13, color: BRAND.textSecondary }} />
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                {center.city}{center.state && center.state !== 'Tamil Nadu' ? `, ${center.state}` : ''}
                {center.pincode ? ` – ${center.pincode}` : ''}
              </Typography>
            </Stack>
            {center.trial_ends_at && (
              <Chip label={`Trial ends ${new Date(center.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                size="small" sx={{ fontSize: 11, height: 22, bgcolor: 'rgba(59,130,246,0.1)', color: '#3B82F6' }} />
            )}
          </Stack>
        </Box>
      </Box>

      {/* ════ ALERT BANNERS ════ */}
      {!center.latitude && !center.longitude && (
        <Box sx={{ mx: 3, mt: 2, display: 'flex', alignItems: 'center', gap: 1,
          p: 1.5, borderRadius: 1.5, bgcolor: '#FFFBEB', border: '1px solid #FCD34D' }}>
          <WarningAmberRoundedIcon sx={{ color: '#D97706', fontSize: 16 }} />
          <Typography sx={{ fontSize: 12, color: '#92400E' }}>
            No map pin — discovery listing withheld until location is set
          </Typography>
        </Box>
      )}

      {center.rejection_reason && (
        <Box sx={{ mx: 3, mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: '#FFF1F2', border: '1px solid #FECDD3' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#BE123C', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.4 }}>
            Rejected · {center.rejection_category?.replace(/([A-Z])/g, ' $1').trim()}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#9F1239', lineHeight: 1.6 }}>
            {center.rejection_reason}
          </Typography>
        </Box>
      )}

      {/* ════ OWNER SECTION ════ */}
      <Box sx={{ mx: 3, mt: 2 }}>
        {!(center.owner_id || center.owner_user_name) ? (
          /* ── No owner warning ── */
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
            p: 1.5, borderRadius: 1.5,
            bgcolor: '#FFF7ED', border: '1px solid #FED7AA',
          }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <WarningAmberRoundedIcon sx={{ color: '#D97706', fontSize: 16 }} />
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                  No owner account linked
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#B45309' }}>
                  Owner must be assigned before this center can be approved
                </Typography>
              </Box>
            </Stack>
            <Button
              size="small" variant="contained"
              onClick={() => setOwnerDialogOpen(true)}
              sx={{
                bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' },
                fontSize: 12, fontWeight: 700, borderRadius: '8px', px: 2, flexShrink: 0,
              }}
            >
              Assign Owner
            </Button>
          </Box>
        ) : (
          /* ── Owner card ── */
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
            p: 1.5, borderRadius: 1.5,
            bgcolor: BRAND.primaryBg, border: `1px solid ${BRAND.divider}`,
          }}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Avatar sx={{
                width: 36, height: 36, fontSize: 13, fontWeight: 700,
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              }}>
                {(center.owner_user_name ?? center.owner_name).split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: BRAND.textPrimary, lineHeight: 1.3 }}>
                  {center.owner_user_name ?? center.owner_name}
                </Typography>
                <Stack direction="row" gap={1.5} flexWrap="wrap">
                  {center.owner_user_mobile && (
                    <Stack direction="row" alignItems="center" gap={0.4}>
                      <PhoneRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary }} />
                      <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{center.owner_user_mobile}</Typography>
                    </Stack>
                  )}
                  {center.owner_user_email && (
                    <Stack direction="row" alignItems="center" gap={0.4}>
                      <EmailRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary }} />
                      <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{center.owner_user_email}</Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Stack>
            <Tooltip title="Change owner">
              <Button size="small" variant="outlined" onClick={() => setOwnerDialogOpen(true)}
                sx={{ fontSize: 11, borderRadius: '8px', px: 1.5, flexShrink: 0 }}>
                Change
              </Button>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* ── Assign owner dialog ── */}
      {ownerDialogOpen && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 1300,
          bgcolor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setOwnerDialogOpen(false)}
        >
          <Box sx={{ bgcolor: '#fff', borderRadius: 2, p: 3, width: 420, mx: 2 }}
            onClick={(e) => e.stopPropagation()}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>
              {(center.owner_id || center.owner_user_name) ? 'Change Owner' : 'Assign Owner'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2.5}>
              Search by name or mobile number. The user must already have an account.
            </Typography>
            <Autocomplete
              options={dialogResults}
              getOptionLabel={(u) => `${u.name}${u.mobile_number ? ` · ${u.mobile_number}` : ''}`}
              filterOptions={(x) => x}
              loading={dialogLoading}
              value={dialogOwner}
              onChange={(_, v) => setDialogOwner(v)}
              inputValue={dialogSearch}
              onInputChange={(_, v, reason) => { if (reason !== 'reset') setDialogSearch(v); }}
              noOptionsText={dialogSearch.length < 2 ? 'Type at least 2 characters…' : 'No users found'}
              renderOption={(props, u) => (
                <Box component="li" {...props} key={u.id}>
                  <Stack direction="row" alignItems="center" gap={1.5} py={0.25}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700,
                      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                      {u.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{u.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {u.mobile_number}{u.email ? ` · ${u.email}` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search owner"
                  size="small"
                  placeholder="Name or mobile…"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {dialogLoading && <CircularProgress size={14} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            {dialogOwner && (
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: BRAND.primaryBg, border: `1px solid ${BRAND.divider}` }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.textPrimary }}>{dialogOwner.name}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {dialogOwner.mobile_number}{dialogOwner.email ? ` · ${dialogOwner.email}` : ''}
                </Typography>
              </Box>
            )}
            <Stack direction="row" justifyContent="flex-end" gap={1} mt={2.5}>
              <Button onClick={() => setOwnerDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!dialogOwner || assignOwnerMut.isPending}
                onClick={() => assignOwnerMut.mutate()}
                startIcon={assignOwnerMut.isPending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : undefined}
              >
                {assignOwnerMut.isPending ? 'Assigning…' : 'Assign'}
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {/* ════ TABS ════ */}
      <Box sx={{ px: 3, mt: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 36, borderBottom: `1px solid ${BRAND.divider}`,
            '& .MuiTab-root': { fontSize: 13, fontWeight: 500, minHeight: 36, py: 0, px: 2, textTransform: 'none' },
            '& .Mui-selected': { fontWeight: 700, color: BRAND.primary },
            '& .MuiTabs-indicator': { bgcolor: BRAND.primary } }}>
          <Tab label="Details" />
          <Tab label="Users" />
          <Tab label="Batches" />
          <Tab label="Students" />
          <Tab label="Parents" />
        </Tabs>
      </Box>

      {/* ════════════════════════
          INFO TAB
      ════════════════════════ */}
      {tab === 0 && (
        <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>

          {editing ? (
            /* ────────── EDIT FORM ────────── */
            <Stack gap={3}>

              {/* Basic Info */}
              <Box>
                <SectionTitle>Basic Info</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <TextField label="Center Name" size="small" fullWidth
                      value={form.name ?? ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Autocomplete
                      options={mdCategories}
                      getOptionLabel={(o) => o.label}
                      value={mdCategories.find(o => o.value === form.category) ?? null}
                      onChange={(_, v) => setForm(f => ({ ...f, category: v?.value ?? '' }))}
                      renderInput={(params) => <TextField {...params} label="Category" size="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={ownerSearchResults}
                      getOptionLabel={(u) => `${u.name}${u.mobile_number ? ` · ${u.mobile_number}` : ''}`}
                      filterOptions={(x) => x}
                      loading={ownerSearchLoading}
                      value={selectedOwner}
                      onChange={(_, v) => {
                        setSelectedOwner(v);
                        if (v) setForm(f => ({ ...f, owner_name: v.name, mobile_number: v.mobile_number ?? f.mobile_number }));
                      }}
                      inputValue={ownerSearch}
                      onInputChange={(_, v, reason) => {
                        if (reason !== 'reset') setOwnerSearch(v);
                      }}
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
                          label="Owner Name"
                          size="small"
                          placeholder={center.owner_name || 'Search by name or mobile…'}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {ownerSearchLoading && <CircularProgress size={13} />}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Phone" size="small" fullWidth type="tel"
                      value={form.mobile_number ?? ''} onChange={(e) => setForm(f => ({ ...f, mobile_number: e.target.value }))} />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Location */}
              <Box>
                <SectionTitle>Location</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField label="Street Address" size="small" fullWidth multiline rows={2}
                      value={form.address ?? ''} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Autocomplete
                      options={mdCities}
                      getOptionLabel={(o) => o.label}
                      value={mdCities.find(o => o.value === form.city) ?? null}
                      onChange={(_, v) => setForm(f => ({ ...f, city: v?.value ?? '' }))}
                      renderInput={(params) => <TextField {...params} label="City" size="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="State" size="small" fullWidth
                      value={form.state ?? 'Tamil Nadu'} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Pincode" size="small" fullWidth
                      value={form.pincode ?? ''} onChange={(e) => setForm(f => ({ ...f, pincode: e.target.value }))}
                      inputProps={{ maxLength: 6, pattern: '[0-9]*' }} />
                  </Grid>
                  {/* Map */}
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${BRAND.divider}`, bgcolor: BRAND.surface }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>Map Pin</Typography>
                        {form.latitude && form.longitude && (
                          <Button size="small" variant="text"
                            onClick={() => setForm(f => ({ ...f, latitude: null, longitude: null }))}
                            sx={{ fontSize: 11, color: BRAND.textSecondary, minWidth: 0, p: '2px 8px' }}>
                            Clear pin
                          </Button>
                        )}
                      </Stack>
                      <MapPicker
                        lat={form.latitude ?? null} lng={form.longitude ?? null}
                        onChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))}
                        height={240}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Operations */}
              <Box>
                <SectionTitle>Operations</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={mdOpDays}
                      getOptionLabel={(o) => o.label}
                      value={mdOpDays.find(o => o.value === form.operating_days) ?? null}
                      onChange={(_, v) => setForm(f => ({ ...f, operating_days: v?.value ?? '' }))}
                      renderInput={(params) => <TextField {...params} label="Operating Days" size="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Operating Timings" size="small" fullWidth
                      value={form.operating_timings ?? ''}
                      onChange={(e) => setForm(f => ({ ...f, operating_timings: e.target.value }))}
                      placeholder="e.g. 4:00 PM – 8:00 PM" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={mdAgGroups}
                      getOptionLabel={(o) => o.label}
                      value={mdAgGroups.find(o => o.value === form.age_group) ?? null}
                      onChange={(_, v) => setForm(f => ({ ...f, age_group: v?.value ?? '' }))}
                      renderInput={(params) => <TextField {...params} label="Age Group" size="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={mdFeeRanges}
                      getOptionLabel={(o) => o.label}
                      value={mdFeeRanges.find(o => o.value === form.fee_range) ?? null}
                      onChange={(_, v) => setForm(f => ({ ...f, fee_range: v?.value ?? '' }))}
                      renderInput={(params) => <TextField {...params} label="Fee Range" size="small" />}
                    />
                  </Grid>
                  {/* Multi-select facilities */}
                  <Grid item xs={12}>
                    <Autocomplete
                      multiple
                      options={mdFacilities}
                      getOptionLabel={(o) => o.label}
                      value={mdFacilities.filter(o => selectedFacilities.includes(o.value))}
                      onChange={(_, vals) => setForm(f => ({ ...f, facilities: vals.map(v => v.value).join(',') }))}
                      renderTags={(vals, getTagProps) =>
                        vals.map((o, i) => (
                          <Chip
                            {...getTagProps({ index: i })}
                            key={o.value}
                            label={o.label}
                            size="small"
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        ))
                      }
                      renderInput={(params) => <TextField {...params} label="Facilities" size="small" placeholder="Search…" />}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Description & Links */}
              <Box>
                <SectionTitle>Description & Links</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField label="Description" size="small" fullWidth multiline rows={3}
                      value={form.description ?? ''}
                      onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Website URL" size="small" fullWidth
                      value={form.website_link ?? ''} onChange={(e) => setForm(f => ({ ...f, website_link: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Social Media Link" size="small" fullWidth
                      value={form.social_link ?? ''} onChange={(e) => setForm(f => ({ ...f, social_link: e.target.value }))} />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Admin Notes */}
              <Box>
                <SectionTitle>Admin Notes</SectionTitle>
                <TextField label="Internal notes (not visible to owner)" size="small" fullWidth multiline rows={2}
                  value={form.admin_notes ?? ''}
                  onChange={(e) => setForm(f => ({ ...f, admin_notes: e.target.value }))} />
              </Box>

            </Stack>

          ) : (
            /* ────────── VIEW MODE ────────── */
            <Stack gap={3}>

              {/* Contact & Location */}
              <Box>
                <SectionTitle>Contact & Location</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<PeopleRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Owner" value={center.owner_name} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<PhoneRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Phone" value={center.mobile_number} />
                  </Grid>
                  <Grid item xs={12}>
                    <InfoRow icon={<LocationOnRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Address"
                      value={[center.address, center.city, center.state, center.pincode].filter(Boolean).join(', ')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<MarkunreadMailboxRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Pincode" value={center.pincode ?? '—'} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<LocationOnRoundedIcon sx={{ fontSize: 15 }} />}
                      label="State" value={center.state ?? 'Tamil Nadu'} />
                  </Grid>
                  {/* Map */}
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: 10, color: BRAND.textSecondary, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
                      Map Location
                    </Typography>
                    {center.latitude && center.longitude ? (
                      <Box>
                        <MapPicker lat={center.latitude} lng={center.longitude}
                          onChange={() => {}} readOnly height={200} />
                        <Stack direction="row" alignItems="center" gap={0.5} mt={0.75}>
                          <LocationOnRoundedIcon sx={{ fontSize: 12, color: BRAND.primary }} />
                          <Link href={`https://maps.google.com/?q=${center.latitude},${center.longitude}`}
                            target="_blank" rel="noopener"
                            sx={{ fontSize: 11.5, color: BRAND.primary }}>
                            {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)} — Open in Google Maps
                          </Link>
                        </Stack>
                      </Box>
                    ) : (
                      <Box sx={{ height: 60, borderRadius: 1.5, border: `1px dashed ${BRAND.divider}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: BRAND.surface }}>
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>No map pin set</Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Operations */}
              <Box>
                <SectionTitle>Operations</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<CalendarMonthRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Operating Days" value={center.operating_days} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<ScheduleRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Timings" value={center.operating_timings} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<PeopleRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Age Group" value={center.age_group} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<CurrencyRupeeRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Fee Range" value={center.fee_range} />
                  </Grid>
                  {center.facilities && (
                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: 10, color: BRAND.textSecondary, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
                        Facilities
                      </Typography>
                      <FacilityChips value={center.facilities} />
                    </Grid>
                  )}
                  {center.description && (
                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: 10, color: BRAND.textSecondary, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                        Description
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: BRAND.textPrimary, lineHeight: 1.7 }}>
                        {center.description}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>

              {(center.website_link || center.social_link) && (
                <>
                  <Divider />
                  <Box>
                    <SectionTitle>Links</SectionTitle>
                    <Stack gap={1.5}>
                      {center.website_link && (
                        <InfoRow icon={<LanguageRoundedIcon sx={{ fontSize: 15 }} />} label="Website"
                          value={<Link href={center.website_link} target="_blank" rel="noopener"
                            sx={{ fontSize: 13, color: BRAND.primary }}>{center.website_link}</Link>} />
                      )}
                      {center.social_link && (
                        <InfoRow icon={<ShareRoundedIcon sx={{ fontSize: 15 }} />} label="Social"
                          value={<Link href={center.social_link} target="_blank" rel="noopener"
                            sx={{ fontSize: 13, color: BRAND.primary }}>{center.social_link}</Link>} />
                      )}
                    </Stack>
                  </Box>
                </>
              )}

              {docs.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <SectionTitle>{`Documents (${docs.length})`}</SectionTitle>
                    <Grid container spacing={1.5}>
                      {docs.map((doc) => (
                        <Grid item xs={12} sm={6} key={doc.label}>
                          <DocCard label={doc.label} url={doc.url} />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </>
              )}

              {center.admin_notes && (
                <>
                  <Divider />
                  <Box>
                    <SectionTitle>Admin Notes</SectionTitle>
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: `${BRAND.primary}06`,
                      border: `1px solid ${BRAND.primary}18` }}>
                      <Stack direction="row" gap={1} alignItems="flex-start">
                        <StickyNote2RoundedIcon sx={{ fontSize: 15, color: BRAND.primary, mt: 0.1 }} />
                        <Typography sx={{ fontSize: 13, color: BRAND.textPrimary, lineHeight: 1.7 }}>
                          {center.admin_notes}
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>
                </>
              )}

              {/* Timeline */}
              <Divider />
              <Box>
                <SectionTitle>Timeline</SectionTitle>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<CalendarMonthRoundedIcon sx={{ fontSize: 15 }} />} label="Submitted"
                      value={new Date(center.created_date).toLocaleDateString('en-IN',
                        { day: 'numeric', month: 'long', year: 'numeric' })} />
                  </Grid>
                  {center.approved_at && (
                    <Grid item xs={12} sm={6}>
                      <InfoRow icon={<CheckCircleRoundedIcon sx={{ fontSize: 15 }} />} label="Approved"
                        value={new Date(center.approved_at).toLocaleDateString('en-IN',
                          { day: 'numeric', month: 'long', year: 'numeric' })} />
                    </Grid>
                  )}
                  {center.trial_ends_at && (
                    <Grid item xs={12} sm={6}>
                      <InfoRow icon={<ScheduleRoundedIcon sx={{ fontSize: 15 }} />} label="Trial Ends"
                        value={new Date(center.trial_ends_at).toLocaleDateString('en-IN',
                          { day: 'numeric', month: 'long', year: 'numeric' })} />
                    </Grid>
                  )}
                  {center.suspended_at && (
                    <Grid item xs={12} sm={6}>
                      <InfoRow icon={<WarningAmberRoundedIcon sx={{ fontSize: 15 }} />} label="Suspended"
                        value={new Date(center.suspended_at).toLocaleDateString('en-IN',
                          { day: 'numeric', month: 'long', year: 'numeric' })} />
                    </Grid>
                  )}
                  {center.data_purge_at && (
                    <Grid item xs={12} sm={6}>
                      <InfoRow icon={<WarningAmberRoundedIcon sx={{ fontSize: 15 }} />} label="Data Purge Scheduled"
                        value={new Date(center.data_purge_at).toLocaleDateString('en-IN',
                          { day: 'numeric', month: 'long', year: 'numeric' })} />
                    </Grid>
                  )}
                </Grid>
              </Box>

            </Stack>
          )}

          {/* ── Action Buttons ── */}
          {!editing && (
            <>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" gap={1.5} flexWrap="wrap">
                {status === 'Submitted' && (
                  <Button variant="outlined" size="small" onClick={() => reviewMut.mutate()}
                    disabled={isActionLoading}
                    sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 12,
                      '&:hover': { borderColor: BRAND.primary, color: BRAND.primary } }}>
                    Mark Under Review
                  </Button>
                )}
                {(status === 'Submitted' || status === 'UnderReview') && (
                  <>
                    <Button variant="contained" size="small"
                      onClick={() => approveMut.mutate()} disabled={isActionLoading}
                      sx={{ background: 'linear-gradient(135deg, #16A34A, #15803D)',
                        '&:hover': { background: 'linear-gradient(135deg, #15803D, #166534)' }, fontSize: 12 }}>
                      {approveMut.isPending ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : 'Approve'}
                    </Button>
                    <Button variant="outlined" size="small" color="error"
                      onClick={() => setRejectOpen(true)} disabled={isActionLoading}
                      sx={{ fontSize: 12 }}>
                      Reject
                    </Button>
                  </>
                )}
                {status === 'Approved' && (
                  <Button variant="outlined" size="small"
                    onClick={() => setSuspendOpen(true)} disabled={isActionLoading}
                    sx={{ borderColor: '#F97316', color: '#F97316', fontSize: 12,
                      '&:hover': { bgcolor: 'rgba(249,115,22,0.06)' } }}>
                    Suspend Center
                  </Button>
                )}
                {status === 'Suspended' && (
                  <Button variant="contained" size="small"
                    onClick={() => reinstateMut.mutate()} disabled={isActionLoading}
                    sx={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', fontSize: 12 }}>
                    {reinstateMut.isPending ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : 'Reinstate'}
                  </Button>
                )}
              </Stack>
            </>
          )}
        </Box>
      )}

      {/* ════════════════════════
          USERS TAB
      ════════════════════════ */}
      {tab === 1 && (
        <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
          {/* Users tab header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>
              {usersLoading ? 'Users' : `${users?.length ?? 0} ${(users?.length ?? 0) === 1 ? 'user' : 'users'} linked`}
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<PersonAddRoundedIcon sx={{ fontSize: 15 }} />}
              onClick={() => setAddUserOpen(true)}
              sx={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
                fontSize: 12, py: 0.5,
              }}
            >
              Add User
            </Button>
          </Stack>

          {usersLoading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress size={28} sx={{ color: BRAND.primary }} />
            </Box>
          ) : !users || users.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: BRAND.primaryBg,
                mx: 'auto', mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PeopleRoundedIcon sx={{ fontSize: 22, color: BRAND.primary }} />
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>No users linked</Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                No staff or owners are connected to this center yet.
              </Typography>
            </Box>
          ) : (
            <Stack gap={1.5}>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mb: 0.5 }}>
                {users.length} {users.length === 1 ? 'user' : 'users'} linked
              </Typography>
              {users.map((u) => {
                const initials2 = u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                const roleColors: Record<string, string> = { Owner: BRAND.primary, Teacher: '#3B82F6', Staff: '#8B5CF6' };
                const roleColor = roleColors[u.role] ?? BRAND.textSecondary;
                return (
                  <Box key={u.user_id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: 1.5, borderRadius: 2, border: `1px solid ${BRAND.divider}`, bgcolor: '#FAFBFC',
                    '&:hover': { boxShadow: '0 2px 8px rgba(15,30,53,0.08)' },
                  }}>
                    <Avatar sx={{ width: 38, height: 38, fontSize: 13, fontWeight: 700, flexShrink: 0,
                      background: `linear-gradient(135deg, ${BRAND.navyDark}, ${BRAND.navyLight})`, color: '#fff' }}>
                      {initials2}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>{u.name}</Typography>
                        <Chip label={u.role} size="small"
                          sx={{ height: 18, fontSize: 11, fontWeight: 700, bgcolor: `${roleColor}18`, color: roleColor }} />
                        <StatusChip status={u.status} />
                      </Stack>
                      <Stack direction="row" gap={2} mt={0.4} flexWrap="wrap">
                        {u.email && (
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <EmailRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary }} />
                            <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>{u.email}</Typography>
                          </Stack>
                        )}
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <PhoneRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary }} />
                          <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>{u.mobile_number}</Typography>
                        </Stack>
                      </Stack>
                    </Box>
                    {u.joined_at && (
                      <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                        <Typography sx={{ fontSize: 10, color: BRAND.textSecondary, fontWeight: 500 }}>Joined</Typography>
                        <Typography sx={{ fontSize: 11.5, color: BRAND.textPrimary, fontWeight: 600 }}>
                          {new Date(u.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {/* ════════════════════════
          BATCHES TAB
      ════════════════════════ */}
      {tab === 2 && (
        <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>
              {batchesLoading ? 'Batches' : `${batches?.length ?? 0} ${(batches?.length ?? 0) === 1 ? 'batch' : 'batches'}`}
            </Typography>
            <Button size="small" variant="contained"
              startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
              onClick={() => setAddBatchOpen(true)}
              sx={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
                fontSize: 12, py: 0.5,
              }}>
              Add Batch
            </Button>
          </Stack>

          {batchesLoading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress size={28} sx={{ color: BRAND.primary }} />
            </Box>
          ) : !batches || batches.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: BRAND.primaryBg,
                mx: 'auto', mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClassRoundedIcon sx={{ fontSize: 22, color: BRAND.primary }} />
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>No batches yet</Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                Create a batch to start managing classes for this center.
              </Typography>
            </Box>
          ) : (
            <Stack gap={2}>
              {batches.map((b) => (
                <BatchCard key={b.id} batch={b} centerId={center.id} />
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ════════════════════════
          STUDENTS TAB
      ════════════════════════ */}
      {tab === 3 && (
        <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>
              {enrolledLoading
                ? 'Students'
                : `${enrolledStudents.length} ${enrolledStudents.length === 1 ? 'student' : 'students'} enrolled`}
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<PersonAddRoundedIcon sx={{ fontSize: 15 }} />}
              onClick={() => setMapStudentOpen(true)}
              sx={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
                fontSize: 12, py: 0.5,
              }}
            >
              Map Student
            </Button>
          </Stack>

          {enrolledLoading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress size={28} sx={{ color: BRAND.primary }} />
            </Box>
          ) : enrolledStudents.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: '14px', bgcolor: BRAND.primaryBg,
                mx: 'auto', mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <SchoolRoundedIcon sx={{ fontSize: 22, color: BRAND.primary }} />
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>No students mapped</Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                Use "Map Student" to search by parent mobile and link students.
              </Typography>
            </Box>
          ) : (
            <Stack gap={1.5}>
              {enrolledStudents.map((s) => (
                <Box key={s.student_id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.5, borderRadius: 2, border: `1px solid ${BRAND.divider}`, bgcolor: '#FAFBFC',
                  '&:hover': { boxShadow: '0 2px 8px rgba(15,30,53,0.08)' },
                }}>
                  <Avatar sx={{
                    width: 38, height: 38, fontSize: 13, fontWeight: 700, flexShrink: 0,
                    bgcolor: BRAND.primaryBg, color: BRAND.primary,
                  }}>
                    {s.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }} noWrap>
                      {s.name}
                    </Typography>
                    <Stack direction="row" gap={1.5} mt={0.3} flexWrap="wrap">
                      {s.parent_name && (
                        <Stack direction="row" alignItems="center" gap={0.4}>
                          <PeopleRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary }} />
                          <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                            {s.parent_name}
                          </Typography>
                        </Stack>
                      )}
                      {s.gender && (
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{s.gender}</Typography>
                      )}
                      {s.date_of_birth && (
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                          DOB: {new Date(s.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                  <Tooltip title="Remove from center">
                    <IconButton
                      size="small"
                      onClick={() => unenrollMut.mutate(s.student_id)}
                      disabled={unenrollMut.isPending}
                      sx={{ color: '#EF4444', '&:hover': { bgcolor: '#FEE2E2' }, flexShrink: 0 }}
                    >
                      <PersonRemoveRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ════════════════════════
          PARENTS TAB
      ════════════════════════ */}
      {tab === 4 && (
        <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>
              {parentsLoading
                ? 'Parents'
                : `${centerParents.length} ${centerParents.length === 1 ? 'parent' : 'parents'} linked via students`}
            </Typography>
          </Stack>

          {parentsLoading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress size={28} sx={{ color: BRAND.primary }} />
            </Box>
          ) : centerParents.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: '14px', bgcolor: BRAND.primaryBg,
                mx: 'auto', mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PeopleRoundedIcon sx={{ fontSize: 22, color: BRAND.primary }} />
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>No parents yet</Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                Parents appear here once their children are mapped to this center.
              </Typography>
            </Box>
          ) : (
            <Stack gap={1.5}>
              {centerParents.map((p: CenterParent) => {
                const initials = p.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <Box key={p.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: 1.5, borderRadius: 2,
                    border: `1px solid ${BRAND.divider}`, bgcolor: '#FAFBFC',
                    '&:hover': { boxShadow: '0 2px 8px rgba(15,30,53,0.08)' },
                  }}>
                    <Avatar sx={{
                      width: 38, height: 38, fontSize: 13, fontWeight: 700, flexShrink: 0,
                      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                      color: '#fff',
                    }}>
                      {initials}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }} noWrap>
                        {p.name}
                      </Typography>
                      <Stack direction="row" gap={1.5} mt={0.3} flexWrap="wrap">
                        {p.mobile_number && (
                          <Stack direction="row" alignItems="center" gap={0.4}>
                            <PhoneRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary }} />
                            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{p.mobile_number}</Typography>
                          </Stack>
                        )}
                        {p.email && (
                          <Stack direction="row" alignItems="center" gap={0.4}>
                            <EmailRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary }} />
                            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }} noWrap>{p.email}</Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                    <Stack alignItems="flex-end" gap={0.5} flexShrink={0}>
                      <Chip
                        label={p.status}
                        size="small"
                        sx={{
                          height: 20, fontSize: 11, fontWeight: 600,
                          bgcolor: p.status === 'Active' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                          color: p.status === 'Active' ? '#16A34A' : '#EF4444',
                        }}
                      />
                      <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                        {p.student_count} student{p.student_count !== 1 ? 's' : ''}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {/* ── Modals ── */}
      <RejectReasonModal
        open={rejectOpen}
        mode="reject"
        onCancel={() => setRejectOpen(false)}
        onSubmit={(cat, reason) => rejectMut.mutate({ rejection_category: cat, rejection_reason: reason })}
        loading={rejectMut.isPending}
      />
      <RejectReasonModal
        open={suspendOpen}
        mode="suspend"
        onCancel={() => setSuspendOpen(false)}
        onSubmit={(_, reason) => suspendMut.mutate(reason)}
        loading={suspendMut.isPending}
      />

      <AddUserModal
        open={addUserOpen}
        centerId={center.id}
        onClose={() => setAddUserOpen(false)}
      />
      <AddBatchModal
        open={addBatchOpen}
        centerId={center.id}
        onClose={() => setAddBatchOpen(false)}
      />

      <MapStudentModal
        open={mapStudentOpen}
        centerId={center.id}
        onClose={() => setMapStudentOpen(false)}
        onSuccess={() => {
          if (tab === 3) qc.invalidateQueries({ queryKey: ['center-enrolled-students', center.id] });
        }}
      />

      {cropSrc && (
        <ImageCropModal open imageSrc={cropSrc} onClose={() => setCropSrc(null)}
          onDone={handleCropDone} maxKb={150} aspect={1} />
      )}
    </Box>
  );
}
