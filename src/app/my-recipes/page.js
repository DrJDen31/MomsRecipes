
import { getMyRecipes } from '@/app/actions';
import MyRecipesClient from './MyRecipesClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MyRecipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { success, owned, shared, gallery, favorites, error } = await getMyRecipes();

  if (!success) {
     console.error('Failed to fetch my recipes:', error);
  }

  return (
    <MyRecipesClient 
      owned={owned || []} 
      shared={shared || []} 
      gallery={gallery || []}
      favorites={favorites || []}
      userId={user.id} 
    />
  );
}
