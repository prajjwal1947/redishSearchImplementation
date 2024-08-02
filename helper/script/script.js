const { spawn } = require('child_process');
const path = require('path');

// Paths to your Python script and PDF file
const pythonScriptPath = path.join(__dirname, '../extract_text.py');  // Adjust path if needed
const pdfFilePath = path.join(__dirname, '../../view/9780429162794_webpdf.pdf');  // Adjust path if needed

// Path to the Python interpreter in the virtual environment
const pythonInterpreter = path.join(__dirname, '../venv/Scripts/python.exe');  // Adjust path if needed

// Run the Python script with the specified interpreter
const pythonProcess = spawn(pythonInterpreter, [pythonScriptPath, pdfFilePath]);

let output = '';
let error = '';

// Collect stdout data
pythonProcess.stdout.on('data', (data) => {
    output += data.toString('utf-8');
});

// Collect stderr data
pythonProcess.stderr.on('data', (data) => {
    error += data.toString('utf-8');
});

// When the process exits
pythonProcess.on('close', (code) => {
    if (code === 0) {
        // Remove BOM from output if present
        output = output.replace(/^\ufeff/, '');

        console.log('Raw Output:', output);  // Log raw output
        console.log('Raw Error:', error);    // Log raw error

        try {
            // Parse JSON output
            const chunks = JSON.parse(output);
            console.log('Chunks:', chunks);
            // You can now use the `chunks` array as needed, e.g., saving to a database
        } catch (e) {
            console.error('Failed to parse JSON:', e);
        }
    } else {
        console.error(`Python script exited with code ${code}`);
        if (error) {
            console.error('stderr:', error);
        }
    }
});
