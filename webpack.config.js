module.exports.getWebpackConfig = (config, options) => ({
    ...config,
    output: {
      ...config.output,
      publicPath: '/public/plugins/grafana-azure-data-explorer-datasource/', // override default '/' for custom chunks
    },
  });