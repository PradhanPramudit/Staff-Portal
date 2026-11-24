// Lightweight hash-based router for Staff Portal
// Zero external dependencies. Keeps URLs clean, shareable, and avoids Nginx fallback configuration.

import { useState, useEffect } from 'react';

export interface RouteMatch {
  path: string;
  name:
    | 'dashboard'
    | 'employees'
    | 'employee_detail'
    | 'attendance'
    | 'advances'
    | 'payroll'
    | 'payslip'
    | 'settings'
    | 'not_found';
  params: Record<string, string>;
  query: Record<string, string>;
}

export function parseHash(hash: string): RouteMatch {
  const clean = hash.replace(/^#\/?/, '').trim();
  const [pathname, queryString] = clean.split('?');

  const query: Record<string, string> = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((v, k) => {
      query[k] = v;
    });
  }

  const segments = (pathname || '').split('/').filter(Boolean);

  if (segments.length === 0) {
    return { path: '/', name: 'dashboard', params: {}, query };
  }

  if (segments[0] === 'employees') {
    if (segments.length === 1) {
      return { path: '/employees', name: 'employees', params: {}, query };
    }
    return {
      path: `/employees/${segments[1]}`,
      name: 'employee_detail',
      params: { id: segments[1] },
      query,
    };
  }

  if (segments[0] === 'attendance') {
    return { path: '/attendance', name: 'attendance', params: {}, query };
  }

  if (segments[0] === 'advances') {
    return { path: '/advances', name: 'advances', params: {}, query };
  }

  if (segments[0] === 'payroll') {
    if (segments.length === 1) {
      return { path: '/payroll', name: 'payroll', params: {}, query };
    }
    // #/payroll/:month/:employeeId
    if (segments.length >= 3) {
      return {
        path: `/payroll/${segments[1]}/${segments[2]}`,
        name: 'payslip',
        params: { month: segments[1], employeeId: segments[2] },
        query,
      };
    }
    return { path: '/payroll', name: 'payroll', params: {}, query };
  }

  if (segments[0] === 'settings') {
    return { path: '/settings', name: 'settings', params: {}, query };
  }

  return { path: `/${pathname}`, name: 'not_found', params: {}, query };
}

export function navigate(to: string): void {
  const target = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : '/' + to}`;
  if (window.location.hash === target) {
    // Force re-dispatch if same hash
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

export function useRoute(): RouteMatch {
  const [route, setRoute] = useState<RouteMatch>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleHash = () => {
      setRoute(parseHash(window.location.hash));
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return route;
}
