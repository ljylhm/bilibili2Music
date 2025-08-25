'use strict';

const path = require('path');
const fse = require('fs-extra');

async function copyDirSafe(src, dest, { clean = true } = {}) {
  const exists = await fse.pathExists(src);
  if (!exists) {
    console.warn(`[postbuild] 源目录不存在，跳过：${src}`);
    return false;
  }
  await fse.ensureDir(dest);
  if (clean) {
    await fse.emptyDir(dest);
  }
  await fse.copy(src, dest, {
    overwrite: true,
    errorOnExist: false,
    dereference: true,
  });
  console.log(`[postbuild] 复制完成：${src} -> ${dest}`);
  return true;
}

async function main() {
  try {
    const root = process.cwd();

    const standaloneDir = path.join(root, '.next', 'standalone');
    if (!(await fse.pathExists(standaloneDir))) {
      console.error(`[postbuild] 未找到 ${standaloneDir}，请先运行 "next build" 并确保 next.config.mjs 中启用 output: "standalone"`);
      process.exit(1);
    }

    // 1) 同步 .next/static -> .next/standalone/.next/static
    const srcStatic = path.join(root, '.next', 'static');
    const destStatic = path.join(standaloneDir, '.next', 'static');
    await fse.ensureDir(path.dirname(destStatic));
    await copyDirSafe(srcStatic, destStatic, { clean: true });

    // 2) 同步 public -> .next/standalone/public
    const srcPublic = path.join(root, 'public');
    const destPublic = path.join(standaloneDir, 'public');
    await copyDirSafe(srcPublic, destPublic, { clean: true });

    // 3) 可选：复制 BUILD_ID，避免某些环境下静态资源校验失败
    const srcBuildId = path.join(root, '.next', 'BUILD_ID');
    const destBuildId = path.join(standaloneDir, '.next', 'BUILD_ID');
    if (await fse.pathExists(srcBuildId)) {
      await fse.ensureDir(path.dirname(destBuildId));
      await fse.copy(srcBuildId, destBuildId, { overwrite: true });
      console.log(`[postbuild] 复制 BUILD_ID -> ${destBuildId}`);
    }

    console.log('[postbuild] 全部完成 ✅');
  } catch (err) {
    console.error('[postbuild] 发生错误：', err);
    process.exit(1);
  }
}

main();