/// <reference path="./dashboard-api.d.ts" />
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Play,
  Square,
  RefreshCw,
  FolderOpen,
  Hammer,
  Package,
  Terminal,
  X,
  AlertTriangle,
  Layers,
} from 'lucide-react'
import type { DashboardApp as AppItem, LaunchMode, LogLine } from '../shared/types'
import './dashboard.css'

const STATUS_LABEL: Record<AppItem['status'], string> = {
  stopped: 'Detenida',
  starting: 'Iniciando',
  running: 'En ejecución',
  error: 'Error',
}

/** Modo de arranque preferido: el ejecutable si ya está compilado. */
function defaultMode(app: AppItem): LaunchMode | null {
  if (app.portablePath) return 'portable'
  if (app.hasDev) return 'dev'
  return null
}

function AppIsland({
  app,
  onLaunch,
  onStop,
  onSelect,
  selected,
}: {
  app: AppItem
  onLaunch: (mode: LaunchMode) => void
  onStop: () => void
  onSelect: () => void
  selected: boolean
}) {
  const busy = app.status === 'running' || app.status === 'starting'
  const mode = defaultMode(app)

  return (
    <div
      className={`island island--${app.status}${selected ? ' island--selected' : ''}`}
      style={{ '--accent': app.accent } as React.CSSProperties}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onSelect()
      }}
    >
      <div className="island__top">
        <span className={`island__status island__status--${app.status}`}>
          {app.task ? (app.task === 'build' ? 'Compilando…' : 'Empaquetando…') : STATUS_LABEL[app.status]}
        </span>
      </div>

      <div className="island__icon">
        {app.iconUrl ? (
          <img src={app.iconUrl} alt="" />
        ) : (
          <span className="island__initials">{app.initials}</span>
        )}
      </div>

      <div className="island__meta">
        <h3 className="island__name">{app.name}</h3>
        <p className="island__desc">{app.description || 'Sin descripción.'}</p>
      </div>

      <div className="island__actions" onClick={e => e.stopPropagation()}>
        {busy ? (
          <button className="btn btn--stop" onClick={onStop}>
            <Square size={14} /> Detener
          </button>
        ) : (
          <button className="btn btn--play" disabled={!mode} onClick={() => mode && onLaunch(mode)}>
            <Play size={14} /> Abrir
          </button>
        )}
      </div>

      {/* En un bundle portable no hay node_modules y no hace falta: sólo avisa si tampoco hay .exe. */}
      {!app.hasDeps && !app.portablePath && (
        <div className="island__warn" title="Ejecutá npm install en la carpeta de la app">
          <AlertTriangle size={13} /> sin dependencias
        </div>
      )}
    </div>
  )
}

function DetailPanel({
  app,
  logs,
  onClose,
}: {
  app: AppItem
  logs: LogLine[]
  onClose: () => void
}) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  const api = window.dashboardAPI
  const taskRunning = app.task !== null

  return (
    <aside className="detail">
      <header className="detail__head">
        <h2>{app.name}</h2>
        <button className="btn btn--ghost" onClick={onClose} aria-label="Cerrar">
          <X size={16} />
        </button>
      </header>

      {app.lastError && <p className="detail__error">{app.lastError}</p>}

      <div className="detail__row">
        <button
          className="btn"
          disabled={!app.portablePath || app.status === 'running'}
          onClick={() => api.launch(app.id, 'portable')}
          title={app.portablePath ?? 'Todavía no hay ejecutable portable'}
        >
          <Play size={14} /> Ejecutable
        </button>
        <button
          className="btn"
          disabled={!app.hasDev || app.status === 'running'}
          onClick={() => api.launch(app.id, 'dev')}
        >
          <Terminal size={14} /> Desarrollo
        </button>
        <button className="btn" disabled={!app.hasBuild || taskRunning} onClick={() => api.runTask(app.id, 'build')}>
          <Hammer size={14} /> Compilar
        </button>
        <button className="btn" disabled={!app.hasPackage || taskRunning} onClick={() => api.runTask(app.id, 'package')}>
          <Package size={14} /> Empaquetar
        </button>
        <button className="btn" onClick={() => api.openFolder(app.id)}>
          <FolderOpen size={14} /> Carpeta
        </button>
      </div>

      <div className="detail__logs" ref={logRef}>
        {logs.length === 0 ? (
          <p className="detail__empty">Sin salida todavía.</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} className={`logline logline--${l.stream}`}>
              {l.text}
            </div>
          ))
        )}
      </div>

      <footer className="detail__foot">
        <span>{app.hasManifest ? 'app.manifest.json' : 'derivado de package.json'}</span>
        <button className="btn btn--ghost" onClick={() => api.clearLogs(app.id)}>
          Limpiar log
        </button>
      </footer>
    </aside>
  )
}

export default function DashboardApp() {
  const [apps, setApps] = useState<AppItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])

  const api = window.dashboardAPI

  useEffect(() => {
    api.listApps().then(setApps)
    const offApps = api.onAppsUpdate(setApps)
    return offApps
  }, [api])

  // Los logs se cargan al seleccionar y se van completando en vivo.
  useEffect(() => {
    if (!selectedId) {
      setLogs([])
      return
    }
    let alive = true
    api.getLogs(selectedId).then(l => {
      if (alive) setLogs(l)
    })
    const off = api.onLog(line => {
      if (line.appId === selectedId) setLogs(prev => [...prev, line])
    })
    return () => {
      alive = false
      off()
    }
  }, [api, selectedId])

  const selected = useMemo(() => apps.find(a => a.id === selectedId) ?? null, [apps, selectedId])

  const launch = useCallback((id: string, mode: LaunchMode) => api.launch(id, mode), [api])

  return (
    <div className={`shell${selected ? ' shell--split' : ''}`}>
      <header className="topbar">
        <div className="topbar__title">
          <Layers size={20} />
          <h1>Falso Vacío Hub</h1>
        </div>
        <div className="topbar__actions">
          <button className="btn btn--ghost" onClick={() => api.refresh()}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button className="btn btn--ghost" onClick={() => api.openWorkspaceRoot()}>
            <FolderOpen size={14} /> Abrir raíz
          </button>
        </div>
      </header>

      <main className="grid">
        {apps.length === 0 ? (
          <p className="grid__empty">
            No se encontró ninguna app. Creá una carpeta hermana de <code>dashboard/</code> con un{' '}
            <code>app.manifest.json</code> y pulsá Actualizar.
          </p>
        ) : (
          apps.map(app => (
            <AppIsland
              key={app.id}
              app={app}
              selected={app.id === selectedId}
              onSelect={() => setSelectedId(id => (id === app.id ? null : app.id))}
              onLaunch={mode => launch(app.id, mode)}
              onStop={() => api.stop(app.id)}
            />
          ))
        )}
      </main>

      {selected && <DetailPanel app={selected} logs={logs} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
