import { useEffect, useCallback } from 'react'
import { addConfigEventListener, removeConfigEventListener, ConfigEventType, ConfigEvent } from './eventBus'

export function useConfigEvents(
  eventTypes: ConfigEventType[],
  callback: (event: ConfigEvent) => void,
  deps: unknown[] = []
) {
  const memoizedCallback = useCallback(callback, deps)

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
export function useConfigSaved(callback: (event: ConfigEvent) => void, deps: unknown[] = []) {
  useConfigEvents(['config-saved'], callback, deps)
}

// 便捷 Hook，用于监听配置加载事件
export function useConfigLoaded(callback: (event: ConfigEvent) => void, deps: unknown[] = []) {
  useConfigEvents(['config-loaded'], callback, deps)
}

// 便捷 Hook，用于监听角色相关事件
export function useCharacterEvents(callback: (event: ConfigEvent) => void, deps: unknown[] = []) {
  useConfigEvents(['character-added', 'character-removed', 'character-updated'], callback, deps)
}

// 便捷 Hook，用于监听所有配置相关事件
export function useAllConfigEvents(callback: (event: ConfigEvent) => void, deps: unknown[] = []) {
  useConfigEvents(['config-saved', 'config-loaded', 'character-added', 'character-removed', 'character-updated'], callback, deps)
} 