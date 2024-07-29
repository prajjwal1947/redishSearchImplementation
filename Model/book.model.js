const { Client } = require('@elastic/elasticsearch');
const { v4: uuidv4 } = require('uuid');
const client = new Client({
    node: 'http://localhost:9200', // Replace with your local Elasticsearch URL
    auth: {
        username: 'elastic', // Replace with your local Elasticsearch username, if needed
        password: 'your-password' // Replace with your local Elasticsearch password, if needed
    }, // Replace with your local Elasticsearch URL
   
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
                        chunks: {
                            type: 'nested',  // This field is nested
                            properties: {
                                chunk_id: { type: 'keyword' },
                                text: { type: 'text' },
                                chunk_metadata: {
                                    type: 'nested',  // This field is nested
                                    properties: {
                                        metadata_id: { type: 'keyword' },
                                        chunk_related_text: { type: 'text' }
                                    }
                                },
                                response_data: {
                                    type: 'nested',  // This field is nested
                                    properties: {
                                        response_id: { type: 'keyword' },
                                        summary: { type: 'text' }
                                    }
                                }
                            }
                        },
                        prompt_data: {
                            type: 'nested',  // This field is nested
                            properties: {
                                prompt_id: { type: 'keyword' },
                                text: { type: 'text' }
                            }
                        }
                    }
                }
            }
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
        // Step 1: Search in chunks.response_data.summary
        const responseDataResults = await client.search({
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
                                    path: 'chunks.response_data',
                                    query: {
                                        bool: {
                                            should: [
                                                {
                                                    match: {
                                                        'chunks.response_data.summary': {
                                                            query: queryText,
                                                            fuzziness: 'AUTO',  // Allow for typos and partial matches
                                                            operator: 'or'     // Allow for any term to match
                                                        }
                                                    }
                                                },
                                                {
                                                    match_phrase: {
                                                        'chunks.response_data.summary': {
                                                            query: queryText,
                                                            slop: 5  // Allow for a few words to be in between, if necessary
                                                        }
                                                    }
                                                },
                                                {
                                                    match_phrase_prefix: {
                                                        'chunks.response_data.summary': queryText  // Handle prefixes
                                                    }
                                                }
                                            ],
                                            minimum_should_match: 1  // At least one of the should queries must match
                                        }
                                    },
                                    inner_hits: {
                                        _source: ['chunks.response_data.response_id', 'chunks.response_data.summary'],
                                        size: 10  // Limit the number of hits returned
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        });

        // Extract nested hits from responseDataResults
        let hits = responseDataResults.hits.hits.flatMap(hit => {
            const innerHits = hit.inner_hits?.['chunks.response_data']?.hits?.hits || [];
            return innerHits.map(innerHit => ({
                responseId: innerHit._source.response_id,
                summary: innerHit._source.summary,
                _score: innerHit._score // Include the score for sorting
            }));
        });

        // If we have hits from response_data, return the top 3 results
        if (hits.length > 0) {
            hits = hits.sort((a, b) => b._score - a._score).slice(0, 3); // Return top 3 results
            return hits;
        }

        // Step 2: If no results in response_data, search in chunks.chunk_metadata.chunk_related_text
        const chunkMetadataResults = await client.search({
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
                                    path: 'chunks.chunk_metadata',
                                    query: {
                                        bool: {
                                            should: [
                                                {
                                                    match: {
                                                        'chunks.chunk_metadata.chunk_related_text': {
                                                            query: queryText,
                                                            fuzziness: 'AUTO',  // Allow for typos and partial matches
                                                            operator: 'or'     // Allow for any term to match
                                                        }
                                                    }
                                                },
                                                {
                                                    match_phrase: {
                                                        'chunks.chunk_metadata.chunk_related_text': {
                                                            query: queryText,
                                                            slop: 5  // Allow for a few words to be in between, if necessary
                                                        }
                                                    }
                                                },
                                                {
                                                    match_phrase_prefix: {
                                                        'chunks.chunk_metadata.chunk_related_text': queryText  // Handle prefixes
                                                    }
                                                }
                                            ],
                                            minimum_should_match: 1  // At least one of the should queries must match
                                        }
                                    },
                                    inner_hits: {
                                        _source: ['chunks.chunk_metadata.chunk_related_text'],
                                        size: 10  // Limit the number of hits returned
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        });

        // Extract nested hits from chunkMetadataResults
        const chunkMetadataHits = chunkMetadataResults.hits.hits.flatMap(hit => {
            const innerHits = hit.inner_hits?.['chunks.chunk_metadata']?.hits?.hits || [];
            return innerHits.map(innerHit => ({
                chunkRelatedText: innerHit._source.chunk_related_text,
                _score: innerHit._score // Include the score for sorting
            }));
        });

        // Combine hits from both searches and return the top 3 results
        const allHits = [...hits, ...chunkMetadataHits].sort((a, b) => b._score - a._score).slice(0, 3);

        return allHits.length > 0 ? allHits : { message: 'No relevant summaries found' };

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

async function getAllbookdata(){
    try {
        const result = await client.search({
            index: 'books',
            body: {
                query: {
                    match_all: {}  // Fetch all documents
                }
            }
        });
        
        return result.hits.hits.map(hit => hit._source);
    } catch (error) {
        throw new Error('Error fetching books: ' + error.message);
    }

}

async function updateDocument(book_id, queryText) {
    try {
        // Search for the document to get its ID
        const searchResult = await client.search({
            index: 'books',
            body: {
                query: {
                    match: { book_id: book_id }
                }
            }
        });

        // Ensure that we found at least one document
        if (searchResult.hits.hits.length === 0) {
            throw new Error('Document not found');
        }

        // Extract the document ID
        const documentId = searchResult.hits.hits[0]._id;

        // Update the document
        const response = await client.update({
            index: 'books',
            id: documentId,  // Use the document ID here
            body: {
                script: {
                    source: `
                        if (ctx._source.prompt_data == null) {
                            ctx._source.prompt_data = [];
                        }
                        ctx._source.prompt_data.add(params.newPrompt);
                    `,
                    params: {
                        newPrompt: {
                            text: queryText,
                            prompt_id: uuidv4()  // Generate a new UUID for the prompt_id
                        }
                    }
                }
            }
        });

        console.log('Document updated successfully:', response);
        return response;
    } catch (error) {
        console.error('Error updating document:', error.message);
        throw new Error('Error updating document: ' + error.message);
    }
}


module.exports = { createIndex,addBook, getBookById, deleteBookById, searchSummaries,getAllbookdata ,updateDocument};
