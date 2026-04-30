import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { Hash, MessageSquare, Paperclip, Send, Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useOrgStore } from '@/stores/orgStore'

export default function ProjectChatPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const org = useOrgStore((s) => s.activeOrg())
  const [message, setMessage] = useState('')

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-6">
      <PageHeader
        title={t('project.chat', 'Project chat')}
        description="Project conversation with channels, linked work context, files, and participant visibility."
        eyebrow="Project workspace"
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('shell.project'), to: '/project' },
          { label: t('project.chat', 'Chat') },
        ]}
      />

      <div className="grid min-h-[620px] flex-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="rounded-xl border border-border bg-card p-3">
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            Channels
          </div>
          <button className="flex w-full items-center gap-2 rounded-lg bg-primary/8 px-3 py-2 text-left text-sm font-medium text-primary">
            <Hash className="h-4 w-4" />
            general
          </button>
          <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Hash className="h-4 w-4" />
            delivery
          </button>
        </aside>

        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground"># general</p>
            <p className="text-xs text-muted-foreground">Primary project coordination channel</p>
          </div>

          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState
              icon={MessageSquare}
              title={t('project.noMessages', 'Нет сообщений')}
              description={t('project.noMessagesDesc', 'Начните общение с участниками проекта')}
            />
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('project.typeMessage', 'Введите сообщение...')}
                className="flex-1 h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
              <button
                disabled={!message.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Context panel</h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">Participants</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                No participants loaded yet
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">Linked work</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Project messages should reference tasks, decisions, files, and milestones from the same workspace chain.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
