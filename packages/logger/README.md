# @ringcentral/mfe-logger

![Node CI](https://github.com/ringcentral/ringcentral-mfe/workflows/Node%20CI/badge.svg)

A micro frontends framework for building Web applications

### Overview

`@ringcentral/mfe-logger` is a flexible logging system based on [Roarr](https://github.com/gajus/roarr), providing structured logging with configurable transports, middlewares, and integrations. It's designed to be extensible and adaptable to different environments and use cases.

### Features

- Multiple log levels (log, trace, debug, info, warn, error, fatal)
- Configurable transports for different output destinations
- Middleware support for log manipulation and transformation
- Integration capabilities with other systems
- Tag-based logging for better organization
- Storage persistence for log retrieval and analysis
- Error tracking integration

## Usage

### Installation

```bash
npm install @ringcentral/mfe-logger
# or
yarn add @ringcentral/mfe-logger
```

You can visit [https://github.com/ringcentral/ringcentral-mfe](https://github.com/ringcentral/ringcentral-mfe) for more documentation.

### Basic Usage

```javascript
import { useLogger, ConsoleTransport, ScriptErrorIntegration } from '@ringcentral/mfe-logger';

// Initialize the logger
const logger = useLogger({
  name: 'my-application', // required
  version: '1.0.0',
  environment: 'development',
  enabled: true,
  transports: [
    new ConsoleTransport({ 
      enabled: true 
    })
  ],
  integrations: [
    new ScriptErrorIntegration({ 
      enabled: true 
    })
  ]
});

// Use the logger
logger.info('Application started');
logger.debug('Debug information', { key: 'value' });
logger.warn('Warning message');
logger.error('Error occurred', new Error('Something went wrong'));

// Create a tagged logger for a specific component
const componentLogger = logger.tag('Component');
componentLogger.info('Component initialized');
```

### Available Transports

#### ConsoleTransport

Outputs logs to the browser console.

```javascript
import { ConsoleTransport } from '@ringcentral/mfe-logger';

const consoleTransport = new ConsoleTransport({
  enabled: true, // Enable console output
  filter: 'context.logLevel:>= 20', // Only show logs with level >= 20 (info)
  ignoreRule: [/sensitive/], // Ignore logs containing 'sensitive'
  storage: localStorage // Storage to save settings
});

// Later enable/disable programmatically
consoleTransport.enable();
consoleTransport.disable();

// Set a filter query (uses Liqe syntax)
consoleTransport.setFilter('context.logLevel:>= 30'); // Only errors and higher
```

#### StorageTransport

Persists logs to browser storage using IndexedDB.

```javascript
import { StorageTransport } from '@ringcentral/mfe-logger';

const storageTransport = new StorageTransport({
  enabled: true,
  prefix: 'myapp', // Prefix for the database name
  batchNumber: 1024 * 256, // Custom batch size (256KB)
  batchTimeout: 1000 * 60 * 2, // Custom timeout (2 minutes)
  expired: 1000 * 60 * 60 * 48, // Custom expiration (48 hours)
  maxLogsSize: 1024 * 1024 * 50, // Custom max size (50MB)
  recentTime: 1000 * 60 * 30 // Custom recent time (30 minutes)
});

// Save current logs to database
await storageTransport.saveDB();

// Get logs from the last hour (default)
const logs = await storageTransport.getLogs();

// Get logs with custom parameters
const customLogs = await storageTransport.getLogs({
  name: 'custom-export',
  recentTime: 1000 * 60 * 60 * 24, // Last 24 hours
  extraLogs: [
    {
      fileName: 'extra.log',
      log: 'Additional log content'
    }
  ]
});

// Download logs as a zip file
await storageTransport.downloadLogs();
```

##### Storage Transport Default Configuration

The storage transport implements the following default behavior:

- **Batch Size**: 512KB - Logs are saved to storage when the batch size exceeds 512KB
- **Batch Timeout**: 5 minutes - Even if the batch size is not reached, logs are saved every 5 minutes
- **Maximum Logs Size**: 100MB - When the total size of logs exceeds 100MB, older logs are pruned
- **Expiration Time**: 1 day - Logs older than 1 day are automatically deleted
- **Recent Time**: 1 hour - The `getLogs` and `downloadLogs` methods retrieve logs from the last hour by default

These defaults can be customized when initializing the storage transport.

### Available Integrations

#### ScriptErrorIntegration

Automatically captures unhandled errors and promise rejections.

```javascript
import { ScriptErrorIntegration } from '@ringcentral/mfe-logger';

const scriptErrorIntegration = new ScriptErrorIntegration({
  enabled: true
});
```

#### Console Integration

Provides integration with the browser console for easier debugging.

```javascript
import { ConsoleIntegration } from '@ringcentral/mfe-logger';

const consoleIntegration = new ConsoleIntegration();
```

#### HTTP Client Integration

Intended for integrating with HTTP clients to log network requests.

```javascript
import { HttpClientIntegration } from '@ringcentral/mfe-logger';

const httpClientIntegration = new HttpClientIntegration();
```

### Advanced Usage

#### Creating a Tagged Logger

Tagged loggers are useful for organizing logs by component or feature:

```javascript
// Create a logger for a specific feature
const featureLogger = logger.tag('FeatureName');

// Create a logger with multiple tags
const subFeatureLogger = logger.tag('FeatureName', 'SubFeature');

// Logs will show the full namespace: [AppName:FeatureName:SubFeature]
subFeatureLogger.info('Log message');
```

#### Enabling/Disabling Logging

You can enable or disable logging at runtime:

```javascript
// Disable all logging
logger.disable();

// Enable logging again
logger.enable();

// Check if logging is enabled
if (logger.enabled) {
  // Do something
}
```

#### Custom Middleware

Middlewares can transform log context and parameters:

```javascript
import { useLogger } from '@ringcentral/mfe-logger';

// Simple middleware example
const myMiddleware = {
  handleContext(context) {
    // Add custom properties to context
    return {
      ...context,
      customProperty: 'value'
    };
  },
  handleParams(params) {
    // Transform or format parameters
    if (Array.isArray(params)) {
      return params.map(p => typeof p === 'object' ? JSON.stringify(p) : p).join(' ');
    }
    return params;
  }
};

const logger = useLogger({
  name: 'my-app',
  middlewares: [myMiddleware]
});
```

### Best Practices

1. **Appropriate Log Levels**: Use the correct log level based on the importance and type of information:
   - `trace`: Extremely detailed information (rarely used)
   - `debug`: Debugging information useful during development
   - `info`: General information about application flow
   - `warn`: Warning situations that don't cause errors
   - `error`: Error conditions that affect operation
   - `fatal`: Critical errors causing application shutdown

2. **Structured Logging**: Pass objects along with messages for better searchability:
   ```javascript
   logger.info('User logged in', { userId: '123', timestamp: Date.now() });
   ```

3. **Tagged Loggers**: Create tagged loggers for different parts of your application to easily filter logs.

4. **Error Handling**: Use the error transport for catching unhandled errors in production.

5. **Performance Considerations**: Be mindful of the performance impact of verbose logging in production environments.
