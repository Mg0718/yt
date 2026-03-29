/**
 * ZIP Streaming Service
 * Creates ZIP archives progressively without loading entire files into memory
 */

import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { EventEmitter } from 'events';

/**
 * Creates a streaming ZIP archive
 * @param {string} outputPath - Path for the output ZIP file
 * @returns {Object} Archive controller with methods to add files and finalize
 */
export function createZipStream(outputPath) {
    const emitter = new EventEmitter();

    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
        zlib: { level: 5 } // Balanced compression
    });

    // Track progress
    let totalBytes = 0;
    let processedBytes = 0;

    output.on('close', () => {
        emitter.emit('complete', {
            totalBytes: archive.pointer(),
            path: outputPath
        });
    });

    archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
            console.warn('ZIP warning:', err.message);
        } else {
            emitter.emit('error', err);
        }
    });

    archive.on('error', (err) => {
        emitter.emit('error', err);
    });

    archive.on('progress', (progress) => {
        emitter.emit('progress', {
            entries: progress.entries.processed,
            totalEntries: progress.entries.total,
            bytes: progress.fs.processedBytes
        });
    });

    archive.pipe(output);

    return {
        emitter,

        /**
         * Adds a file to the archive
         * @param {string} filePath - Path to the file to add
         * @param {string} name - Name within the archive
         */
        addFile(filePath, name) {
            archive.file(filePath, { name });
        },

        /**
         * Adds a file from a stream
         * @param {ReadableStream} stream - File stream
         * @param {string} name - Name within the archive
         */
        addStream(stream, name) {
            archive.append(stream, { name });
        },

        /**
         * Adds a buffer as a file
         * @param {Buffer} buffer - File contents
         * @param {string} name - Name within the archive
         */
        addBuffer(buffer, name) {
            archive.append(buffer, { name });
        },

        /**
         * Finalizes the archive (must be called when done adding files)
         * @returns {Promise<void>}
         */
        async finalize() {
            await archive.finalize();
        },

        /**
         * Aborts the archive creation
         */
        abort() {
            archive.abort();
            output.destroy();
        }
    };
}
