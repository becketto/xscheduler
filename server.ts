import { startPostPublisher, stopPostPublisher } from "./app/workers/post-publisher.server";

// ... your existing server setup code ...

startPostPublisher();

// Handle graceful shutdown
process.on('SIGTERM', () => {
    stopPostPublisher();
    // ... other cleanup code ...
}); 