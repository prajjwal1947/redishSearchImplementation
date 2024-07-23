const BookModel = require('../Model/book.model');

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

    const { book_id } = req.params;
    const { queryText } = req.body;
    console.log(book_id, queryText)
    if (!book_id || !queryText) {
        return res.status(400).json({ error: 'bookId and queryText are required' });
    }

    try {
        const results = await BookModel.searchSummaries(book_id, queryText);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}




module.exports = { createIndex, addBook, getBookById, searchSummaries };
