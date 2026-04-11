import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { verifyToken } from '../../api/auth.api';

import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined,
  SchoolOutlined,
  GroupsOutlined,
  ReceiptLongOutlined,
  CampaignOutlined,
} from '@mui/icons-material';

/* ── Google 'G' SVG logo ─────────────────────────── */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

/* ── Floating feature pill ───────────────────────── */
function FeaturePill({
  icon,
  label,
  position,
}: {
  icon: React.ReactNode;
  label: string;
  position: { top?: string; bottom?: string; left?: string; right?: string };
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        ...position,
        display: { xs: 'none', lg: 'flex' },
        alignItems: 'center',
        gap: 1,
        bgcolor: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(12px)',
        borderRadius: '40px',
        px: 2.5,
        py: 1,
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: 0.2,
        animation: 'float 6s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      }}
    >
      {icon}
      {label}
    </Box>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAfterSignIn = async (idToken: string) => {
    const profile = await verifyToken(idToken);
    if (!profile.roles.some((r) => r.role === 'Admin')) {
      setError('Access denied — Admin account required.');
      await auth.signOut();
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await handleAfterSignIn(token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      await handleAfterSignIn(token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        /* Rich gradient background */
        background: 'linear-gradient(135deg, #0F0C29 0%, #302B63 50%, #24243E 100%)',
        fontFamily: 'Roboto, sans-serif',
      }}
    >
      {/* ── Animated gradient orbs ── */}
      <Box
        sx={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.35) 0%, transparent 70%)',
          top: '-15%',
          right: '-10%',
          filter: 'blur(60px)',
          animation: 'pulse1 8s ease-in-out infinite',
          '@keyframes pulse1': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.6 },
            '50%': { transform: 'scale(1.15)', opacity: 0.9 },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
          bottom: '-10%',
          left: '-8%',
          filter: 'blur(50px)',
          animation: 'pulse2 10s ease-in-out infinite',
          '@keyframes pulse2': {
            '0%, 100%': { transform: 'scale(1.1)', opacity: 0.5 },
            '50%': { transform: 'scale(0.9)', opacity: 0.8 },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
          top: '40%',
          left: '60%',
          filter: 'blur(40px)',
          animation: 'pulse3 12s ease-in-out infinite',
          '@keyframes pulse3': {
            '0%, 100%': { transform: 'translate(0, 0)' },
            '50%': { transform: 'translate(-30px, 20px)' },
          },
        }}
      />

      {/* ── Floating feature pills ── */}
      <FeaturePill
        icon={<SchoolOutlined sx={{ fontSize: 18 }} />}
        label="Centre Management"
        position={{ top: '18%', left: '8%' }}
      />
      <FeaturePill
        icon={<GroupsOutlined sx={{ fontSize: 18 }} />}
        label="Student Tracking"
        position={{ top: '30%', right: '6%' }}
      />
      <FeaturePill
        icon={<ReceiptLongOutlined sx={{ fontSize: 18 }} />}
        label="Billing & Invoicing"
        position={{ bottom: '28%', left: '5%' }}
      />
      <FeaturePill
        icon={<CampaignOutlined sx={{ fontSize: 18 }} />}
        label="Feed & Notifications"
        position={{ bottom: '16%', right: '9%' }}
      />

      {/* ── Login card ── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 440,
          mx: 2,
        }}
      >
        {/* Brand header above card */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: '0 8px 32px rgba(79,70,229,0.4)',
            }}
          >
            <Typography
              sx={{
                color: '#fff',
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: -1,
                lineHeight: 1,
              }}
            >
              SW
            </Typography>
          </Box>
          <Typography
            variant="h5"
            sx={{
              color: '#fff',
              fontWeight: 700,
              letterSpacing: -0.5,
              mb: 0.5,
            }}
          >
            SiraguWings
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 13.5 }}>
            Admin Portal
          </Typography>
        </Box>

        {/* Glass card */}
        <Box
          sx={{
            bgcolor: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.12)',
            p: { xs: 3.5, sm: 5 },
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          }}
        >
          {/* Lock icon + heading */}
          <Box sx={{ textAlign: 'center', mb: 3.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'rgba(99,102,241,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <LockOutlined sx={{ color: '#A5B4FC', fontSize: 22 }} />
            </Box>
            <Typography
              variant="h6"
              sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}
            >
              Welcome back
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
              Sign in to continue to your dashboard
            </Typography>
          </Box>

          {/* Error alert */}
          <Collapse in={!!error}>
            <Alert
              severity="error"
              onClose={() => setError('')}
              sx={{
                mb: 2.5,
                borderRadius: '12px',
                fontSize: 13,
                bgcolor: 'rgba(239,68,68,0.15)',
                color: '#FCA5A5',
                border: '1px solid rgba(239,68,68,0.25)',
                '& .MuiAlert-icon': { color: '#F87171' },
              }}
            >
              {error}
            </Alert>
          </Collapse>

          {/* Google button */}
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogle}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <GoogleLogo />}
            sx={{
              py: 1.4,
              borderRadius: '12px',
              borderColor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              bgcolor: 'rgba(255,255,255,0.06)',
              fontWeight: 500,
              fontSize: 14,
              textTransform: 'none',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.12)',
                borderColor: 'rgba(255,255,255,0.25)',
              },
              mb: 3,
            }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }}>
            <Typography
              sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, px: 1.5 }}
            >
              OR
            </Typography>
          </Divider>

          {/* Email / password form */}
          <Box
            component="form"
            onSubmit={handleEmailLogin}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            <TextField
              label="Email address"
              type="email"
              size="small"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  fontSize: 14,
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.12)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.25)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6366F1',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 14,
                  '&.Mui-focused': { color: '#A5B4FC' },
                },
              }}
            />

            <TextField
              label="Password"
              type={showPwd ? 'text' : 'password'}
              size="small"
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
                      edge="end"
                      tabIndex={-1}
                      sx={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      {showPwd ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  fontSize: 14,
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.12)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.25)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6366F1',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 14,
                  '&.Mui-focused': { color: '#A5B4FC' },
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                py: 1.35,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                fontWeight: 600,
                fontSize: 14.5,
                textTransform: 'none',
                boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #818CF8, #6366F1)',
                  boxShadow: '0 6px 28px rgba(79,70,229,0.5)',
                },
                mt: 0.5,
              }}
            >
              {loading ? (
                <CircularProgress size={20} sx={{ color: '#fff' }} />
              ) : (
                'Sign in'
              )}
            </Button>
          </Box>
        </Box>

        {/* Footer */}
        <Typography
          sx={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 11.5,
            mt: 3.5,
            letterSpacing: 0.3,
          }}
        >
          Admin access only &middot; Unauthorised use is prohibited
        </Typography>
      </Box>
    </Box>
  );
}
