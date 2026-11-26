export const demoData = {
  luno: {
    product: 'Buy and sell crypto',
    buyCryptoPath: /\/en-my\/buy-crypto$/,
    riskWarningTitle: /Risk warning/,
    search: {
      term: 'Ethereum',
      resultTitle: 'Ethereum - ETH - Cryptocurrency',
      assetName: 'Ethereum',
      assetPath: /\/en-my\/assets\/ethereum$/,
    },
    category: {
      name: 'Stablecoins',
      queryValue: 'stablecoins',
      excludedAsset: 'Bitcoin',
    },
    chart: {
      assetSlug: 'bitcoin',
      assetName: 'Bitcoin',
      defaultTimeframe: '7D',
      timeframe: '1Y',
    },
    accountApp: {
      signUpUrl: /^https:\/\/(www\.)?luno\.com\/signup/,
      signInUrl: /^https:\/\/(www\.)?luno\.com\/login/,
    },
  },
  api: {
    postId: 1,
    userId: 1,
    missingPostId: 0,
  },
} as const;
