import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/shell/AppShell'
import { AgentWorkspacePage } from '@/pages/agent/AgentWorkspacePage'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { FeedPage } from '@/pages/FeedPage'
import { MarketplacePage } from '@/pages/MarketplacePage'
import { MessagesPage } from '@/pages/MessagesPage'
import { MyKrewPage } from '@/pages/MyKrewPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { ReportDetailPage, ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <OverviewPage /> },
      { path: '/krew', element: <MyKrewPage /> },
      { path: '/krew/:agentId', element: <AgentWorkspacePage /> },
      { path: '/krew/:agentId/:tab', element: <AgentWorkspacePage /> },
      { path: '/feed', element: <FeedPage /> },
      { path: '/messages', element: <MessagesPage /> },
      { path: '/messages/:conversationId', element: <MessagesPage /> },
      { path: '/approvals', element: <ApprovalsPage /> },
      { path: '/approvals/:approvalId', element: <ApprovalsPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/reports/:reportId', element: <ReportDetailPage /> },
      { path: '/marketplace', element: <MarketplacePage /> },
      { path: '/marketplace/:agentId', element: <MarketplacePage /> },
      { path: '/settings', element: <Navigate to="/settings/brand" replace /> },
      { path: '/settings/:section', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
