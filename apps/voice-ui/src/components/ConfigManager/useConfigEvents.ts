import { useEffect, useCallback } from 'react'
import { addConfigEventListener, removeConfigEventListener, ConfigEventType, ConfigEvent } from './eventBus'

export function useConfigEvents(
  eventTypes: ConfigEventType[],
  callback: (event: ConfigEvent) => void
) {
  const memoizedCallback = useCallback((event: ConfigEvent) => {
    callback(event)
  }, [callback])

  useEffect(() => {
    // 为每个事件类型添加监听器
    eventTypes.forEach(eventType => {
      addConfigEventListener(eventType, memoizedCallback)
    })

    // 清理函数
    return () => {
      eventTypes.forEach(eventType => {
        removeConfigEventListener(eventType, memoizedCallback)
      })
    }
  }, [eventTypes, memoizedCallback])
}

// 便捷 Hook，用于监听配置保存事件
export function useConfigSaved(callback: (event: ConfigEvent) => void) {
  useConfigEvents(['config-saved'], callback)
}

// 便捷 Hook，用于监听配置加载事件
export function useConfigLoaded(callback: (event: ConfigEvent) => void) {
  useConfigEvents(['config-loaded'], callback)
}

// 便捷 Hook，用于监听角色相关事件
export function useCharacterEvents(callback: (event: ConfigEvent) => void) {
  useConfigEvents(['character-added', 'character-removed', 'character-updated'], callback)
}

// 便捷 Hook，用于监听所有配置相关事件
export function useAllConfigEvents(callback: (event: ConfigEvent) => void) {
  useConfigEvents(['config-saved', 'config-loaded', 'character-added', 'character-removed', 'character-updated'], callback)
} 