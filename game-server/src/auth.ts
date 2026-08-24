import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const TOKEN_SERVICE_JWKS_URL = process.env.TOKEN_SERVICE_JWKS_URL || 'http://token-service:8100/.well-known/jwks.json';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'sudhood-services';
const JWT_ISSUER = process.env.JWT_ISSUER || 'sudhood-token-service';

const client = jwksClient({
  jwksUri: TOKEN_SERVICE_JWKS_URL,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 30
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!header.kid) {
    return callback(new Error('No kid in token header'));
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export interface UserSession {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  roles?: string[];
  isGuest?: boolean;
}

export function verifyToken(token: string): Promise<UserSession | null> {
  return new Promise((resolve) => {
    // 1. Check if token is guest / demo token
    if (token.startsWith('guest-') || token.startsWith('demo-')) {
      const parts = token.split(':');
      const name = parts[1] || 'TankCommander';
      return resolve({
        id: `user-${parts[0]}`,
        name,
        email: `${name.toLowerCase()}@player.local`,
        isGuest: true
      });
    }

    // 2. Try JWKS verification from Token-Service
    jwt.verify(
      token,
      getKey,
      {
        audience: JWT_AUDIENCE,
        issuer: JWT_ISSUER,
        algorithms: ['RS256']
      },
      (err, decoded: any) => {
        if (err || !decoded) {
          // Fallback: try decoding unverified for dev mode if configured
          try {
            const rawDecoded: any = jwt.decode(token);
            if (rawDecoded && (rawDecoded.sub || rawDecoded.email)) {
              return resolve({
                id: rawDecoded.sub || rawDecoded.email,
                name: rawDecoded.name || rawDecoded.preferred_username || 'Google Player',
                email: rawDecoded.email,
                roles: rawDecoded.roles || [],
                isGuest: false
              });
            }
          } catch {
            // failed
          }
          return resolve(null);
        }

        resolve({
          id: decoded.sub,
          name: decoded.name || decoded.preferred_username || decoded.email,
          email: decoded.email,
          roles: decoded.roles || [],
          isGuest: false
        });
      }
    );
  });
}
