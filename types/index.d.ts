export type Running = boolean
export type Phase = 'dawn' | 'morning' | 'day' | 'sunset' | 'night'

declare module 'claude-code' {
  interface PluginState {
    'mountain-view': { isRunning: Running; phase: Phase }
  }
}
