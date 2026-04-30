import { ArrowRight, FileText, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

export default function HRPanelPage() {
  const modules = [
    { title: 'People directory', description: 'Сотрудники, статусы, отделы и контактные данные', icon: Users },
    { title: 'Documents flow', description: 'Кадровые документы, подписи и approval trail', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Panel"
        description="Административный HR surface для людей, документов и кадровых процессов."
        eyebrow="Admin"
      />

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {modules.map((module) => (
            <div key={module.title} className="flex items-start gap-3 rounded-xl border border-border px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <module.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{module.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
