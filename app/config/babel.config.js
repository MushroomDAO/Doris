export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
        modules: 'commonjs', // Transform ES modules to CommonJS for Jest
      },
    ],
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
            modules: 'commonjs',
          },
        ],
      ],
    },
  },
}; 