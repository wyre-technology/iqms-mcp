import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, DomainHandler } from '../utils/types.js';
import { getClient } from '../utils/client.js';

function getTools(): Tool[] {
  return [
    {
      name: 'iqms_purchase_orders_list',
      description: 'List purchase orders. Filter by status, supplier, or expected receipt date.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          status: { type: 'string', enum: ['open', 'partial', 'received', 'cancelled'] },
          supplier_id: { type: 'number' },
          expected_before: { type: 'string', description: 'ISO date' },
          expected_after: { type: 'string', description: 'ISO date' },
          limit: { type: 'number' },
        },
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const client = await getClient();

  if (toolName === 'iqms_purchase_orders_list') {
    const rows = await client.purchaseOrders.list({
      status: args.status as 'open' | 'partial' | 'received' | 'cancelled' | undefined,
      supplierId: args.supplier_id as number | undefined,
      expectedBefore: args.expected_before as string | undefined,
      expectedAfter: args.expected_after as string | undefined,
      limit: args.limit as number | undefined,
    });
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  }
  return {
    content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
    isError: true,
  };
}

export const purchaseOrdersHandler: DomainHandler = { getTools, handleCall };
