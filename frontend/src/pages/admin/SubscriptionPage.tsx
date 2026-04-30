import { useState } from 'react'
import { toast } from 'sonner'
import { CreditCard, Shield, Zap } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { useOrgStore } from '@/stores/orgStore'
import { useBillingOverview, useCreateInvoice, useCreateSubscription } from '@/hooks/useBilling'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/shared/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingState'
import { StatusBadge } from '@/components/shared/StatusBadge'

const inputClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring'

export default function SubscriptionPage() {
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const { data: overview, isLoading } = useBillingOverview(orgId)
  const createSubscription = useCreateSubscription(orgId ?? '')
  const createInvoice = useCreateInvoice(orgId ?? '')
  const [planCode, setPlanCode] = useState('business')
  const [seats, setSeats] = useState(10)

  async function handleActivatePlan() {
    if (!orgId) return
    try {
      await createSubscription.mutateAsync({ plan_code: planCode, seats })
      toast.success('Подписка обновлена')
    } catch {
      toast.error('Не удалось обновить подписку')
    }
  }

  async function handleCreateInvoice() {
    if (!orgId) return
    const activePlan = overview?.plans.find((plan) => plan.code === planCode)
    if (!activePlan) return
    try {
      await createInvoice.mutateAsync({
        amount: activePlan.price_amount,
        currency: activePlan.currency,
        description: `${activePlan.name} manual invoice`,
      })
      toast.success('Инвойс создан')
    } catch {
      toast.error('Не удалось создать инвойс')
    }
  }

  if (!orgId) {
    return <EmptyState title="Нет выбранной компании" description="Выберите компанию, чтобы работать с биллингом." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription"
        description="Billing, active plan, module access and commercial controls for the workspace."
        eyebrow="Admin"
        breadcrumbs={[
          { label: org?.orgName ?? 'Company', to: '/company' },
          { label: 'Subscription' },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={CreditCard} label="Current plan" value={overview?.active_subscription ? 'Active' : 'No plan'} />
        <StatCard icon={Zap} label="Enabled modules" value={overview?.active_subscription ? String(overview.plans.find((plan) => plan.id === overview.active_subscription?.plan_id)?.features.length ?? 0) : '0'} />
        <StatCard icon={Shield} label="Support SLA" value={overview?.active_subscription ? 'Business' : 'Standard'} />
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Планы и модульный доступ</h2>
          {isLoading ? <LoadingSkeleton rows={4} /> : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {overview?.plans.map((plan) => (
                <div key={plan.id} className={`rounded-xl border p-4 ${plan.code === planCode ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">{plan.price_amount.toLocaleString()} {plan.currency} / {plan.billing_period}</p>
                    </div>
                    <Button variant={plan.code === planCode ? 'default' : 'outline'} size="sm" onClick={() => setPlanCode(plan.code)}>
                      Выбрать
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {plan.features.map((feature) => (
                      <span key={feature} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{feature}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Управление подпиской</h2>
          <div className="mt-4 space-y-4">
            <FormField label="План">
              <select value={planCode} onChange={(e) => setPlanCode(e.target.value)} className={inputClass}>
                {overview?.plans.map((plan) => <option key={plan.id} value={plan.code}>{plan.name}</option>)}
              </select>
            </FormField>
            <FormField label="Seats">
              <input type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value) || 1)} className={inputClass} />
            </FormField>
            <div className="flex gap-2">
              <Button onClick={() => void handleActivatePlan()} disabled={createSubscription.isPending}>Активировать план</Button>
              <Button variant="outline" onClick={() => void handleCreateInvoice()} disabled={createInvoice.isPending}>Создать инвойс</Button>
            </div>
            {overview?.active_subscription ? (
              <div className="rounded-xl border border-border bg-background p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Текущий статус</span>
                  <StatusBadge variant="success">{overview.active_subscription.status}</StatusBadge>
                </div>
                <p className="mt-2 text-muted-foreground">Seats: {overview.active_subscription.seats}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Инвойсы</h2>
        {isLoading ? <LoadingSkeleton rows={4} /> : !overview?.invoices.length ? (
          <EmptyState title="Инвойсов пока нет" description="Первый инвойс появится после активации плана или ручного создания." />
        ) : (
          <div className="mt-4 space-y-3">
            {overview.invoices.map((invoice) => (
              <div key={invoice.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-foreground">{invoice.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">{invoice.description || 'Manual invoice'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">{invoice.amount.toLocaleString()} {invoice.currency}</span>
                  <StatusBadge variant={invoice.status === 'paid' ? 'success' : 'warning'}>{invoice.status}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
