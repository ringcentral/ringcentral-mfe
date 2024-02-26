/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-dynamic-require */
import path from 'path';
import fs from 'fs-extra';
import dts from 'rollup-plugin-dts';
import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import replacePlugin from '@rollup/plugin-replace';

const rootPath = process.cwd();
const { dependencies = {}, devDependencies = {} } = fs.readJSONSync(
  path.join(rootPath, 'package.json')
);
export const external = Object.keys({
  ...devDependencies,
  ...dependencies,
});

const generateBaseConfig = (
  typescriptOptions = {
    tsconfigOverride: {
      compilerOptions: {
        module: 'ES2015',
      },
    },
  }
) => {
  return [
    {
      input: 'src/index.ts',
      output: [
        {
          file: 'dist/index.js',
          format: 'cjs',
          sourcemap: true,
        },
        {
          file: 'dist/index.mjs',
          format: 'es',
          sourcemap: true,
        },
      ],
      external,
      plugins: [
        replacePlugin({
          __DEV__: "process.env.NODE_ENV !== 'production'",
          preventAssignment: true,
        }),
        resolve(),
        typescript(typescriptOptions),
      ],
    },
    {
      input: 'src/index.ts',
      plugins: [dts()],
      output: {
        file: 'dist/index.d.ts',
        format: 'es',
      },
    },
  ];
};

const baseConfig = generateBaseConfig();

export { generateBaseConfig };

export default baseConfig;
