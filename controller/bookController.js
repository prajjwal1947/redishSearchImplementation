const BookModel = require('../Model/book.model');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
async function createIndex(req, res) {
    try {
        await BookModel.createIndex();
        res.status(200).send('Index created');
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function addBook(req, res) {
    try {
        const book = req.body;

        // Generate UUIDs if they are not provided in the incoming data
        if (!book.book_id) book.book_id = uuidv4();
        if (book.chunks) {
            book.chunks = book.chunks.map(chunk => {
                if (!chunk.chunk_id) chunk.chunk_id = uuidv4();
                if (chunk.chunk_metadata) {
                    chunk.chunk_metadata = chunk.chunk_metadata.map(metadata => {
                        if (!metadata.metadata_id) metadata.metadata_id = uuidv4();
                        return metadata;
                    });
                }
                if (chunk.response_data) {
                    chunk.response_data = chunk.response_data.map(response => {
                        if (!response.response_id) response.response_id = uuidv4();
                        return response;
                    });
                }
                return chunk;
            });
        }
        if (book.prompt_data) {
            book.prompt_data = book.prompt_data.map(prompt => {
                if (!prompt.prompt_id) prompt.prompt_id = uuidv4();
                return prompt;
            });
        }

        const response = await BookModel.addBook(book);
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getBookById(req, res) {
    try {
        const { book_id } = req.params;
        const book = await BookModel.getBookById(book_id);
        res.status(200).json(book);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteBookByid(req, res) {
    try {
        const { book_id } = req.params;
        const book = await BookModel.deleteBookByid(book_id);
        res.status(200).json(book);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function searchSummaries(req, res) {
    let externalApiResponse
    const { book_id } = req.params;
    const { queryText } = req.body;
    console.log(book_id, queryText)
    if (!book_id || !queryText) {
        return res.status(400).json({ error: 'bookId and queryText are required' });
    }

    try {
        await BookModel.updateDocument(book_id, queryText);
        const results = await BookModel.searchSummaries(book_id, queryText);
        if (results.length == 1) {
            return res.status(200).json(results);
        }
        else {
            const combinedSummary = results.map(result => result.summary).join(' ');
            externalApiResponse = await axios.post('http://localhost:8001/api/chat', {
                combinedSummary,
                queryText
            });
        }



        return res.status(200).json(externalApiResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function searchFrequencyofQuery(req,res){
    const { book_id } = req.params;
    const { queryText } = req.body;
    try {
        const results = await BookModel.queryOccurence(book_id, queryText); 
        return res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getAllbookdata(req, res) {
    try {
        const response = await BookModel.getAllbookdata();
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

}


async function addBookChunks(req, res) {
    try {
        const { book_id, chunk_related_text, summary } = req.body;

        // Validate the request body
        if (!book_id || !chunk_related_text || !summary) {
            return res.status(400).json({ error: "book_id, chunk_related_text, and summary are required." });
        }

        // Fetch the book by book_id
        let book = await BookModel.getBookById(book_id);

        // If the book exists, update its chunk_metadata and response_data
        if (book!=0) {
            // Create new chunk_metadata and response_data entries
            const newMetadata = {
                metadata_id: uuidv4(),
                chunk_related_text
            };

            const newResponseData = {
                response_id: uuidv4(),
                summary
            };

            // Update the existing book's chunks
            if (book[0]._source.chunks && book[0]._source.chunks.length> 0) {
                book[0]._source.chunks[0].chunk_metadata.push(newMetadata);
                book[0]._source.chunks[0].response_data.push(newResponseData);
            } else {
                // If chunks array is empty, initialize it with the new data
                book.chunks = [{
                    chunk_id: uuidv4(),
                    text: "",
                    chunk_metadata: [newMetadata],
                    response_data: [newResponseData]
                }];
            }

    const response = await BookModel.updateChunksData(book_id, book);
            res.status(200).json(response);
        } else {
            // If the book does not exist, create a new one
            const newBook = {
                book_id,
                book_name: "", // You can provide a default name or use an empty string
                chunks: [{
                    chunk_id: uuidv4(),
                    text: "",
                    chunk_metadata: [{
                        metadata_id: uuidv4(),
                        chunk_related_text
                    }],
                    response_data: [{
                        response_id: uuidv4(),
                        summary
                    }]
                }]
            };

            const response = await BookModel.addBook(newBook);
            res.status(201).json(response);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


async function generateChunksFromPdf(req, res) {
    const pythonScriptPath = path.join(__dirname, '../helper/extract_text.py'); // Adjust path if needed
    const pythonInterpreter = path.join(__dirname, '../helper/venv/Scripts/python.exe'); // Adjust path if needed
    const pdfPath = path.join(__dirname, '../view/9780429162794_webpdf.pdf');

    // Validate input
    if (!pdfPath) {
        return res.status(400).json({ error: 'pdfPath is required' });
    }

    // Run the Python script
    const pythonProcess = spawn(pythonInterpreter, [pythonScriptPath, pdfPath]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
        output += data.toString('utf-8');
    });

    pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString('utf-8');
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: `Python script failed with code ${code}`, details: errorOutput });
        }

        try {
            const chunks = JSON.parse(output); // Parse the JSON output from Python
            res.json(chunks);
        } catch (error) {
            res.status(500).json({ error: 'Error processing the output', details: error.message });
        }
    });
}




module.exports = { createIndex,addBookChunks, addBook, getBookById, searchSummaries, getAllbookdata,searchFrequencyofQuery,generateChunksFromPdf };
