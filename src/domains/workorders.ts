import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, DomainHandler } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

const WO_STATUSES = ['open', 'in_progress', 'complete', 'cancelled', 'on_hold'] as const;

function getTools(): Tool[] {
  return [
    {
      name: 'iqms_workorders_list',
      description:
        'List work orders. Filter by status, customer, item, or due date. ' +
        'Returns up to `limit` rows (default 50, max 500).',
      inputSchema: {
        type: 'object' as const,
        properties: {
          status: { type: 'string', enum: WO_STATUSES, description: 'Filter by WO status' },
          customer_id: { type: 'number', description: 'Filter by customer ID' },
          item_number: { type: 'string', description: 'Filter by item number' },
          due_before: { type: 'string', description: 'ISO date — due on or before' },
          due_after: { type: 'string', description: 'ISO date — due on or after' },
          limit: { type: 'number', description: 'Max rows (default 50, max 500)' },
        },
      },
    },
    {
      name: 'iqms_workorders_get',
      description: 'Get a single work order by ID, including routings.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Work order ID' },
        },
        required: ['id'],
      },
    },
    {
      name: 'iqms_workorders_create',
      description:
        'Create a new work order. Requires WebAPI credentials (licensed module). ' +
        'Returns DriverNotConfiguredError when WebAPI is not configured.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          item_number: { type: 'string' },
          quantity: { type: 'number' },
          due_date: { type: 'string', description: 'ISO date' },
          customer_id: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['item_number', 'quantity'],
      },
    },
    {
      name: 'iqms_workorders_post_production',
      description:
        'Post production quantities (made / scrapped) against a work order. ' +
        'Requires WebAPI credentials.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          work_order_id: { type: 'number' },
          quantity_made: { type: 'number' },
          quantity_scrapped: { type: 'number' },
          scrap_reason_code: { type: 'string' },
          posted_at: { type: 'string', description: 'ISO timestamp' },
        },
        required: ['work_order_id', 'quantity_made'],
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case 'iqms_workorders_list': {
      const params = {
        status: args.status as 'open' | 'in_progress' | 'complete' | 'cancelled' | 'on_hold' | undefined,
        customerId: args.customer_id as number | undefined,
        itemNumber: args.item_number as string | undefined,
        dueBefore: args.due_before as string | undefined,
        dueAfter: args.due_after as string | undefined,
        limit: args.limit as number | undefined,
      };
      logger.info('iqms.workorders.list', params);
      const rows = await client.workorders.list(params);
      return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
    }
    case 'iqms_workorders_get': {
      const id = args.id as number;
      const row = await client.workorders.get(id);
      if (!row) {
        return {
          content: [{ type: 'text', text: `Work order ${id} not found` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(row, null, 2) }] };
    }
    case 'iqms_workorders_create': {
      const result = await client.workorders.create({
        itemNumber: args.item_number as string,
        quantity: args.quantity as number,
        dueDate: args.due_date as string | undefined,
        customerId: args.customer_id as number | undefined,
        notes: args.notes as string | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'iqms_workorders_post_production': {
      await client.workorders.postProduction({
        workOrderId: args.work_order_id as number,
        quantityMade: args.quantity_made as number,
        quantityScrapped: args.quantity_scrapped as number | undefined,
        scrapReasonCode: args.scrap_reason_code as string | undefined,
        postedAt: args.posted_at as string | undefined,
      });
      return { content: [{ type: 'text', text: 'Production posted' }] };
    }
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}

export const workordersHandler: DomainHandler = { getTools, handleCall };
