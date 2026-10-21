import { Redis, Cluster } from 'ioredis';

interface RedisOptions {
  url?: string;
  sentinel?: {
    hosts: string[];
    masterName: string;
    role?: 'master' | 'slave';
  };
  cluster?: {
    nodes: { host: string; port: number }[];
  };
}

function parseRedisConfig(): RedisOptions {
  const url = process.env.REDIS_URL;
  const sentinelHosts = process.env.REDIS_SENTINEL_HOSTS?.split(',');
  const sentinelMasterName = process.env.REDIS_SENTINEL_MASTER_NAME;
  const clusterNodes = process.env.REDIS_CLUSTER_NODES?.split(',');

  if (sentinelHosts && sentinelMasterName) {
    return {
      sentinel: {
        hosts: sentinelHosts,
        masterName: sentinelMasterName,
        role: (process.env.REDIS_SENTINEL_ROLE as 'master' | 'slave') || 'master',
      },
    };
  }

  if (clusterNodes) {
    return {
      cluster: {
        nodes: clusterNodes.map(n => {
          const [host, port] = n.split(':');
          return { host, port: parseInt(port, 10) };
        }),
      },
    };
  }

  return {
    url: url || 'redis://localhost:6379',
  };
}

const config = parseRedisConfig();

let redis: Redis | Cluster;

if (config.sentinel) {
  const sentinelHosts = config.sentinel.hosts.map(h => {
    const [host, port] = h.split(':');
    return { host, port: parseInt(port, 10) };
  });

  redis = new Redis({
    sentinels: sentinelHosts,
    name: config.sentinel.masterName,
    role: config.sentinel.role,
    sentinelRetryStrategy: (times: number) => Math.min(times * 100, 3000),
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
    lazyConnect: true,
  });
} else if (config.cluster) {
  redis = new Redis.Cluster(config.cluster.nodes, {
    enableReadyCheck: true,
    clusterRetryStrategy: (times: number) => Math.min(times * 50, 2000),
    scaleReads: 'slave',
  });
} else {
  redis = new Redis(config.url!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  });
}

export { redis };