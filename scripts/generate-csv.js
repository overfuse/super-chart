// generate-csv.js
// Node.js script to generate CSV with 100M data points
// Usage: node generate-csv.js [numPoints] [outputFile]

import fs from 'fs';

// Configuration
const NUM_POINTS = parseInt(process.argv[2]) || 100_000_000; // Default 100M
const OUTPUT_FILE = process.argv[3] || `data_points_${NUM_POINTS}.csv`;
const CHUNK_SIZE = 100_000; // Write in chunks to optimize memory
const REPORT_INTERVAL = 1_000_000; // Report progress every 1M points

console.log(`\n📊 CSV Data Generator`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Points to generate: ${NUM_POINTS.toLocaleString()}`);
console.log(`Output file: ${OUTPUT_FILE}`);
console.log(`Estimated size: ~${(NUM_POINTS * 25 / (1024 * 1024 * 1024)).toFixed(2)} GB\n`);

// Create write stream
const writeStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'w' });

// Write CSV header
writeStream.write('x,y\n');

let pointsWritten = 0;
const startTime = Date.now();

// Data generation function (similar to your sample pattern)
function generateDataPoint(x) {
    // Complex wave pattern with multiple frequencies (similar to your sample)
    const scale = 0.00001;
    
    const y = 
        5 * Math.sin(x * scale * 2) +          // Low frequency base wave
        3 * Math.sin(x * scale * 7) +          // Medium frequency
        2 * Math.sin(x * scale * 23) +         // High frequency
        1.5 * Math.cos(x * scale * 13) +       // Phase-shifted component
        Math.sin(x * scale * 37) * 0.5 +       // Very high frequency
        (Math.random() - 0.5) * 2 +            // Random noise
        3 * Math.sin(x * scale * 0.5) +        // Very low frequency trend
        Math.sin(x * scale * 97) * 0.3 +       // Ultra high frequency detail
        0.8 * Math.cos(x * scale * 5) +        // Additional harmonic
        (Math.random() - 0.5) * 0.5;           // Additional fine noise
    
    return y;
}

// Function to format number with consistent precision
function formatFloat(num) {
    // Match the precision from your sample
    return num.toFixed(15).replace(/0+$/, '').replace(/\.$/, '');
}

// Progress reporting
function reportProgress() {
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = Math.round(pointsWritten / elapsed);
    const progress = (pointsWritten / NUM_POINTS * 100).toFixed(1);
    const eta = Math.round((NUM_POINTS - pointsWritten) / rate);
    
    process.stdout.write(`\rProgress: ${progress}% | Points: ${pointsWritten.toLocaleString()} | Speed: ${rate.toLocaleString()} pts/s | ETA: ${eta}s    `);
}

// Main generation loop
async function generateCSV() {
    return new Promise((resolve, reject) => {
        let buffer = '';
        let i = 0;
        
        function writeNextChunk() {
            let chunkWritten = false;
            
            while (i < NUM_POINTS) {
                const x = i;
                const y = generateDataPoint(x);
                buffer += `${x},${formatFloat(y)}\n`;
                i++;
                pointsWritten++;
                
                // Report progress
                if (pointsWritten % REPORT_INTERVAL === 0) {
                    reportProgress();
                }
                
                // Write chunk when buffer is full
                if (i % CHUNK_SIZE === 0) {
                    chunkWritten = !writeStream.write(buffer);
                    buffer = '';
                    
                    if (chunkWritten) {
                        // Buffer is full, wait for drain
                        writeStream.once('drain', writeNextChunk);
                        return;
                    }
                }
            }
            
            // Write remaining buffer
            if (buffer.length > 0) {
                writeStream.write(buffer);
            }
            
            // Complete
            writeStream.end();
            resolve();
        }
        
        writeStream.on('error', reject);
        writeNextChunk();
    });
}

// Run generator
console.log('Starting generation...\n');

generateCSV()
    .then(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const fileSize = fs.statSync(OUTPUT_FILE).size;
        const fileSizeGB = (fileSize / (1024 * 1024 * 1024)).toFixed(2);
        
        console.log(`\n\n✅ Generation complete!`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Time taken: ${elapsed.toFixed(1)} seconds`);
        console.log(`File size: ${fileSizeGB} GB`);
        console.log(`Average speed: ${Math.round(NUM_POINTS / elapsed).toLocaleString()} points/second`);
        console.log(`Output saved to: ${OUTPUT_FILE}\n`);
    })
    .catch(err => {
        console.error('\n❌ Error generating CSV:', err);
        process.exit(1);
    });

// Handle interruption
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Generation interrupted by user');
    writeStream.end();
    
    // Delete partial file
    setTimeout(() => {
        if (fs.existsSync(OUTPUT_FILE)) {
            fs.unlinkSync(OUTPUT_FILE);
            console.log('Partial file deleted');
        }
        process.exit(0);
    }, 100);
});