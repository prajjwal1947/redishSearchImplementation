const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });

async function createBookChunksIndex() {
    try {
        await client.indices.create({
            index: 'book_chunks',
            body: {
                mappings: {
                    properties: {
                        book_id: { type: 'keyword' }, // Book ID
                        chunks: { // Array of chunks
                            type: 'nested',
                            properties: {
                                chunk_related_text: { type: 'text' } // Text for each chunk
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


async function indexBookChunks(book) {
    try {
        const body = {
            index: 'book_chunks',
            id: book.book_id, // Use book_id as the document ID
            body: {
                book_id: book.book_id,
                chunks: book.chunks.map(chunk => ({
                    chunk_related_text: chunk.chunk_related_text
                }))
            }
        };

        // Index the data
        const response = await client.index(body);

        // Log the response for debugging
        console.log('Index Response:', JSON.stringify(response, null, 2));

        if (response.errors) {
            console.error('Indexing errors:', response.errors);
        } else {
            console.log('Data indexed successfully');
        }
    } catch (error) {
        console.error('Error indexing data:', error);
    }
}



async function deleteBookChunksByBookId(book_id) {
    try {
        const response = await client.deleteByQuery({
            index: 'book_chunks',
            body: {
                query: {
                    match: { book_id }
                }
            }
        });

        console.log('Deletion Response:', response);
    } catch (error) {
        console.error('Error deleting data:', error);
    }
}



module.exports = {
    createBookChunksIndex,
    indexBookChunks,
    deleteBookChunksByBookId,
};
