import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import { auth } from './firebase';

import { ThemeProvider, CssBaseline, Button, Box } from '@mui/material';
import { getTheme } from './theme';
import './i18n';
import { useTranslation } from 'react-i18next';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { CircularProgress, Typography } from '@mui/material';
import OTCalculator from './components/OTCalculator';
import MainLayout from './components/MainLayout'; // 👈 เพิ่มเข้ามา

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('dark');
  const theme = getTheme(mode);
  const { t, i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.background.default, // ✅ ใช้ theme
          color: theme.palette.text.primary
        }}
      >
        <CircularProgress color="primary" />
        <Typography sx={{ mt: 2 }}>{t('loading')}</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TranslateIcon fontSize="small" />
          <ToggleButtonGroup
            value={i18n.language}
            exclusive
            onChange={(e, lang) => lang && i18n.changeLanguage(lang)}
            size="small"
            color="primary"
          >
             <ToggleButton value="th">TH</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
          </ToggleButtonGroup>

        </Box>

        <Button onClick={() => setMode(mode === 'light' ? 'dark' : 'light')} size="small">
          {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </Button>
      </Box>

      <Routes>
  {/* หน้า login ไม่แสดง navbar */}
  <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />

  {/* Layout สำหรับผู้ที่ login แล้วเท่านั้น */}
  {user && (
    <Route element={<MainLayout mode={mode} setMode={setMode} />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/ot" element={<OTCalculator />} />
    </Route>
  )}

  {/* redirect กรณีไม่ login */}
  {!user && (
    <Route path="*" element={<Navigate to="/login" />} />
  )}

  {/* เส้นทางเริ่มต้น */}
  <Route path="/" element={<Navigate to="/dashboard" />} />
</Routes>
    </ThemeProvider>
  );
}

export default App;
