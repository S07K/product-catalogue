import { loadConfig } from './config/env';
import { buildDependencies } from './composition';
import { createApp } from './app';

const config = loadConfig();
const deps = buildDependencies(config);
const app = createApp(deps);

const server = app.listen(config.port, () => {
  deps.logger.info(
    { port: config.port, productSource: config.products.source, email: config.email.provider },
    'API listening',
  );
});

// Graceful shutdown for containers (docker stop / ECS task replacement).
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    deps.logger.info({ signal }, 'Shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
