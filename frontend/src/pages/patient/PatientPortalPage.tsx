import { Link, useLocation } from 'react-router'
import {
  Bell,
  CalendarDays,
  FileText,
  HeartPulse,
  MessageSquare,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

const appointments = [
  { date: 'Сегодня, 10:30', doctor: 'А. Искадиров', service: 'Повторный прием', status: 'Подтвержден' },
  { date: 'Завтра, 09:40', doctor: 'Д. Абылаева', service: 'Контроль анализов', status: 'Ожидает' },
]

const documents = [
  { title: 'Протокол приема', meta: 'Готов к просмотру', date: '11.05.2026' },
  { title: 'Результат ЭКГ', meta: 'Файл прикреплен', date: '10.05.2026' },
  { title: 'Рекомендации', meta: 'После приема', date: '09.05.2026' },
]

const recordItems = [
  'Диагноз: I10 Эссенциальная гипертензия',
  'Назначение: контроль АД утром и вечером',
  'Рекомендация: повторный прием через 14 дней',
]

function PatientNav() {
  const { pathname } = useLocation()
  const items = [
    { to: '/patient', label: 'Обзор' },
    { to: '/patient/records', label: 'Медкарта' },
    { to: '/patient/documents', label: 'Документы' },
    { to: '/patient/support', label: 'Помощь' },
  ]
  return (
    <nav className="clinic-os-tabs" aria-label="Разделы кабинета пациента">
      {items.map((item) => (
        <Link key={item.to} to={item.to} className={pathname === item.to ? 'is-active' : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

export default function PatientPortalPage() {
  const { pathname } = useLocation()
  const showRecords = pathname.includes('/records')
  const showDocs = pathname.includes('/documents')
  const showSupport = pathname.includes('/support')

  return (
    <main className="mis-workspace space-y-5 patient-portal-page">
      <section className="mis-command-panel">
        <div>
          <p className="mis-kicker">QorMed Patient</p>
          <h1>Личный кабинет пациента</h1>
          <p>Записи, медкарта, документы, уведомления и обращения в одном защищенном рабочем окне.</p>
        </div>
        <div className="mis-command-actions">
          <Link className="clinic-os-button" to="/clinic/calendar">
            <CalendarDays className="mr-2 h-4 w-4" />
            Записаться
          </Link>
        </div>
      </section>

      <PatientNav />

      <section className="clinic-os-patient-summary">
        <div className="clinic-os-patient-identity">
          <div className="clinic-os-avatar clinic-os-avatar--large"><UserRound className="h-7 w-7" /></div>
          <div>
            <h2>Айгерим Нурланова</h2>
            <p>ИИН 890512450012 - 36 лет - +7 701 245 18 90</p>
            <div className="clinic-os-tag-list"><span>Документы проверены</span><span>ДМС</span></div>
          </div>
        </div>
        <div className="clinic-os-patient-alerts">
          <div className="clinic-os-alert"><Bell className="h-4 w-4" /><span>Напоминание о приеме отправлено.</span></div>
          <div className="clinic-os-alert"><ShieldCheck className="h-4 w-4" /><span>Медкарта доступна только для чтения.</span></div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="mis-card rounded-xl p-5">
          <div className="clinic-os-panel-head">
            <div>
              <span>{showRecords ? 'Медкарта' : showDocs ? 'Документы' : showSupport ? 'Помощь' : 'Ближайшее'}</span>
              <h2>{showSupport ? 'Связь с клиникой' : 'Что важно сейчас'}</h2>
            </div>
          </div>

          {showDocs ? documents.map((doc) => (
            <div className="clinic-os-timeline-item" key={doc.title}>
              <FileText className="h-4 w-4" />
              <span>{doc.title} - {doc.meta} - {doc.date}</span>
            </div>
          )) : null}

          {showRecords ? recordItems.map((item) => (
            <div className="clinic-os-timeline-item" key={item}>
              <HeartPulse className="h-4 w-4" />
              <span>{item}</span>
            </div>
          )) : null}

          {showSupport ? (
            <div className="clinic-os-empty-state">
              <MessageSquare className="h-8 w-8" />
              <strong>Опишите вопрос</strong>
              <p>Тема, клиника, роль и страница будут прикреплены к обращению автоматически.</p>
              <Link className="clinic-os-button" to="/support">Открыть поддержку</Link>
            </div>
          ) : null}

          {!showRecords && !showDocs && !showSupport ? appointments.map((appointment) => (
            <article className="clinic-os-visit-card" key={appointment.date}>
              <div className="clinic-os-visit-time">{appointment.date}</div>
              <div><strong>{appointment.service}</strong><span>{appointment.doctor}</span></div>
              <span className="clinic-os-pill clinic-os-pill--ready">{appointment.status}</span>
            </article>
          )) : null}
        </div>

        <aside className="mis-card rounded-xl p-5">
          <div className="clinic-os-panel-head"><div><span>Действия</span><h2>Быстро</h2></div></div>
          <Link className="clinic-os-action-row" to="/patient/documents">Мои документы</Link>
          <Link className="clinic-os-action-row" to="/patient/records">Моя медкарта</Link>
          <Link className="clinic-os-action-row" to="/patient/support">Помощь</Link>
        </aside>
      </section>
    </main>
  )
}
