import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw, ExternalLink } from 'lucide-react'
import type { UpdateInfo, UpdateProgress } from '../../shared/types'

/** Estado de actualización: se consulta al abrir el panel y bajo demanda. */
export function useUpdateStatus() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)

  const check = useCallback(async () => {
    setChecking(true)
    setProgress(null)
    try {
      setInfo(await window.electronAPI.checkForUpdate())
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI.platform !== 'electron') return
    check()
    return window.electronAPI.onUpdateProgress(setProgress)
  }, [check])

  return { info, checking, progress, check }
}

type Status = ReturnType<typeof useUpdateStatus>

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)

export function UpdatePanel({ status }: { status: Status }) {
  const { info, checking, progress, check } = status
  const busy = progress?.phase === 'descargando' || progress?.phase === 'instalando'

  const install = () => {
    if (!info?.latest) return
    const ok = window.confirm(`Se descargará la versión ${info.latest}. La app se cerrará y se abrirá ya actualizada.\n\n¿Continuar?`)
    if (ok) window.electronAPI.installUpdate()
  }

  let message: string
  if (checking) message = 'Buscando actualizaciones…'
  else if (!info) message = ''
  else if (info.error) message = `No se pudo consultar GitHub: ${info.error}`
  else if (info.available) message = `Hay una versión nueva: ${info.latest}`
  else if (info.latest) message = 'Tienes la última versión.'
  else message = 'Todavía no hay versiones publicadas.'

  return (
    <div className="config-group">
      <div className="config-group-title">Versión</div>
      <div className="update-row">
        <span>Versión actual <strong>{info?.current ?? '…'}</strong></span>
        <span className={info?.available ? 'update-msg update-msg--new' : 'update-msg'}>{message}</span>
      </div>

      {progress?.phase === 'descargando' && (
        <div className="update-progress">
          <div className="update-progress-bar" style={{ width: `${(progress.received / progress.total) * 100}%` }} />
          <span>Descargando {mb(progress.received)} de {mb(progress.total)} MB</span>
        </div>
      )}
      {progress?.phase === 'instalando' && <span className="update-msg update-msg--new">Cerrando para instalar…</span>}
      {progress?.phase === 'error' && <span className="update-msg update-msg--error">{progress.message}</span>}

      <div className="update-row">
        <button className="btn btn-ghost btn-sm" onClick={check} disabled={checking || busy}>
          <RefreshCw size={14} /> Buscar actualizaciones
        </button>
        {info?.available && info.canInstall && (
          <button className="btn btn-primary btn-sm" onClick={install} disabled={busy}>
            <Download size={14} /> Descargar y actualizar
          </button>
        )}
        {info?.available && !info.canInstall && (
          <button className="btn btn-ghost btn-sm" onClick={() => window.electronAPI.openReleasePage()}>
            <ExternalLink size={14} /> Ver en GitHub
          </button>
        )}
      </div>
      {info?.available && !info.canInstall && (
        <span className="update-msg">La actualización automática sólo funciona desde el .exe portable.</span>
      )}
    </div>
  )
}
