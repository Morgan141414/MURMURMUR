import api from './client'

// ── Types ──
export interface Currency {
  id: string
  code: string
  name: string
  symbol: string | null
  fraction: string | null
  fraction_units: number
  smallest_value: number
  is_active: boolean
}

export interface AccountingAccount {
  id: string
  org_id: string
  name: string
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
  account_type: string | null
  parent_account_id: string | null
  is_group: boolean
  is_active: boolean
  balance: number
  created_at: string
  children?: AccountingAccount[]
}

export interface Party {
  id: string
  org_id: string
  name: string
  role: 'Customer' | 'Supplier' | 'Both'
  email: string | null
  phone: string | null
  tax_id: string | null
  image_url: string | null
  currency_id: string | null
  default_account_id: string | null
  outstanding_amount: number
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  is_active: boolean
  created_at: string
}

export interface TaxDetail {
  id: string
  account_id: string
  rate: number
}

export interface TaxTemplate {
  id: string
  org_id: string
  name: string
  is_active: boolean
  details: TaxDetail[]
}

export interface AccItem {
  id: string
  org_id: string
  name: string
  item_code: string | null
  description: string | null
  image_url: string | null
  barcode: string | null
  item_type: string
  for_type: string
  item_group_id: string | null
  unit_id: string | null
  tax_id: string | null
  income_account_id: string | null
  expense_account_id: string | null
  rate: number
  track_item: boolean
  is_active: boolean
  created_at: string
}

export interface InvoiceItem {
  id: string
  idx: number
  item_id: string
  description: string | null
  account_id: string
  tax_id: string | null
  quantity: number
  rate: number
  amount: number
  item_discount_percent: number
  item_discount_amount: number
  item_discounted_total: number
  item_taxed_total: number
}

export interface TaxSummary {
  id: string
  account_id: string
  rate: number
  amount: number
}

export interface Invoice {
  id: string
  org_id: string
  number: string
  invoice_type: 'Sales' | 'Purchase'
  party_id: string
  account_id: string
  date: string
  currency_id: string | null
  exchange_rate: number
  net_total: number
  tax_total: number
  discount_amount: number
  discount_percent: number
  grand_total: number
  base_grand_total: number
  outstanding_amount: number
  terms: string | null
  submitted: boolean
  cancelled: boolean
  is_return: boolean
  is_pos: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  items: InvoiceItem[]
  tax_summary: TaxSummary[]
}

export interface PaymentAllocation {
  id: string
  invoice_id: string
  amount: number
}

export interface Payment {
  id: string
  org_id: string
  number: string
  party_id: string
  date: string
  payment_type: 'Receive' | 'Pay'
  payment_method_id: string | null
  account_id: string
  payment_account_id: string
  amount: number
  writeoff: number
  reference_id: string | null
  submitted: boolean
  cancelled: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  allocations: PaymentAllocation[]
}

export interface JournalEntryAccount {
  id: string
  account_id: string
  debit: number
  credit: number
}

export interface JournalEntry {
  id: string
  org_id: string
  number: string
  entry_type: string
  date: string
  reference_number: string | null
  user_remark: string | null
  submitted: boolean
  cancelled: boolean
  created_by: string | null
  created_at: string
  accounts: JournalEntryAccount[]
}

export interface AccountingSettings {
  id: string
  org_id: string
  company_name: string | null
  country: string | null
  currency_id: string | null
  fiscal_year_start: string | null
  fiscal_year_end: string | null
  enable_discounting: boolean
  enable_inventory: boolean
  enable_pos: boolean
  enable_invoice_returns: boolean
  setup_complete: boolean
}

export interface DashboardSummary {
  total_revenue: number
  total_expenses: number
  net_profit: number
  total_receivable: number
  total_payable: number
  cash_balance: number
  recent_invoices: Invoice[]
  recent_payments: Payment[]
}

export interface PaymentMethod {
  id: string
  org_id: string
  name: string
  is_active: boolean
}

export interface ItemGroup {
  id: string
  org_id: string
  name: string
}

export interface UOM {
  id: string
  org_id: string
  name: string
  is_whole: boolean
}

// ── API Functions ──
const base = (orgId: string) => `/orgs/${orgId}/accounting`

// Settings
export const getSettings = (orgId: string) =>
  api.get<AccountingSettings>(`${base(orgId)}/settings`)
export const updateSettings = (orgId: string, body: Record<string, unknown>) =>
  api.patch<AccountingSettings>(`${base(orgId)}/settings`, body)
export const setupAccounting = (orgId: string, body: Record<string, unknown>) =>
  api.post<AccountingSettings>(`${base(orgId)}/setup`, body)

// Dashboard
export const getDashboard = (orgId: string) =>
  api.get<DashboardSummary>(`${base(orgId)}/dashboard`)

// Accounts
export const listAccounts = (orgId: string, params?: Record<string, unknown>) =>
  api.get<AccountingAccount[]>(`${base(orgId)}/accounts`, { params })
export const getAccountTree = (orgId: string) =>
  api.get<AccountingAccount[]>(`${base(orgId)}/accounts/tree`)
export const createAccount = (orgId: string, body: Record<string, unknown>) =>
  api.post<AccountingAccount>(`${base(orgId)}/accounts`, body)
export const updateAccount = (orgId: string, accountId: string, body: Record<string, unknown>) =>
  api.patch<AccountingAccount>(`${base(orgId)}/accounts/${accountId}`, body)

// Parties
export const listParties = (orgId: string, params?: Record<string, unknown>) =>
  api.get<Party[]>(`${base(orgId)}/parties`, { params })
