import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export type DomainName =
  | 'workorders'
  | 'inventory'
  | 'boms'
  | 'sales_orders'
  | 'purchase_orders'
  | 'schedule'
  | 'quality';

export type CallToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export interface DomainHandler {
  getTools(): Tool[];
  handleCall(
    toolName: string,
    args: Record<string, unknown>,
    extra?: unknown,
  ): Promise<CallToolResult>;
}
