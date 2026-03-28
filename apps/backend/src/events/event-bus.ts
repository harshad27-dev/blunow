import { EventEmitter2 } from 'eventemitter2';

// Singleton event bus used by all services for cross-module communication
export const eventBus = new EventEmitter2({
  wildcard: true,
  delimiter: '.',
  maxListeners: 30,
  verboseMemoryLeak: false,
});
