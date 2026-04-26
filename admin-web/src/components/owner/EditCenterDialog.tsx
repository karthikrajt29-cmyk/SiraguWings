import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CenterDetail,
  type CenterUpdatePayload,
} from '../../api/centers.api';
import { updateOwnerCenter } from '../../api/owner.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { DialogHeader, DialogFooter } from '../common/DialogHeader';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  onClose: () => void;
  center: CenterDetail | null;
}

export default function EditCenterDialog({ open, onClose, center }: Props) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const [name, setName]                  = useState('');
  const [ownerName, setOwnerName]        = useState('');
  const [mobile, setMobile]              = useState('');
  const [address, setAddress]            = useState('');
  const [city, setCity]                  = useState('');
  const [state, setState]                = useState('');
  const [pincode, setPincode]            = useState('');
  const [description, setDescription]    = useState('');
  const [operatingDays, setOperatingDays] = useState('');
  const [operatingTimings, setOperatingTimings] = useState('');
  const [ageGroup, setAgeGroup]          = useState('');
  const [feeRange, setFeeRange]          = useState('');
  const [facilities, setFacilities]      = useState('');
  const [websiteLink, setWebsiteLink]    = useState('');
  const [socialLink, setSocialLink]      = useState('');
  const [gstin, setGstin]                = useState('');

  useEffect(() => {
    if (!open || !center) return;
    setName(center.name ?? '');
    setOwnerName(center.owner_name ?? '');
    setMobile(center.mobile_number ?? '');
    setAddress(center.address ?? '');
    setCity(center.city ?? '');
    setState(center.state ?? '');
    setPincode(center.pincode ?? '');
    setDescription(center.description ?? '');
    setOperatingDays(center.operating_days ?? '');
    setOperatingTimings(center.operating_timings ?? '');
    setAgeGroup(center.age_group ?? '');
    setFeeRange(center.fee_range ?? '');
    setFacilities(center.facilities ?? '');
    setWebsiteLink(center.website_link ?? '');
    setSocialLink(center.social_link ?? '');
    setGstin(center.gstin ?? '');
  }, [open, center]);

  const saveMut = useMutation({
    mutationFn: (payload: CenterUpdatePayload) => updateOwnerCenter(center!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-center', center?.id] });
      qc.invalidateQueries({ queryKey: ['owner', 'centers'] });
      showSnack('Center updated', 'success');
      onClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const submit = () => {
    if (!center) return;
    const diff: CenterUpdatePayload = {};
    if (name !== center.name)                       diff.name = name.trim();
    if (ownerName !== (center.owner_name ?? ''))    diff.owner_name = ownerName.trim();
    if (mobile !== (center.mobile_number ?? ''))    diff.mobile_number = mobile.trim();
    if (address !== (center.address ?? ''))         diff.address = address.trim();
    if (city !== (center.city ?? ''))               diff.city = city.trim();
    if (state !== (center.state ?? ''))             diff.state = state.trim();
    if (pincode !== (center.pincode ?? ''))         diff.pincode = pincode.trim();
    if (description !== (center.description ?? '')) diff.description = description.trim();
    if (operatingDays !== (center.operating_days ?? ''))       diff.operating_days = operatingDays.trim();
    if (operatingTimings !== (center.operating_timings ?? '')) diff.operating_timings = operatingTimings.trim();
    if (ageGroup !== (center.age_group ?? ''))      diff.age_group = ageGroup.trim();
    if (feeRange !== (center.fee_range ?? ''))      diff.fee_range = feeRange.trim();
    if (facilities !== (center.facilities ?? ''))   diff.facilities = facilities.trim();
    if (websiteLink !== (center.website_link ?? '')) diff.website_link = websiteLink.trim();
    if (socialLink !== (center.social_link ?? ''))   diff.social_link = socialLink.trim();
    if (gstin.trim().toUpperCase() !== (center.gstin ?? '')) {
      diff.gstin = gstin.trim() ? gstin.trim().toUpperCase() : null;
    }
    if (Object.keys(diff).length === 0) {
      showSnack('No changes to save', 'info');
      return;
    }
    saveMut.mutate(diff);
  };

  return (
    <Dialog
      open={open}
      onClose={() => { if (!saveMut.isPending) onClose(); }}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <DialogHeader
        icon={<EditRoundedIcon sx={{ fontSize: 20 }} />}
        title="Edit Center Details"
        subtitle="Category, registration status, and admin notes can only be changed by an Admin."
        onClose={onClose}
        disabled={saveMut.isPending}
      />

      <DialogContent sx={{ py: 2.5 }}>
        <Stack gap={3}>
          <Section title="Basics">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} fullWidth size="small" />
              </Grid>
            </Grid>
          </Section>

          <Section title="Location">
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth size="small" multiline minRows={2} />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={8} sm={4}>
                <TextField label="State" value={state} onChange={(e) => setState(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={4} sm={3}>
                <TextField label="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} fullWidth size="small" />
              </Grid>
            </Grid>
          </Section>

          <Section title="Operations">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Operating days" value={operatingDays} onChange={(e) => setOperatingDays(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Operating timings" value={operatingTimings} onChange={(e) => setOperatingTimings(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Age group" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Fee range" value={feeRange} onChange={(e) => setFeeRange(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Facilities" value={facilities} onChange={(e) => setFacilities(e.target.value)} fullWidth size="small" multiline minRows={2} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth size="small" multiline minRows={3} />
              </Grid>
            </Grid>
          </Section>

          <Section title="Tax">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="GSTIN (15-char)"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  inputProps={{ maxLength: 15, style: { textTransform: 'uppercase' } }}
                  placeholder="22AAAAA0000A1Z5"
                  helperText="Optional. When set, fee invoices show CGST/SGST split."
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Section>

          <Section title="Links">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Website" value={websiteLink} onChange={(e) => setWebsiteLink(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Social link" value={socialLink} onChange={(e) => setSocialLink(e.target.value)} fullWidth size="small" />
              </Grid>
            </Grid>
          </Section>
        </Stack>
      </DialogContent>

      <DialogFooter>
        <Button onClick={onClose} disabled={saveMut.isPending}
          sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saveMut.isPending}
          startIcon={saveMut.isPending ? <CircularProgress size={13} color="inherit" /> : <EditRoundedIcon />}
          sx={{
            fontSize: 13, fontWeight: 600, px: 2.5,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          }}
        >
          {saveMut.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{
        fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
        textTransform: 'uppercase', letterSpacing: 0.6, mb: 1,
      }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
