// Dynamic config — reads env vars injected by EAS Build at build time.
// This wraps app.json and adds runtime values that can't be hardcoded.
const { withInfoPlist } = require('@expo/config-plugins');

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
      eas: {
        projectId: config.extra?.eas?.projectId,
      },
    },
  };
};
