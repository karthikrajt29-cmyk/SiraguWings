import { useEffect, useMemo, useRef, useState } from 'react';
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
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon               from '@mui/icons-material/AddRounded';
import SearchRoundedIcon            from '@mui/icons-material/SearchRounded';
import DeleteRoundedIcon            from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon              from '@mui/icons-material/EditRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import CameraAltRoundedIcon        from '@mui/icons-material/CameraAltRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import {
  listOwnerTeachers,
  createOwnerTeacher,
  updateOwnerTeacher,
  removeOwnerTeacher,
  type OwnerTeacher,
} from '../../api/owner.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { DialogHeader } from '../../components/common/DialogHeader';
import { BRAND, STATUS_COLORS } from '../../theme';

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

/* Resize image file → base64 data URI (max 800 px, 0.85 quality) */
async function resizeDoc(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function ProofUploadBox({
  label, preview, onFile,
}: {
  label: string;
  preview: string | null;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: BRAND.textSecondary, mb: 0.75 }}>
        {label}
      </Typography>
      <Box
        onClick={() => ref.current?.click()}
        sx={{
          border: `1.5px dashed ${preview ? BRAND.primary : BRAND.divider}`,
          borderRadius: 2, p: preview ? 0.5 : 2,
          cursor: 'pointer', textAlign: 'center',
          bgcolor: preview ? 'transparent' : BRAND.primaryBg,
          transition: 'border-color 0.15s',
          '&:hover': { borderColor: BRAND.primary },
          overflow: 'hidden',
        }}
      >
        {preview ? (
          <Box component="img" src={preview} alt={label}
            sx={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 1.5 }} />
        ) : (
          <Stack alignItems="center" gap={0.5}>
            <CameraAltRoundedIcon sx={{ fontSize: 26, color: BRAND.primary, opacity: 0.7 }} />
            <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
              Tap to capture or upload
            </Typography>
            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, opacity: 0.65 }}>
              JPG · PNG · max 5 MB
            </Typography>
          </Stack>
        )}
      </Box>
      <input ref={ref} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </Box>
  );
}

