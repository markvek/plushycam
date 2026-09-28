import { router } from 'expo-router';
import { SavedCollection } from '../components/SavedCollection';

export default function SavedScreen() {
  return <SavedCollection onCamera={() => router.push('/')} />;
}
