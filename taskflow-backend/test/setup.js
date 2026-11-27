const dns = require('dns');

// 1. Enforce test environment
process.env.NODE_ENV = 'test';

// 2. Prevent accidental mutation of production database
if (process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: Test runner cannot execute in production environment (NODE_ENV=production)');
}

// 3. DNS reliability: Enforce IPv4-first DNS resolution for test network operations
// This prevents timeouts against dual-stack endpoints (e.g. Neon AWS PostgreSQL) where IPv6 egress routes are unreachable
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
