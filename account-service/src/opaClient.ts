import { UserRoleCode } from './types.js';

const OPA_URL = process.env.OPA_URL || 'http://localhost:8181';

// Static fallback permissions in case OPA is temporarily unreachable during startup
const FALLBACK_PERMISSIONS: Record<UserRoleCode, string[]> = {
  ADMIN: ['*'],
  TEACHER: [
    'game:play',
    'game:join_squad',
    'quiz:vote',
    'portal:teacher',
    'quiz:read_all',
    'quiz:write',
    'quiz:import',
    'quiz:difficulty',
    'room:control',
    'stats:read_class',
    'stats:read_own',
    'lms:sync'
  ],
  STUDENT: [
    'game:play',
    'game:join_squad',
    'quiz:vote',
    'stats:read_own'
  ],
  GUEST: [
    'game:play',
    'game:join_squad',
    'quiz:vote'
  ]
};

export class OpaClient {
  private baseUrl: string;

  constructor(url: string = OPA_URL) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  /**
   * Check if OPA service is healthy and responsive
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Evaluates user permissions using OPA Rego policy
   * Endpoint: /v1/data/tankquiz/authz/user_permissions
   */
  async getPermissionsForRole(role: UserRoleCode): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/data/tankquiz/authz/user_permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { role } }),
        signal: AbortSignal.timeout(2500)
      });

      if (res.ok) {
        const body = (await res.json()) as any;
        if (Array.isArray(body.result)) {
          return body.result;
        }
      }
    } catch (err) {
      console.warn(`[OpaClient] ⚠️ Could not query OPA at ${this.baseUrl} for role ${role}:`, (err as any).message);
    }

    // Graceful fallback if OPA is starting up or temporarily unavailable
    console.log(`[OpaClient] ℹ️ Using fallback permissions for role: ${role}`);
    return FALLBACK_PERMISSIONS[role] || FALLBACK_PERMISSIONS.GUEST;
  }

  /**
   * Evaluates whether a specific permission is allowed by OPA
   * Endpoint: /v1/data/tankquiz/authz/allow
   */
  async evaluatePermission(role: UserRoleCode, permission: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/data/tankquiz/authz/allow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { role, permission } }),
        signal: AbortSignal.timeout(2500)
      });

      if (res.ok) {
        const body = (await res.json()) as any;
        return body.result === true;
      }
    } catch (err) {
      console.warn(`[OpaClient] ⚠️ OPA evaluatePermission failed:`, (err as any).message);
    }

    // Fallback evaluation
    const perms = FALLBACK_PERMISSIONS[role] || [];
    return perms.includes('*') || perms.includes(permission);
  }
}

export const opaClient = new OpaClient();
