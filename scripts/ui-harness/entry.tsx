import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QuickLaunchPanel } from '/home/claude/GreenLauncher-main/src/renderer/src/QuickLaunchPanel'
import { InstalledVersionsManager } from '/home/claude/GreenLauncher-main/src/renderer/src/InstalledVersionsManager'
import { Layers3, HardDrive } from 'lucide-react'
import { translate } from '/home/claude/GreenLauncher-main/src/renderer/src/i18n'

const lang = (new URLSearchParams(location.search).get('lang') ?? 'en') as any
const t = (s: string, v?: any) => translate(lang, s, v)
const calls: any[] = []
;(window as any).__calls = calls
let st: any = {
  settings: { memoryMb: 4096, javaPath: '', language: lang }, profiles: [], selectedProfileId: null, selectedVersionId: null, accounts: [], selectedAccountId: null, dataPath: 'C:/x', playHistory: []
}
const installedList = [
  { id: '1.21.4', kind: 'release', baseVersion: '1.21.4', releaseTime: '2024-12-03T00:00:00Z', bytes: 28_400_000, dependents: ['fabric-loader-0.16.9-1.21.4'], removable: false },
  { id: 'fabric-loader-0.16.9-1.21.4', kind: 'loader', loader: 'fabric', baseVersion: '1.21.4', releaseTime: '2024-12-10T00:00:00Z', bytes: 410_000, dependents: [], removable: true },
  { id: '1.8.9', kind: 'release', baseVersion: '1.8.9', releaseTime: '2015-12-09T00:00:00Z', bytes: 9_800_000, dependents: [], removable: true },
  { id: '25w10a', kind: 'snapshot', baseVersion: '25w10a', releaseTime: '2025-03-05T00:00:00Z', bytes: 31_000_000, dependents: [], removable: true },
]
;(window as any).launcher = {
  getSystemInfo: async () => ({ totalMemoryMb: Number(new URLSearchParams(location.search).get('ram') ?? 16384), freeMemoryMb: 8000, cpuCount: 8, platform: 'win32' }),
  getJavaRuntimes: async () => [{ path: 'C:/Java/jdk-21/bin/javaw.exe', version: '21.0.2', majorVersion: 21, source: 'x' }, { path: 'C:/Java/jre8/bin/javaw.exe', version: '1.8.0_402', majorVersion: 8, source: 'x' }],
  selectVersion: async (id: string) => { calls.push(['selectVersion', id]); st = { ...st, selectedVersionId: id }; return st },
  selectAccount: async (id: string) => { calls.push(['selectAccount', id]); st = { ...st, selectedAccountId: id }; return st },
  createOfflineAccount: async (name: string) => {
    calls.push(['createOfflineAccount', name])
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw new Error('Oyuncu adı 3-16 karakter olmalı')
    if (st.accounts.some((a: any) => a.name.toLowerCase() === name.toLowerCase())) throw new Error('Bu oyuncu adıyla bir hesap zaten var.')
    const a = { id: 'off-' + name, name, homeAccountId: 'off-' + name, kind: 'offline' }
    st = { ...st, accounts: [...st.accounts, a], selectedAccountId: a.id }; return st
  },
  saveSettings: async (c: any) => { calls.push(['saveSettings', c]); st = { ...st, settings: { ...st.settings, ...c } }; return st },
  chooseJava: async () => { calls.push(['chooseJava']); return 'D:/MyJava/bin/javaw.exe' },
  getInstalledVersions: async () => installedList,
  openVersionLocation: async (id: string) => { calls.push(['openVersionLocation', id]) },
}
const versions: any[] = [
  { id: '1.21.4', type: 'release', installed: true, optifineVersions: [], releaseTime: '2024-12-03T00:00:00Z', url: '' },
  { id: '1.8.9', type: 'release', installed: true, optifineVersions: [{ id: '1.8.9-OptiFine_HD_U_M5', source: 'launcher' }], releaseTime: '2015-12-09T00:00:00Z', url: '' },
  { id: '1.21.5', type: 'release', installed: false, optifineVersions: [], releaseTime: '2025-03-25T00:00:00Z', url: '' },
  { id: '1.20.1', type: 'release', installed: false, optifineVersions: [], releaseTime: '2023-06-12T00:00:00Z', url: '' },
  { id: '25w10a', type: 'snapshot', installed: true, optifineVersions: [], releaseTime: '2025-03-05T00:00:00Z', url: '' },
]
function Home() {
  const [state, setState] = useState<any>(st)
  const [toast, setToast] = useState('')
  const [view, setView] = useState<'library' | 'installed'>('installed')
  const mode = new URLSearchParams(location.search).get('page') ?? 'home'
  return <div className="app-shell"><main className="main-content" style={{ height: '100vh' }}>
    {mode === 'home' ? <div className="home-bottom"><QuickLaunchPanel state={state} versions={versions} launchBusy={false} t={t} onState={s => { st = s; setState(s) }} onNotice={setToast} onPlay={async id => { calls.push(['play', id]) }} /></div>
    : <div className="content-page"><div className="page-heading"><div><h2>{t('Sürümler')}</h2></div></div>
      <div className="versions-view-tabs" role="tablist">{(['library', 'installed'] as const).map(v => <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{v === 'library' ? <Layers3 size={16} /> : <HardDrive size={16} />}{t(v === 'library' ? 'Sürüm listesi' : 'Kurulu sürüm yöneticisi')}</button>)}</div>
      <InstalledVersionsManager t={t} refreshKey={versions} busy={false} launchBusy={false} formatDate={v => new Date(v).toLocaleDateString('en-GB')} onPlay={id => calls.push(['play', id])} onDelete={id => calls.push(['delete', id])} onNotice={setToast} /></div>}
    <div id="toast" style={{ position: 'fixed', bottom: 8, left: 8 }}>{toast}</div>
  </main></div>
}
createRoot(document.getElementById('root')!).render(<Home />)
