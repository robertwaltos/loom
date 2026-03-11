import { describe, it, expect } from 'vitest';
import {
  createWebSocketGateway,
  type WsGatewayDeps,
  type WsClockPort,
  type WsIdPort,
  type WsLoggerPort,
} from '../websocket-gateway.js';

function createTestDeps(): WsGatewayDeps {
  let idCounter = 0;
  let now = 1000000;
  const clock: WsClockPort = {
    nowMicroseconds: () => now,
  };
  const idGenerator: WsIdPort = {
    generate: () => {
      idCounter++;
      return 'ws-' + String(idCounter);
    },
  };
  const logger: WsLoggerPort = {
    info: () => {},
    warn: () => {},
  };
  return { clock, idGenerator, logger };
}

describe('WebSocketGateway', () => {
  describe('registerConnection', () => {
    it('should register a new connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      const conn = gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      expect(conn.connectionId).toBe('conn-001');
      expect(conn.clientId).toBe('client-001');
      expect(conn.state).toBe('OPEN');
      expect(conn.messagesSent).toBe(0);
      expect(conn.messagesReceived).toBe(0);
    });

    it('should set initial timestamps', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      const conn = gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      expect(conn.connectedAt).toBe(1000000);
      expect(conn.lastHeartbeatAt).toBe(1000000);
    });

    it('should allow retrieving connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      const retrieved = gateway.getConnection('conn-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.clientId).toBe('client-001');
    });

    it('should register multiple connections', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.registerConnection({
        connectionId: 'conn-002',
        clientId: 'client-002',
      });
      const stats = gateway.getStats();
      expect(stats.totalConnections).toBe(2);
    });
  });

  describe('getConnection', () => {
    it('should return undefined for unknown connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      const result = gateway.getConnection('missing-conn');
      expect(result).toBeUndefined();
    });

    it('should return connection details', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      const conn = gateway.getConnection('conn-001');
      expect(conn?.connectionId).toBe('conn-001');
      expect(conn?.state).toBe('OPEN');
    });
  });

  describe('registerHandler', () => {
    it('should register a message handler', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      let called = false;
      gateway.registerHandler({
        messageType: 'ping',
        handler: () => {
          called = true;
          return undefined;
        },
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'ping',
        payload: {},
      });
      expect(called).toBe(true);
    });

    it('should register multiple handlers', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerHandler({
        messageType: 'ping',
        handler: () => undefined,
      });
      gateway.registerHandler({
        messageType: 'chat',
        handler: () => undefined,
      });
      const stats = gateway.getStats();
      expect(stats.registeredHandlers).toBe(2);
    });

    it('should allow handler replacement', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      let counter = 0;
      gateway.registerHandler({
        messageType: 'test',
        handler: () => {
          counter = counter + 1;
          return undefined;
        },
      });
      gateway.registerHandler({
        messageType: 'test',
        handler: () => {
          counter = counter + 10;
          return undefined;
        },
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      expect(counter).toBe(10);
    });
  });

  describe('routeMessage', () => {
    it('should route message to handler', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      let receivedPayload: unknown = null;
      gateway.registerHandler({
        messageType: 'echo',
        handler: (connId, payload) => {
          receivedPayload = payload;
          return undefined;
        },
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      const result = gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'echo',
        payload: { text: 'hello' },
      });
      expect(result).toBeUndefined();
      expect(receivedPayload).toEqual({ text: 'hello' });
    });

    it('should return error for unknown connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerHandler({
        messageType: 'test',
        handler: () => undefined,
      });
      const result = gateway.routeMessage({
        connectionId: 'missing-conn',
        type: 'test',
        payload: {},
      });
      expect(result).toBe('CONNECTION_NOT_FOUND');
    });

    it('should return error if no handler registered', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      const result = gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'unknown-type',
        payload: {},
      });
      expect(result).toBe('NO_HANDLER');
    });

    it('should return error if connection not open', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerHandler({
        messageType: 'test',
        handler: () => undefined,
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.disconnectClient('conn-001');
      const result = gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      expect(result).toBe('CONNECTION_NOT_OPEN');
    });

    it('should increment messages received', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerHandler({
        messageType: 'test',
        handler: () => undefined,
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      const conn = gateway.getConnection('conn-001');
      expect(conn?.messagesReceived).toBe(2);
    });

    it('should pass connection ID to handler', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      let receivedConnId = '';
      gateway.registerHandler({
        messageType: 'test',
        handler: (connId) => {
          receivedConnId = connId;
          return undefined;
        },
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      expect(receivedConnId).toBe('conn-001');
    });

    it('should return handler result', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerHandler({
        messageType: 'validate',
        handler: () => 'VALIDATION_ERROR',
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      const result = gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'validate',
        payload: {},
      });
      expect(result).toBe('VALIDATION_ERROR');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      const result = gateway.sendMessage({
        connectionId: 'conn-001',
        type: 'notification',
        payload: { text: 'Hello' },
      });
      expect(result).toBeUndefined();
    });

    it('should return error for unknown connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      const result = gateway.sendMessage({
        connectionId: 'missing-conn',
        type: 'test',
        payload: {},
      });
      expect(result).toBe('CONNECTION_NOT_FOUND');
    });

    it('should return error if connection not open', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.disconnectClient('conn-001');
      const result = gateway.sendMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      expect(result).toBe('CONNECTION_NOT_OPEN');
    });

    it('should increment messages sent', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.sendMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      gateway.sendMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      const conn = gateway.getConnection('conn-001');
      expect(conn?.messagesSent).toBe(2);
    });
  });

  describe('disconnectClient', () => {
    it('should disconnect open connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      const result = gateway.disconnectClient('conn-001');
      expect(result).toBe(true);
      const conn = gateway.getConnection('conn-001');
      expect(conn?.state).toBe('CLOSED');
    });

    it('should return false for unknown connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      const result = gateway.disconnectClient('missing-conn');
      expect(result).toBe(false);
    });

    it('should allow disconnecting already closed connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.disconnectClient('conn-001');
      const result = gateway.disconnectClient('conn-001');
      expect(result).toBe(true);
    });

    it('should prevent routing after disconnect', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerHandler({
        messageType: 'test',
        handler: () => undefined,
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.disconnectClient('conn-001');
      const result = gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      expect(result).toBe('CONNECTION_NOT_OPEN');
    });

    it('should prevent sending after disconnect', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.disconnectClient('conn-001');
      const result = gateway.sendMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      expect(result).toBe('CONNECTION_NOT_OPEN');
    });
  });

  describe('heartbeat', () => {
    it('should update heartbeat timestamp', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      const conn1 = gateway.getConnection('conn-001');
      const initialHeartbeat = conn1?.lastHeartbeatAt ?? 0;
      const result = gateway.heartbeat('conn-001');
      expect(result).toBe(true);
      const conn2 = gateway.getConnection('conn-001');
      expect(conn2?.lastHeartbeatAt).toBe(initialHeartbeat);
    });

    it('should return false for unknown connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      const result = gateway.heartbeat('missing-conn');
      expect(result).toBe(false);
    });

    it('should return false for closed connection', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.disconnectClient('conn-001');
      const result = gateway.heartbeat('conn-001');
      expect(result).toBe(false);
    });

    it('should succeed for open connections', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      const result = gateway.heartbeat('conn-001');
      expect(result).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return zero stats for empty gateway', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      const stats = gateway.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.openConnections).toBe(0);
      expect(stats.closedConnections).toBe(0);
      expect(stats.totalMessagesSent).toBe(0);
      expect(stats.totalMessagesReceived).toBe(0);
      expect(stats.registeredHandlers).toBe(0);
    });

    it('should count total connections', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.registerConnection({
        connectionId: 'conn-002',
        clientId: 'client-002',
      });
      const stats = gateway.getStats();
      expect(stats.totalConnections).toBe(2);
    });

    it('should count open connections', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.registerConnection({
        connectionId: 'conn-002',
        clientId: 'client-002',
      });
      gateway.disconnectClient('conn-002');
      const stats = gateway.getStats();
      expect(stats.openConnections).toBe(1);
    });

    it('should count closed connections', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.registerConnection({
        connectionId: 'conn-002',
        clientId: 'client-002',
      });
      gateway.disconnectClient('conn-001');
      gateway.disconnectClient('conn-002');
      const stats = gateway.getStats();
      expect(stats.closedConnections).toBe(2);
    });

    it('should count total messages sent', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.sendMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      gateway.sendMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      const stats = gateway.getStats();
      expect(stats.totalMessagesSent).toBe(2);
    });

    it('should count total messages received', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerHandler({
        messageType: 'test',
        handler: () => undefined,
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      gateway.routeMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      const stats = gateway.getStats();
      expect(stats.totalMessagesReceived).toBe(2);
    });

    it('should count registered handlers', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerHandler({
        messageType: 'ping',
        handler: () => undefined,
      });
      gateway.registerHandler({
        messageType: 'chat',
        handler: () => undefined,
      });
      const stats = gateway.getStats();
      expect(stats.registeredHandlers).toBe(2);
    });

    it('should aggregate stats across connections', () => {
      const deps = createTestDeps();
      const gateway = createWebSocketGateway(deps);
      gateway.registerHandler({
        messageType: 'test',
        handler: () => undefined,
      });
      gateway.registerConnection({
        connectionId: 'conn-001',
        clientId: 'client-001',
      });
      gateway.registerConnection({
        connectionId: 'conn-002',
        clientId: 'client-002',
      });
      gateway.sendMessage({
        connectionId: 'conn-001',
        type: 'test',
        payload: {},
      });
      gateway.routeMessage({
        connectionId: 'conn-002',
        type: 'test',
        payload: {},
      });
      const stats = gateway.getStats();
      expect(stats.totalMessagesSent).toBe(1);
      expect(stats.totalMessagesReceived).toBe(1);
    });
  });
});
