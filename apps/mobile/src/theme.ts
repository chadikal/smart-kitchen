import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6E8B74',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E4EFE6',
    secondary: '#C4A484',
    background: '#F7F3EA',
    surface: '#FFFDF8',
    outline: '#D9D0C1',
  },
};
