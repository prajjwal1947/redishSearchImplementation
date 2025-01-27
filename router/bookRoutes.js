const express = require('express');
const router = express.Router();
const bookController = require('../controller/bookController');

router.post('/create-index', bookController.createIndex);
router.post('/add-book', bookController.addBook);
router.post('/add-book/chunks', bookController.addBookChunks);
router.post('/search/:book_id', bookController.searchSummaries);
router.get('/get-book/:book_id', bookController.getBookById);
router.get('/getAll_book', bookController.getAllbookdata);
module.exports = router;
