const fs = require('fs');
const path = require('path');

function patchParcelDist(path = '') {
  return path && path.replace('dist', '.');
}

const createWritePackageHandler = (pkg, targetPath) => {
  return {
    generateBundle() {
      const output = {
        name: pkg.name,
        bin: pkg.bin,
        version: pkg.version,
        author: pkg.author,
        license: pkg.license,
        main: patchParcelDist(pkg.main) || './index.js',
        module: patchParcelDist(pkg.module) || './index.js',
        types: patchParcelDist(pkg.types) || './index.d.ts',
        bugs: pkg.bugs,
        homepage: pkg.homepage,
        repository: pkg.repository,
        dependencies: pkg.dependencies,
        peerDependencies: pkg.peerDependencies,
        sideEffects: false,
      };

      fs.writeFileSync(
        path.join(targetPath, 'package.json'),
        JSON.stringify(output, null, 2),
      );
    },
  };
};

module.exports = { createWritePackageHandler };
