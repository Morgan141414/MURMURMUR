import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { listCertificates, renewCertificate, revokeCertificate } from '@/api/adminPlatform'
import type { Certificate } from '@/types'
import { Award, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

export default function CertificatesPage() {
  const { t } = useTranslation()
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await listCertificates()
      setCerts(r.data)
    } catch {
      toast.error(t('superadmin.certsLoadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  async function handleRenew(orgId: string) {
    try {
      await renewCertificate(orgId)
      toast.success(t('superadmin.certRenewed'))
      load()
    } catch {
      toast.error(t('superadmin.certRenewError'))
    }
  }

  async function handleRevoke() {
    if (!revokeId || !revokeReason.trim()) return
    try {
      await revokeCertificate(revokeId, revokeReason.trim())
      toast.success(t('superadmin.certRevoked'))
      setRevokeId(null)
      setRevokeReason('')
      load()
    } catch {
      toast.error(t('superadmin.certRevokeError'))
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'expired': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'revoked': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader title={t('superadmin.certificates')} description={t('superadmin.certificatesDesc')} />

      {/* Revoke modal */}
      {revokeId && (
        <div className="rounded-lg border border-destructive/20 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('superadmin.revokeCert')}</h3>
          <input
            placeholder={t('superadmin.revokeReasonPlaceholder')}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none mb-3"
          />
          <div className="flex gap-2">
            <button onClick={handleRevoke} disabled={!revokeReason.trim()}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
              {t('superadmin.confirmRevoke')}
            </button>
            <button onClick={() => { setRevokeId(null); setRevokeReason('') }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Award className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">{t('superadmin.noCertificates')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('superadmin.certNumber')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('superadmin.orgId')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('superadmin.issuedAt')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('superadmin.expiresAt')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('superadmin.status')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {certs.map((cert) => (
                <tr key={cert.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{cert.certificate_number}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{cert.org_id}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(cert.issued_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(cert.expires_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(cert.status)}`}>
                      {cert.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      {cert.status === 'active' && (
                        <>
                          <button onClick={() => handleRenew(cert.org_id)}
                            className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20">
                            <RefreshCw className="h-3 w-3" /> {t('superadmin.renew')}
                          </button>
                          <button onClick={() => setRevokeId(cert.org_id)}
                            className="flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-900/20 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30">
                            <XCircle className="h-3 w-3" /> {t('superadmin.revoke')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
