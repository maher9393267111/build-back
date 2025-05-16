const Redis = require("ioredis");

// Configure Redis client with proper connection options
const redisClient = new Redis({
  host: 'glad-leech-38485.upstash.io',
  port: 6379,
  password: 'AZZVAAIjcDE2Yzc4YWU4MzZjMDk0OWZlYWY2NDY5M2ZmM2QzZjBmZHAxMA',
  tls: {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  }
});

// Enhanced error handling
redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
  // Implement proper error handling strategy here
});

redisClient.on('connect', () => console.log('✅ Redis Connected'));

module.exports = redisClient; 



