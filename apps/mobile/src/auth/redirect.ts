import * as Linking from 'expo-linking';

export function authRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}
