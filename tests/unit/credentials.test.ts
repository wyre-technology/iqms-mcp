import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCredentials, resetClient } from '../../src/utils/client.js';

const ENV_KEYS = [
  'IQMS_ORACLE_USER',
  'IQMS_ORACLE_PASSWORD',
  'IQMS_ORACLE_CONNECT_STRING',
  'IQMS_WEBAPI_BASE_URL',
  'IQMS_WEBAPI_USER',
  'IQMS_WEBAPI_PASSWORD',
] as const;

describe('getCredentials', () => {
  const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    resetClient();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    resetClient();
  });

  it('returns null when Oracle env vars are missing', () => {
    expect(getCredentials()).toBeNull();
  });

  it('returns oracle creds with webapi=null when only Oracle vars are set', () => {
    process.env.IQMS_ORACLE_USER = 'u';
    process.env.IQMS_ORACLE_PASSWORD = 'p';
    process.env.IQMS_ORACLE_CONNECT_STRING = 'host:1521/EIQ';

    const creds = getCredentials();
    expect(creds?.oracle.user).toBe('u');
    expect(creds?.webapi).toBeNull();
  });

  it('returns webapi creds when all WebAPI vars are present', () => {
    process.env.IQMS_ORACLE_USER = 'u';
    process.env.IQMS_ORACLE_PASSWORD = 'p';
    process.env.IQMS_ORACLE_CONNECT_STRING = 'host:1521/EIQ';
    process.env.IQMS_WEBAPI_BASE_URL = 'http://eiq';
    process.env.IQMS_WEBAPI_USER = 'svc';
    process.env.IQMS_WEBAPI_PASSWORD = 'pw';

    const creds = getCredentials();
    expect(creds?.webapi).toEqual({ baseUrl: 'http://eiq', username: 'svc', password: 'pw' });
  });
});
