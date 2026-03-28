/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'img.clerk.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'proud-turtle-533.convex.cloud' },
        ],
    },
    webpack: (config, { isServer }) => {
        // Fallback for ethers/crypto
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "crypto": false,
            "stream": false,
            "assert": false,
            "http": false,
            "https": false,
            "os": false,
            "url": false,
        };
        // Fix for undici / @clerk/nextjs warning
        if (config.module?.rules) {
            config.module.rules.push({
                test: /node_modules\/undici\/.*\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: { presets: ['@babel/preset-env'] }
                }
            });
        }
        return config;
    },
};

export default nextConfig;
