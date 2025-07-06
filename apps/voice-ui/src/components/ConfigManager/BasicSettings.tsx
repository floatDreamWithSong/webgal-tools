'use client'

import { VoiceConfig } from './types'

interface BasicSettingsProps {
  config: Pick<VoiceConfig, 'volume' | 'gpt_sovits_url' | 'gpt_sovits_path' | 'model_version' | 'max_translator'>
  onConfigChange: (updates: Partial<BasicSettingsProps['config']>) => void
}

export function BasicSettings({ config, onConfigChange }: BasicSettingsProps) {
  return (
    <div className="space-y-4 flex-1">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            音量
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={config.volume}
            onChange={(e) => onConfigChange({ volume: parseInt(e.target.value) })}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GPT-SoVITS 服务地址
          </label>
          <input
            type="url"
            value={config.gpt_sovits_url}
            onChange={(e) => onConfigChange({ gpt_sovits_url: e.target.value })}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="http://localhost:9872"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GPT-SoVITS 项目路径
          </label>
          <input
            type="text"
            value={config.gpt_sovits_path}
            onChange={(e) => onConfigChange({ gpt_sovits_path: e.target.value })}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="D:/AIVoice/GPT-SoVITS-v2pro-20250604"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            模型版本
          </label>
          <select
            value={config.model_version}
            onChange={(e) => onConfigChange({ model_version: e.target.value })}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="v2">v2</option>
            <option value="v3">v3</option>
            <option value="v4">v4</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            最大翻译并发数
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={config.max_translator || 1}
            onChange={(e) => onConfigChange({ max_translator: parseInt(e.target.value) })}
            className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
} 