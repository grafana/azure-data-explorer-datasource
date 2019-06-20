const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');


module.exports = {
  target: 'node',
  node: {
    fs: 'empty',
  },
  context: path.join(__dirname, 'src'),
  entry: {
    module: './module.ts',
  },
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist'),
    libraryTarget: 'amd',
  },
  externals: [
    'lodash',
    'moment',
    'angular',
    'global',
    function(context, request, callback) {
      var prefix = 'grafana/';
      if (request.indexOf(prefix) === 0) {
        return callback(null, request.substr(prefix.length));
      }
      callback();
    },
  ],
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new LodashModuleReplacementPlugin(),
    new HtmlWebpackPlugin(),
    new CopyWebpackPlugin([
      { from: 'plugin.json', to: '.' },
      { from: '../README.md', to: '.' },
      { from: '../CHANGELOG.md', to: '.' },
      { from: '../LICENSE', to: '.' },
      { from: 'partials/*', to: '.' },
      { from: 'img/*', to: '.' },
      { from: 'lib/*', to: '.' },
      { from: 'query_help.md', to: '.' },
    ]),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loaders: ['ts-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
};
