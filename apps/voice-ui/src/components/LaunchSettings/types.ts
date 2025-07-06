export interface LaunchConfig {
  workDir: string
  forceMode: boolean
}

export interface TaskConfig {
  scriptFile: string
  maxTranslator: number
  forceMode: boolean
}

export interface TaskStatus {
  isRunning: boolean
  progress: number
  message: string
  error?: string
} 