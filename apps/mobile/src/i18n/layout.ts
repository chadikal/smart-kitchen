import { Platform, type ViewProps, type ViewStyle } from 'react-native';
import type { LayoutDirection } from '@/src/i18n/languages';

/**
 * Native layout follows the style direction.
 * Web also needs the dir attribute, because a direction style is not the dir attribute.
 */
export function layoutDirection(direction: LayoutDirection): {
  props: ViewProps;
  style: ViewStyle;
} {
  return {
    props: Platform.OS === 'web' ? ({ dir: direction } as ViewProps) : {},
    style: { direction },
  };
}
