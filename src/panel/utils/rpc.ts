import type {
  RPCCommand,
  RPCResponse,
  FSEntry,
  FSStats,
  StorageEstimate,
  IsAvailableResult,
  ReadTextResult,
  ReadBase64Result,
  ListParams,
  StatParams,
  ReadTextParams,
  WriteTextParams,
  ReadBase64Params,
  WriteBase64Params,
  MkdirParams,
  CreateFileParams,
  DeleteParams,
  CopyParams,
  MoveParams,
} from '../../shared/types';
import { createRequestId } from '../../shared/rpc/messages';

let inspectedTabId: number | null = null;

export function setInspectedTabId(tabId: number): void {
  inspectedTabId = tabId;
}

export function getInspectedTabId(): number | null {
  return inspectedTabId;
}

async function sendRPCRequest<T>(command: RPCCommand, params: object = {}): Promise<T> {
  if (inspectedTabId === null) {
    throw new Error('Inspected tab ID not set');
  }

  if (!chrome?.runtime?.sendMessage) {
    throw new Error('Chrome runtime API not available. Please refresh the DevTools panel.');
  }

  const requestId = createRequestId();

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'OPFS_RPC_REQUEST',
        tabId: inspectedTabId,
        command,
        params,
        requestId,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          reject(new Error('No response received'));
          return;
        }

        const rpcResponse = response.response as RPCResponse<T>;

        if (!rpcResponse.ok) {
          const error = new Error(rpcResponse.error.message);
          (error as Error & { code?: string }).code = rpcResponse.error.code;
          reject(error);
          return;
        }

        resolve(rpcResponse.data as T);
      }
    );
  });
}

// OPFS RPC API
export const opfsApi = {
  isAvailable(): Promise<IsAvailableResult> {
    return sendRPCRequest<IsAvailableResult>('opfs.isAvailable');
  },

  estimate(): Promise<StorageEstimate> {
    return sendRPCRequest<StorageEstimate>('opfs.estimate');
  },

  list(params: ListParams): Promise<FSEntry[]> {
    return sendRPCRequest<FSEntry[]>('fs.list', params);
  },

  stat(params: StatParams): Promise<FSStats> {
    return sendRPCRequest<FSStats>('fs.stat', params);
  },

  readText(params: ReadTextParams): Promise<ReadTextResult> {
    return sendRPCRequest<ReadTextResult>('fs.readText', params);
  },

  writeText(params: WriteTextParams): Promise<void> {
    return sendRPCRequest<void>('fs.writeText', params);
  },

  readBase64(params: ReadBase64Params): Promise<ReadBase64Result> {
    return sendRPCRequest<ReadBase64Result>('fs.readBase64', params);
  },

  writeBase64(params: WriteBase64Params): Promise<void> {
    return sendRPCRequest<void>('fs.writeBase64', params);
  },

  mkdir(params: MkdirParams): Promise<void> {
    return sendRPCRequest<void>('fs.mkdir', params);
  },

  createFile(params: CreateFileParams): Promise<void> {
    return sendRPCRequest<void>('fs.createFile', params);
  },

  delete(params: DeleteParams): Promise<void> {
    return sendRPCRequest<void>('fs.delete', params);
  },

  copy(params: CopyParams): Promise<void> {
    return sendRPCRequest<void>('fs.copy', params);
  },

  move(params: MoveParams): Promise<void> {
    return sendRPCRequest<void>('fs.move', params);
  },
};
