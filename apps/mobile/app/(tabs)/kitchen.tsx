import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function KitchenScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen title={t('kitchen.title')} />
  );
}
