const BookModel = require('../Model/book.model');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
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

async function getAllbookdata(req, res) {
    try {
        const response = await BookModel.getAllbookdata();
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

}





module.exports = { createIndex, addBook, getBookById, searchSummaries, getAllbookdata, };
