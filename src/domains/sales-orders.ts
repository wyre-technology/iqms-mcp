import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, DomainHandler } from '../utils/types.js';
import { getClient } from '../utils/client.js';

function getTools(): Tool[] {
  return [
    {
      name: 'iqms_sales_orders_list',
      description: 'List sales orders. Filter by status, customer, or requested ship date.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          status: { type: 'string', enum: ['open', 'partial', 'shipped', 'cancelled'] },
          customer_id: { type: 'number' },
          ship_before: { type: 'string', description: 'ISO date' },
          ship_after: { type: 'string', description: 'ISO date' },
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

  if (toolName === 'iqms_sales_orders_list') {
    const rows = await client.salesOrders.list({
      status: args.status as 'open' | 'partial' | 'shipped' | 'cancelled' | undefined,
      customerId: args.customer_id as number | undefined,
      shipBefore: args.ship_before as string | undefined,
      shipAfter: args.ship_after as string | undefined,
      limit: args.limit as number | undefined,
    });
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  }
  return {
    content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
    isError: true,
  };
}

export const salesOrdersHandler: DomainHandler = { getTools, handleCall };
