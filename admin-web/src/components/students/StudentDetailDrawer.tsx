import {
  Avatar, Box, Button, Chip, Drawer, IconButton, Stack, Typography,
} from '@mui/material';
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded';
import CakeRoundedIcon          from '@mui/icons-material/CakeRounded';
import EditRoundedIcon          from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon        from '@mui/icons-material/DeleteRounded';
import BusinessRoundedIcon      from '@mui/icons-material/BusinessRounded';
import PhoneRoundedIcon         from '@mui/icons-material/PhoneRounded';
import PersonRoundedIcon        from '@mui/icons-material/PersonRounded';
import LinkOffRoundedIcon       from '@mui/icons-material/LinkOffRounded';
import AddBusinessRoundedIcon   from '@mui/icons-material/AddBusinessRounded';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteStudent, unenrollStudent, type Student,
} from '../../api/students.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  student: Student | null;
  onClose: () => void;
  onEdit: () => void;
  onEnroll: () => void;
}

export default function StudentDetailDrawer({
  open, student, onClose, onEdit, onEnroll,
}: Props) {
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      showSnack('Student deleted', 'success');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student-stats'] });
      onClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const unenrollMut = useMutation({
    mutationFn: ({ student_id, center_id }: { student_id: string; center_id: string }) =>
      unenrollStudent(student_id, center_id),
    onSuccess: () => {
      showSnack('Removed from center', 'success');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student', student?.id] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!student) return null;

  const initials = student.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const ageYears = student.date_of_birth
    ? Math.floor((Date.now() - new Date(student.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, bgcolor: '#FAFBFC' } }}
    >
      {/* Header */}
      <Box sx={{
        px: 2.5, pt: 2.5, pb: 2,
        background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
        color: '#fff',
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{
              width: 56, height: 56, fontSize: 22, fontWeight: 700,
              bgcolor: 'rgba(255,255,255,0.18)', color: '#fff',
              border: '2px solid rgba(255,255,255,0.3)',
            }}>
              {initials}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{student.name}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Chip
                  size="small" label={student.gender}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, height: 20, fontSize: 11 }}
                />
                {ageYears !== null && (
                  <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
                    {ageYears} yr{ageYears === 1 ? '' : 's'}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Action bar */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#fff', borderBottom: `1px solid ${BRAND.divider}` }}>
        <Stack direction="row" gap={1}>
          <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={onEdit}>
            Edit
          </Button>
          <Button size="small" variant="outlined" startIcon={<AddBusinessRoundedIcon />} onClick={onEnroll}>
            Enroll
          </Button>
          <Button
            size="small" variant="outlined" color="error" startIcon={<DeleteRoundedIcon />}
            disabled={deleteMut.isPending}
            onClick={() => {
              if (confirm(`Delete student "${student.name}"? This is a soft-delete.`)) {
                deleteMut.mutate(student.id);
              }
            }}
          >
            Delete
          </Button>
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1 }}>
        {/* Demographics */}
        <SectionCard title="Demographics">
          <Row icon={<CakeRoundedIcon />} label="Date of Birth"
            value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '—'} />
          <Row icon={<PersonRoundedIcon />} label="Gender" value={student.gender} />
          {student.medical_notes && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#FFFBEB', borderRadius: 1.5, borderLeft: '3px solid #F59E0B' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#B45309', mb: 0.25 }}>
                Medical Notes
              </Typography>
              <Typography sx={{ fontSize: 13, color: BRAND.textPrimary }}>
                {student.medical_notes}
              </Typography>
            </Box>
          )}
        </SectionCard>

        {/* Parent */}
        <SectionCard title="Parent">
          {student.parent_id ? (
            <>
              <Row icon={<PersonRoundedIcon />} label="Name" value={student.parent_name ?? '—'} />
              {student.parent_mobile && (
                <Row icon={<PhoneRoundedIcon />} label="Mobile" value={student.parent_mobile} />
              )}
            </>
          ) : (
            <Typography sx={{ fontSize: 13, color: BRAND.textSecondary, fontStyle: 'italic' }}>
              No parent linked. Edit to add a parent mobile.
            </Typography>
          )}
        </SectionCard>

        {/* Centers */}
        <SectionCard title={`Enrolled Centers (${student.centers.length})`}>
          {student.centers.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: BRAND.textSecondary, fontStyle: 'italic' }}>
              Not enrolled in any center.
            </Typography>
          ) : (
            <Stack gap={1}>
              {student.centers.map((c) => (
                <Box key={c.center_id} sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  p: 1.25, borderRadius: 1.5, border: `1px solid ${BRAND.divider}`, bgcolor: '#fff',
                }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <BusinessRoundedIcon sx={{ fontSize: 16, color: BRAND.textSecondary }} />
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{c.center_name}</Typography>
                      <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                        {c.invite_status} · since {new Date(c.enrolled_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Stack>
                  <IconButton
                    size="small" disabled={unenrollMut.isPending}
                    onClick={() => {
                      if (confirm(`Remove from ${c.center_name}?`)) {
                        unenrollMut.mutate({ student_id: student.id, center_id: c.center_id });
                      }
                    }}
                    sx={{ color: '#DC2626' }}
                  >
                    <LinkOffRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </SectionCard>
      </Box>
    </Drawer>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{
        fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
        textTransform: 'uppercase', letterSpacing: 0.6, mb: 1,
      }}>
        {title}
      </Typography>
      <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: `1px solid ${BRAND.divider}` }}>
        {children}
      </Box>
    </Box>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.25} sx={{ py: 0.5 }}>
      <Box sx={{ color: BRAND.textSecondary, display: 'flex', '& svg': { fontSize: 16 } }}>{icon}</Box>
      <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, minWidth: 90 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>{value}</Typography>
    </Stack>
  );
}

