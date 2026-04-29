import { IqmsClient } from '@wyre-technology/node-iqms';
import { logger } from './logger.js';

interface OracleCreds {
  user: string;
  password: string;
  connectString: string;
}

interface WebApiCreds {
  baseUrl: string;
  username: string;
  password: string;
}

interface Credentials {
  oracle: OracleCreds;
  webapi: WebApiCreds | null;
}

let _client: IqmsClient | null = null;
let _credKey: string | null = null;

/**
 * Read credentials from env. In gateway mode the HTTP transport copies
 * incoming `X-IQMS-*` headers into env vars before invoking the MCP server,
 * so the same lookup serves both transports.
 */
export function getCredentials(): Credentials | null {
  const user = process.env.IQMS_ORACLE_USER;
  const password = process.env.IQMS_ORACLE_PASSWORD;
  const connectString = process.env.IQMS_ORACLE_CONNECT_STRING;

  if (!user || !password || !connectString) {
    logger.debug('Oracle credentials missing', {
      hasUser: !!user,
      hasPassword: !!password,
      hasConnectString: !!connectString,
    });
    return null;
  }

  const webapiBaseUrl = process.env.IQMS_WEBAPI_BASE_URL;
  const webapiUser = process.env.IQMS_WEBAPI_USER;
  const webapiPassword = process.env.IQMS_WEBAPI_PASSWORD;

  const webapi: WebApiCreds | null =
    webapiBaseUrl && webapiUser && webapiPassword
      ? { baseUrl: webapiBaseUrl, username: webapiUser, password: webapiPassword }
      : null;

  return { oracle: { user, password, connectString }, webapi };
}

export async function getClient(): Promise<IqmsClient> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error(
      'No IQMS credentials configured. Set IQMS_ORACLE_USER, IQMS_ORACLE_PASSWORD, ' +
        'and IQMS_ORACLE_CONNECT_STRING. Optionally set IQMS_WEBAPI_BASE_URL / ' +
        'IQMS_WEBAPI_USER / IQMS_WEBAPI_PASSWORD to enable write tools.',
    );
  }

  // Cache key includes both driver credentials so a header swap forces a rebuild.
  const key = JSON.stringify({
    o: `${creds.oracle.user}@${creds.oracle.connectString}`,
    w: creds.webapi ? `${creds.webapi.username}@${creds.webapi.baseUrl}` : '',
  });

  if (_client && _credKey === key) return _client;
  if (_client) await _client.close().catch(() => undefined);

  _client = await IqmsClient.create({
    oracle: creds.oracle,
    webapi: creds.webapi ?? undefined,
  });
  _credKey = key;
  logger.info('Created IQMS client', {
    connectString: creds.oracle.connectString,
    webapi: !!creds.webapi,
  });
  return _client;
}

export function resetClient(): void {
  if (_client) {
    _client.close().catch(() => undefined);
  }
  _client = null;
  _credKey = null;
}
