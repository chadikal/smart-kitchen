import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function RecipesScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen title={t('recipes.title')} body={t('recipes.body')} />
  );
}
