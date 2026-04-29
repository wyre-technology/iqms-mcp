import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DOMAINS, getNavigationTools } from './domains/navigation.js';
import { getDomainHandler } from './domains/index.js';
import { getCredentials } from './utils/client.js';
import { logger } from './utils/logger.js';
import type { DomainName } from './utils/types.js';

export function createServer(): Server {
  const server = new Server(
    { name: 'iqms-mcp', version: '0.0.0' },
    { capabilities: { tools: {}, logging: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [...getNavigationTools()];
    for (const domain of DOMAINS) {
      const handler = await getDomainHandler(domain);
      tools.push(...handler.getTools());
    }
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;

    if (name === 'iqms_navigate') {
      const domain = args?.domain as DomainName | undefined;
      if (!domain || !DOMAINS.includes(domain)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Invalid domain: ${String(domain)}. Valid: ${DOMAINS.join(', ')}`,
            },
          ],
          isError: true,
        };
      }
      const handler = await getDomainHandler(domain);
      const tools = handler.getTools().map((t) => `${t.name}: ${t.description ?? ''}`);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Domain: ${domain}\n\nAvailable tools:\n${tools.join('\n')}`,
          },
        ],
      };
    }

    if (name === 'iqms_status') {
      const creds = getCredentials();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                oracleConnected: !!creds,
                webapiEnabled: !!creds?.webapi,
                domains: DOMAINS,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    for (const domain of DOMAINS) {
      const handler = await getDomainHandler(domain);
      const toolNames = handler.getTools().map((t) => t.name);
      if (toolNames.includes(name)) {
        try {
          return await handler.handleCall(
            name,
            (args || {}) as Record<string, unknown>,
            extra,
          );
        } catch (err) {
          logger.error('Tool call failed', {
            tool: name,
            error: (err as Error).message,
          });
          return {
            content: [
              { type: 'text' as const, text: `Error: ${(err as Error).message}` },
            ],
            isError: true,
          };
        }
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Unknown tool: ${name}. Use iqms_navigate to discover available tools.`,
        },
      ],
      isError: true,
    };
  });

  return server;
}
