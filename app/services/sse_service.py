"""
Server-Sent Events (SSE) service for real-time admin dashboard updates.
Broadcasts change notifications to all connected admin clients.
"""

import time
import json
from queue import Queue, Empty
from threading import Lock
from flask import Response

# Global event queue for all SSE clients
_clients = []
_clients_lock = Lock()


class SSEClient:
    """Represents a single SSE connection."""
    def __init__(self):
        self.queue = Queue(maxsize=50)
        
    def put(self, data):
        """Add event to this client's queue."""
        try:
            self.queue.put_nowait(data)
        except:
            pass  # Queue full, skip event


def add_client():
    """Register a new SSE client."""
    client = SSEClient()
    with _clients_lock:
        _clients.append(client)
    return client


def remove_client(client):
    """Unregister an SSE client."""
    with _clients_lock:
        if client in _clients:
            _clients.remove(client)


def broadcast_event(event_type: str, data: dict):
    """
    Broadcast an event to all connected clients.
    
    Args:
        event_type: Type of event (e.g., 'registration_update', 'biometric_update')
        data: Event payload as dictionary
    """
    message = {
        'type': event_type,
        'data': data,
        'timestamp': time.time()
    }
    
    with _clients_lock:
        dead_clients = []
        for client in _clients:
            try:
                client.put(message)
            except:
                dead_clients.append(client)
        
        # Clean up dead clients
        for dead in dead_clients:
            _clients.remove(dead)
    
    print(f"[SSE] Broadcasted {event_type} to {len(_clients)} clients")


def stream_events(client):
    """
    Generator function for SSE response.
    Yields formatted SSE messages from client's queue.
    """
    try:
        # Send initial connection message
        yield f"data: {json.dumps({'type': 'connected', 'timestamp': time.time()})}\n\n"
        
        while True:
            try:
                # Wait for event with timeout
                message = client.queue.get(timeout=30)
                yield f"event: {message['type']}\ndata: {json.dumps(message['data'])}\n\n"
            except Empty:
                # Send keepalive ping every 30 seconds
                yield f"data: {json.dumps({'type': 'ping', 'timestamp': time.time()})}\n\n"
                
    except GeneratorExit:
        # Client disconnected
        remove_client(client)
