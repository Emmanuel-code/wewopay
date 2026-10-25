import React from 'react';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardHomePage from './pages/dashboard/DashboardHomePage';
import ProjectsListPage from './pages/dashboard/projects/ProjectsListPage';
import NewProjectPage from './pages/dashboard/projects/NewProjectPage';
import ProjectDetailPage from './pages/dashboard/projects/ProjectDetailPage';
import ProjectSettingsPage from './pages/dashboard/projects/ProjectSettingsPage';
import NewClientPage from './pages/dashboard/projects/NewClientPage';
import ClientDetailPage from './pages/dashboard/projects/ClientDetailPage';
import EarningsPage from './pages/dashboard/EarningsPage';
import DeveloperSettingsPage from './pages/dashboard/DeveloperSettingsPage';
import PublicPaymentPage from './pages/public/PublicPaymentPage';
import ClientPortalPage from './pages/public/ClientPortalPage';
import AdminHomePage from './pages/admin/AdminHomePage';
import AdminDevelopersPage from './pages/admin/AdminDevelopersPage';
import AdminPayoutsQueuePage from './pages/admin/AdminPayoutsQueuePage';
import AdminPayoutHistoryPage from './pages/admin/AdminPayoutHistoryPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  // Authentication (Public)
  { path: '/login', element: <LoginPage />, public: true },
  { path: '/signup', element: <SignupPage />, public: true },

  // Public Endpoints (Client checkout & portal)
  { path: '/pay/:token', element: <PublicPaymentPage />, public: true },
  { path: '/portal/:token', element: <ClientPortalPage />, public: true },

  // Developer Dashboard (Protected)
  { path: '/dashboard', element: <DashboardHomePage /> },
  { path: '/dashboard/projects', element: <ProjectsListPage /> },
  { path: '/dashboard/projects/new', element: <NewProjectPage /> },
  { path: '/dashboard/projects/:projectId', element: <ProjectDetailPage /> },
  { path: '/dashboard/projects/:projectId/settings', element: <ProjectSettingsPage /> },
  { path: '/dashboard/projects/:projectId/clients/new', element: <NewClientPage /> },
  { path: '/dashboard/projects/:projectId/clients/:clientId', element: <ClientDetailPage /> },
  { path: '/dashboard/earnings', element: <EarningsPage /> },
  { path: '/dashboard/settings', element: <DeveloperSettingsPage /> },

  // Owner Admin Panel (Protected)
  { path: '/admin', element: <AdminHomePage /> },
  { path: '/admin/developers', element: <AdminDevelopersPage /> },
  { path: '/admin/payouts', element: <AdminPayoutsQueuePage /> },
  { path: '/admin/payouts/history', element: <AdminPayoutHistoryPage /> },
  { path: '/admin/payments', element: <AdminPaymentsPage /> },
  { path: '/admin/settings', element: <AdminSettingsPage /> },

  // Landing page
  { path: '/', element: <LandingPage />, public: true },
];
