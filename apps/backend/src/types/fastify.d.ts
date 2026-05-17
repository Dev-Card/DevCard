import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
    encryption: {
      encrypt: (plaintext: string) => string;
      decrypt: (encryptedBase64: string) => string;
    };
  }
}

export {};
