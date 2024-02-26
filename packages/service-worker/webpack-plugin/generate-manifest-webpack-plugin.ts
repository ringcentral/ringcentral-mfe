// reference: https://github.com/GoogleChrome/workbox/blob/v4.1.1/packages/workbox-webpack-plugin/src/generate-sw.js
import webpack, { ModuleFilenameHelpers, sources } from 'webpack';
import crypto from 'crypto';

type AssetMetadata = {
  [key: string]: { chunkName: string; hash?: string };
};

type Config = {
  exclude: RegExp[];
  manifestFileName: string;
  dontCacheBustURLsMatching?: RegExp;
};
class GenerateManifestWebpackPlugin {
  private readonly config: Config;

  constructor(config = {}) {
    this.config = {
      exclude: [/\.map$/, /^manifest.*\.js?$/],
      manifestFileName: 'precache-manifest',
      ...config,
    };
  }

  getAssetHash(asset: webpack.sources.Source) {
    return crypto
      .createHash('md5')
      .update(Buffer.from(asset.source()))
      .digest('hex');
  }

  generateMetadataForAssets(compilation: webpack.Compilation) {
    const mapping: AssetMetadata = {};

    for (const chunk of compilation.chunks) {
      for (const file of chunk.files) {
        mapping[file] = {
          chunkName: chunk.name!,
          hash: chunk.renderedHash,
        };
      }
    }

    for (const [file, asset] of Object.entries(compilation.assets)) {
      if (!mapping[file]) {
        mapping[file] = {
          chunkName: '',
          hash: this.getAssetHash(asset),
        };
      }
    }

    return mapping;
  }

  getKnownHashesFromAssets(assetMetadata: AssetMetadata) {
    const knownHashes = new Set<string | undefined>();
    for (const metadata of Object.values(assetMetadata)) {
      knownHashes.add(metadata.hash);
    }
    return knownHashes;
  }

  getEntry(
    knownHashes: string[],
    url: string,
    revision: string | undefined,
    config: Config
  ) {
    if (config?.dontCacheBustURLsMatching?.test(url)) {
      return {
        url,
      };
    }
    if (!revision || knownHashes.some((hash) => url.includes(hash))) {
      return { url };
    }
    return { revision, url };
  }

  resolveWebpackURL(publicPath: string, ...paths: Array<string>) {
    // This is a change in webpack v5.
    // See https://github.com/jantimon/html-webpack-plugin/pull/1516
    if (publicPath === 'auto') {
      return paths.join('');
    }
    return [publicPath, ...paths].join('');
  }

  getManifestEntriesFromCompilation(
    compilation: webpack.Compilation,
    config: Config
  ) {
    const { publicPath } = compilation.options.output;

    const assetMetadata = this.generateMetadataForAssets(compilation);

    const knownHashes = [
      compilation.hash,
      compilation.fullHash,
      ...this.getKnownHashesFromAssets(assetMetadata),
    ].filter((hash) => !!hash) as string[];

    const manifestEntries = [];
    for (const [file, metadata] of Object.entries(assetMetadata)) {
      // Filter based on test/include/exclude options set in the config,
      // following webpack's conventions.
      // This matches the behavior of, e.g., UglifyJS's webpack plugin.
      if (ModuleFilenameHelpers.matchObject(config, file)) {
        const publicURL = this.resolveWebpackURL(publicPath as string, file);
        const manifestEntry = this.getEntry(
          knownHashes,
          publicURL,
          metadata.hash,
          config
        );
        manifestEntries.push(manifestEntry);
      }
    }
    return manifestEntries;
  }

  generateManifestFile(
    entries: (
      | { url: string; revision?: undefined }
      | { revision: string; url: string }
    )[]
  ) {
    return entries
      .map((e) => {
        return `${e.url} ${e.revision ?? ''}`.trim();
      })
      .join('\n');
  }

  async addAssets(compilation: webpack.Compilation) {
    const entries = this.getManifestEntriesFromCompilation(
      compilation,
      this.config
    );

    const manifestFileSource = this.generateManifestFile(entries);
    compilation.emitAsset(
      this.config.manifestFileName,
      new sources.RawSource(Buffer.from(manifestFileSource))
    );
  }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.emit.tapPromise(this.constructor.name, (compilation) =>
      this.addAssets(compilation).catch((error) => {
        compilation.errors.push(error);
      })
    );
  }
}

export { GenerateManifestWebpackPlugin };
