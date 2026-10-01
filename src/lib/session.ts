import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify, SignJWT } from 'jose';

const COOKIE = 'renta_session';
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? 'renta-dev-secret-change-me');

export interface Session {
  landlordId: number;
  name: string;
}

export async function createSession(s: Session) {
  const token = await new SignJWT({ name: s.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(s.landlordId))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { landlordId: Number(payload.sub), name: String(payload.name) };
  } catch {
    return null;
  }
}

/** Use in pages and actions that need a signed-in landlord. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/login');
  return s;
}
