import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, FolderOpen, LoaderCircle, Play, RefreshCw, UserRound, WifiOff } from 'lucide-react'
import type { GameVersion, JavaRuntimeInfo, LauncherState, SystemInfo } from '../../shared/types'
import { memoryGb } from '../../shared/memory'
import { diagnoseError } from '../../shared/errors'

type T = (source: string, values?: Record<string, string | number>) => string

const namePattern = /^[A-Za-z0-9_]{3,16}$/
const minMemoryMb = 1024
const memoryStep = 512
const hardMemoryCapMb = 32768

/** Highest RAM allocation the slider offers: the machine's physical memory, rounded down to a step. */
export function memoryCeiling(totalMemoryMb: number | undefined): number {
  if (!totalMemoryMb || !Number.isFinite(totalMemoryMb)) return 16384
  return Math.max(minMemoryMb, Math.min(hardMemoryCapMb, Math.floor(totalMemoryMb / memoryStep) * memoryStep))
}

export function QuickLaunchPanel({ state, versions, launchBusy, t, onState, onNotice, onPlay }: {
  state: LauncherState; versions: GameVersion[]; launchBusy: boolean; t: T
  onState: (state: LauncherState) => void; onNotice: (message: string) => void; onPlay: (versionId: string) => Promise<void>
}) {
  const selectedAccount = state.accounts.find(item => item.id === state.selectedAccountId)
  const [name, setName] = useState(selectedAccount?.kind === 'offline' ? selectedAccount.name : '')
  const [applying, setApplying] = useState(false)
  const [system, setSystem] = useState<SystemInfo | null>(null)
  const [runtimes, setRuntimes] = useState<JavaRuntimeInfo[]>([])
  const [scanning, setScanning] = useState(false)
  const [memory, setMemory] = useState(state.settings.memoryMb)
  const [versionId, setVersionId] = useState(state.selectedVersionId ?? '')
  const applyLock = useRef(false)

  // Keep the field in sync when the account is switched somewhere else in the launcher.
  useEffect(() => { if (selectedAccount?.kind === 'offline') setName(selectedAccount.name) }, [selectedAccount?.id, selectedAccount?.name, selectedAccount?.kind])
  useEffect(() => { setMemory(state.settings.memoryMb) }, [state.settings.memoryMb])
  useEffect(() => { window.launcher.getSystemInfo().then(setSystem).catch(() => setSystem(null)) }, [])
  const scan = () => {
    setScanning(true)
    window.launcher.getJavaRuntimes().then(setRuntimes).catch(() => setRuntimes([])).finally(() => setScanning(false))
  }
  useEffect(scan, [])

  const installed = useMemo(() => versions.filter(item => item.installed || item.optifineVersions.length > 0), [versions])
  const downloadable = useMemo(() => versions.filter(item => !item.installed && item.type === 'release' && !item.custom).slice(0, 40), [versions])
  const options = useMemo(() => {
    const ids = new Set<string>()
    const installedIds: string[] = []
    for (const item of installed) {
      if (item.installed && !ids.has(item.id)) { ids.add(item.id); installedIds.push(item.id) }
      for (const variant of item.optifineVersions) if (!ids.has(variant.id)) { ids.add(variant.id); installedIds.push(variant.id) }
    }
    return { installedIds, downloadIds: downloadable.map(item => item.id).filter(id => !ids.has(id)) }
  }, [installed, downloadable])
  const knownIds = new Set([...options.installedIds, ...options.downloadIds])
  const effectiveVersion = knownIds.has(versionId) ? versionId : options.installedIds[0] ?? options.downloadIds[0] ?? ''
  const isInstalled = options.installedIds.includes(effectiveVersion)

  const trimmed = name.trim()
  const validName = namePattern.test(trimmed)
  const sameAsSelected = selectedAccount?.kind === 'offline' && selectedAccount.name === trimmed
  const nameError = trimmed && !validName ? t('3-16 karakter: harf, rakam veya alt çizgi.') : ''
  const ceiling = memoryCeiling(system?.totalMemoryMb)
  const heavy = !!system && memory > system.totalMemoryMb * 0.75
  const javaPath = state.settings.javaPath
  const javaKnown = !javaPath || runtimes.some(item => item.path.toLowerCase() === javaPath.toLowerCase())

  const applyName = async (): Promise<boolean> => {
    if (!validName) { onNotice(t('Önce geçerli bir kullanıcı adı gir.')); return false }
    if (sameAsSelected) return true
    if (applyLock.current) return false
    applyLock.current = true
    setApplying(true)
    try {
      const existing = state.accounts.find(item => item.kind === 'offline' && item.name.toLowerCase() === trimmed.toLowerCase())
      const next = existing ? await window.launcher.selectAccount(existing.id) : await window.launcher.createOfflineAccount(trimmed)
      onState(next)
      onNotice(t('Çevrimdışı hesap hazır: {name}', { name: trimmed }))
      return true
    } catch (error) { onNotice(t(diagnoseError(error).message)); return false }
    finally { applyLock.current = false; setApplying(false) }
  }
  const saveSettings = async (changes: { memoryMb?: number; javaPath?: string }) => {
    try { onState(await window.launcher.saveSettings(changes)) } catch (error) { onNotice(t(diagnoseError(error).message)) }
  }
  const commitMemory = () => { if (memory !== state.settings.memoryMb) void saveSettings({ memoryMb: memory }) }
  const chooseVersion = (id: string) => { setVersionId(id); if (id) window.launcher.selectVersion(id).then(onState).catch(() => undefined) }
  const browseJava = async () => {
    try { const path = await window.launcher.chooseJava(); if (path) await saveSettings({ javaPath: path }) }
    catch (error) { onNotice(t(diagnoseError(error).message)) }
  }
  const play = async () => {
    if (!effectiveVersion) return
    if (!(await applyName())) return
    await onPlay(effectiveVersion)
  }
  const presets = [2048, 4096, 6144, 8192].filter(value => value <= ceiling)

  return <section className="quick-play-panel" aria-label={t('Hızlı oyun')}>
    <header className="quick-play-head"><div><h2>{t('Hızlı oyun')}</h2><p>{t('Kullanıcı adını, sürümü, belleği ve Java’yı seçip hemen başla.')}</p></div><span className="quick-play-badge"><WifiOff size={14} />{t('Çevrimdışı hesap')}</span></header>
    <div className="quick-play-grid">
      <div className="quick-field">
        <label htmlFor="quick-username">{t('Oyuncu adı')}</label>
        <div className={`quick-input ${nameError ? 'invalid' : ''}`}><UserRound size={17} /><input id="quick-username" value={name} maxLength={16} autoComplete="off" spellCheck={false} placeholder="Steve" aria-invalid={!!nameError} aria-describedby="quick-username-help" onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void applyName() }} onBlur={() => { if (validName && !sameAsSelected) void applyName() }} /><span>{trimmed.length}/16</span></div>
        <small id="quick-username-help" className={nameError ? 'invalid' : ''}>{nameError || (applying ? t('Hesap hazırlanıyor...') : t('3-16 karakter: harf, rakam veya alt çizgi.'))}</small>
      </div>
      <div className="quick-field">
        <label htmlFor="quick-version">{t('Sürüm')}</label>
        <select id="quick-version" className="quick-select" value={effectiveVersion} disabled={!options.installedIds.length && !options.downloadIds.length} onChange={event => chooseVersion(event.target.value)}>
          {options.installedIds.length > 0 && <optgroup label={t('Kurulu sürümler')}>{options.installedIds.map(id => <option key={id} value={id}>{id}</option>)}</optgroup>}
          {options.downloadIds.length > 0 && <optgroup label={t('Oynarken indirilir')}>{options.downloadIds.map(id => <option key={id} value={id}>{id}</option>)}</optgroup>}
        </select>
        <small>{effectiveVersion ? (isInstalled ? t('Yüklü') : t('Oynarken indirilir')) : t('Sürümler yükleniyor...')}</small>
      </div>
      <div className="quick-field quick-memory">
        <div className="quick-label-row"><label htmlFor="quick-memory">{t('Bellek')} (RAM)</label><strong>{memoryGb(memory)} GB <small>· {memory} MB</small></strong></div>
        <input id="quick-memory" className="quick-range" type="range" min={minMemoryMb} max={ceiling} step={memoryStep} value={Math.min(memory, ceiling)} onChange={event => setMemory(Number(event.target.value))} onPointerUp={commitMemory} onKeyUp={commitMemory} onBlur={commitMemory} />
        <div className="quick-presets">{presets.map(value => <button key={value} type="button" className={memory === value ? 'active' : ''} onClick={() => { setMemory(value); void saveSettings({ memoryMb: value }) }}>{value / 1024} GB</button>)}</div>
        {heavy ? <small className="quick-warning"><AlertTriangle size={13} />{t('Fiziksel belleğinin büyük kısmını ayırıyorsun; oyun veya sistem yavaşlayabilir.')}</small> : <small>{system ? t('Bilgisayarında {total} GB RAM var.', { total: memoryGb(system.totalMemoryMb) }) : ''}</small>}
      </div>
      <div className="quick-field quick-java">
        <div className="quick-label-row"><label htmlFor="quick-java">Java</label><button type="button" className="quick-link" disabled={scanning} onClick={scan}>{scanning ? <LoaderCircle className="spin" size={13} /> : <RefreshCw size={13} />}{t('Yeniden tara')}</button></div>
        <div className="quick-java-row">
          <select id="quick-java" className="quick-select" value={javaPath} onChange={event => void saveSettings({ javaPath: event.target.value })}>
            <option value="">{t('Otomatik algıla')}</option>
            {!javaKnown && <option value={javaPath}>{javaPath}</option>}
            {runtimes.map(item => <option key={item.path} value={item.path}>{`Java ${item.version} · ${item.path}`}</option>)}
          </select>
          <button type="button" className="quick-icon-button" title={t('Java seç')} aria-label={t('Java seç')} onClick={() => void browseJava()}><FolderOpen size={17} /></button>
        </div>
        <small>{t('Bellek ve Java, profilsiz başlatmalar ile genel ayarı kullanan profiller için geçerlidir.')}</small>
      </div>
    </div>
    <footer className="quick-play-actions"><button type="button" className="quick-play-button" disabled={launchBusy || applying || !effectiveVersion || !validName} onClick={() => void play()}>{launchBusy || applying ? <LoaderCircle className="spin" size={20} /> : <Play size={20} fill="currentColor" />}{t('Başlat')} {effectiveVersion && <span>{effectiveVersion}</span>}</button></footer>
  </section>
}
