
import winston from  "winston"

// Create a logger instance
export const logger = winston.createLogger({
    level: 'info', // Default log level
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json() // Format the logs as JSON
    ),
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Colorize the console output
                winston.format.simple() // Simple format for console
            )
        }),
        // File transport
        new winston.transports.File({ filename: 'application.log' }) // Log to a file
    ],
});

