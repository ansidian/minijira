// SSE Manager - Manages Server-Sent Events connections and broadcasts

class SSEManager {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);

    // Send initial connection success message
    res.write('data: {"type":"connected"}\n\n');

    // Setup heartbeat to keep connection alive (every 30 seconds)
    const heartbeat = setInterval(() => {
      if (this.clients.has(res)) {
        res.write(': heartbeat\n\n');
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    // Clean up on client disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      this.removeClient(res);
    });
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  broadcast(event) {
    const data = JSON.stringify(event);

    // Collect failed clients to remove after iteration
    const failedClients = [];

    // Send to all connected clients
    this.clients.forEach((client) => {
      try {
        client.write(`data: ${data}\n\n`);
      } catch (error) {
        console.error('Error sending SSE message to client:', error);
        failedClients.push(client);
      }
    });

    // Remove failed clients after iteration completes
    failedClients.forEach((client) => this.removeClient(client));
  }
}

// Export singleton instance
export default new SSEManager();
