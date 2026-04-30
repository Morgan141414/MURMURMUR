import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, FileText, CreditCard, BookOpen,
  GitBranch, Users, Package, BarChart3, Settings,
  Receipt, Wallet, ShoppingCart, ClipboardList, Coins,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AccPage =
  | 'dashboard'
  | 'sales-invoices' | 'sales-payments' | 'customers'
  | 'purchase-invoices' | 'purchase-payments' | 'suppliers'
  | 'journal-entry' | 'parties' | 'items'
  | 'general-ledger' | 'profit-and-loss' | 'balance-sheet' | 'trial-balance'
  | 'chart-of-accounts' | 'settings'

interface SidebarItem { page: AccPage; label: string }

interface SidebarGroup {
  key: string
  label: string
  icon: LucideIcon
  defaultPage: AccPage
  items: SidebarItem[]
}

export function AccSidebar({
  activePage,
  onNavigate,
  companyName,
}: {
  activePage: AccPage
  onNavigate: (page: AccPage) => void
  companyName?: string
}) {
  const { t } = useTranslation()

  const groups: SidebarGroup[] = [
    {
      key: 'sales',
      label: t('accounting.nav.sales', 'Sales'),
      icon: FileText,
      defaultPage: 'sales-invoices',
      items: [
        { page: 'sales-invoices', label: t('accounting.nav.salesInvoices', 'Sales Invoices') },
        { page: 'sales-payments', label: t('accounting.nav.salesPayments', 'Sales Payments') },
        { page: 'customers', label: t('accounting.nav.customers', 'Customers') },
      ],
    },
    {
      key: 'purchases',
      label: t('accounting.nav.purchases', 'Purchases'),
      icon: Receipt,
      defaultPage: 'purchase-invoices',
      items: [
        { page: 'purchase-invoices', label: t('accounting.nav.purchaseInvoices', 'Purchase Invoices') },
        { page: 'purchase-payments', label: t('accounting.nav.purchasePayments', 'Purchase Payments') },
        { page: 'suppliers', label: t('accounting.nav.suppliers', 'Suppliers') },
      ],
    },
    {
      key: 'common',
      label: t('accounting.nav.common', 'Common'),
      icon: BookOpen,
      defaultPage: 'journal-entry',
      items: [
        { page: 'journal-entry', label: t('accounting.nav.journalEntry', 'Journal Entry') },
        { page: 'parties', label: t('accounting.nav.parties', 'Party') },
        { page: 'items', label: t('accounting.nav.items', 'Items') },
      ],
    },
    {
      key: 'reports',
      label: t('accounting.nav.reports', 'Reports'),
      icon: BarChart3,
      defaultPage: 'general-ledger',
      items: [
        { page: 'general-ledger', label: t('accounting.nav.generalLedger', 'General Ledger') },
        { page: 'profit-and-loss', label: t('accounting.nav.profitAndLoss', 'Profit and Loss') },
        { page: 'balance-sheet', label: t('accounting.nav.balanceSheet', 'Balance Sheet') },
        { page: 'trial-balance', label: t('accounting.nav.trialBalance', 'Trial Balance') },
      ],
    },
    {
      key: 'setup',
      label: t('accounting.nav.setup', 'Setup'),
      icon: Settings,
      defaultPage: 'chart-of-accounts',
      items: [
        { page: 'chart-of-accounts', label: t('accounting.nav.chartOfAccounts', 'Chart of Accounts') },
        { page: 'settings', label: t('accounting.nav.settings', 'Settings') },
      ],
    },
  ]

  const activeGroupKey = groups.find(g =>
    g.items.some(i => i.page === activePage)
  )?.key ?? null

  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupKey)

  const handleGroupClick = (group: SidebarGroup) => {
    if (openGroup === group.key) {
      setOpenGroup(null)
    } else {
      setOpenGroup(group.key)
      onNavigate(group.defaultPage)
    }
  }

  return (
    <div className="acc-sidebar">
      {/* Company name */}
      <div style={{ padding: '16px 16px 8px' }}>
        <h2 style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--acc-gray-800)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {companyName || 'Accounting'}
        </h2>
      </div>

      {/* Dashboard */}
      <div
        className={`acc-sidebar-item ${activePage === 'dashboard' ? 'acc-sidebar-item--active' : ''}`}
        onClick={() => { setOpenGroup(null); onNavigate('dashboard') }}
      >
        <LayoutDashboard size={18} />
        <span>{t('accounting.nav.dashboard', 'Dashboard')}</span>
      </div>

      {/* Groups */}
      {groups.map((group) => {
        const isGroupOpen = openGroup === group.key
        const isGroupActive = group.items.some(i => i.page === activePage)
        const Icon = group.icon

        return (
          <div key={group.key}>
            <div
              className={`acc-sidebar-item ${isGroupActive && !isGroupOpen ? 'acc-sidebar-item--active' : ''}`}
              onClick={() => handleGroupClick(group)}
            >
              <Icon size={18} />
              <span>{group.label}</span>
            </div>

            {isGroupOpen && group.items.map((item) => (
              <div
                key={item.page}
                className={`acc-sidebar-sub ${activePage === item.page ? 'acc-sidebar-sub--active' : ''}`}
                onClick={() => onNavigate(item.page)}
              >
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
