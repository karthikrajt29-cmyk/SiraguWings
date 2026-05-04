import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useDebouncedValue } from '../../hooks/useDebounce';
import AddRoundedIcon        from '@mui/icons-material/AddRounded';
import SearchRoundedIcon     from '@mui/icons-material/SearchRounded';
import DeleteRoundedIcon     from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon       from '@mui/icons-material/EditRounded';
import SchoolRoundedIcon     from '@mui/icons-material/SchoolRounded';
import PersonRoundedIcon     from '@mui/icons-material/PersonRounded';
import SwapHorizRoundedIcon  from '@mui/icons-material/SwapHorizRounded';
import CameraAltRoundedIcon  from '@mui/icons-material/CameraAltRounded';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import { useSearchParams } from 'react-router-dom';
import {
  listOwnerStudents,
  createOwnerStudent,
  updateOwnerStudent,
  removeOwnerStudent,
  type OwnerStudent,
  type OwnerStudentCreatePayload,
  type OwnerStudentUpdatePayload,
} from '../../api/owner.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ParentPickerDialog from '../../components/students/ParentPickerDialog';
import { DialogHeader } from '../../components/common/DialogHeader';
import { BRAND, STATUS_COLORS } from '../../theme';

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/* Resize a File to max 400×400, return base64 data URI */
function resizeImage(file: File, maxPx = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{
      fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.25, mt: 0.5,
    }}>
      {children}
    </Typography>
  );
}

