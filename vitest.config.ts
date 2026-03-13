import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@loom/bridge-loom-contracts': path.resolve(__dirname, 'contracts/bridge-loom/src/index.ts'),
      '@loom/design-contracts': path.resolve(__dirname, 'contracts/design/src/index.ts'),
      '@loom/entities-contracts': path.resolve(__dirname, 'contracts/entities/src/index.ts'),
      '@loom/events-contracts': path.resolve(__dirname, 'contracts/events/src/index.ts'),
      '@loom/protocols-contracts': path.resolve(__dirname, 'contracts/protocols/src/index.ts'),
      '@loom/archive': path.resolve(__dirname, 'fabrics/archive/src/index.ts'),
      '@loom/dye-house': path.resolve(__dirname, 'fabrics/dye-house/src/index.ts'),
      '@loom/inspector': path.resolve(__dirname, 'fabrics/inspector/src/index.ts'),
      '@loom/loom-core': path.resolve(__dirname, 'fabrics/loom-core/src/index.ts'),
      '@loom/nakama-fabric': path.resolve(__dirname, 'fabrics/nakama-fabric/src/index.ts'),
      '@loom/selvage': path.resolve(__dirname, 'fabrics/selvage/src/index.ts'),
      '@loom/shuttle': path.resolve(__dirname, 'fabrics/shuttle/src/index.ts'),
      '@loom/silfen-weave': path.resolve(__dirname, 'fabrics/silfen-weave/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'fabrics/bridge-loom-ue5/Source', 'fabrics/bridge-loom-ue5/GameFeatures'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    testTimeout: 10000,
    passWithNoTests: true,
  },
});
