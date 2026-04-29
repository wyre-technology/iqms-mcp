import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, DomainHandler } from '../utils/types.js';
import { getClient } from '../utils/client.js';

function getTools(): Tool[] {
  return [
    {
      name: 'iqms_quality_ncrs',
      description:
        'List non-conformances / Corrective Action Requests (CARs / CAPAs). ' +
        'Filter by status, item, or reported date.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          status: { type: 'string', enum: ['open', 'investigating', 'closed'] },
          item_number: { type: 'string' },
          reported_after: { type: 'string', description: 'ISO date' },
          reported_before: { type: 'string', description: 'ISO date' },
          limit: { type: 'number' },
        },
      },
    },
    {
      name: 'iqms_quality_create_ncr',
      description: 'Open a non-conformance record. Requires WebAPI credentials.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          item_number: { type: 'string' },
          work_order_id: { type: 'number' },
          description: { type: 'string' },
          reported_by: { type: 'string' },
        },
        required: ['description'],
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
    case 'iqms_quality_ncrs': {
      const rows = await client.quality.ncrs({
        status: args.status as 'open' | 'investigating' | 'closed' | undefined,
        itemNumber: args.item_number as string | undefined,
        reportedAfter: args.reported_after as string | undefined,
        reportedBefore: args.reported_before as string | undefined,
        limit: args.limit as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
    }
    case 'iqms_quality_create_ncr': {
      const result = await client.quality.createNcr({
        itemNumber: args.item_number as string | undefined,
        workOrderId: args.work_order_id as number | undefined,
        description: args.description as string,
        reportedBy: args.reported_by as string | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}

export const qualityHandler: DomainHandler = { getTools, handleCall };
