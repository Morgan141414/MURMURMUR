import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createInvoice, createSubscription, getBillingOverview, listBillingPlans, listInvoices } from '@/api/billing'
import type { BillingOverview, BillingPlan, Invoice, Subscription } from '@/types'
import { queryKeys } from '@/lib/queryKeys'

export function useBillingPlans() {
  return useQuery({
    queryKey: queryKeys.billing.plans(),
    queryFn: () => listBillingPlans().then((r) => r.data as BillingPlan[]),
  })
}

export function useBillingOverview(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.billing.overview(orgId!),
    queryFn: () => getBillingOverview(orgId!).then((r) => r.data as BillingOverview),
    enabled: !!orgId,
  })
}

export function useInvoices(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.billing.invoices(orgId!),
    queryFn: () => listInvoices(orgId!).then((r) => r.data as Invoice[]),
    enabled: !!orgId,
  })
}

export function useCreateSubscription(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { plan_code: string; seats: number }) =>
      createSubscription(orgId, body).then((r) => r.data as Subscription),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.billing.overview(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.billing.invoices(orgId) })
    },
  })
}

export function useCreateInvoice(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createInvoice(orgId, body).then((r) => r.data as Invoice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.billing.overview(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.billing.invoices(orgId) })
    },
  })
}
