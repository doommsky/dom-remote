export function useDevices() { return { devices: [], refresh: () => {} }; }
export function useSession() { return { session: null, request: () => {}, accept: () => {}, end: () => {} }; }
export function useTelemetry() { return { metrics: {}, request: () => {} }; }
export function useFileTransfer() { return { transfers: [], request: () => {}, cancel: () => {} }; }
EOF