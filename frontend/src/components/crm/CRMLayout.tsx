import { Outlet } from 'react-router'
import { CRMSidebar } from './CRMSidebar'

export function CRMLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <CRMSidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  )
}
