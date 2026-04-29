import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, DomainHandler } from '../utils/types.js';
import { getClient } from '../utils/client.js';

function getTools(): Tool[] {
  return [
    {
      name: 'iqms_schedule_capacity',
      description: 'List scheduled work-center slots within a date range.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          work_center: { type: 'string' },
          start_date: { type: 'string', description: 'ISO date' },
          end_date: { type: 'string', description: 'ISO date' },
          limit: { type: 'number' },
        },
        required: ['start_date', 'end_date'],
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const client = await getClient();

  if (toolName === 'iqms_schedule_capacity') {
    const rows = await client.schedule.capacity({
      workCenter: args.work_center as string | undefined,
      startDate: args.start_date as string,
      endDate: args.end_date as string,
      limit: args.limit as number | undefined,
    });
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  }
  return {
    content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
    isError: true,
  };
}

export const scheduleHandler: DomainHandler = { getTools, handleCall };
