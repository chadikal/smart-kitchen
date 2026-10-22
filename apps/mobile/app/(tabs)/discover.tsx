import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function DiscoverScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen title={t('discover.title')} body={t('discover.body')} />
  );
}
