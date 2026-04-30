import api from './client'
import type { BillingOverview, BillingPlan, Invoice, Subscription } from '@/types'

export function listBillingPlans() {
  return api.get<BillingPlan[]>('/billing/plans')
}

export function getBillingOverview(orgId: string) {
  return api.get<BillingOverview>(`/orgs/${orgId}/billing/overview`)
}

export function createSubscription(orgId: string, body: { plan_code: string; seats: number }) {
  return api.post<Subscription>(`/orgs/${orgId}/billing/subscription`, body)
}

export function listInvoices(orgId: string) {
  return api.get<Invoice[]>(`/orgs/${orgId}/billing/invoices`)
}

export function createInvoice(orgId: string, body: Record<string, unknown>) {
  return api.post<Invoice>(`/orgs/${orgId}/billing/invoices`, body)
}
