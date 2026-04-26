import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon         from '@mui/icons-material/SearchRounded';
import FamilyRestroomRoundedIcon from '@mui/icons-material/FamilyRestroomRounded';
import EmailRoundedIcon          from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon          from '@mui/icons-material/PhoneRounded';
import { useQuery } from '@tanstack/react-query';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import { listOwnerParents } from '../../api/owner.api';
import { BRAND, STATUS_COLORS } from '../../theme';

export default function OwnerParentsPage() {
  const { centerId, centers } = useOwnerCenter();
  const [search, setSearch] = useState('');

  const centerName = centers.find((c) => c.id === centerId)?.name ?? '';

  const { data: parents = [], isLoading } = useQuery({
    queryKey: ['owner', 'parents', centerId],
    queryFn: () => listOwnerParents(centerId!),
    enabled: !!centerId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return parents;
    const q = search.toLowerCase();
    return parents.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      p.mobile_number.includes(q),
    );
  }, [parents, search]);

  const totalStudents = useMemo(
    () => parents.reduce((s, p) => s + p.student_count, 0),
    [parents],
  );

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography sx={{ color: BRAND.textSecondary }}>
            Select a center to view its parents.
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
            Parents
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
            {centerName} &middot; {parents.length} parent{parents.length === 1 ? '' : 's'}
            {parents.length > 0 && ` covering ${totalStudents} student${totalStudents === 1 ? '' : 's'}`}
          </Typography>
        </Box>
      </Stack>

      {/* Search */}
      <Card sx={{ borderRadius: '16px', mb: 2 }}>
        <CardContent sx={{ p: '16px !important' }}>
          <TextField
            size="small"
            placeholder="Search by name, email, or mobile…"
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
                <FamilyRestroomRoundedIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                {parents.length === 0 ? 'No parents linked yet' : 'No parents match your search'}
              </Typography>
              {parents.length === 0 && (
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                  Parents appear here once you enroll students with linked parent mobile numbers.
                </Typography>
              )}
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Parent</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Students</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.25}>
                        <Avatar sx={{
                          width: 32, height: 32,
                          bgcolor: BRAND.primaryBg, color: BRAND.primary,
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {p.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </Avatar>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                          {p.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={0.75}>
                        <PhoneRoundedIcon sx={{ fontSize: 14, color: BRAND.textSecondary }} />
                        <Typography sx={{ fontSize: 13 }}>{p.mobile_number}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {p.email ? (
                        <Stack direction="row" alignItems="center" gap={0.75}>
                          <EmailRoundedIcon sx={{ fontSize: 14, color: BRAND.textSecondary }} />
                          <Typography sx={{ fontSize: 13 }}>{p.email}</Typography>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={p.student_count}
                        size="small"
                        sx={{
                          height: 22, minWidth: 36, fontSize: 12, fontWeight: 700,
                          bgcolor: BRAND.primaryBg, color: BRAND.primary,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={p.status}
                        size="small"
                        sx={{
                          height: 22, fontSize: 11, fontWeight: 600,
                          bgcolor: p.status === 'Active' ? '#ECFDF5' : BRAND.surface,
                          color: p.status === 'Active' ? STATUS_COLORS.approved : BRAND.textSecondary,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
