import { useEffect, useState, useCallback } from 'react'
import { listContacts, createContact, deleteContact } from '../../api/crm'
import type { Contact, ContactCreate } from '../../types/crm'
import { useOrgStore } from '@/stores/orgStore'

export default function ContactsPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<ContactCreate>({
    first_name: '',
    last_name: '',
    email: '',
    mobile_no: '',
    organization: '',
    designation: '',
  })

  const loadContacts = useCallback(async () => {
    if (!activeOrgId) {
      setContacts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await listContacts(activeOrgId)
      // Backend returns {data: [...]}
      const contactsData = (response.data as any)?.data || response.data || []
      setContacts(contactsData)
    } catch (err: any) {
      console.error('Failed to load contacts:', err)
      setError(err?.response?.data?.detail || 'Не удалось загрузить контакты')
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId) return

    try {
      await createContact(activeOrgId, formData)
      setShowCreateForm(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        mobile_no: '',
        organization: '',
        designation: '',
      })
      loadContacts()
    } catch (err) {
      console.error('Failed to create contact:', err)
      alert('Не удалось создать контакт')
    }
  }

  const handleDelete = async (contactId: string) => {
    if (!activeOrgId) return
    if (!confirm('Удалить этот контакт?')) return

    try {
      await deleteContact(activeOrgId, contactId)
      loadContacts()
    } catch (err) {
      console.error('Failed to delete contact:', err)
      alert('Не удалось удалить контакт')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Контакты</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Добавить контакт
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Новый контакт</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Имя *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Фамилия</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Телефон</label>
                <input
                  type="tel"
                  value={formData.mobile_no}
                  onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Компания</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Должность</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Имя</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Телефон</th>
              <th className="text-left p-4">Компания</th>
              <th className="text-left p-4">Должность</th>
              <th className="text-left p-4">Действия</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-muted-foreground">
                  Нет контактов. Добавьте первый контакт!
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.name} className="border-b hover:bg-accent/50">
                  <td className="p-4">
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td className="p-4">{contact.email || '—'}</td>
                  <td className="p-4">{contact.mobile_no || contact.phone || '—'}</td>
                  <td className="p-4">{contact.organization || '—'}</td>
                  <td className="p-4">{contact.designation || '—'}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleDelete(contact.name)}
                      className="text-destructive hover:underline text-sm"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
