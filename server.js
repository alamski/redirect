const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure CORS
app.use(cors());
app.use(express.json());

// Initialize OpenAI client with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware to check if OpenAI API key is configured
const checkApiKey = (req, res, next) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'Server configuration error: OpenAI API key not found' 
    });
  }
  next();
};

// Endpoint for generating embeddings
app.post('/api/embeddings', checkApiKey, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    res.json({ embedding: response.data[0].embedding });
  } catch (error) {
    console.error('Error generating embedding:', error);
    res.status(500).json({ 
      error: `Error generating embedding: ${error.message}` 
    });
  }
});

// Endpoint for generating explanations
app.post('/api/explanations', checkApiKey, async (req, res) => {
  try {
    const { oldUrl, newUrl, confidence } = req.body;
    
    if (!oldUrl || !newUrl) {
      return res.status(400).json({ error: 'Old URL and New URL are required' });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that explains URL similarities."
        },
        {
          role: "user",
          content: `Explain why these two URLs might be related in a website migration:
Old URL: ${oldUrl}
New URL: ${newUrl}
Confidence Score: ${(confidence * 100).toFixed(1)}%

Provide a brief explanation (maximum 2 sentences) about the structural or semantic similarities between these URLs.`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    res.json({ explanation: response.choices[0].message.content });
  } catch (error) {
    console.error('Error generating explanation:', error);
    res.status(500).json({ 
      error: `Error generating explanation: ${error.message}` 
    });
  }
});

// Endpoint for batch processing URLs
app.post('/api/batch-process', checkApiKey, async (req, res) => {
  try {
    const { urls, batchSize = 5, delayMs = 1000 } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    // Process URLs in batches
    const results = [];
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      // Process batch sequentially
      for (const url of batch) {
        try {
          const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: url,
          });
          results.push({ url, embedding: response.data[0].embedding });
        } catch (error) {
          console.error(`Error processing URL ${url}:`, error);
          results.push({ url, error: error.message });
        }
        
        // Add delay between requests if not the last one
        if (i + batchSize < urls.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error batch processing URLs:', error);
    res.status(500).json({ 
      error: `Error batch processing URLs: ${error.message}` 
    });
  }
});

// Endpoint for finding best URL matches
app.post('/api/find-matches', checkApiKey, async (req, res) => {
  try {
    const { oldUrls, newUrls } = req.body;
    
    if (!oldUrls || !newUrls || !Array.isArray(oldUrls) || !Array.isArray(newUrls)) {
      return res.status(400).json({ error: 'Old URLs and New URLs arrays are required' });
    }

    // Process old URLs to get embeddings
    const oldUrlsResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: oldUrls,
    });
    
    // Process new URLs to get embeddings
    const newUrlsResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: newUrls,
    });
    
    // Extract embeddings
    const oldUrlEmbeddings = oldUrlsResponse.data.map(item => item.embedding);
    const newUrlEmbeddings = newUrlsResponse.data.map(item => item.embedding);
    
    // Find best matches using cosine similarity
    const mappings = oldUrls.map((oldUrl, oldIndex) => {
      let bestMatchIndex = 0;
      let highestSimilarity = 0;
      
      // Compare with each new URL
      newUrlEmbeddings.forEach((newEmbedding, newIndex) => {
        const similarity = cosineSimilarity(
          oldUrlEmbeddings[oldIndex],
          newEmbedding
        );
        
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatchIndex = newIndex;
        }
      });
      
      return {
        oldUrl,
        newUrl: newUrls[bestMatchIndex],
        confidence: highestSimilarity,
      };
    });
    
    // Sort by confidence score (highest first)
    const sortedMappings = mappings.sort((a, b) => b.confidence - a.confidence);
    
    res.json({ mappings: sortedMappings });
  } catch (error) {
    console.error('Error finding URL matches:', error);
    res.status(500).json({ 
      error: `Error finding URL matches: ${error.message}` 
    });
  }
});

// Helper function for cosine similarity
function cosineSimilarity(vecA, vecB) {
  // Calculate dot product
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }

  // Calculate magnitudes
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  // Calculate cosine similarity
  return dotProduct / (magA * magB);
}

// Serve static files from the public directory
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
  console.log(`Secure OpenAI proxy server running on port ${port}`);
  console.log(`API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});
