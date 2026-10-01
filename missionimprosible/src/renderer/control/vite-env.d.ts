/// <reference types="vite/client" />

declare module '*.mpeg' {
  const src: string
  export default src
}

declare module '*.mpeg?url' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpg?url' {
  const src: string
  export default src
}
