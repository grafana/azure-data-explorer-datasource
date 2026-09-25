import type { Configuration } from 'webpack';
import { mergeWithRules } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const config = async (env: Record<string, unknown>): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  const customConfig = {
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: '../pkg/schema/dsconfig.json',
            to: './schema/dsconfig.json',
            noErrorOnMissing: true,
          },
          {
            from: '../pkg/schema/schema.gen.json',
            to: './schema/v0alpha1.json',
            noErrorOnMissing: true,
          },
          {
            from: '../pkg/schema/settings.gen.json',
            to: './schema/v0alpha1/settings.json',
            noErrorOnMissing: true,
          },
          {
            from: '../pkg/schema/settings.examples.gen.json',
            to: './schema/v0alpha1/settings.examples.json',
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
    externals: ['i18next'],
  };
  return mergeWithRules({
    module: {
      rules: {
        exclude: 'replace',
      },
    },
  })(baseConfig, customConfig);
};

export default config;
