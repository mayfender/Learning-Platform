import { createMemoryStore } from '@/store/MemoryStore';
import { runProgressStoreContract } from '@/store/progressStore.contract';

runProgressStoreContract('MemoryStore', async () => createMemoryStore());
