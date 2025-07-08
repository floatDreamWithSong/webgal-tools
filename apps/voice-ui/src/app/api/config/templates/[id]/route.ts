import { NextRequest, NextResponse } from 'next/server'
import { templateManager } from '@webgal-tools/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const template = templateManager.getTemplate(id)
    if (!template) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      )
    }
    return NextResponse.json(template)
  } catch (error) {
    console.error('获取模板失败:', error)
    return NextResponse.json(
      { error: '获取模板失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
          const success = templateManager.deleteTemplate(id)
    if (!success) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除模板失败:', error)
    return NextResponse.json(
      { error: '删除模板失败' },
      { status: 500 }
    )
  }
} 