export const createParty = (orgId: string, body: Record<string, unknown>) =>
  api.post<Party>(`${base(orgId)}/parties`, body)
export const getParty = (orgId: string, partyId: string) =>
  api.get<Party>(`${base(orgId)}/parties/${partyId}`)
export const updateParty = (orgId: string, partyId: string, body: Record<string, unknown>) =>
  api.patch<Party>(`${base(orgId)}/parties/${partyId}`, body)

// Tax Templates
export const listTaxes = (orgId: string) =>
  api.get<TaxTemplate[]>(`${base(orgId)}/taxes`)
export const createTax = (orgId: string, body: Record<string, unknown>) =>
  api.post<TaxTemplate>(`${base(orgId)}/taxes`, body)

// Items
export const listItems = (orgId: string, params?: Record<string, unknown>) =>
  api.get<AccItem[]>(`${base(orgId)}/items`, { params })
export const createItem = (orgId: string, body: Record<string, unknown>) =>
  api.post<AccItem>(`${base(orgId)}/items`, body)
export const getItem = (orgId: string, itemId: string) =>
  api.get<AccItem>(`${base(orgId)}/items/${itemId}`)
export const updateItem = (orgId: string, itemId: string, body: Record<string, unknown>) =>
  api.patch<AccItem>(`${base(orgId)}/items/${itemId}`, body)

// Item Groups
export const listItemGroups = (orgId: string) =>
  api.get<ItemGroup[]>(`${base(orgId)}/item-groups`)
export const createItemGroup = (orgId: string, body: Record<string, unknown>) =>
  api.post<ItemGroup>(`${base(orgId)}/item-groups`, body)

// UOMs
export const listUOMs = (orgId: string) =>
  api.get<UOM[]>(`${base(orgId)}/uoms`)
export const createUOM = (orgId: string, body: Record<string, unknown>) =>
  api.post<UOM>(`${base(orgId)}/uoms`, body)

// Payment Methods
export const listPaymentMethods = (orgId: string) =>
  api.get<PaymentMethod[]>(`${base(orgId)}/payment-methods`)
export const createPaymentMethod = (orgId: string, body: Record<string, unknown>) =>
  api.post<PaymentMethod>(`${base(orgId)}/payment-methods`, body)

// Invoices
export const listInvoices = (orgId: string, params?: Record<string, unknown>) =>
  api.get<Invoice[]>(`${base(orgId)}/invoices`, { params })
export const createInvoice = (orgId: string, body: Record<string, unknown>) =>
  api.post<Invoice>(`${base(orgId)}/invoices`, body)
export const getInvoice = (orgId: string, invoiceId: string) =>
  api.get<Invoice>(`${base(orgId)}/invoices/${invoiceId}`)
export const updateInvoice = (orgId: string, invoiceId: string, body: Record<string, unknown>) =>
  api.patch<Invoice>(`${base(orgId)}/invoices/${invoiceId}`, body)
export const submitInvoice = (orgId: string, invoiceId: string) =>
  api.post<Invoice>(`${base(orgId)}/invoices/${invoiceId}/submit`)
export const cancelInvoice = (orgId: string, invoiceId: string) =>
  api.post<Invoice>(`${base(orgId)}/invoices/${invoiceId}/cancel`)

// Payments
export const listPayments = (orgId: string, params?: Record<string, unknown>) =>
  api.get<Payment[]>(`${base(orgId)}/payments`, { params })
export const createPayment = (orgId: string, body: Record<string, unknown>) =>
  api.post<Payment>(`${base(orgId)}/payments`, body)
export const getPayment = (orgId: string, paymentId: string) =>
  api.get<Payment>(`${base(orgId)}/payments/${paymentId}`)
export const submitPayment = (orgId: string, paymentId: string) =>
  api.post<Payment>(`${base(orgId)}/payments/${paymentId}/submit`)
export const cancelPayment = (orgId: string, paymentId: string) =>
  api.post<Payment>(`${base(orgId)}/payments/${paymentId}/cancel`)

// Journal Entries
export const listJournalEntries = (orgId: string) =>
  api.get<JournalEntry[]>(`${base(orgId)}/journal-entries`)
export const createJournalEntry = (orgId: string, body: Record<string, unknown>) =>
  api.post<JournalEntry>(`${base(orgId)}/journal-entries`, body)
export const getJournalEntry = (orgId: string, jeId: string) =>
  api.get<JournalEntry>(`${base(orgId)}/journal-entries/${jeId}`)
export const submitJournalEntry = (orgId: string, jeId: string) =>
  api.post<JournalEntry>(`${base(orgId)}/journal-entries/${jeId}/submit`)
export const cancelJournalEntry = (orgId: string, jeId: string) =>
  api.post<JournalEntry>(`${base(orgId)}/journal-entries/${jeId}/cancel`)

// Reports
export const getGeneralLedger = (orgId: string, body: Record<string, unknown>) =>
  api.post(`${base(orgId)}/reports/general-ledger`, body)
export const getTrialBalance = (orgId: string, body: Record<string, unknown>) =>
  api.post(`${base(orgId)}/reports/trial-balance`, body)
export const getProfitAndLoss = (orgId: string, body: Record<string, unknown>) =>
  api.post(`${base(orgId)}/reports/profit-and-loss`, body)
export const getBalanceSheet = (orgId: string, body: Record<string, unknown>) =>
  api.post(`${base(orgId)}/reports/balance-sheet`, body)

// Currencies
export const listCurrencies = (orgId: string) =>
  api.get<Currency[]>(`${base(orgId)}/currencies`)
