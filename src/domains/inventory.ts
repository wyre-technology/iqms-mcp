import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, DomainHandler } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'iqms_inventory_onhand',
      description:
        'List on-hand inventory by item, location, or lot. By default hides zero-quantity rows.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          item_number: { type: 'string' },
          location: { type: 'string' },
          lot_number: { type: 'string' },
          hide_zero_on_hand: { type: 'boolean', description: 'Default true' },
          limit: { type: 'number' },
        },
      },
    },
    {
      name: 'iqms_inventory_lot_trace',
      description:
        'Walk lot genealogy. Direction "from_components" walks back through inputs that produced the lot; "where_produced" walks forward to lots derived from it.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          lot_number: { type: 'string' },
          direction: {
            type: 'string',
            enum: ['from_components', 'where_produced'],
            description: 'Default from_components',
          },
        },
        required: ['lot_number'],
      },
    },
    {
      name: 'iqms_inventory_adjust',
      description:
        'Post an inventory adjustment (positive or negative quantity). Requires WebAPI credentials.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          item_number: { type: 'string' },
          location: { type: 'string' },
          lot_number: { type: 'string' },
          quantity_delta: { type: 'number', description: 'Signed delta vs current on-hand' },
          reason_code: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['item_number', 'location', 'quantity_delta', 'reason_code'],
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
    case 'iqms_inventory_onhand': {
      const rows = await client.inventory.onHand({
        itemNumber: args.item_number as string | undefined,
        location: args.location as string | undefined,
        lotNumber: args.lot_number as string | undefined,
        hideZeroOnHand: args.hide_zero_on_hand as boolean | undefined,
        limit: args.limit as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
    }
    case 'iqms_inventory_lot_trace': {
      logger.info('iqms.inventory.lot_trace', args);
      const rows = await client.inventory.trace({
        lotNumber: args.lot_number as string,
        direction: args.direction as 'from_components' | 'where_produced' | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
    }
    case 'iqms_inventory_adjust': {
      await client.inventory.adjust({
        itemNumber: args.item_number as string,
        location: args.location as string,
        lotNumber: args.lot_number as string | undefined,
        quantityDelta: args.quantity_delta as number,
        reasonCode: args.reason_code as string,
        notes: args.notes as string | undefined,
      });
      return { content: [{ type: 'text', text: 'Inventory adjustment posted' }] };
    }
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}

export const inventoryHandler: DomainHandler = { getTools, handleCall };
