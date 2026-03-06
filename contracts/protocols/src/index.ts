/**
 * Wire Protocol Contracts
 *
 * Defines how data moves between The Loom and Rendering Fabrics.
 * All hot-path communication uses binary protocols.
 * JSON is only for debugging and low-frequency admin APIs.
 */

export type { WireMessage, MessageHeader, MessageType } from './wire-message.js';
