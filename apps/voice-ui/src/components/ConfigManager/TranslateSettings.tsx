'use client'

import { TranslateConfig } from './types'

interface TranslateSettingsProps {
  translate: TranslateConfig
  onTranslateChange: (updates: Partial<TranslateConfig>) => void
}

export function TranslateSettings({ translate, onTranslateChange }: TranslateSettingsProps) {
  return (
    <div className="space-y-4 flex-1 overflow-y-auto">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="translate-check"
          checked={translate.check}
          onChange={(e) => onTranslateChange({ check: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="translate-check" className="text-sm font-medium text-gray-700">
          启用翻译服务
        </label>
      </div>

      {translate.check && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型服务商
              </label>
              <select
                value={translate.model_type}
                onChange={(e) => onTranslateChange({ 
                  model_type: e.target.value as TranslateConfig['model_type']
                })}
                className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ollama">Ollama</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="mistral">Mistral</option>
                <option value="cohere">Cohere</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型 API baseUrl
              </label>
              <input
                type="url"
                value={translate.base_url}
                onChange={(e) => onTranslateChange({ base_url: e.target.value })}
                className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="http://localhost:11434/api"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型名称
              </label>
              <input
                type="text"
                value={translate.model_name}
                onChange={(e) => onTranslateChange({ model_name: e.target.value })}
                className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="glm4:9b"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API 密钥（本地Ollama服务可不填）
              </label>
              <input
                type="password"
                value={translate.api_key || ''}
                onChange={(e) => onTranslateChange({ api_key: e.target.value })}
                className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="留空如果不需要"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上下文宽度（行）
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={translate.context_size}
                onChange={(e) => onTranslateChange({ context_size: parseInt(e.target.value) })}
                className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              额外全局提示词
            </label>
            <textarea
              value={translate.additional_prompt || ''}
              onChange={(e) => onTranslateChange({ additional_prompt: e.target.value })}
              rows={4}
              className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入额外的提示词信息..."
            />
          </div>
        </div>
      )}
    </div>
  )
} 