import { NextResponse } from 'next/server'
import { templateManager } from '@webgal-tools/config'

export async function GET() {
  try {
    const templates = templateManager.getTemplateList()
    return NextResponse.json(templates)
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
    const { name, description, type, config } = body

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

    return NextResponse.json(template)
  } catch (error) {
    console.error('保存模板失败:', error)
    return NextResponse.json(
      { error: '保存模板失败' },
      { status: 500 }
    )
  }
} 