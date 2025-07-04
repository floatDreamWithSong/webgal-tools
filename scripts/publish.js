#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const apps = ['mcp-server', 'voice'];
const packages = ['config', 'logger'];

// 获取版本号
function getVersion(packagePath) {
  const packageJson = JSON.parse(readFileSync(join(packagePath, 'package.json'), 'utf8'));
  return packageJson.version;
}

// 更新版本号
function updateVersion(packagePath, newVersion) {
  const packageJsonPath = join(packagePath, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(`Updated ${packagePath} to version ${newVersion}`);
}

// 发布包
function publishPackage(packagePath, tag = 'latest') {
  try {
    console.log(`\n📦 Publishing ${packagePath}...`);
    execSync(`cd ${packagePath} && pnpm publish --tag ${tag} --no-git-checks --access public`, { 
      stdio: 'inherit',
      shell: true 
    });
    console.log(`✅ Successfully published ${packagePath}`);
  } catch (error) {
    console.error(`❌ Failed to publish ${packagePath}:`, error.message);
    throw error;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const version = args[1];
  const tag = args[2] || 'latest';

  if (!command) {
    console.log(`
📦 WebGAL MCP 发布工具

用法:
  node scripts/publish.js <command> [version] [tag]

命令:
  build     - 构建所有包
  publish   - 发布所有包
  version   - 更新所有包版本号
  check     - 检查所有包状态

示例:
  node scripts/publish.js build
  node scripts/publish.js version 1.6.0
  node scripts/publish.js publish 1.6.0 beta
    `);
    return;
  }

  try {
    switch (command) {
      case 'build':
        console.log('🔨 Building all packages...');
        execSync('pnpm run build', { stdio: 'inherit' });
        console.log('✅ Build completed');
        break;

      case 'version':
        if (!version) {
          console.error('❌ Version is required for version command');
          process.exit(1);
        }
        console.log(`📝 Updating all packages to version ${version}...`);
        
        // 先更新 packages
        for (const pkg of packages) {
          updateVersion(`packages/${pkg}`, version);
        }
        
        // 再更新 apps
        for (const app of apps) {
          updateVersion(`apps/${app}`, version);
        }
        
        console.log('✅ Version update completed');
        break;

      case 'publish':
        console.log('🚀 Starting publication process...');
        
        // 先发布 packages
        console.log('\n📦 Publishing packages...');
        for (const pkg of packages) {
          publishPackage(`packages/${pkg}`, tag);
        }
        
        // 再发布 apps
        console.log('\n📦 Publishing apps...');
        for (const app of apps) {
          publishPackage(`apps/${app}`, tag);
        }
        
        console.log('\n🎉 All packages published successfully!');
        break;

      case 'check':
        console.log('🔍 Checking package status...');
        for (const pkg of [...packages, ...apps]) {
          const path = packages.includes(pkg) ? `packages/${pkg}` : `apps/${pkg}`;
          const currentVersion = getVersion(path);
          console.log(`${pkg}: ${currentVersion}`);
        }
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main(); 