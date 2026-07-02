import api from '../utils/api';

const QUEUE_KEY = 'agri_offline_mutation_queue';

export const getOfflineQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
};

export const saveOfflineQueue = (queue) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const queueOfflineMutation = (url, method, data) => {
  const queue = getOfflineQueue();
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  queue.push({ id, url, method, data, timestamp: new Date().toISOString() });
  saveOfflineQueue(queue);
  console.log(`Queued offline request: ${method} ${url}`);
};

export const syncOfflineData = async (onSyncProgress) => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`Replaying ${queue.length} queued offline mutations...`);
  const remaining = [];

  for (const task of queue) {
    try {
      if (onSyncProgress) onSyncProgress(`Syncing: ${task.method} ${task.url}...`);
      await api({
        url: task.url,
        method: task.method,
        data: task.data,
      });
      console.log(`Successfully synced task: ${task.id}`);
    } catch (err) {
      console.error(`Failed to sync task: ${task.id}`, err);
      // Keep it in queue if it is a transient error, otherwise drop it if it is a 400 bad request
      if (err.response && err.response.status < 500) {
        console.warn(`Dropped invalid task (status ${err.response.status})`);
      } else {
        remaining.push(task);
      }
    }
  }

  saveOfflineQueue(remaining);
  if (onSyncProgress) {
    onSyncProgress(remaining.length === 0 ? 'Sync completed' : `Sync completed with ${remaining.length} errors`);
  }
};

// Auto sync setup
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineData().catch(console.error);
  });
}
