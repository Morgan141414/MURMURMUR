import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Building2, Command, FolderKanban, Search, Sparkles } from 'lucide-react'
import { Command as CommandRoot } from 'cmdk'
import { useTranslation } from 'react-i18next'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useOrgStore } from '@/stores/orgStore'
import { cn } from '@/lib/utils'
import { KbdShortcut } from './KbdShortcut'

const TOGGLE_EVENT = 'app:command-palette-toggle'

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(TOGGLE_EVENT))
}

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { results, recent } = useGlobalSearch(query)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    const onToggle = () => setOpen((prev) => !prev)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener(TOGGLE_EVENT, onToggle)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener(TOGGLE_EVENT, onToggle)
    }
  }, [])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const grouped = useMemo(() => ({
    pages: results.filter((item) => item.group === 'pages'),
    companies: results.filter((item) => item.group === 'companies'),
    actions: results.filter((item) => item.group === 'actions'),
  }), [results])

  const handleSelect = (value: string) => {
    const item = results.find((entry) => entry.id === value) ?? recent.find((entry) => entry.id === value)
    if (!item) return

    if (item.id.startsWith('company:')) {
      setActiveOrg(item.id.replace('company:', ''))
      setOpen(false)
      return
    }

    if (item.to) navigate(item.to)
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-[10vh] w-[min(42rem,calc(100vw-2rem))]" onClick={(e) => e.stopPropagation()}>
        <CommandRoot
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          label={t('commandPalette.title', 'Глобальный поиск')}
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CommandRoot.Input
              value={query}
              onValueChange={setQuery}
              placeholder={t('commandPalette.placeholder', 'Поиск по компаниям, людям, проектам и задачам...')}
              className="h-10 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <KbdShortcut keys={['Esc']} />
          </div>

          <CommandRoot.List className="max-h-[26rem] overflow-y-auto p-2">
            <CommandRoot.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
              {t('commandPalette.noResults', 'По этому запросу ничего не найдено.')}
            </CommandRoot.Empty>

            {!query && recent.length > 0 && (
              <CommandRoot.Group heading={t('commandPalette.recent', 'Недавнее')} className="mb-2">
                {recent.map((item) => (
                  <PaletteItem
                    key={item.id}
                    value={item.id}
                    title={item.label}
                    description={item.description}
                    icon={Command}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandRoot.Group>
            )}

            {grouped.pages.length > 0 && (
              <CommandRoot.Group heading={t('commandPalette.pages', 'Страницы')} className="mb-2">
                {grouped.pages.map((item) => (
                  <PaletteItem
                    key={item.id}
                    value={item.id}
                    title={item.label}
                    description={item.description}
                    icon={FolderKanban}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandRoot.Group>
            )}

            {grouped.companies.length > 0 && (
              <CommandRoot.Group heading={t('commandPalette.companies', 'Компании')} className="mb-2">
                {grouped.companies.map((item) => (
                  <PaletteItem
                    key={item.id}
                    value={item.id}
                    title={item.label}
                    description={item.description}
                    icon={Building2}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandRoot.Group>
            )}

            {grouped.actions.length > 0 && (
              <CommandRoot.Group heading={t('commandPalette.actions', 'Быстрые действия')}>
                {grouped.actions.map((item) => (
                  <PaletteItem
                    key={item.id}
                    value={item.id}
                    title={item.label}
                    description={item.description}
                    icon={Sparkles}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandRoot.Group>
            )}
          </CommandRoot.List>

          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span>{t('commandPalette.footer', 'Глобальный поиск и навигация')}</span>
            <KbdShortcut keys={['Ctrl', 'K']} />
          </div>
        </CommandRoot>
      </div>
    </div>
  )
}

interface PaletteItemProps {
  value: string
  title: string
  description?: string
  icon: typeof Search
  onSelect: (value: string) => void
}

function PaletteItem({ value, title, description, icon: Icon, onSelect }: PaletteItemProps) {
  return (
    <CommandRoot.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none',
        'data-[selected=true]:bg-accent data-[selected=true]:text-foreground',
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{title}</p>
        {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
      </div>
    </CommandRoot.Item>
  )
}