function AddTeacherDrawer({
  open,
  onClose,
  onSubmit,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: import('../../api/owner.api').OwnerTeacherCreatePayload) => void;
  saving: boolean;
}) {
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const [name, setName]             = useState('');
  const [mobile, setMobile]         = useState('');
  const [email, setEmail]           = useState('');
  const [spec, setSpec]             = useState('');
  const [qualification, setQual]    = useState('');
  const [expYears, setExpYears]     = useState('');
  const [dateOfJoin, setDateOfJoin] = useState(todayStr());
  const [idProof, setIdProof]       = useState<string | null>(null);
  const [qualCert, setQualCert]     = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(''); setMobile(''); setEmail(''); setSpec('');
      setQual(''); setExpYears(''); setDateOfJoin(todayStr());
      setIdProof(null); setQualCert(null);
    }
  }, [open]);

  const valid = name.trim().length >= 2 && /^\d{10}$/.test(mobile.trim());

  const submit = () => {
    if (!valid) return;
    onSubmit({
      name: name.trim(),
      mobile_number: mobile.trim(),
      email: email.trim() || null,
      specialisation: spec.trim() || null,
      qualification: qualification.trim() || null,
      experience_years: expYears ? parseInt(expYears, 10) : null,
      date_of_join: dateOfJoin || null,
      id_proof_base64: idProof || null,
      qualification_cert_base64: qualCert || null,
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => !saving && onClose()}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 460 },
          display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 32px rgba(15,30,53,0.18)',
        },
      }}
    >
      <DialogHeader
        icon={<SupervisorAccountRoundedIcon sx={{ fontSize: 20 }} />}
        title="Add Teacher"
        subtitle="Fill in the details — the teacher can log in to the app after registration"
        onClose={onClose}
        disabled={saving}
      />

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
        <Stack gap={0}>

          {/* ── Personal Info ── */}
          <SectionLabel>Personal Info</SectionLabel>
          <Stack gap={2} mb={3}>
            <TextField label="Full name *" value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth size="small" autoFocus />
            <Stack direction="row" gap={2}>
              <TextField label="Mobile number *" value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                fullWidth size="small" inputProps={{ inputMode: 'numeric' }}
                error={!!mobile && !/^\d{10}$/.test(mobile)}
                helperText={mobile && !/^\d{10}$/.test(mobile) ? 'Must be 10 digits' : 'Used to log in'} />
              <TextField label="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth size="small" type="email"
                helperText="Optional — for app login link" />
            </Stack>
          </Stack>

          {/* ── Professional ── */}
          <SectionLabel>Professional Details</SectionLabel>
          <Stack gap={2} mb={3}>
            <TextField label="Specialisation / Subject" value={spec}
              onChange={(e) => setSpec(e.target.value)}
              fullWidth size="small"
              placeholder="e.g. Mathematics, Bharatanatyam, Keyboard" />
            <TextField label="Qualification" value={qualification}
              onChange={(e) => setQual(e.target.value)}
              fullWidth size="small"
              placeholder="e.g. B.Ed, M.Sc, Diploma in Dance" />
            <Stack direction="row" gap={2}>
              <TextField label="Experience (years)" value={expYears}
                onChange={(e) => setExpYears(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                fullWidth size="small" inputProps={{ inputMode: 'numeric' }}
                placeholder="e.g. 5" />
              <TextField label="Date of joining" type="date" value={dateOfJoin}
                onChange={(e) => setDateOfJoin(e.target.value)}
                InputLabelProps={{ shrink: true }} size="small" fullWidth />
            </Stack>
          </Stack>

          {/* ── Proof Documents ── */}
          <SectionLabel>Proof Documents</SectionLabel>
          <Stack gap={2}>
            <ProofUploadBox
              label="Government ID (Aadhaar / PAN / Passport)"
              preview={idProof}
              onFile={(f) => resizeDoc(f).then(setIdProof)}
            />
            <ProofUploadBox
              label="Qualification Certificate"
              preview={qualCert}
              onFile={(f) => resizeDoc(f).then(setQualCert)}
            />
          </Stack>

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
          {saving ? 'Adding…' : 'Add teacher'}
        </Button>
      </Box>
    </Drawer>
  );
}

