import { useEffect, useMemo, useState } from 'react'
import { FolderOpen, HardDrive, LoaderCircle, Play, RefreshCw, Search, Trash2 } from 'lucide-react'
import type { InstalledVersionInfo } from '../../shared/types'
import { diagnoseError } from '../../shared/errors'

type T = (source: string, values?: Record<string, string | number>) => string
type Sort = 'newest' | 'size' | 'name'

export const formatSize = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : bytes < 1024 ** 3 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${(bytes / 1024 ** 3).toFixed(2)} GB`

const loaderNames: Record<string, string> = { fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt', liteloader: 'LiteLoader', optifine: 'OptiFine' }

export function sortInstalled(items: InstalledVersionInfo[], sort: Sort): InstalledVersionInfo[] {
  const copy = [...items]
  if (sort === 'size') return copy.sort((a, b) => b.bytes - a.bytes || a.id.localeCompare(b.id))
  if (sort === 'name') return copy.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  return copy.sort((a, b) => Date.parse(b.releaseTime) - Date.parse(a.releaseTime) || a.id.localeCompare(b.id))
}

export function InstalledVersionsManager({ t, refreshKey, busy, launchBusy, formatDate, onPlay, onDelete, onNotice }: {
  t: T; refreshKey: unknown; busy: boolean; launchBusy: boolean; formatDate: (value: string) => string
  onPlay: (versionId: string) => void; onDelete: (versionId: string) => void; onNotice: (message: string) => void
}) {
  const [items, setItems] = useState<InstalledVersionInfo[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const load = () => {
    setLoading(true)
    window.launcher.getInstalledVersions().then(setItems).catch(error => { setItems([]); onNotice(t(diagnoseError(error).message)) }).finally(() => setLoading(false))
  }
  useEffect(load, [refreshKey])
  const visible = useMemo(() => sortInstalled((items ?? []).filter(item => item.id.toLowerCase().includes(query.trim().toLowerCase())), sort), [items, query, sort])
  const total = (items ?? []).reduce((sum, item) => sum + item.bytes, 0)
  const kindLabel = (item: InstalledVersionInfo) => item.kind === 'loader' && item.loader ? loaderNames[item.loader] : item.kind === 'optifine' ? 'OptiFine' : item.kind === 'custom' ? t('Özel istemci') : item.kind === 'snapshot' ? t('Snapshot') : item.kind === 'legacy' ? t('Eski sürüm') : t('Sürüm')
  const reveal = (id: string) => window.launcher.openVersionLocation(id).catch(error => onNotice(t(diagnoseError(error).message)))

  return <section className="installed-manager" aria-label={t('Kurulu sürüm yöneticisi')}>
    <div className="installed-summary">
      <div><HardDrive size={20} /><div><strong>{items ? items.length : '—'}</strong><span>{t('Kurulu sürümler')}</span></div></div>
      <div><div><strong>{items ? formatSize(total) : '—'}</strong><span>{t('Sürüm klasörlerinde kullanılan alan')}</span></div></div>
      <button type="button" className="heading-action" disabled={loading} onClick={load}>{loading ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}{t('Yeniden tara')}</button>
    </div>
    <div className="installed-toolbar">
      <div className="search-box"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Sürüm ara') + '...'} /></div>
      <div className="filter-tabs" role="group" aria-label={t('Sırala')}>{(['newest', 'size', 'name'] as Sort[]).map(item => <button key={item} type="button" className={sort === item ? 'selected' : ''} onClick={() => setSort(item)}>{t(item === 'newest' ? 'En yeni' : item === 'size' ? 'Boyut' : 'Ad')}</button>)}</div>
    </div>
    <div className="version-list installed-list">
      <div className="list-head installed-head"><span>{t('Sürüm')}</span><span>{t('Yayın tarihi')}</span><span>{t('Boyut')}</span><span /></div>
      {items === null ? <div className="empty-state"><LoaderCircle className="spin" size={26} /> {t('Sürümler yükleniyor...')}</div>
        : visible.length === 0 ? <div className="empty-state">{items.length ? t('Bu filtrede sürüm bulunamadı.') : t('Henüz kurulu sürüm yok. Sürüm listesinden bir sürüm indir.')}</div>
        : visible.map(item => <div className="version-row installed-row" key={item.id}>
          <div className="version-main"><div><strong>{item.id}</strong><span>{kindLabel(item)}{item.baseVersion && item.baseVersion !== item.id ? ` · ${item.baseVersion}` : ''}</span></div></div>
          <div className="row-date"><span>{formatDate(item.releaseTime)}</span></div>
          <div className="row-status"><span className="installed-size">{formatSize(item.bytes)}</span></div>
          <div className="row-actions">
            <button type="button" title={t('Profilsiz başlat')} aria-label={`${item.id}: ${t('Profilsiz başlat')}`} disabled={launchBusy} onClick={() => onPlay(item.id)}><Play size={17} /></button>
            <button type="button" title={t('Dosya konumunda aç')} aria-label={`${item.id}: ${t('Dosya konumunda aç')}`} onClick={() => void reveal(item.id)}><FolderOpen size={17} /></button>
            <button type="button" title={item.removable ? t('Sürümü kaldır') : t('Bu sürüme bağlı kurulu sürümler var. Önce onları kaldırın.')} aria-label={`${item.id}: ${t('Sürümü kaldır')}`} disabled={busy || !item.removable} onClick={() => onDelete(item.id)}><Trash2 size={17} /></button>
          </div>
        </div>)}
    </div>
  </section>
}
