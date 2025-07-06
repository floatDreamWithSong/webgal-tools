import { VoiceWrapper } from '@/lib/voice-wrapper'

declare global {
  var currentVoiceTask: {
    wrapper: VoiceWrapper
    workDir: string
    scriptFile: string
    startTime: number
  } | null
  
  var broadcastToMonitorClients: (data: Record<string, unknown>) => void
}

export {} 