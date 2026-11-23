import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authRuntimeFrom, googleSignInSupported, type AuthRuntime } from './auth-runtime';

export function currentAuthRuntime(): AuthRuntime {
  return authRuntimeFrom(Constants.executionEnvironment, Platform.OS);
}

export function googleRequiresDevelopmentBuild(): boolean {
  return !googleSignInSupported(currentAuthRuntime());
}
