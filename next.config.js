// next.config.js
const withAntdLess = require('next-plugin-antd-less');

module.exports = withAntdLess({
  // optional
  lessVarsFilePath: './src/styles/variables.less',
  // optional
  lessVarsFilePathAppendToEndOfContent: false,
  // optional https://github.com/webpack-contrib/css-loader#object
  cssLoaderOptions: {},

  webpack (config) {
    return config;
  },

  reactStrictMode: true,
});