import api from './client'

export interface DocumentTemplateItem {
  id: number
  clinic_id?: number | null
  code: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

export interface DocumentTemplateCreatePayload {
  code: string
  title: string
  body: string
}

export function listDocumentTemplates(clinicId: number) {
  return api.get<DocumentTemplateItem[]>(`/clinics/${clinicId}/documents/templates`)
}

export function saveDocumentTemplate(
  clinicId: number,
  payload: DocumentTemplateCreatePayload,
) {
  return api.post<DocumentTemplateItem>(
    `/clinics/${clinicId}/documents/templates`,
    payload,
  )
}
