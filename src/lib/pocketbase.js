import PocketBase from 'pocketbase';

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
export const pb = new PocketBase(pocketbaseUrl);

// Автоматически восстанавливаем аутентификацию из localStorage
pb.authStore.loadSaved();
