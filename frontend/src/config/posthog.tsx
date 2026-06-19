export const initPosthog = async () => null;
export const getStoredConsentState = () => 'denied' as const;
export const trackFrontendEvent = async (_event: string, _properties?: Record<string, unknown>) => {};
export const optOutUser = async () => {};
export const optInUser = async () => {};
export const resetAnalyticsIdentity = async () => {};
export const getAnalyticsDistinctId = (): string | null => null;
export const captureException = async (_error: unknown, _properties?: Record<string, unknown>) => {};
