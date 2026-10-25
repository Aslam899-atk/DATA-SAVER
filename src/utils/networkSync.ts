// Real-Time Cross-Account and Multiplayer Synchronization
// Combines BroadcastChannel (instant inter-tab/inter-window) + Socket.io (multi-device network)

import { io, Socket } from 'socket.io-client';
import type { DroppedFileItem, CashAirdropItem, NetworkPlayer } from '../types/game';

export interface SyncMessage {
  type:
    | 'PLAYER_JOIN'
    | 'PLAYER_MOVE'
    | 'PLAYER_OFFLINE'
    | 'FILE_DROPPED'
    | 'FILE_PURCHASED'
    | 'ADMIN_CASH_DROPPED'
    | 'ADMIN_CASH_CLAIMED'
    | 'REQUEST_PLAYERS_SYNC';
  payload: any;
  senderId: string;
  timestamp: number;
}

type SyncCallback = (data: any) => void;

class NetworkSyncManager {
  private channel: BroadcastChannel | null = null;
  private socket: Socket | null = null;
  private currentUserId: string = '';
  private listeners: { [key: string]: Set<SyncCallback> } = {
    PLAYER_JOIN: new Set(),
    PLAYER_MOVE: new Set(),
    PLAYER_OFFLINE: new Set(),
    FILE_DROPPED: new Set(),
    FILE_PURCHASED: new Set(),
    ADMIN_CASH_DROPPED: new Set(),
    ADMIN_CASH_CLAIMED: new Set(),
    REQUEST_PLAYERS_SYNC: new Set(),
  };

  constructor() {
    this.initBroadcastChannel();
    this.initSocket();
  }

  public setUserId(id: string) {
    this.currentUserId = id;
  }

  private initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('vicedrop_mesh_channel');
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          this.handleIncoming(event.data);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment', e);
    }
  }

  private initSocket() {
    try {
      if (typeof window === 'undefined') return;
      // Connect to local backend if running
      const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
      this.socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 4000,
      });

      this.socket.on('connect', () => {
        // Socket active
      });

      this.socket.on('vicedrop_event', (msg: SyncMessage) => {
        this.handleIncoming(msg);
      });
    } catch (e) {
      // Socket fallback
    }
  }

  private handleIncoming(msg: SyncMessage) {
    if (!msg || msg.senderId === this.currentUserId) return; // Don't process self-broadcast
    const set = this.listeners[msg.type];
    if (set) {
      set.forEach((cb) => {
        try {
          cb(msg.payload);
        } catch (e) {
          console.error(`Error in listener for ${msg.type}:`, e);
        }
      });
    }
  }

  private broadcast(type: SyncMessage['type'], payload: any) {
    const msg: SyncMessage = {
      type,
      payload,
      senderId: this.currentUserId,
      timestamp: Date.now(),
    };

    // 1. BroadcastChannel (0ms to other tabs / accounts in browser)
    try {
      this.channel?.postMessage(msg);
    } catch (e) {}

    // 2. Socket.io (to other devices on the network)
    try {
      if (this.socket && this.socket.connected) {
        this.socket.emit('vicedrop_event', msg);
      }
    } catch (e) {}
  }

  // --- Public Broadcast Methods ---

  public emitPlayerJoin(player: NetworkPlayer) {
    this.broadcast('PLAYER_JOIN', player);
  }

  public emitPlayerMove(player: {
    id: string;
    name: string;
    avatar: string;
    x: number;
    z: number;
    rotation: number;
    isDriving: boolean;
    carId?: string;
    speed?: number;
  }) {
    this.broadcast('PLAYER_MOVE', player);
  }

  public emitPlayerOffline(player: {
    id: string;
    name: string;
    avatar: string;
    x: number;
    z: number;
    rotation: number;
    lastSeen: number;
  }) {
    this.broadcast('PLAYER_OFFLINE', player);
  }

  public emitFileDropped(file: DroppedFileItem) {
    this.broadcast('FILE_DROPPED', file);
  }

  public emitFilePurchased(data: {
    fileId: string;
    fileName: string;
    price: number;
    buyerId: string;
    buyerName: string;
    sellerId: string;
  }) {
    this.broadcast('FILE_PURCHASED', data);
  }

  public emitCashDropped(drop: CashAirdropItem) {
    this.broadcast('ADMIN_CASH_DROPPED', drop);
  }

  public emitCashClaimed(data: {
    dropId: string;
    amount: number;
    claimedBy: string;
    claimedByName: string;
  }) {
    this.broadcast('ADMIN_CASH_CLAIMED', data);
  }

  public emitRequestPlayersSync() {
    this.broadcast('REQUEST_PLAYERS_SYNC', { requesterId: this.currentUserId });
  }

  // --- Subscriptions ---

  public on(type: SyncMessage['type'], callback: SyncCallback): () => void {
    if (!this.listeners[type]) {
      this.listeners[type] = new Set();
    }
    this.listeners[type].add(callback);
    return () => {
      this.listeners[type]?.delete(callback);
    };
  }
}

export const networkSync = new NetworkSyncManager();
