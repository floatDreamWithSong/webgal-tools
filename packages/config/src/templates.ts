import ConfigStore from 'configstore';
import { v4 as uuidv4 } from 'uuid';
import { ConfigTemplate, TemplateListItem, SaveTemplateOptions, VoiceConfig } from './types.js';

const CONFIG_STORE_NAME = 'webgal-config-templates';

class TemplateManager {
  private store: ConfigStore;

  constructor() {
    this.store = new ConfigStore(CONFIG_STORE_NAME);
  }

  /**
   * 获取所有模板列表
   */
  getTemplateList(): TemplateListItem[] {
    const templates = this.store.get('templates') as Record<string, ConfigTemplate> || {};
    return Object.values(templates).map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));
  }

  /**
   * 根据类型获取模板列表
   */
  getTemplatesByType(type: 'voice' | 'mcp' | 'all'): TemplateListItem[] {
    return this.getTemplateList().filter(template => template.type === type);
  }

  /**
   * 获取模板详情
   */
  getTemplate(id: string): ConfigTemplate | null {
    const templates = this.store.get('templates') as Record<string, ConfigTemplate> || {};
    return templates[id] || null;
  }

  /**
   * 保存模板
   */
  saveTemplate(options: SaveTemplateOptions): ConfigTemplate {
    const templates = this.store.get('templates') as Record<string, ConfigTemplate> || {};
    const id = uuidv4();
    const now = new Date().toISOString();

    const template: ConfigTemplate = {
      id,
      name: options.name,
      description: options.description,
      type: options.type,
      config: options.config,
      createdAt: now,
      updatedAt: now
    };

    templates[id] = template;
    this.store.set('templates', templates);

    return template;
  }

  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<SaveTemplateOptions>): ConfigTemplate | null {
    const templates = this.store.get('templates') as Record<string, ConfigTemplate> || {};
    const template = templates[id];

    if (!template) {
      return null;
    }

    const updatedTemplate: ConfigTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    templates[id] = updatedTemplate;
    this.store.set('templates', templates);

    return updatedTemplate;
  }

  /**
   * 删除模板
   */
  deleteTemplate(id: string): boolean {
    const templates = this.store.get('templates') as Record<string, ConfigTemplate> || {};
    
    if (!templates[id]) {
      return false;
    }

    delete templates[id];
    this.store.set('templates', templates);
    return true;
  }

  /**
   * 检查模板名称是否已存在
   */
  isTemplateNameExists(name: string, excludeId?: string): boolean {
    const templates = this.store.get('templates') as Record<string, ConfigTemplate> || {};
    return Object.values(templates).some(template => 
      template.name === name && template.id !== excludeId
    );
  }

  /**
   * 获取默认语音配置模板
   */
  getDefaultVoiceConfig(): VoiceConfig {
    return {
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
    };
  }

  /**
   * 清空所有模板
   */
  clearAllTemplates(): void {
    this.store.delete('templates');
  }
}

// 创建单例实例
const templateManager = new TemplateManager();

export default templateManager; 