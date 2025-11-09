export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const store = new Map<string, PushSubscriptionJSON>(); // key: endpoint

export function saveSubscription(sub: PushSubscriptionJSON) {
  store.set(sub.endpoint, sub);
}

export function listSubscriptions(): PushSubscriptionJSON[] {
  return Array.from(store.values());
}

export function removeSubscription(endpoint: string) {
  store.delete(endpoint);
}

