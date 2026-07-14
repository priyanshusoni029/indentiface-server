// ════════════════════════════════════════════════════════
// SSE Client for Real-Time Dashboard Updates
// ════════════════════════════════════════════════════════

let sseConnection = null;
let sseReconnectTimer = null;
let sseReconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

// Event handlers registry
const sseHandlers = {
    'registration_update': [],
    'biometric_update': [],
    'attendance_update': [],
    'stats_update': []
};

/**
 * Register an event handler for specific SSE event type
 */
function onSSEEvent(eventType, handler) {
    if (!sseHandlers[eventType]) {
        sseHandlers[eventType] = [];
    }
    sseHandlers[eventType].push(handler);
}

/**
 * Dispatch SSE event to all registered handlers
 */
function dispatchSSEEvent(eventType, data) {
    if (sseHandlers[eventType]) {
        sseHandlers[eventType].forEach(handler => {
            try {
                handler(data);
            } catch (e) {
                console.error(`[SSE] Handler error for ${eventType}:`, e);
            }
        });
    }
}

/**
 * Connect to SSE stream
 */
function connectSSE() {
    if (sseConnection) {
        console.log('[SSE] Already connected');
        return;
    }

    console.log('[SSE] Connecting to event stream...');
    
    sseConnection = new EventSource('/admin/sse/stream');

    // Connection opened
    sseConnection.onopen = function() {
        console.log('[SSE] Connected successfully');
        sseReconnectAttempts = 0;
        showToast('Live updates enabled', 'success');
    };

    // Generic message handler (for ping/keepalive)
    sseConnection.onmessage = function(event) {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'connected') {
                console.log('[SSE] Initial connection confirmed');
            } else if (message.type === 'ping') {
                // Keepalive ping - do nothing
            }
        } catch (e) {
            console.error('[SSE] Message parse error:', e);
        }
    };

    // Registration update handler
    sseConnection.addEventListener('registration_update', function(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('[SSE] Registration update:', data);
            dispatchSSEEvent('registration_update', data);
        } catch (e) {
            console.error('[SSE] Registration update parse error:', e);
        }
    });

    // Biometric update handler
    sseConnection.addEventListener('biometric_update', function(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('[SSE] Biometric update:', data);
            dispatchSSEEvent('biometric_update', data);
        } catch (e) {
            console.error('[SSE] Biometric update parse error:', e);
        }
    });

    // Attendance update handler
    sseConnection.addEventListener('attendance_update', function(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('[SSE] Attendance update:', data);
            dispatchSSEEvent('attendance_update', data);
        } catch (e) {
            console.error('[SSE] Attendance update parse error:', e);
        }
    });

    // Stats update handler
    sseConnection.addEventListener('stats_update', function(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('[SSE] Stats update:', data);
            dispatchSSEEvent('stats_update', data);
        } catch (e) {
            console.error('[SSE] Stats update parse error:', e);
        }
    });

    // Connection error
    sseConnection.onerror = function(error) {
        console.error('[SSE] Connection error:', error);
        disconnectSSE();
        scheduleReconnect();
    };
}

/**
 * Disconnect SSE stream
 */
function disconnectSSE() {
    if (sseConnection) {
        console.log('[SSE] Disconnecting...');
        sseConnection.close();
        sseConnection = null;
    }
}

/**
 * Schedule automatic reconnection with exponential backoff
 */
function scheduleReconnect() {
    if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
    }

    sseReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, sseReconnectAttempts - 1), MAX_RECONNECT_DELAY);
    
    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${sseReconnectAttempts})...`);
    
    sseReconnectTimer = setTimeout(() => {
        connectSSE();
    }, delay);
}

/**
 * Initialize SSE connection on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Only connect SSE on admin dashboard pages
    if (window.location.pathname.startsWith('/admin')) {
        connectSSE();
    }
});

/**
 * Clean up SSE connection when page unloads
 */
window.addEventListener('beforeunload', function() {
    disconnectSSE();
    if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
    }
});