/* ── Add Student — right-side drawer ── */
function AddStudentDrawer({
  open, onClose, centerId, onSubmit, saving,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  onSubmit: (data: OwnerStudentCreatePayload) => void;
  saving: boolean;
}) {
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [currentClass, setCurrentClass] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [medical, setMedical] = useState('');
  const [dateOfJoin, setDateOfJoin] = useState(todayStr());
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [parent, setParent] = useState<{ parent_id: string; parent_name: string; parent_mobile: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(''); setDob(''); setGender('Male'); setBloodGroup('');
      setCurrentClass(''); setSchoolName(''); setMedical('');
      setDateOfJoin(todayStr()); setPhotoDataUri(null); setParent(null);
    }
  }, [open]);

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file) return;
    const uri = await resizeImage(file);
    setPhotoDataUri(uri);
  };

  const valid = !!(name.trim() && dob && gender && parent);

  const submit = () => {
    if (!valid || !parent) return;
    onSubmit({
      name: name.trim(),
      date_of_birth: dob,
      gender,
      parent_id: parent.parent_id,
      blood_group: bloodGroup || null,
      current_class: currentClass.trim() || null,
      school_name: schoolName.trim() || null,
      medical_notes: medical.trim() || null,
      date_of_join: dateOfJoin || null,
      profile_image_base64: photoDataUri || null,
    });
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => !saving && onClose()}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 460 },
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 32px rgba(15,30,53,0.18)',
          },
        }}
      >
        <DialogHeader
          icon={<SchoolRoundedIcon sx={{ fontSize: 20 }} />}
          title="Add Student"
          subtitle="Fill in the details below to enroll a new student"
          onClose={onClose}
          disabled={saving}
        />

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
          <Stack gap={0}>

            {/* ── Profile photo ── */}
            <SectionLabel>Profile Photo</SectionLabel>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Box sx={{ position: 'relative', width: 88, height: 88 }}>
                <Avatar
                  src={photoDataUri ?? undefined}
                  sx={{
                    width: 88, height: 88,
                    bgcolor: BRAND.primaryBg, color: BRAND.primary,
                    fontSize: 28, fontWeight: 700,
                    border: `2px solid ${BRAND.divider}`,
                  }}
                >
                  {name ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : <SchoolRoundedIcon sx={{ fontSize: 32 }} />}
                </Avatar>
                <IconButton
                  size="small"
                  onClick={() => fileRef.current?.click()}
                  sx={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 28, height: 28,
                    background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                    color: '#fff', border: '2px solid #fff',
                    '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
                  }}
                >
                  <CameraAltRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePhotoFile(e.target.files?.[0])}
                />
              </Box>
            </Box>

            {/* ── Basic Info ── */}
            <SectionLabel>Basic Info</SectionLabel>
            <Stack gap={2} mb={3}>
              <TextField label="Full name *" value={name} onChange={(e) => setName(e.target.value)}
                fullWidth size="small" autoFocus />

              <Stack direction="row" gap={2}>
                <TextField label="Date of birth *" type="date" value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  InputLabelProps={{ shrink: true }} size="small" fullWidth />
                <TextField label="Gender *" select value={gender}
                  onChange={(e) => setGender(e.target.value)} size="small" fullWidth>
                  {GENDERS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </TextField>
              </Stack>

              <TextField label="Blood group" select value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)} size="small" fullWidth>
                <MenuItem value="">— Not specified —</MenuItem>
                {BLOOD_GROUPS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </TextField>
            </Stack>

            {/* ── Academic ── */}
            <SectionLabel>Academic</SectionLabel>
            <Stack gap={2} mb={3}>
              <TextField label="Current class / grade" value={currentClass}
                onChange={(e) => setCurrentClass(e.target.value)}
                placeholder="e.g. Class 5-A, LKG, Grade 10"
                size="small" fullWidth />
              <TextField label="School name" value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                size="small" fullWidth />
            </Stack>

            {/* ── Parent ── */}
            <SectionLabel>Parent *</SectionLabel>
            <Box mb={3}>
              {parent ? (
                <Box sx={{
                  border: `1px solid ${BRAND.divider}`, borderRadius: 2,
                  p: 1.25, display: 'flex', alignItems: 'center', gap: 1.25,
                  bgcolor: BRAND.primaryBg,
                }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <PersonRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }}>{parent.parent_name}</Typography>
                    <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>{parent.parent_mobile}</Typography>
                  </Box>
                  <Button size="small" startIcon={<SwapHorizRoundedIcon sx={{ fontSize: 15 }} />}
                    onClick={() => setPickerOpen(true)} sx={{ fontSize: 12 }}>
                    Change
                  </Button>
                </Box>
              ) : (
                <Button variant="outlined" fullWidth startIcon={<PersonRoundedIcon />}
                  onClick={() => setPickerOpen(true)}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5, borderStyle: 'dashed' }}>
                  Choose parent
                </Button>
              )}
              <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary, mt: 0.75 }}>
                Every student must be linked to a parent. Search globally or add a new parent.
              </Typography>
            </Box>

            {/* ── Health ── */}
            <SectionLabel>Health</SectionLabel>
            <Stack gap={2} mb={3}>
              <TextField label="Medical notes" value={medical}
                onChange={(e) => setMedical(e.target.value)}
                placeholder="Allergies, conditions, special needs…"
                multiline minRows={2} size="small" fullWidth />
            </Stack>

            {/* ── Enrollment ── */}
            <SectionLabel>Enrollment</SectionLabel>
            <TextField label="Date of joining" type="date" value={dateOfJoin}
              onChange={(e) => setDateOfJoin(e.target.value)}
              InputLabelProps={{ shrink: true }} size="small" fullWidth
              helperText="Date this student joined this center" />

          </Stack>
        </Box>

        <Divider />
        <Box sx={{
          px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.25,
          bgcolor: BRAND.surface ?? '#fafafa', flexShrink: 0,
        }}>
          <Button onClick={onClose} disabled={saving} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={13} color="inherit" /> : <AddRoundedIcon />}
            onClick={submit}
            disabled={!valid || saving}
            sx={{
              fontSize: 13, fontWeight: 600, px: 2.5,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
            }}
          >
            {saving ? 'Adding…' : 'Add student'}
          </Button>
        </Box>
      </Drawer>

      <ParentPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        centerId={centerId}
        onPick={(p) => { setParent(p); setPickerOpen(false); }}
      />
    </>
  );
}

