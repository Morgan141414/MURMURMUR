import { useEffect, useState, useCallback } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { listNotes, createNote, updateNote, deleteNote } from '@/api/crm'
import type { Note, NoteCreate } from '@/types/crm'

export default function NotesPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [formData, setFormData] = useState<Partial<NoteCreate>>({})

  const loadNotes = useCallback(async () => {
    if (!activeOrgId) return

    try {
      setLoading(true)
      const response = await listNotes(activeOrgId)
      const notesData = (response.data as any)?.data || response.data || []
      setNotes(notesData)
    } catch (err) {
      console.error('Failed to load notes:', err)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId || !formData.title || !formData.content) return

    try {
      if (editingNote) {
        await updateNote(activeOrgId, editingNote.id, formData)
      } else {
        await createNote(activeOrgId, formData as NoteCreate)
      }
      setShowModal(false)
      setFormData({})
      setEditingNote(null)
      loadNotes()
    } catch (err) {
      console.error('Failed to save note:', err)
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setFormData({ title: note.title, content: note.content })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!activeOrgId || !confirm('Удалить заметку?')) return

    try {
      await deleteNote(activeOrgId, id)
      loadNotes()
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 60) return `${diffInMinutes} минут назад`
    if (diffInHours < 24) return `${diffInHours} часов назад`
    if (diffInDays < 30) return `${diffInDays} дней назад`
    return `${Math.floor(diffInDays / 30)} месяцев назад`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Заметки</h1>
            <p className="text-sm text-muted-foreground mt-1">Notes View</p>
          </div>
          <button
            onClick={() => {
              setEditingNote(null)
              setFormData({})
              setShowModal(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Создать
          </button>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md"
            >
              {/* Actions */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(note)}
                    className="rounded p-1 hover:bg-accent"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="rounded p-1 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground line-clamp-2 pr-12">
                  {note.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {note.content}
                </p>

                {/* Footer */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-semibold text-white">
                    {note.owner_id ? 'SC' : 'U'}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Sarah Connor
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDate(note.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {notes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Заметки не найдены
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">
              {editingNote ? 'Редактировать заметку' : 'Новая заметка'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Competitor Mentioned"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Содержание *</label>
                <textarea
                  required
                  rows={6}
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Currently trialing a competitor. Our differentiators: better UX, open source..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({})
                    setEditingNote(null)
                  }}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {editingNote ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
