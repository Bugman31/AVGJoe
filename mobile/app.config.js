// Dynamic config — reads env vars injected by EAS Build at build time.
// This wraps app.json and adds runtime values that can't be hardcoded.
module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
    },
  };
};
