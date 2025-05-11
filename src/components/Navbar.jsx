import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Button, Drawer,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box,
  ToggleButton, ToggleButtonGroup
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import TranslateIcon from '@mui/icons-material/Translate';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useTranslation } from 'react-i18next';

export default function Navbar({ mode, setMode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const menuItems = [
    { label: t('dashboard'), path: '/dashboard', icon: <DashboardIcon /> },
    { label: t('ot_tracker'), path: '/ot', icon: <AccessTimeIcon /> }
  ];

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ width: 250 }}>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton component={Link} to={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary={t('logout')} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {t('app_name')}
          </Typography>

          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
            {menuItems.map((item) => (
              <Button
                key={item.label}
                color="inherit"
                startIcon={item.icon}
                component={Link}
                to={item.path}
              >
                {item.label}
              </Button>
            ))}

            <IconButton color="inherit" onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TranslateIcon fontSize="small" />
              <ToggleButtonGroup
                value={i18n.language}
                exclusive
                onChange={(e, lang) => lang && i18n.changeLanguage(lang)}
                size="small"
                sx={{ ml: 1 }}
              >
                <ToggleButton value="en">EN</ToggleButton>
                <ToggleButton value="th">TH</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>
    </>
  );
}
