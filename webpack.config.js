//@ts-check
const path = require("node:path");
const TypedCssModulePlugin = require("./webpack-typed-css-module-plugin");
const webpack = require("webpack");

const entry = `./source/main.tsx`;
const output = path.join(__dirname, "public");

/** @type {import("webpack").Configuration} */
const config = {
    mode: "production",
    entry,
    plugins: [
        new webpack.DefinePlugin({
            "process.browser": true,
        }),
        new TypedCssModulePlugin(),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
    output: {
        path: output,
        filename: `index.js`,
    },
    devServer: {
        static: output,
        open: true,
        // 同一ネットワーク内の別端末から http://IPアドレス:8080/ でアクセスできるようにするため
        host: "local-ip",
    },
};
module.exports = config;