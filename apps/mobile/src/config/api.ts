const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

export const apiBaseUrl =
  configuredUrl && configuredUrl.length > 0
    ? configuredUrl
    : 'http://localhost:3000';
