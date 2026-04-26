import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { verifyToken } from '../../api/auth.api';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import {
  VisibilityRounded,
  VisibilityOffRounded,
  BusinessRounded,
  PeopleRounded,
  ReceiptRounded,
  CampaignRounded,
  CheckCircleRounded,
} from '@mui/icons-material';
import { BRAND } from '../../theme';

/* ── Google logo ── */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

/* ── Feature item for left panel ── */
function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box sx={{
        width: 38, height: 38, borderRadius: '10px',
        bgcolor: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: '#FFD166',
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff', mb: 0.25 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          {desc}
        </Typography>
      </Box>
    </Box>
  );
}

/* ── Decorative circle ── */
function Circle({ size, top, left, right, bottom, opacity }: {
  size: number; top?: string | number; left?: string | number;
  right?: string | number; bottom?: string | number; opacity?: number;
}) {
  return (
    <Box sx={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: '50%',
      border: '1px solid rgba(255,255,255,0.15)',
      top, left, right, bottom,
      opacity: opacity ?? 1,
      pointerEvents: 'none',
    }} />
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleAfterSignIn = async (idToken: string) => {
    const profile = await verifyToken(idToken);
    const hasAdmin = profile.roles.some((r) => r.role === 'Admin');
    const hasOwner = profile.roles.some((r) => r.role === 'Owner');

    if (hasAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (hasOwner) {
      navigate('/owner/dashboard', { replace: true });
      return;
    }
    setError('Access denied — your account has no portal access.');
    await auth.signOut();
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleAfterSignIn(await result.user.getIdToken());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally { setLoading(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleAfterSignIn(await result.user.getIdToken());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally { setLoading(false); }
  };

  /* shared input style */
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      fontSize: 14,
      bgcolor: BRAND.surface,
      color: BRAND.textPrimary,
      '& fieldset': { borderColor: BRAND.divider },
      '&:hover fieldset': { borderColor: `${BRAND.primary}60` },
      '&.Mui-focused fieldset': { borderColor: BRAND.primary, borderWidth: 2 },
    },
    '& .MuiInputLabel-root': {
      fontSize: 14,
      color: BRAND.textSecondary,
      '&.Mui-focused': { color: BRAND.primary },
    },
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', fontFamily: 'Roboto, sans-serif' }}>

      {/* ═══════════════════════════════════════
          LEFT — brand panel
      ═══════════════════════════════════════ */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        flex: '0 0 480px',
        background: `linear-gradient(160deg, #081528 0%, ${BRAND.navyDark} 45%, ${BRAND.navyLight} 100%)`,
        position: 'relative',
        overflow: 'hidden',
        px: 6, py: 7,
      }}>
        {/* decorative rings */}
        <Circle size={480} top={-120} right={-200} />
        <Circle size={300} top={-60}  right={-140} opacity={0.5} />
        <Circle size={600} bottom={-260} left={-250} opacity={0.3} />
        <Circle size={200} bottom={60}  right={-80}  opacity={0.4} />

        {/* glow blob */}
        <Box sx={{
          position: 'absolute', width: 320, height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,209,102,0.25) 0%, transparent 70%)',
          top: '35%', right: -80,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />

        {/* logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 7, position: 'relative' }}>
          <Box sx={{
            width: 46, height: 46, borderRadius: '13px',
            bgcolor: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: -1 }}>
              SW
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 18, lineHeight: 1.1 }}>
              SiraguWings
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
              Admin Console
            </Typography>
          </Box>
        </Box>

        {/* headline */}
        <Box sx={{ position: 'relative', mb: 6 }}>
          <Typography sx={{
            color: '#fff', fontWeight: 800, fontSize: 36,
            lineHeight: 1.15, letterSpacing: -0.5, mb: 2,
          }}>
            Manage India's<br />
            coaching ecosystem
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7 }}>
            One platform to onboard, monitor and grow<br />
            coaching centres — starting from Chennai.
          </Typography>
        </Box>

        {/* features */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}>
          <Feature
            icon={<BusinessRounded sx={{ fontSize: 20 }} />}
            title="Centre Onboarding"
            desc="Approve, reject or suspend coaching centres with one click."
          />
          <Feature
            icon={<PeopleRounded sx={{ fontSize: 20 }} />}
            title="Student Deduplication"
            desc="Detect and merge duplicate student records automatically."
          />
          <Feature
            icon={<ReceiptRounded sx={{ fontSize: 20 }} />}
            title="Billing & Invoicing"
            desc="Track MRR, outstanding amounts and platform fees in real-time."
          />
          <Feature
            icon={<CampaignRounded sx={{ fontSize: 20 }} />}
            title="Feed Moderation"
            desc="Review and approve posts before they reach parents."
          />
        </Box>

        {/* bottom badge */}
        <Box sx={{
          mt: 'auto', pt: 6,
          display: 'flex', alignItems: 'center', gap: 1,
          position: 'relative',
        }}>
          <CheckCircleRounded sx={{ color: '#FFD166', fontSize: 18 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5 }}>
            Secured with Firebase Authentication · Admin-only access
          </Typography>
        </Box>
      </Box>

      {/* ═══════════════════════════════════════
          RIGHT — form panel
      ═══════════════════════════════════════ */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#FFFFFF',
        px: { xs: 3, sm: 6 },
        py: 6,
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>

          {/* mobile brand */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 5 }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>SW</Typography>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: BRAND.textPrimary }}>
              SiraguWings
            </Typography>
          </Box>

          {/* heading */}
          <Box sx={{ mb: 5 }}>
            <Typography sx={{
              fontSize: 28, fontWeight: 800,
              color: BRAND.textPrimary, mb: 0.75, lineHeight: 1.2,
            }}>
              Welcome back
            </Typography>
            <Typography sx={{ fontSize: 15, color: BRAND.textSecondary }}>
              Sign in to your admin portal
            </Typography>
          </Box>

          {/* error */}
          <Collapse in={!!error}>
            <Alert
              severity="error"
              onClose={() => setError('')}
              sx={{ mb: 3, borderRadius: '10px', fontSize: 13 }}
            >
              {error}
            </Alert>
          </Collapse>

          {/* Google */}
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogle}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <GoogleLogo />}
            sx={{
              py: 1.4, borderRadius: '10px',
              borderColor: BRAND.divider,
              color: BRAND.textPrimary,
              bgcolor: '#fff',
              fontWeight: 500, fontSize: 14,
              textTransform: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              '&:hover': {
                borderColor: `${BRAND.primary}50`,
                bgcolor: BRAND.surface,
                boxShadow: '0 2px 8px rgba(229,62,0,0.1)',
              },
              mb: 3,
            }}
          >
            Continue with Google
          </Button>

          {/* divider */}
          <Divider sx={{ mb: 3, borderColor: BRAND.divider }}>
            <Typography sx={{ color: BRAND.textSecondary, fontSize: 12, px: 1.5, fontWeight: 500 }}>
              or sign in with email
            </Typography>
          </Divider>

          {/* email + password */}
          <Box component="form" onSubmit={handleEmail} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Email address"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={inputSx}
            />

            <TextField
              label="Password"
              type={showPwd ? 'text' : 'password'}
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPwd((p) => !p)}
                      tabIndex={-1}
                      edge="end"
                      sx={{ color: BRAND.textSecondary, mr: -0.5 }}
                    >
                      {showPwd
                        ? <VisibilityOffRounded sx={{ fontSize: 20 }} />
                        : <VisibilityRounded   sx={{ fontSize: 20 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={inputSx}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                mt: 0.5, py: 1.45,
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
                fontWeight: 700, fontSize: 15,
                textTransform: 'none',
                boxShadow: `0 4px 16px rgba(229,62,0,0.35)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 100%)`,
                  boxShadow: `0 6px 24px rgba(229,62,0,0.45)`,
                },
                '&.Mui-disabled': { background: '#E5E7EB', boxShadow: 'none' },
              }}
            >
              {loading
                ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                : 'Sign in'}
            </Button>
          </Box>

          {/* footer */}
          <Typography sx={{
            textAlign: 'center', mt: 5,
            fontSize: 12, color: '#C4A99A', lineHeight: 1.6,
          }}>
            Admin access only.<br />Unauthorised use is strictly prohibited.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
