'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { CharacterCard } from './CharacterCard'
import { CharacterConfig } from './types'

interface ValidationErrors {
  character_name?: string
  gpt?: string
  sovits?: string
  ref_audio?: string
  ref_text?: string
}

interface CharacterSettingsProps {
  characters: CharacterConfig[]
  onAddCharacter: () => void
  onUpdateCharacter: (index: number, field: keyof CharacterConfig, value: unknown) => void
  onRemoveCharacter: (index: number) => void
  gptSovitsPath: string
  modelVersion: string
  onSave?: () => void
  loading?: boolean
  saved?: boolean
}

export function CharacterSettings({ 
  characters, 
  onAddCharacter, 
  onUpdateCharacter, 
  onRemoveCharacter,
  gptSovitsPath,
  modelVersion,
  onSave,
  loading = false,
  saved = false,
}: CharacterSettingsProps) {
  const prevCharactersLength = useRef(characters.length)
  const [validationStates, setValidationStates] = useState<Record<number, { isValid: boolean; errors: ValidationErrors }>>({})
  const [validationMessage, setValidationMessage] = useState<string>('')

  // 监听角色数量变化，自动滚动到底部
  useEffect(() => {
    if (characters.length > prevCharactersLength.current) {
      // 新增了角色，滚动到底部
      setTimeout(() => {
        // 尝试多种滚动方式
        const scrollToBottom = () => {
          // 方法1: 直接滚动到页面底部
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
          })
          
          // 方法2: 尝试找到配置管理区域的滚动容器
          const configManager = document.querySelector('.overflow-y-auto')
          if (configManager) {
            const scrollHeight = configManager.scrollHeight
            const clientHeight = configManager.clientHeight
            const maxScrollTop = scrollHeight - clientHeight
            
            configManager.scrollTo({
              top: maxScrollTop,
              behavior: 'smooth'
            })
          }
        }
        
        scrollToBottom()
      }, 300)
    }
    prevCharactersLength.current = characters.length
  }, [characters.length])

  // 处理角色校验状态变化
  const handleValidationChange = useCallback((index: number, isValid: boolean, errors: ValidationErrors) => {
    setValidationStates(prev => ({
      ...prev,
      [index]: { isValid, errors }
    }))
  }, [])

  // 校验所有角色
  const validateAllCharacters = useCallback(() => {
    const invalidCharacters = Object.entries(validationStates).filter(([, state]) => !state.isValid)
    
    if (invalidCharacters.length > 0) {
      const invalidIndexes = invalidCharacters.map(([index]) => parseInt(index) + 1)
      setValidationMessage(`角色 ${invalidIndexes.join(', ')} 的配置有误，请检查后重试`)
      return false
    }
    
    setValidationMessage('')
    return true
  }, [validationStates])

  // 处理保存
  const handleSave = useCallback(() => {
    if (!validateAllCharacters()) {
      return
    }
    onSave?.()
  }, [validateAllCharacters, onSave])

  // 处理角色删除，清理校验状态
  const handleRemoveCharacter = useCallback((index: number) => {
    setValidationStates(prev => {
      const newStates = { ...prev }
      delete newStates[index]
      // 重新索引
      const reindexedStates: Record<number, { isValid: boolean; errors: ValidationErrors }> = {}
      Object.entries(newStates).forEach(([oldIndex, state]) => {
        const oldIndexNum = parseInt(oldIndex)
        if (oldIndexNum > index) {
          reindexedStates[oldIndexNum - 1] = state
        } else {
          reindexedStates[oldIndexNum] = state
        }
      })
      return reindexedStates
    })
    onRemoveCharacter(index)
  }, [onRemoveCharacter])



  // 当角色数量变化时，清理不存在的角色的校验状态
  useEffect(() => {
    setValidationStates(prev => {
      const newStates: Record<number, { isValid: boolean; errors: ValidationErrors }> = {}
      Object.entries(prev).forEach(([index, state]) => {
        const indexNum = parseInt(index)
        if (indexNum < characters.length) {
          newStates[indexNum] = state
        }
      })
      return newStates
    })
  }, [characters.length])

  return (
    <div className="flex flex-col h-full">
      {/* 固定在顶部的按钮区域 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-900">角色配置</h3>
          <div className="flex items-center space-x-3">
            {onSave && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-md text-sm font-medium"
              >
                {loading ? '保存中...' : '保存配置'}
              </button>
            )}
            <button
              onClick={onAddCharacter}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium"
            >
              添加角色
            </button>
          </div>
        </div>
        {validationMessage && (
          <div className="mt-2 text-red-600 text-sm">
            {validationMessage}
          </div>
        )}
        {saved && !validationMessage && (
          <div className="mt-2 text-green-600 text-sm">
            配置已保存成功！
          </div>
        )}
      </div>

      {/* 可滚动的角色列表区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {characters.map((character, index) => (
            <CharacterCard
              key={index}
              character={character}
              index={index}
              onUpdate={onUpdateCharacter}
              onRemove={handleRemoveCharacter}
              gptSovitsPath={gptSovitsPath}
              modelVersion={modelVersion}
              onValidationChange={handleValidationChange}
            />
          ))}
        </div>
      </div>
    </div>
  )
} 