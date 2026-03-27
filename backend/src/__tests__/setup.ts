// Set required env vars before any module loads
process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-chars-long';
process.env.ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
process.env.NODE_ENV = 'test';
