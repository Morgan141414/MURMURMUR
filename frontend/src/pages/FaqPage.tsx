import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, HelpCircle, Search, X } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import './FaqPage.css'

interface FaqItem {
  questionKey: string
  answerKey: string
  category: string
}

const FAQ_ITEMS: FaqItem[] = [
  // Getting started
  { questionKey: 'faq.items.whatIsPlatform.q', answerKey: 'faq.items.whatIsPlatform.a', category: 'getting_started' },
  { questionKey: 'faq.items.howToRegister.q', answerKey: 'faq.items.howToRegister.a', category: 'getting_started' },
  { questionKey: 'faq.items.howToJoinOrg.q', answerKey: 'faq.items.howToJoinOrg.a', category: 'getting_started' },
  { questionKey: 'faq.items.howToCreateOrg.q', answerKey: 'faq.items.howToCreateOrg.a', category: 'getting_started' },
  // Activity & sessions
  { questionKey: 'faq.items.whatIsActivity.q', answerKey: 'faq.items.whatIsActivity.a', category: 'activity' },
  { questionKey: 'faq.items.howToStartSession.q', answerKey: 'faq.items.howToStartSession.a', category: 'activity' },
  { questionKey: 'faq.items.canManagerSeeActivity.q', answerKey: 'faq.items.canManagerSeeActivity.a', category: 'activity' },
  // Reports
  { questionKey: 'faq.items.whatReportsAvailable.q', answerKey: 'faq.items.whatReportsAvailable.a', category: 'reports' },
  { questionKey: 'faq.items.howToExportReport.q', answerKey: 'faq.items.howToExportReport.a', category: 'reports' },
  { questionKey: 'faq.items.whatIsAiScore.q', answerKey: 'faq.items.whatIsAiScore.a', category: 'reports' },
  // Account & security
  { questionKey: 'faq.items.howToChangePassword.q', answerKey: 'faq.items.howToChangePassword.a', category: 'account' },
  { questionKey: 'faq.items.howToEnable2fa.q', answerKey: 'faq.items.howToEnable2fa.a', category: 'account' },
  { questionKey: 'faq.items.howToEditProfile.q', answerKey: 'faq.items.howToEditProfile.a', category: 'account' },
  // Admin
  { questionKey: 'faq.items.howToManageMembers.q', answerKey: 'faq.items.howToManageMembers.a', category: 'admin' },
  { questionKey: 'faq.items.whatArePrivacyRules.q', answerKey: 'faq.items.whatArePrivacyRules.a', category: 'admin' },
  { questionKey: 'faq.items.howToApproveRequests.q', answerKey: 'faq.items.howToApproveRequests.a', category: 'admin' },
  // Support
  { questionKey: 'faq.items.howToContactSupport.q', answerKey: 'faq.items.howToContactSupport.a', category: 'support' },
  { questionKey: 'faq.items.howLongForReply.q', answerKey: 'faq.items.howLongForReply.a', category: 'support' },
]

const CATEGORIES = ['all', 'getting_started', 'activity', 'reports', 'account', 'admin', 'support'] as const

export default function FaqPage() {
  const { t } = useTranslation()
  const isDark = useUiStore((s) => s.theme === 'dark')
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')

  const filteredItems = FAQ_ITEMS.filter((item) => {
    if (category !== 'all' && item.category !== category) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      t(item.questionKey).toLowerCase().includes(q) ||
      t(item.answerKey).toLowerCase().includes(q)
    )
  })

  return (
    <div className={`faq-container ${isDark ? '' : 'faq-light'}`}>
      <div className="faq-content">
        {/* Header */}
        <div className="faq-header">
          <div className="faq-header-icon">
            <HelpCircle size={32} />
          </div>
          <h1>{t('faq.title')}</h1>
          <p>{t('faq.subtitle')}</p>
        </div>

        {/* Search */}
        <div className="faq-search">
          <Search size={18} className="faq-search-icon" />
          <input
            type="text"
            placeholder={t('faq.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="faq-search-clear" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="faq-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`faq-cat-btn ${category === cat ? 'faq-cat-btn--active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {t(`faq.categories.${cat}`)}
            </button>
          ))}
        </div>

        {/* FAQ items */}
        <div className="faq-list">
          {filteredItems.length === 0 ? (
            <div className="faq-empty">
              <HelpCircle size={48} />
              <p>{t('faq.noResults')}</p>
            </div>
          ) : (
            filteredItems.map((item, i) => {
              const globalIndex = FAQ_ITEMS.indexOf(item)
              const isOpen = openIndex === globalIndex
              return (
                <div
                  key={globalIndex}
                  className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}
                >
                  <button
                    className="faq-item-header"
                    onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                  >
                    <span className="faq-item-number">{String(i + 1).padStart(2, '0')}</span>
                    <span className="faq-item-question">{t(item.questionKey)}</span>
                    <ChevronDown size={18} className={`faq-item-chevron ${isOpen ? 'faq-item-chevron--open' : ''}`} />
                  </button>
                  <div className={`faq-item-body ${isOpen ? 'faq-item-body--open' : ''}`}>
                    <div className="faq-item-answer">
                      {t(item.answerKey)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
