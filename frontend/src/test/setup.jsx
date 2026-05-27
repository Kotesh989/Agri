import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../components/Navbar', () => ({ Navbar: () => <div data-testid="navbar" /> }));
vi.mock('../components/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar" /> }));
vi.mock('../components/FarmerMobileNav', () => ({ FarmerMobileNav: () => <div data-testid="farmer-mobile-nav" /> }));
