import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getCredentials,
  runWithCredentials,
  resetClient,
  closeAllClients,
} from '../../src/utils/client.js';
import type { Credentials } from '../../src/utils/client.js';

const ENV_KEYS = [
  'IQMS_ORACLE_USER',
  'IQMS_ORACLE_PASSWORD',
  'IQMS_ORACLE_CONNECT_STRING',
  'IQMS_WEBAPI_BASE_URL',
  'IQMS_WEBAPI_USER',
  'IQMS_WEBAPI_PASSWORD',
] as const;

const TENANT_A: Credentials = {
  oracle: { user: 'a_user', password: 'a_pass', connectString: 'host-a:1521/EIQ' },
  webapi: null,
};
const TENANT_B: Credentials = {
  oracle: { user: 'b_user', password: 'b_pass', connectString: 'host-b:1521/EIQ' },
  webapi: { baseUrl: 'http://eiq-b', username: 'svc_b', password: 'pw_b' },
};

describe('getCredentials — env fallback (stdio / single-tenant mode)', () => {
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

describe('runWithCredentials / getCredentials — ALS request-scoped mode', () => {
  afterEach(async () => {
    await closeAllClients();
  });

  it('ALS-scoped credentials override env vars', () => {
    // Set up env as if single-tenant mode
    const originalUser = process.env.IQMS_ORACLE_USER;
    process.env.IQMS_ORACLE_USER = 'env_user';
    process.env.IQMS_ORACLE_PASSWORD = 'env_pass';
    process.env.IQMS_ORACLE_CONNECT_STRING = 'env-host:1521/EIQ';

    let seen: Credentials | null = null;
    runWithCredentials(TENANT_A, () => {
      seen = getCredentials();
    });

    expect(seen?.oracle.user).toBe('a_user');
    expect(seen?.oracle.connectString).toBe('host-a:1521/EIQ');

    // Restore env
    if (originalUser === undefined) {
      delete process.env.IQMS_ORACLE_USER;
      delete process.env.IQMS_ORACLE_PASSWORD;
      delete process.env.IQMS_ORACLE_CONNECT_STRING;
    } else {
      process.env.IQMS_ORACLE_USER = originalUser;
    }
  });

  it('ALS context does not leak between sequential calls', () => {
    let afterA: Credentials | null = null;

    runWithCredentials(TENANT_A, () => {
      // inside A's context — fine
    });

    // Outside any runWithCredentials scope — ALS store should be empty
    afterA = getCredentials();
    // Without env vars set, this would return null; with env vars it would
    // return env creds — either way it must NOT return TENANT_A's creds.
    if (afterA !== null) {
      expect(afterA.oracle.user).not.toBe('a_user');
    }
  });

  it('concurrent ALS contexts are isolated (tenant A sees A, tenant B sees B)', async () => {
    let seenA: Credentials | null = null;
    let seenB: Credentials | null = null;

    // Simulate two concurrent requests interleaving via Promise
    const taskA = new Promise<void>((resolve) => {
      runWithCredentials(TENANT_A, () => {
        // Yield to let "tenant B" potentially start
        setImmediate(() => {
          seenA = getCredentials();
          resolve();
        });
      });
    });

    const taskB = new Promise<void>((resolve) => {
      runWithCredentials(TENANT_B, () => {
        setImmediate(() => {
          seenB = getCredentials();
          resolve();
        });
      });
    });

    await Promise.all([taskA, taskB]);

    // Each context saw only its own credentials — no cross-tenant bleed
    expect(seenA?.oracle.user).toBe('a_user');
    expect(seenA?.oracle.connectString).toBe('host-a:1521/EIQ');
    expect(seenB?.oracle.user).toBe('b_user');
    expect(seenB?.oracle.connectString).toBe('host-b:1521/EIQ');
    expect(seenB?.webapi?.baseUrl).toBe('http://eiq-b');
  });

  it('process.env is not mutated during ALS-scoped credential binding', () => {
    const before = process.env.IQMS_ORACLE_USER;

    runWithCredentials(TENANT_A, () => {
      // Inside the ALS context process.env must be untouched
      expect(process.env.IQMS_ORACLE_USER).toBe(before);
    });

    expect(process.env.IQMS_ORACLE_USER).toBe(before);
  });

  it('all 6 credential fields are carried correctly', () => {
    let seen: Credentials | null = null;
    runWithCredentials(TENANT_B, () => {
      seen = getCredentials();
    });

    // Oracle fields
    expect(seen?.oracle.user).toBe('b_user');
    expect(seen?.oracle.password).toBe('b_pass');
    expect(seen?.oracle.connectString).toBe('host-b:1521/EIQ');
    // WebAPI fields
    expect(seen?.webapi?.baseUrl).toBe('http://eiq-b');
    expect(seen?.webapi?.username).toBe('svc_b');
    expect(seen?.webapi?.password).toBe('pw_b');
  });
});
