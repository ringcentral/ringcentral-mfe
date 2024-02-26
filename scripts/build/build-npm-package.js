const path = require('path');
const fs = require('fs-extra');
const { createWritePackageHandler } = require('./writePackageHandler.plugin');

const rootPath = process.cwd();
const pkg = require(path.join(rootPath, 'package.json'));

// const licensePath = path.join(__dirname, '../../LICENSE');

const npmrc = path.join(__dirname, '../../.npmrc');

const targetPath = 'dist';
const targetFolder = path.join(rootPath, targetPath);

console.log('[Release]: prepare package start');

// write package.json
const packageHandler = createWritePackageHandler(pkg, targetFolder);
packageHandler.generateBundle();

const [moveConfigPath, ...args] = process.argv.slice(2);

const configPath = moveConfigPath && path.join(rootPath, moveConfigPath);

// copy license
// fs.copyFileSync(licensePath, path.join(targetFolder, 'LICENSE'));

// copy npmrc
fs.copyFileSync(npmrc, path.join(targetFolder, '.npmrc'));

if (fs.existsSync(configPath)) {
  console.log('[Release]: start copy files');
  const npmPackageOptions = require(configPath);

  // copy addition files
  npmPackageOptions.movePaths.forEach((distMovePath) => {
    if (typeof distMovePath === 'string') {
      fs.copySync(
        path.join(rootPath, distMovePath),
        path.join(targetFolder, distMovePath)
      );
    } else {
      fs.copySync(
        path.join(rootPath, distMovePath.from),
        path.join(targetFolder, distMovePath.toDist)
      );
    }
  });

  console.log('[Release]: copy files completed');
}

console.log('[Release]: prepare package complete');
