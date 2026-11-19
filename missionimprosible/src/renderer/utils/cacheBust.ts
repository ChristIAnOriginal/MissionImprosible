/**
 * Añade `?v=` a una URL para forzar que se vuelva a cargar tras cambiar el
 * archivo (el logo). Las URL blob: de la versión web no admiten parámetros, y
 * además ya son distintas cada vez que el archivo cambia.
 */
export function cacheBust(url: string | null, version: number | string): string | null {
  if (!url || url.startsWith('blob:')) return url
  return `${url}?v=${version}`
}