/* ── Edit Student — right-side drawer ── */
function EditStudentDialog({
  student, onSubmit, onClose, saving,
}: {
  student: OwnerStudent | null;
  onSubmit: (data: OwnerStudentUpdatePayload) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [currentClass, setCurrentClass] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [medical, setMedical] = useState('');
  const [dateOfJoin, setDateOfJoin] = useState('');
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (student) {
      setName(student.name ?? '');
      setDob(student.date_of_birth ?? '');
      setGender(student.gender ?? 'Male');
      setBloodGroup(student.blood_group ?? '');
      setCurrentClass(student.current_class ?? '');
      setSchoolName(student.school_name ?? '');
      setMedical(student.medical_notes ?? '');
      setDateOfJoin(student.added_at ? student.added_at.slice(0, 10) : '');
      setPhotoDataUri(student.profile_image_url ?? null);
    }
  }, [student?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file) return;
    const uri = await resizeImage(file);
    setPhotoDataUri(uri);
  };

  const valid = !!(name.trim() && dob && gender);
  const submit = () => {
    if (!valid || !student) return;
    const update: OwnerStudentUpdatePayload = {};
    if (name !== student.name) update.name = name.trim();
    if (dob !== (student.date_of_birth ?? '')) update.date_of_birth = dob;
    if (gender !== (student.gender ?? '')) update.gender = gender;
    if (bloodGroup !== (student.blood_group ?? '')) update.blood_group = bloodGroup || null;
    if (currentClass !== (student.current_class ?? '')) update.current_class = currentClass.trim() || null;
    if (schoolName !== (student.school_name ?? '')) update.school_name = schoolName.trim() || null;
    if (medical !== (student.medical_notes ?? '')) update.medical_notes = medical.trim() || null;
    const origJoin = student.added_at ? student.added_at.slice(0, 10) : '';
    if (dateOfJoin !== origJoin) update.date_of_join = dateOfJoin || null;
    if (photoDataUri !== (student.profile_image_url ?? null)) update.profile_image_base64 = photoDataUri;
    onSubmit(update);
  };

  if (!student) return null;
  return (
    <Drawer
      anchor="right"
      open
      onClose={() => !saving && onClose()}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 460 },
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 32px rgba(15,30,53,0.18)',
        },
      }}
    >
      <DialogHeader
        icon={<EditRoundedIcon sx={{ fontSize: 20 }} />}
        title="Edit Student"
        subtitle={student.name}
        onClose={onClose}
        disabled={saving}
      />

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
        <Stack gap={0}>

          {/* ── Profile photo ── */}
          <SectionLabel>Profile Photo</SectionLabel>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Box sx={{ position: 'relative', width: 88, height: 88 }}>
              <Avatar
                src={photoDataUri ?? undefined}
                sx={{
                  width: 88, height: 88,
                  bgcolor: BRAND.primaryBg, color: BRAND.primary,
                  fontSize: 28, fontWeight: 700,
                  border: `2px solid ${BRAND.divider}`,
                }}
              >
                {name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </Avatar>
              <IconButton
                size="small"
                onClick={() => fileRef.current?.click()}
                sx={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 28, height: 28,
                  background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                  color: '#fff', border: '2px solid #fff',
                  '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
                }}
              >
                <CameraAltRoundedIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoFile(e.target.files?.[0])}
              />
            </Box>
          </Box>

          {/* ── Basic Info ── */}
          <SectionLabel>Basic Info</SectionLabel>
          <Stack gap={2} mb={3}>
            <TextField label="Full name *" value={name} onChange={(e) => setName(e.target.value)}
              fullWidth size="small" autoFocus />
            <Stack direction="row" gap={2}>
              <TextField label="Date of birth *" type="date" value={dob}
                onChange={(e) => setDob(e.target.value)}
                InputLabelProps={{ shrink: true }} size="small" fullWidth />
              <TextField label="Gender *" select value={gender}
                onChange={(e) => setGender(e.target.value)} size="small" fullWidth>
                {GENDERS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Blood group" select value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)} size="small" fullWidth>
              <MenuItem value="">— Not specified —</MenuItem>
              {BLOOD_GROUPS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
            </TextField>
          </Stack>

          {/* ── Academic ── */}
          <SectionLabel>Academic</SectionLabel>
          <Stack gap={2} mb={3}>
            <TextField label="Current class / grade" value={currentClass}
              onChange={(e) => setCurrentClass(e.target.value)}
              placeholder="e.g. Class 5-A, LKG, Grade 10"
              size="small" fullWidth />
            <TextField label="School name" value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              size="small" fullWidth />
          </Stack>

          {/* ── Health ── */}
          <SectionLabel>Health</SectionLabel>
          <Stack gap={2} mb={3}>
            <TextField label="Medical notes" value={medical}
              onChange={(e) => setMedical(e.target.value)}
              placeholder="Allergies, conditions, special needs…"
              multiline minRows={2} size="small" fullWidth />
          </Stack>

          {/* ── Enrollment ── */}
          <SectionLabel>Enrollment</SectionLabel>
          <TextField label="Date of joining" type="date" value={dateOfJoin}
            onChange={(e) => setDateOfJoin(e.target.value)}
            InputLabelProps={{ shrink: true }} size="small" fullWidth
            helperText="Date this student joined this center" />

        </Stack>
      </Box>

      <Divider />
      <Box sx={{
        px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.25,
        bgcolor: BRAND.surface ?? '#fafafa', flexShrink: 0,
      }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>Cancel</Button>
        <Button variant="contained"
          startIcon={saving ? <CircularProgress size={13} color="inherit" /> : <EditRoundedIcon />}
          onClick={submit} disabled={!valid || saving}
          sx={{
            fontSize: 13, fontWeight: 600, px: 2.5,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          }}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </Box>
    </Drawer>
  );
}

export default function OwnerStudentsPage() {
  const { centerId, centers } = useOwnerCenter();
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<OwnerStudent | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OwnerStudent | null>(null);

  const PAGE_SIZE = 25;

  // Auto-open Add dialog when navigated with ?add=1 (e.g. from sidebar shortcut)
  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setAdding(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const centerName = centers.find((c) => c.id === centerId)?.name ?? '';

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['owner', 'students', centerId, debouncedSearch, genderFilter, page],
    queryFn: () => listOwnerStudents(centerId!, {
      q: debouncedSearch || undefined,
      gender: genderFilter || undefined,
      page: page + 1,
      size: PAGE_SIZE,
    }),
    enabled: !!centerId,
    placeholderData: keepPreviousData,
  });

  const filtered = studentsData?.items ?? [];
  const totalStudents = studentsData?.total ?? 0;

  const createMut = useMutation({
    mutationFn: (payload: OwnerStudentCreatePayload) => createOwnerStudent(centerId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'students', centerId] });
      showSnack('Student added', 'success');
      setAdding(false);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: OwnerStudentUpdatePayload }) =>
      updateOwnerStudent(centerId!, vars.id, vars.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'students', centerId] });
      showSnack('Student updated', 'success');
      setEditing(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeOwnerStudent(centerId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'students', centerId] });
      showSnack('Student removed', 'success');
      setDeleteTarget(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography sx={{ color: BRAND.textSecondary }}>
            Select a center to manage its students.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
            Students
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
            {centerName} &middot; {totalStudents} enrolled
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setAdding(true)}
        >
          Add Student
        </Button>
      </Stack>

      {/* Filters */}
      <Card sx={{ borderRadius: '16px', mb: 2 }}>
        <CardContent sx={{ p: '16px !important' }}>
          <Stack direction="row" gap={2} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search by name, parent, or mobile…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              sx={{ flex: 1, minWidth: 280 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              size="small"
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value); setPage(0); }}
              label="Gender"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">All</MenuItem>
              {GENDERS.map((g) => (
                <MenuItem key={g} value={g}>{g}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={28} sx={{ color: BRAND.primary }} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Avatar sx={{
                width: 56, height: 56, bgcolor: BRAND.primaryBg, color: BRAND.primary,
                mx: 'auto', mb: 1.5, borderRadius: '14px',
              }}>
                <SchoolRoundedIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                {totalStudents === 0 ? 'No students enrolled yet' : 'No students match your filters'}
              </Typography>
              {totalStudents === 0 && (
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                  Click "Add Student" to enroll your first student.
                </Typography>
              )}
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Date of birth</TableCell>
                  <TableCell>Gender</TableCell>
                  <TableCell>Parent</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.25}>
                        <Avatar sx={{
                          width: 32, height: 32,
                          bgcolor: BRAND.primaryBg, color: BRAND.primary,
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {s.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </Avatar>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                          {s.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{s.date_of_birth ?? '—'}</TableCell>
                    <TableCell>
                      <Chip label={s.gender ?? '—'} size="small" sx={{ height: 22, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      {s.parent_name ? (
                        <Box>
                          <Typography sx={{ fontSize: 13 }}>{s.parent_name}</Typography>
                          <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                            {s.parent_mobile}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                          Not linked
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.status}
                        size="small"
                        sx={{
                          height: 22, fontSize: 11, fontWeight: 600,
                          bgcolor: s.status === 'Active' ? '#ECFDF5' : BRAND.surface,
                          color: s.status === 'Active' ? STATUS_COLORS.approved : BRAND.textSecondary,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => setEditing(s)}>
                          <EditRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove from center">
                        <IconButton size="small" onClick={() => setDeleteTarget(s)}>
                          <DeleteRoundedIcon sx={{ fontSize: 18, color: STATUS_COLORS.rejected }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && filtered.length > 0 && (
            <TablePagination
              component="div"
              count={totalStudents}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
              sx={{ borderTop: `1px solid ${BRAND.divider}` }}
            />
          )}
        </CardContent>
      </Card>

      {/* Add — right-side drawer */}
      <AddStudentDrawer
        open={adding}
        onClose={() => setAdding(false)}
        centerId={centerId!}
        onSubmit={(data) => createMut.mutate(data)}
        saving={createMut.isPending}
      />

      {/* Edit — centered dialog */}
      <EditStudentDialog
        student={editing}
        onSubmit={(data) => editing && updateMut.mutate({ id: editing.id, payload: data })}
        onClose={() => setEditing(null)}
        saving={updateMut.isPending}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove student?"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.name} from ${centerName}? The student record stays in the system, but they'll no longer be enrolled at this center.`
            : ''
        }
        confirmLabel="Remove"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMut.mutate(deleteTarget.id)}
        loading={removeMut.isPending}
        confirmColor="error"
      />
    </Box>
  );
}
