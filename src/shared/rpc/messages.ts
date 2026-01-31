import type { RPCCommand, RPCResponse } from '../types';

// Message types for communication between panel and background
export interface PanelToBackgroundMessage {
  type: 'OPFS_RPC_REQUEST';
  tabId: number;
  command: RPCCommand;
  params: Record<string, unknown>;
  requestId: string;
}

export interface BackgroundToPanelMessage {
  type: 'OPFS_RPC_RESPONSE';
  requestId: string;
  response: RPCResponse;
}

export function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
