import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
