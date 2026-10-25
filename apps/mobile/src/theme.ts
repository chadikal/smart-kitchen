import { MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { colors } from '@/src/theme/tokens';

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.sage,
    onPrimary: '#FFFFFF',
    primaryContainer: colors.sageWash,
    secondary: '#C4A484',
    background: colors.paper,
    surface: colors.card,
    outline: colors.line,
    onSurface: colors.ink,
    onSurfaceVariant: colors.muted,
  },
};
