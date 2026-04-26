import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      hospitalName?: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    hospitalName: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    hospitalId: string;
    hospitalName?: string | null;
  }
}
