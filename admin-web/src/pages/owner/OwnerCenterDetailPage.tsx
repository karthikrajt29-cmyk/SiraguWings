import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon     from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon          from '@mui/icons-material/EditRounded';
import LocationOnRoundedIcon    from '@mui/icons-material/LocationOnRounded';
import PhoneRoundedIcon         from '@mui/icons-material/PhoneRounded';
import EmailRoundedIcon         from '@mui/icons-material/EmailRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ScheduleRoundedIcon      from '@mui/icons-material/ScheduleRounded';
import PeopleRoundedIcon        from '@mui/icons-material/PeopleRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery }            from '@tanstack/react-query';
import { getOwnerCenter }      from '../../api/centers.api';
import StatusChip              from '../../components/common/StatusChip';
import EditCenterDialog        from '../../components/owner/EditCenterDialog';
import { useState }            from 'react';
import { BRAND }               from '../../theme';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <Stack direction="row" alignItems="flex-start" gap={1.5}>
      <Box sx={{ color: BRAND.textSecondary, mt: 0.15, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography sx={{
          fontSize: 10, color: BRAND.textSecondary, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 13, color: BRAND.textPrimary, mt: 0.2 }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

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

export default function OwnerCenterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-center', id],
    queryFn: () => getOwnerCenter(id!),
    enabled: !!id,
  });

  return (
    <Box>
      {/* ── Breadcrumb ── */}
      <Stack direction="row" alignItems="center" gap={1.5} mb={2.5}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/owner/centers')}
          size="small"
          sx={{
            color: BRAND.textSecondary, fontWeight: 500, fontSize: 13,
            textTransform: 'none', px: 1.25,
            '&:hover': { bgcolor: BRAND.primaryBg, color: BRAND.primary },
          }}
        >
          My Centers
        </Button>
        <Typography sx={{ color: BRAND.divider, fontSize: 16, lineHeight: 1 }}>/</Typography>
        {data && (
          <Stack direction="row" alignItems="center" gap={1} sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
              {data.name}
            </Typography>
            <StatusChip status={data.registration_status} />
          </Stack>
        )}
        {data && (
          <Button
            variant="contained"
            size="small"
            startIcon={<EditRoundedIcon />}
            onClick={() => setEditing(true)}
          >
            Edit details
          </Button>
        )}
      </Stack>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size={32} sx={{ color: BRAND.primary }} />
        </Box>
      )}

      {isError && (
        <Box sx={{
          py: 6, textAlign: 'center',
          border: `1px solid ${BRAND.divider}`, borderRadius: 3,
        }}>
          <Typography sx={{ color: 'error.main', mb: 1.5 }}>
            Failed to load center details.
          </Typography>
        </Box>
      )}

      {data && (
        <Box sx={{
          borderRadius: 3, border: `1px solid ${BRAND.divider}`,
          overflow: 'hidden', bgcolor: '#fff',
          boxShadow: '0 1px 6px rgba(15,30,53,0.06)',
        }}>
          {/* ── Cover banner ── */}
          <Box sx={{
            background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navyLight} 100%)`,
            px: 3, pt: 2.5, pb: 5.5, position: 'relative',
          }}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <StatusChip status={data.registration_status} />
              {data.subscription_status && data.subscription_status !== data.registration_status && (
                <StatusChip status={data.subscription_status} />
              )}
            </Stack>
          </Box>

          {/* ── Logo + name ── */}
          <Box sx={{ px: 3, mt: -4 }}>
            <Avatar sx={{
              width: 72, height: 72, border: '3px solid #fff',
              boxShadow: '0 4px 16px rgba(15,30,53,0.18)',
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              fontSize: 22, fontWeight: 800, color: '#fff',
            }}>
              {data.logo_url ? (
                <img src={data.logo_url} alt={data.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                data.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
              )}
            </Avatar>

            <Box mt={1.5}>
              <Typography sx={{ fontSize: 19, fontWeight: 700, color: BRAND.textPrimary, lineHeight: 1.2 }}>
                {data.name}
              </Typography>
              <Stack direction="row" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
                <Chip label={data.category} size="small" sx={{
                  fontSize: 11, fontWeight: 600, height: 22,
                  bgcolor: BRAND.primaryBg, color: BRAND.primary,
                }} />
                <Stack direction="row" alignItems="center" gap={0.4}>
                  <LocationOnRoundedIcon sx={{ fontSize: 13, color: BRAND.textSecondary }} />
                  <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                    {data.city}
                    {data.state && data.state !== 'Tamil Nadu' ? `, ${data.state}` : ''}
                    {data.pincode ? ` – ${data.pincode}` : ''}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Box>

          {/* ── Sections ── */}
          <Box sx={{ px: 3, pt: 3, pb: 3 }}>
            <Stack gap={3}>
              {/* Contact */}
              <Box>
                <SectionTitle>Contact</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<PeopleRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Owner" value={data.owner_user_name ?? data.owner_name} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<PhoneRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Phone" value={data.owner_user_mobile ?? data.mobile_number} />
                  </Grid>
                  {data.owner_user_email && (
                    <Grid item xs={12} sm={6}>
                      <InfoRow icon={<EmailRoundedIcon sx={{ fontSize: 15 }} />}
                        label="Email" value={data.owner_user_email} />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <InfoRow icon={<LocationOnRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Address"
                      value={[data.address, data.city, data.state, data.pincode].filter(Boolean).join(', ')} />
                  </Grid>
                  {data.gstin && (
                    <Grid item xs={12} sm={6}>
                      <InfoRow icon={<PeopleRoundedIcon sx={{ fontSize: 15 }} />}
                        label="GSTIN" value={data.gstin} />
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider />

              {/* Operations */}
              <Box>
                <SectionTitle>Operations</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<CalendarMonthRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Operating Days" value={data.operating_days} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<ScheduleRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Timings" value={data.operating_timings} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<PeopleRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Age Group" value={data.age_group} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow icon={<CurrencyRupeeRoundedIcon sx={{ fontSize: 15 }} />}
                      label="Fee Range" value={data.fee_range} />
                  </Grid>
                  {data.description && (
                    <Grid item xs={12}>
                      <Typography sx={{
                        fontSize: 10, color: BRAND.textSecondary, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5,
                      }}>
                        Description
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: BRAND.textPrimary, lineHeight: 1.7 }}>
                        {data.description}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Stack>
          </Box>
        </Box>
      )}

      <EditCenterDialog
        open={editing}
        onClose={() => setEditing(false)}
        center={data ?? null}
      />
    </Box>
  );
}
