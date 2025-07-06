'use client'

import { CharacterConfig } from './types'

interface CharacterCardProps {
  character: CharacterConfig
  index: number
  onUpdate: (index: number, field: keyof CharacterConfig, value: string | number | boolean) => void
  onRemove: (index: number) => void
}

export function CharacterCard({ character, index, onUpdate, onRemove }: CharacterCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-medium text-gray-900">
          角色 {index + 1}: {character.character_name || '未命名'}
        </h4>
        <button
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700"
        >
          删除
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            角色名称
          </label>
          <input
            type="text"
            value={character.character_name}
            onChange={(e) => onUpdate(index, 'character_name', e.target.value)}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入角色名称"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            翻译目标语言
          </label>
          <input
            type="text"
            value={character.translate_to}
            onChange={(e) => onUpdate(index, 'translate_to', e.target.value)}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="日文"
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={`auto-${index}`}
            checked={character.auto || false}
            onChange={(e) => onUpdate(index, 'auto', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor={`auto-${index}`} className="text-sm font-medium text-gray-700">
            启用自动情绪识别
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GPT 模型{character.auto ? '文件夹' : '文件'}路径
          </label>
          <input
            type="text"
            value={character.gpt}
            onChange={(e) => onUpdate(index, 'gpt', e.target.value)}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={character.auto ? "GPT_weights_v2ProPlus/character_folder" : "GPT_weights_v2ProPlus/character.ckpt"}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SoVITS 模型{character.auto ? '文件夹' : '文件'}路径
          </label>
          <input
            type="text"
            value={character.sovits}
            onChange={(e) => onUpdate(index, 'sovits', e.target.value)}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={character.auto ? "SoVITS_weights_v2ProPlus/character_folder" : "SoVITS_weights_v2ProPlus/character.pth"}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            参考音频{character.auto ? '文件夹' : '文件'}路径
          </label>
          <input
            type="text"
            value={character.ref_audio}
            onChange={(e) => onUpdate(index, 'ref_audio', e.target.value)}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={character.auto ? "D:/AIVoice/ref_audio/character_folder" : "D:/AIVoice/ref_audio/character.wav"}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            参考文本（自动模式下可不填）
          </label>
          <input
            type="text"
            value={character.ref_text}
            onChange={(e) => onUpdate(index, 'ref_text', e.target.value)}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="参考音频对应的文本"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          角色提示词
        </label>
        <textarea
          value={character.prompt || ''}
          onChange={(e) => onUpdate(index, 'prompt', e.target.value)}
          rows={2}
          className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="描述角色的口吻和特点..."
        />
      </div>
    </div>
  )
} 