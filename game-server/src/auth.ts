import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tank-battle-quiz-secret-2026';

export interface UserSession {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  roles?: string[];
  isGuest?: boolean;
}

export function signUserToken(user: UserSession): string {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      roles: user.roles || ['player'],
      isGuest: !!user.isGuest
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): Promise<UserSession | null> {
  return new Promise((resolve) => {
    if (!token) return resolve(null);

    // 1. Guest or Demo format (e.g. guest-1234:Name)
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

    // 2. Try verifying with internal standalone secret
    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
      if (!err && decoded) {
        return resolve({
          id: decoded.sub || decoded.id,
          name: decoded.name || decoded.email || 'Player',
          email: decoded.email,
          avatar: decoded.avatar,
          roles: decoded.roles || ['player'],
          isGuest: !!decoded.isGuest
        });
      }

      // 3. Fallback: decode JWT payload directly (e.g. Google tokens or client tokens)
      try {
        const rawDecoded: any = jwt.decode(token);
        if (rawDecoded && (rawDecoded.sub || rawDecoded.email || rawDecoded.name)) {
          return resolve({
            id: rawDecoded.sub || rawDecoded.email || `user-${Date.now()}`,
            name: rawDecoded.name || rawDecoded.preferred_username || rawDecoded.email || 'Player',
            email: rawDecoded.email,
            avatar: rawDecoded.picture || rawDecoded.avatar,
            roles: rawDecoded.roles || ['player'],
            isGuest: false
          });
        }
      } catch {
        // decode failed
      }

      resolve(null);
    });
  });
}
