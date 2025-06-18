#!/bin/bash

# 创建docs目录，如果不存在的话
mkdir -p docs

# 清空docs目录（可选，如果需要清理旧文件）
# rm -rf docs/*

echo "开始复制文档文件..."

# 源目录
SRC_DIR="WebGAL_Doc-main/src"

# 检查源目录是否存在
if [ ! -d "$SRC_DIR" ]; then
    echo "错误: 源目录 $SRC_DIR 不存在"
    exit 1
fi

# 复制src根目录下的md文件（不包括语言子目录）
echo "复制src根目录下的md文件..."
for file in "$SRC_DIR"/*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        cp "$file" "docs/$filename"
        echo "已复制: $file -> docs/$filename"
    fi
done

# 复制src根目录下的webgal-script子目录
echo "复制webgal-script目录..."
WEBGAL_SCRIPT_DIR="$SRC_DIR/webgal-script"

if [ -d "$WEBGAL_SCRIPT_DIR" ]; then
    # 创建目标目录
    mkdir -p "docs/webgal-script"
    
    # 复制webgal-script目录下的所有文件
    cp -r "$WEBGAL_SCRIPT_DIR"/* "docs/webgal-script/"
    echo "已复制webgal-script目录: $WEBGAL_SCRIPT_DIR -> docs/webgal-script"
else
    echo "警告: 未找到webgal-script目录在 $SRC_DIR"
fi

echo "文档复制完成！"
echo "所有文件已复制到docs目录"
