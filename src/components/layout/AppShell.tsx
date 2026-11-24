import React, { useState, useEffect, createContext, useContext } from 'react';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../ui/ToastContainer';
import { getSettings, subscribeToStorage } from '../../lib/storage';

interface NavContextType {
  openMobileNav: () => void;
  closeMobileNav: () => void;
}

const NavContext = createContext<NavContextType>({
  openMobileNav: () => {},
  closeMobileNav: () => {},
});

export const useNav = () => useContext(NavContext);

export interface AppShellProps {
  children: (nav: { openMobileNav: () => void }) => React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [businessName, setBusinessName] = useState('Himalayan Enterprises');

  useEffect(() => {
    const loadSettings = () => {
      getSettings().then((s) => {
        if (s.businessName) setBusinessName(s.businessName);
      });
    };
    loadSettings();
    return subscribeToStorage((key) => {
      if (key.includes('settings')) {
        loadSettings();
      }
    });
  }, []);

  const openMobileNav = () => setMobileNavOpen(true);
  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <NavContext.Provider value={{ openMobileNav, closeMobileNav }}>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased font-sans flex">
        {/* Sidebar */}
        <Sidebar
          businessName={businessName}
          isOpenMobile={mobileNavOpen}
          onCloseMobile={closeMobileNav}
        />

        {/* Main content container */}
        <div className="flex-1 md:pl-56 flex flex-col min-w-0">
          <main className="flex-1 pb-16">{children({ openMobileNav })}</main>
        </div>

        {/* Global toasts */}
        <ToastContainer />
      </div>
    </NavContext.Provider>
  );
};
