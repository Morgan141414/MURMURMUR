import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrgStore } from '@/stores/orgStore'
import { getSettings, setupAccounting, type AccountingSettings } from '@/api/accounting'
import { AccSidebar, type AccPage } from './components/AccSidebar'
import { DashboardView } from './views/DashboardView'
import { InvoiceListView } from './views/InvoiceListView'
import { PaymentListView } from './views/PaymentListView'
import { JournalEntryView } from './views/JournalEntryView'
import { PartyListView } from './views/PartyListView'
import { ItemsView } from './views/ItemsView'
import { ChartOfAccountsView } from './views/ChartOfAccountsView'
import { ReportsView } from './views/ReportsView'
import { SettingsView } from './views/SettingsView'
import './accounting.css'

export default function AccountingPage() {
  const { t } = useTranslation()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [settings, setSettings] = useState<AccountingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<AccPage>('dashboard')

  useEffect(() => {
    if (!activeOrgId) return
    setLoading(true)
    getSettings(activeOrgId)
      .then((r) => {
        setSettings(r.data)
        if (!r.data?.setup_complete) {
          return setupAccounting(activeOrgId, {}).then((sr) => setSettings(sr.data))
        }
      })
      .catch(() => setSettings(null))
      .finally(() => setLoading(false))
  }, [activeOrgId])

  if (!activeOrgId) return null

  if (loading) {
    return (
      <div className="acc-root flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--acc-blue-500)' }} />
      </div>
    )
  }

  const nav = (p: AccPage) => setPage(p)

  const renderContent = () => {
    if (!activeOrgId) return null
    switch (page) {
      case 'dashboard':
        return <DashboardView orgId={activeOrgId} />
      case 'sales-invoices':
        return <InvoiceListView orgId={activeOrgId} invoiceType="SalesInvoice" />
      case 'purchase-invoices':
        return <InvoiceListView orgId={activeOrgId} invoiceType="PurchaseInvoice" />
      case 'sales-payments':
        return <PaymentListView orgId={activeOrgId} paymentType="Receive" />
      case 'purchase-payments':
        return <PaymentListView orgId={activeOrgId} paymentType="Pay" />
      case 'customers':
        return <PartyListView orgId={activeOrgId} filter="Customer" />
      case 'suppliers':
        return <PartyListView orgId={activeOrgId} filter="Supplier" />
      case 'journal-entry':
        return <JournalEntryView orgId={activeOrgId} />
      case 'parties':
        return <PartyListView orgId={activeOrgId} filter="all" />
      case 'items':
        return <ItemsView orgId={activeOrgId} />
      case 'general-ledger':
        return <ReportsView orgId={activeOrgId} report="general-ledger" onBack={() => nav('dashboard')} />
      case 'profit-and-loss':
        return <ReportsView orgId={activeOrgId} report="profit-and-loss" onBack={() => nav('dashboard')} />
      case 'balance-sheet':
        return <ReportsView orgId={activeOrgId} report="balance-sheet" onBack={() => nav('dashboard')} />
      case 'trial-balance':
        return <ReportsView orgId={activeOrgId} report="trial-balance" onBack={() => nav('dashboard')} />
      case 'chart-of-accounts':
        return <ChartOfAccountsView orgId={activeOrgId} />
      case 'settings':
        return <SettingsView orgId={activeOrgId} onBack={() => nav('dashboard')} />
      default:
        return <DashboardView orgId={activeOrgId} />
    }
  }

  return (
    <div className="acc-root flex" style={{ height: 'calc(100vh - 64px)' }}>
      <AccSidebar
        activePage={page}
        onNavigate={nav}
        companyName={settings?.company_name || t('accounting.title', 'Accounting')}
      />
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  )
}
