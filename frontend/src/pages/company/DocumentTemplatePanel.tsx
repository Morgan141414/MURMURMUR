import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { saveDocumentTemplate, listDocumentTemplates } from '@/api/documentTemplates'
import { Button } from '@/components/ui/button'

type Props = {
  clinicId: number | null
}

export function DocumentTemplatePanel({ clinicId }: Props) {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const enabled = clinicId !== null

  const templatesQuery = useQuery({
    queryKey: ['document-templates', clinicId],
    queryFn: () => listDocumentTemplates(clinicId as number).then((r) => r.data),
    enabled,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      saveDocumentTemplate(clinicId as number, {
        code: code.trim(),
        title: title.trim(),
        body: body.trim(),
      }),
    onSuccess: () => {
      toast.success('Шаблон сохранён')
      setCode('')
      setTitle('')
      setBody('')
      void qc.invalidateQueries({ queryKey: ['document-templates', clinicId] })
    },
    onError: () => {
      toast.error('Не удалось сохранить шаблон')
    },
  })

  const templates = templatesQuery.data ?? []
  const canSave = useMemo(() => code.trim() && title.trim() && body.trim(), [code, title, body])

  if (!enabled) {
    return null
  }

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">Шаблоны документов</h3>
        <p className="text-xs text-muted-foreground">
          Базовый шаблонизатор для справок, заключений и внутренних форм.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Код (например, initial_exam)"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Название шаблона"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Сохранение...' : 'Сохранить шаблон'}
        </Button>
      </div>

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Тело шаблона, например: Жалобы: {{complaint}}"
        className="mt-2 min-h-[88px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />

      <div className="mt-3 space-y-2">
        {templatesQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Загрузка шаблонов...</p>
        ) : templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">Шаблонов пока нет.</p>
        ) : (
          templates.slice(0, 8).map((template) => (
            <div key={template.id} className="rounded-xl border border-border bg-background px-3 py-2">
              <p className="text-sm font-medium text-foreground">
                {template.title}{' '}
                <span className="text-xs text-muted-foreground">({template.code})</span>
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
