import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function MainLayout({ mode, setMode }) {
  return (
    <>
      <Navbar mode={mode} setMode={setMode} />
      <Outlet />
    </>
  );
}
