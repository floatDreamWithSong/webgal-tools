import { NextResponse } from 'next/server'
import { templateManager } from '@webgal-tools/config'

export async function GET() {
  try {
    const templates = templateManager.getTemplateList()
    const defaultTemplateId = templateManager.getDefaultTemplateId()
    const builtinTemplate = templateManager.getBuiltinTemplate()
    
    return NextResponse.json({
      templates,
      defaultTemplateId,
      hasBuiltinTemplate: !!builtinTemplate
    })
  } catch (error) {
    console.error('获取模板列表失败:', error)
    return NextResponse.json(
      { error: '获取模板列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, type, config, setAsDefault } = body

    if (!name || !type || !config) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 检查模板名称是否已存在
    if (templateManager.isTemplateNameExists(name)) {
      return NextResponse.json(
        { error: '模板名称已存在' },
        { status: 400 }
      )
    }

    const template = templateManager.saveTemplate({
      name,
      description,
      type,
      config
    })

    // 如果设置为默认模板
    if (setAsDefault) {
      templateManager.setDefaultTemplate(template.id)
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('保存模板失败:', error)
    return NextResponse.json(
      { error: '保存模板失败' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { templateId } = body

    if (templateId === undefined) {
      return NextResponse.json(
        { error: '缺少模板ID参数' },
        { status: 400 }
      )
    }

    // 验证模板是否存在（如果templateId不为null）
    if (templateId !== null && !templateManager.getTemplate(templateId)) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      )
    }

    const success = templateManager.setDefaultTemplate(templateId)
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: templateId ? '默认模板设置成功' : '已清除默认模板设置'
      })
    } else {
      return NextResponse.json(
        { error: '设置默认模板失败' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('设置默认模板失败:', error)
    return NextResponse.json(
      { error: '设置默认模板失败' },
      { status: 500 }
    )
  }
} 