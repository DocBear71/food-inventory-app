// file: src/app/api/auth/[...nextauth]/route.js

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };