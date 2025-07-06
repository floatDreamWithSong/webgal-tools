// 事件总线系统，用于配置文件更新广播

export type ConfigEventType = 'config-saved' | 'config-loaded' | 'character-added' | 'character-removed' | 'character-updated' | 'config-updated'

export interface ConfigEvent {
  type: ConfigEventType
  data?: unknown
  timestamp: number
}

type EventListener = (event: ConfigEvent) => void

class EventBus {
  private listeners: Map<ConfigEventType, EventListener[]> = new Map()

  // 添加事件监听器
  addEventListener(eventType: ConfigEventType, listener: EventListener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(listener)
  }

  // 移除事件监听器
  removeEventListener(eventType: ConfigEventType, listener: EventListener) {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // 触发事件
  emit(eventType: ConfigEventType, data?: unknown) {
    const event: ConfigEvent = {
      type: eventType,
      data,
      timestamp: Date.now()
    }

    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('事件监听器执行错误:', error)
        }
      })
    }

    // 同时触发通用配置更新事件（避免递归调用）
    if (eventType !== 'config-updated') {
      const updateEvent: ConfigEvent = {
        type: 'config-updated',
        data: { originalEvent: event },
        timestamp: Date.now()
      }
      
      const updateListeners = this.listeners.get('config-updated')
      if (updateListeners) {
        updateListeners.forEach(listener => {
          try {
            listener(updateEvent)
          } catch (error) {
            console.error('事件监听器执行错误:', error)
          }
        })
      }
    }
  }

  // 清除所有监听器
  clear() {
    this.listeners.clear()
  }
}

// 创建全局事件总线实例
export const configEventBus = new EventBus()

// 便捷方法
export const emitConfigEvent = (eventType: ConfigEventType, data?: unknown) => {
  configEventBus.emit(eventType, data)
}

export const addConfigEventListener = (eventType: ConfigEventType, listener: EventListener) => {
  configEventBus.addEventListener(eventType, listener)
}

export const removeConfigEventListener = (eventType: ConfigEventType, listener: EventListener) => {
  configEventBus.removeEventListener(eventType, listener)
} 