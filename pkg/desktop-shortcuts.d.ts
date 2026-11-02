declare module 'create-desktop-shortcuts' {
  export default function createDesktopShortcut(options: {
    linux?: {
      filePath: string
      outputPath?: string
      name?: string
      icon?: string
    }
  }): boolean
}
