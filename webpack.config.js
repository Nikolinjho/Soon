import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { fileURLToPath } from 'url';
import webpack from 'webpack';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

export default {
  entry: './src/client/index.js',
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: isProduction ? './' : '/',
    // clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    electron: '31.3.1',
                  },
                  modules: false,
                },
              ],
              [
                '@babel/preset-react',
                {
                  runtime: 'automatic',
                },
              ],
            ],
          },
        },
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(scss|css)$/,
        use: [
          'style-loader', // Injects CSS into the DOM
          {
            loader: 'css-loader',
            options: {
              modules: {
                namedExport: false,
                auto: true, ///\.module\.\w+$/i, // Only *.module.sass/scss/css files will use CSS Modules
                localIdentName: isProduction
                  ? '[hash:base64:5]'  // Hash for production
                  : '[path][name]__[local]--[hash:base64:5]',  // Readable class names in development
              },
              sourceMap: !isProduction, // Enable source maps in non-production builds
              esModule: true,  // Support for ES module syntax in CSS
            },
          },
        ],
      },

      {
        test: /\.(png|jpg|jpeg|gif|woff|woff2|eot|ttf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[hash][ext][query]',
        },
      },
      {
        test: /\.svg$/,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    mainFiles: ['index'],
    fullySpecified: false
  },
  devServer: {
    port: 3000,
    open: false,
    allowedHosts: 'all',
    historyApiFallback: true,
    hot: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: 'warn',
    },
    static: {
      directory: path.join(__dirname, 'public'),
    },
    devMiddleware: {
      writeToDisk: false,
    },
  },
  target: process.env.NODE_ENV === 'production' ? 'electron-renderer' : 'web',
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      // favicon: './public/favicon.ico',
      minify: isProduction
        ? {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
          }
        : false,
    }),
    // Provide global object for browser environment in development
    ...(isProduction ? [] : [
      new webpack.DefinePlugin({
        global: 'globalThis',
      }),
    ]),
  ],
  optimization: {
    minimize: isProduction,
    nodeEnv: isProduction ? 'production' : 'development',
  },
  devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
};
