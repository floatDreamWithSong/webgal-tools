import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

console.log('=== 路径解析测试 ===');

// 模拟当前的路径解析逻辑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('当前文件路径 (__filename):', __filename);
console.log('当前目录路径 (__dirname):', __dirname);

// 测试相对路径解析
const examplePath1 = path.resolve(__dirname, '../example');
const examplePath2 = path.resolve(__dirname, './example');
const examplePath3 = path.resolve(__dirname, 'example');
const distExamplePath = path.resolve(__dirname, 'dist/example');

console.log('使用 ../example:', examplePath1, '存在:', fs.existsSync(examplePath1));
console.log('使用 ./example:', examplePath2, '存在:', fs.existsSync(examplePath2));
console.log('使用 example:', examplePath3, '存在:', fs.existsSync(examplePath3));
console.log('使用 dist/example:', distExamplePath, '存在:', fs.existsSync(distExamplePath));

// 模拟在 dist 目录中的路径解析
const distFilePath = path.join(__dirname, 'dist', 'templates.js');
const distDirPath = path.dirname(distFilePath);
const distExampleResolved = path.resolve(distDirPath, './example');

console.log('\n=== 模拟 dist 环境 ===');
console.log('模拟 dist 文件路径:', distFilePath);
console.log('模拟 dist 目录路径:', distDirPath);
console.log('从 dist 解析 example:', distExampleResolved, '存在:', fs.existsSync(distExampleResolved));

// 显示当前的文件结构
console.log('\n=== 当前目录结构 ===');
if (fs.existsSync(__dirname)) {
  const files = fs.readdirSync(__dirname);
  console.log('当前目录内容:', files);
  
  if (fs.existsSync(path.join(__dirname, 'dist'))) {
    const distFiles = fs.readdirSync(path.join(__dirname, 'dist'));
    console.log('dist 目录内容:', distFiles);
  }
  
  if (fs.existsSync(path.join(__dirname, 'example'))) {
    const exampleFiles = fs.readdirSync(path.join(__dirname, 'example'));
    console.log('example 目录内容:', exampleFiles);
  }
} 