function EditTeacherDrawer({
  teacher,
  onClose,
  onSubmit,
  saving,
}: {
  teacher: OwnerTeacher | null;
  onClose: () => void;
  onSubmit: (payload: import('../../api/owner.api').OwnerTeacherUpdatePayload) => void;
  saving: boolean;
}) {
  const [spec, setSpec]             = useState('');
  const [qualification, setQual]    = useState('');
  const [expYears, setExpYears]     = useState('');
  const [dateOfJoin, setDateOfJoin] = useState('');
  const [active, setActive]         = useState(true);
  const [idProof, setIdProof]       = useState<string | null>(null);
  const [qualCert, setQualCert]     = useState<string | null>(null);

  useEffect(() => {
    if (teacher) {
      setSpec(teacher.specialisation ?? '');
      setQual(teacher.qualification ?? '');
      setExpYears(teacher.experience_years != null ? String(teacher.experience_years) : '');
      setDateOfJoin(teacher.joined_at ? teacher.joined_at.slice(0, 10) : '');
      setActive(teacher.is_active);
      setIdProof(teacher.id_proof_url ?? null);
      setQualCert(teacher.qualification_cert_url ?? null);
    }
  }, [teacher?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!teacher) return null;

  const submit = () => {
    const payload: import('../../api/owner.api').OwnerTeacherUpdatePayload = {};
    if (spec.trim() !== (teacher.specialisation ?? '')) payload.specialisation = spec.trim() || null;
    if (qualification.trim() !== (teacher.qualification ?? '')) payload.qualification = qualification.trim() || null;
    const newExp = expYears ? parseInt(expYears, 10) : null;
    if (newExp !== (teacher.experience_years ?? null)) payload.experience_years = newExp;
    const origJoin = teacher.joined_at ? teacher.joined_at.slice(0, 10) : '';
    if (dateOfJoin !== origJoin) payload.date_of_join = dateOfJoin || null;
    if (active !== teacher.is_active) payload.is_active = active;
    if (idProof !== (teacher.id_proof_url ?? null)) payload.id_proof_base64 = idProof;
    if (qualCert !== (teacher.qualification_cert_url ?? null)) payload.qualification_cert_base64 = qualCert;
    onSubmit(payload);
  };

  return (
    <Drawer
      anchor="right"
      open
      onClose={() => !saving && onClose()}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 460 },
          display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 32px rgba(15,30,53,0.18)',
        },
      }}
    >
      <DialogHeader
        icon={<EditRoundedIcon sx={{ fontSize: 20 }} />}
        title="Edit Teacher"
        subtitle={teacher.name}
        onClose={onClose}
        disabled={saving}
      />

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
        <Stack gap={0}>

          {/* Identity card (read-only) */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            border: `1px solid ${BRAND.divider}`, borderRadius: 2,
            p: 1.5, mb: 3, bgcolor: BRAND.surface,
          }}>
            <Avatar sx={{
              width: 40, height: 40, flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              fontSize: 14, fontWeight: 700,
            }}>
              {teacher.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{teacher.name}</Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                {teacher.mobile_number}{teacher.email ? ` · ${teacher.email}` : ''}
              </Typography>
            </Box>
          </Box>

          {/* ── Professional ── */}
          <SectionLabel>Professional Details</SectionLabel>
          <Stack gap={2} mb={3}>
            <TextField label="Specialisation / Subject" value={spec}
              onChange={(e) => setSpec(e.target.value)} fullWidth size="small"
              placeholder="e.g. Mathematics, Bharatanatyam" />
            <TextField label="Qualification" value={qualification}
              onChange={(e) => setQual(e.target.value)} fullWidth size="small"
              placeholder="e.g. B.Ed, M.Sc, Diploma in Dance" />
            <TextField label="Years of experience" value={expYears}
              onChange={(e) => setExpYears(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
              fullWidth size="small" inputProps={{ inputMode: 'numeric' }} placeholder="e.g. 5" />
          </Stack>

          {/* ── Enrollment ── */}
          <SectionLabel>Enrollment</SectionLabel>
          <Box mb={3}>
            <TextField label="Date of joining" type="date" value={dateOfJoin}
              onChange={(e) => setDateOfJoin(e.target.value)}
              InputLabelProps={{ shrink: true }} size="small" fullWidth
              helperText="Date this teacher joined this center" />
          </Box>

          {/* ── Proof Documents ── */}
          <SectionLabel>Proof Documents</SectionLabel>
          <Stack gap={2} mb={3}>
            <ProofUploadBox
              label="Government ID (Aadhaar / PAN / Passport)"
              preview={idProof}
              onFile={(f) => resizeDoc(f).then(setIdProof)}
            />
            <ProofUploadBox
              label="Qualification Certificate"
              preview={qualCert}
              onFile={(f) => resizeDoc(f).then(setQualCert)}
            />
          </Stack>

          {/* ── Status ── */}
          <SectionLabel>Status</SectionLabel>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{
            border: `1px solid ${BRAND.divider}`, borderRadius: 2, px: 2, py: 1,
          }}>
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Active</Typography>
              <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
                Inactive teachers can't be assigned to new batches.
              </Typography>
            </Box>
            <Switch checked={active} onChange={(_, v) => setActive(v)} />
          </Stack>

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
          onClick={submit} disabled={saving}
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

export default function OwnerTeachersPage() {
  const { centerId, centers } = useOwnerCenter();
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<OwnerTeacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnerTeacher | null>(null);

  const centerName = centers.find((c) => c.id === centerId)?.name ?? '';

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['owner', 'teachers', centerId],
    queryFn: () => listOwnerTeachers(centerId!),
    enabled: !!centerId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      (t.email ?? '').toLowerCase().includes(q) ||
      t.mobile_number.includes(q) ||
      (t.specialisation ?? '').toLowerCase().includes(q),
    );
  }, [teachers, search]);

  const createMut = useMutation({
    mutationFn: (payload: import('../../api/owner.api').OwnerTeacherCreatePayload) =>
      createOwnerTeacher(centerId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'teachers', centerId] });
      showSnack('Teacher added', 'success');
      setAdding(false);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: import('../../api/owner.api').OwnerTeacherUpdatePayload }) =>
      updateOwnerTeacher(centerId!, vars.id, vars.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'teachers', centerId] });
      showSnack('Teacher updated', 'success');
      setEditing(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeOwnerTeacher(centerId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'teachers', centerId] });
      showSnack('Teacher removed', 'success');
      setDeleteTarget(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography sx={{ color: BRAND.textSecondary }}>
            Select a center to manage its teachers.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const active = teachers.filter((t) => t.is_active).length;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
            Teachers
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
            {centerName} &middot; {active}/{teachers.length} active
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAdding(true)}>
          Add Teacher
        </Button>
      </Stack>

      {/* Search */}
      <Card sx={{ borderRadius: '16px', mb: 2 }}>
        <CardContent sx={{ p: '16px !important' }}>
          <TextField
            size="small"
            placeholder="Search by name, mobile, email, or specialisation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
                </InputAdornment>
              ),
            }}
          />
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
                <SupervisorAccountRoundedIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                {teachers.length === 0 ? 'No teachers yet' : 'No teachers match your search'}
              </Typography>
              {teachers.length === 0 && (
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                  Add a teacher by their registered mobile number.
                </Typography>
              )}
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Specialisation</TableCell>
                  <TableCell>Qualification</TableCell>
                  <TableCell>Exp.</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} hover sx={{ opacity: t.is_active ? 1 : 0.6 }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.25}>
                        <Avatar sx={{
                          width: 32, height: 32,
                          bgcolor: BRAND.primaryBg, color: BRAND.primary,
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {t.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</Typography>
                          {t.email && (
                            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{t.email}</Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{t.mobile_number}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{t.specialisation ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{t.qualification ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {t.experience_years != null ? `${t.experience_years} yr${t.experience_years !== 1 ? 's' : ''}` : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {t.joined_at ? new Date(t.joined_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          height: 22, fontSize: 11, fontWeight: 600,
                          bgcolor: t.is_active ? '#ECFDF5' : BRAND.surface,
                          color: t.is_active ? STATUS_COLORS.approved : BRAND.textSecondary,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => setEditing(t)}>
                          <EditRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove from center">
                        <IconButton size="small" onClick={() => setDeleteTarget(t)}>
                          <DeleteRoundedIcon sx={{ fontSize: 18, color: STATUS_COLORS.rejected }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddTeacherDrawer
        open={adding}
        onClose={() => setAdding(false)}
        saving={createMut.isPending}
        onSubmit={(payload) => createMut.mutate(payload)}
      />

      <EditTeacherDrawer
        teacher={editing}
        onClose={() => setEditing(null)}
        saving={updateMut.isPending}
        onSubmit={(payload) => editing && updateMut.mutate({ id: editing.id, payload })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove teacher?"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.name} from ${centerName}? Their user account stays but they won't have Teacher access at this center.`
            : ''
        }
        confirmLabel="Remove"
        confirmColor="error"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMut.mutate(deleteTarget.id)}
        loading={removeMut.isPending}
      />
    </Box>
  );
}
