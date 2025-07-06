'use client'

import { CharacterCard } from './CharacterCard'
import { CharacterConfig } from './types'

interface CharacterSettingsProps {
  characters: CharacterConfig[]
  onAddCharacter: () => void
  onUpdateCharacter: (index: number, field: keyof CharacterConfig, value: string | number | boolean) => void
  onRemoveCharacter: (index: number) => void
}

export function CharacterSettings({ 
  characters, 
  onAddCharacter, 
  onUpdateCharacter, 
  onRemoveCharacter 
}: CharacterSettingsProps) {
  return (
    <div className="space-y-4 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-gray-900">角色配置</h3>
        <button
          onClick={onAddCharacter}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium"
        >
          添加角色
        </button>
      </div>

      <div className="space-y-3">
        {characters.map((character, index) => (
          <CharacterCard
            key={index}
            character={character}
            index={index}
            onUpdate={onUpdateCharacter}
            onRemove={onRemoveCharacter}
          />
        ))}
      </div>
    </div>
  )
} 