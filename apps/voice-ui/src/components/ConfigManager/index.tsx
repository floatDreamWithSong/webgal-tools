'use client'

import { useState, useEffect, useCallback } from 'react'
import { ConfigNavigation } from './ConfigNavigation'
import { BasicSettings } from './BasicSettings'
import { TranslateSettings } from './TranslateSettings'
import { CharacterSettings } from './CharacterSettings'
import { VoiceConfig, CharacterConfig } from './types'
import { emitConfigEvent } from './eventBus'

interface ConfigManagerProps {
  workDir: string | null
}

export function ConfigManager({ workDir }: ConfigManagerProps) {
  const [config, setConfig] = useState<VoiceConfig>({
    volume: 30,
    gpt_sovits_url: 'http://localhost:9872',
    gpt_sovits_path: '',
    model_version: 'v2',
    max_translator: 1,
    translate: {
      model_type: 'ollama',
      base_url: 'http://localhost:11434/api',
      model_name: 'glm4:9b',
      check: true,
      context_size: 2,
      additional_prompt: ''
    },
    characters: []
  })

  const [activeSection, setActiveSection] = useState<'basic' | 'translate' | 'characters'>('basic')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadConfig = useCallback(async () => {
    if (!workDir) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/config?workDir=${encodeURIComponent(workDir)}`)
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        emitConfigEvent('config-loaded', { workDir, config: data })
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    } finally {
      setLoading(false)
    }
  }, [workDir])

  useEffect(() => {
    if (workDir) {
      loadConfig()
    }
  }, [workDir, loadConfig])

  const saveConfig = async () => {
    if (!workDir) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workDir, config })
      })
      
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        emitConfigEvent('config-saved', { workDir, config })
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      console.error('保存配置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const addCharacter = () => {
    const newCharacter: CharacterConfig = {
      character_name: '',
      auto: false,
      gpt: '',
      sovits: '',
      ref_audio: '',
      ref_text: '',
      prompt: '',
      translate_to: '日文',
      inferrence_config: {
        prompt_language: '日文',
        text_language: '日文',
        how_to_cut: '凑四句一切',
        top_k: 15,
        top_p: 1.0,
        temperature: 1.0,
        speed: 1.0,
        sample_steps: 8,
        if_sr: false,
        pause_second: 0.5
      }
    }
    setConfig(prev => ({
      ...prev,
      characters: [...prev.characters, newCharacter]
    }))
    emitConfigEvent('character-added', { character: newCharacter, index: config.characters.length })
  }

  const removeCharacter = (index: number) => {
    const characterToRemove = config.characters[index]
    setConfig(prev => ({
      ...prev,
      characters: prev.characters.filter((_, i) => i !== index)
    }))
    emitConfigEvent('character-removed', { character: characterToRemove, index })
  }

  const updateCharacter = (index: number, field: keyof CharacterConfig, value: unknown) => {
    setConfig(prev => ({
      ...prev,
      characters: prev.characters.map((char, i) => 
        i === index ? { ...char, [field]: value } : char
      )
    }))
    emitConfigEvent('character-updated', { index, field, value })
  }

  if (!workDir) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-gray-500">
          <p className="text-lg">请先选择工作目录</p>
          <p className="text-sm mt-2">返回首页选择或添加工作目录</p>
        </div>
      </div>
    )
  }

  if (loading && !config.gpt_sovits_path) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ConfigNavigation 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 overflow-hidden">
        {activeSection === 'basic' && (
          <div className="h-full overflow-y-auto p-4">
            <BasicSettings 
              config={config}
              onConfigChange={(updates) => setConfig(prev => ({ ...prev, ...updates }))}
            />
          </div>
        )}

        {activeSection === 'translate' && config.translate && (
          <div className="h-full overflow-y-auto p-4">
            <TranslateSettings 
              translate={config.translate}
              onTranslateChange={(updates) => setConfig(prev => ({
                ...prev,
                translate: prev.translate ? { ...prev.translate, ...updates } : undefined
              }))}
            />
          </div>
        )}

        {activeSection === 'characters' && (
          <CharacterSettings 
            characters={config.characters}
            onAddCharacter={addCharacter}
            onUpdateCharacter={updateCharacter}
            onRemoveCharacter={removeCharacter}
            gptSovitsPath={config.gpt_sovits_path}
            modelVersion={config.model_version}
            onSave={saveConfig}
            loading={loading}
            saved={saved}
          />
        )}

        {activeSection !== 'characters' && (
          <div className="flex items-center space-x-4 flex-shrink-0 p-4">
            <button
              onClick={saveConfig}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium text-sm"
            >
              {loading ? '保存中...' : '保存配置'}
            </button>
            {saved && (
              <div className="text-green-600 text-sm">
                配置已保存成功！
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 