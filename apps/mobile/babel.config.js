module.exports = function (api) {
    api.cache(true);
    return {
        presets: ["babel-preset-expo"],
        plugins: [
            [
                "babel-plugin-module-resolver",
                {
                    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
                    alias: {
                        "@repo/ui": "../../packages/ui/src",
                        "@repo/hooks": "../../packages/hooks/src",
                        "@repo/lib": "../../packages/lib/src",
                        "@repo/data": "../../packages/data/src",
                        "@repo/auth": "../../packages/auth/src"
                    }
                }
            ]
        ]
    };
};
