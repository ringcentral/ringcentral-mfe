import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';
// eslint-disable-next-line import/no-relative-packages
import { external, generateBaseConfig } from '../../rollup.config';

export default [
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ...generateBaseConfig({ tsconfig: 'tsconfig.src.json' }),
  {
    input: 'sw/service-worker.mfe.ts',
    output: [
      {
        file: 'dist/sw/service-worker.mfe.js',
        format: 'umd',
        name: 'mfe',
      },
    ],
    plugins: [resolve(), typescript({ tsconfig: 'tsconfig.sw.json' })],
  },
  {
    input: 'sw/service-worker.mfe.ts',
    plugins: [dts()],
    output: {
      file: 'dist/sw/service-worker.mfe.d.ts',
      format: 'es',
    },
  },
  {
    input: 'webpack-plugin/generate-manifest-webpack-plugin.ts',
    output: [
      {
        file: 'dist/webpack-plugin/generate-manifest-webpack-plugin.js',
        format: 'cjs',
      },
    ],
    external,
    plugins: [typescript({ tsconfig: 'tsconfig.plugin.json' })],
  },
];
