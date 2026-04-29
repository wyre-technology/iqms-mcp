import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, DomainHandler } from '../utils/types.js';
import { getClient } from '../utils/client.js';

function getTools(): Tool[] {
  return [
    {
      name: 'iqms_boms_explode',
      description:
        'Explode a BOM. Single-level by default; pass max_level to recurse deeper.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          parent_item: { type: 'string' },
          max_level: { type: 'number', description: 'Default 1' },
        },
        required: ['parent_item'],
      },
    },
    {
      name: 'iqms_boms_where_used',
      description:
        'Find every parent item that consumes a given component. Single-level by default.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          component_item: { type: 'string' },
          max_level: { type: 'number', description: 'Default 1' },
        },
        required: ['component_item'],
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
    case 'iqms_boms_explode': {
      const rows = await client.boms.explode({
        parentItem: args.parent_item as string,
        maxLevel: args.max_level as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
    }
    case 'iqms_boms_where_used': {
      const rows = await client.boms.whereUsed({
        componentItem: args.component_item as string,
        maxLevel: args.max_level as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
    }
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}

export const bomsHandler: DomainHandler = { getTools, handleCall };
