'use client'

import { useRef, useEffect } from 'react'
import { CharacterCard } from './CharacterCard'
import { CharacterConfig } from './types'

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
  saved = false
}: CharacterSettingsProps) {
  const prevCharactersLength = useRef(characters.length)

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

  return (
    <div className="flex flex-col h-full">
      {/* 固定在顶部的按钮区域 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-900">角色配置</h3>
          <div className="flex items-center space-x-3">
            {onSave && (
              <button
                onClick={onSave}
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
        {saved && (
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
              onRemove={onRemoveCharacter}
              gptSovitsPath={gptSovitsPath}
              modelVersion={modelVersion}
            />
          ))}
        </div>
      </div>
    </div>
  )
} 