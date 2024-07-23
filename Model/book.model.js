const { Client } = require('@elastic/elasticsearch');

const client = new Client({
    node: 'http://localhost:9200', // Replace with your local Elasticsearch URL
    auth: {
        username: 'elastic', // Replace with your local Elasticsearch username, if needed
        password: 'your-password' // Replace with your local Elasticsearch password, if needed
    }
});
async function createIndex() {
    try {
        await client.indices.create({
            index: 'books',
            body: {
                mappings: {
                    properties: {
                        book_id: { type: 'keyword' },
                        book_name: { type: 'text' },
                        chapters: {
                            type: 'nested',
                            properties: {
                                chapter_id: { type: 'keyword' },
                                chapter_name: { type: 'text' },
                                summary: { type: 'text' },
                            },
                        },
                    },
                },
            },
        });
        console.log('Index created successfully');
    } catch (error) {
        console.error('Error creating index:', error);
    }
}


async function addBook(book) {
    const response = await client.index({
        index: 'books',
        body: book,
    });
    await client.indices.refresh({ index: 'books' });
    return response;
}

async function getBookById(bookId) {
    const response = await client.search({
        index: 'books',
        body: {
            query: {
                match: { book_id: bookId },
            },
        },
    });
    return response.hits.hits;
}

async function deleteBookById(bookId) {
    try {
        const response = await client.delete({
            index: 'books',
            id: bookId
        });

        return {
            status: 200,
            message: 'Book deleted successfully',
            response: response.body
        };
    } catch (error) {
        console.error('Error deleting book:', error);

        return {
            status: 500,
            message: 'Error deleting book',
            error: error.message
        };
    }
}

async function searchSummaries(bookId, queryText) {
    try {
        const result = await client.search({
            index: 'books',
            body: {
                query: {
                    bool: {
                        must: [
                            {
                                match: { 'book_id': bookId }
                            },
                            {
                                nested: {
                                    path: 'chapters',
                                    query: {
                                        bool: {
                                            should: [
                                                {
                                                    match: {
                                                        'chapters.summary': {
                                                            query: queryText,
                                                            fuzziness: 'AUTO',  // Allow for typos and partial matches
                                                            operator: 'or'     // Allow for any term to match
                                                        }
                                                    }
                                                },
                                                {
                                                    match_phrase: {
                                                        'chapters.summary': {
                                                            query: queryText,
                                                            slop: 5  // Allow for a few words to be in between, if necessary
                                                        }
                                                    }
                                                },
                                                {
                                                    match_phrase_prefix: {
                                                        'chapters.summary': queryText  // Handle prefixes
                                                    }
                                                }
                                            ],
                                            minimum_should_match: 1  // At least one of the should queries must match
                                        }
                                    },
                                    inner_hits: {
                                        _source: ['chapters.chapter_id', 'chapters.chapter_name', 'chapters.summary']
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        });

        // Log the raw response for inspection
        console.log('Raw Search Response:', result);

        // Extract nested hits from the response
        const hits = result.hits.hits.flatMap(hit => {
            // Check if inner_hits is present
            const innerHits = hit.inner_hits?.chapters?.hits?.hits || [];
            return innerHits.map(innerHit => ({
                chapterId: innerHit._source.chapter_id,
                chapterName: innerHit._source.chapter_name,
                summary: innerHit._source.summary
            }));
        });

        // Sort hits by relevance score and return the most relevant one
        const sortedHits = hits.sort((a, b) => b._score - a._score);
        return sortedHits.length > 0 ? sortedHits[0] : null;

    } catch (error) {
        console.error('Search Error:', error.message);
        throw new Error('Search Error: ' + error.message);
    }
}





// async function deleteIndex(indexName) {
//     try {
//         await client.indices.delete({ index: indexName });
//         console.log(`Index '${indexName}' deleted successfully`);
//     } catch (error) {
//         console.error(`Error deleting index '${indexName}':`, error);
//     }
// }

// // Call this function with the index name you want to delete
// deleteIndex('books');
module.exports = { createIndex,addBook, getBookById, deleteBookById, searchSummaries };
