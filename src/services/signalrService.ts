import * as signalR from '@microsoft/signalr';
import { API_CONFIG, getAuthToken } from '../config/api';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private listeners: Map<string, Function[]> = new Map();

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR already connected');
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(API_CONFIG.SIGNALR_HUB_URL, {
        accessTokenFactory: () => getAuthToken() || '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupConnectionHandlers();

    try {
      await this.connection.start();
      console.log('SignalR Connected');
      this.setupListeners();
    } catch (error) {
      console.error('SignalR Connection Error:', error);
      throw error;
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.onreconnecting((error) => {
      console.log('SignalR Reconnecting...', error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR Reconnected:', connectionId);
    });

    this.connection.onclose((error) => {
      console.log('SignalR Connection Closed', error);
    });
  }

  private setupListeners(): void {
    if (!this.connection) return;

    // Test run status updates
    this.connection.on('TestRunStatusChanged', (data) => {
      console.log('Test Run Status Changed:', data);
      this.emit('TestRunStatusChanged', data);
    });

    // Test case completed
    this.connection.on('TestCaseCompleted', (data) => {
      console.log('Test Case Completed:', data);
      this.emit('TestCaseCompleted', data);
    });

    // New notification
    this.connection.on('NewNotification', (data) => {
      console.log('New Notification:', data);
      this.emit('NewNotification', data);
    });

    // Test generation completed
    this.connection.on('TestGenerationCompleted', (data) => {
      console.log('Test Generation Completed:', data);
      this.emit('TestGenerationCompleted', data);
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      console.log('SignalR Disconnected');
      this.connection = null;
    }
  }

  // Subscribe to test run updates
  async subscribeToTestRun(testRunId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SubscribeToTestRun', testRunId);
    }
  }

  // Unsubscribe from test run updates
  async unsubscribeFromTestRun(testRunId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('UnsubscribeFromTestRun', testRunId);
    }
  }

  // Event emitter pattern
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  getConnectionState(): signalR.HubConnectionState | null {
    return this.connection?.state || null;
  }
}

export const signalRService = new SignalRService();
