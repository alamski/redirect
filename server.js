const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure CORS - More restrictive configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback)  {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' })); // Limit payload size

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 'Retry after 15 minutes'
  }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Initialize OpenAI client with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware to check if OpenAI API key is configured
const checkApiKey = (req, res, next) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'Server configuration error: OpenAI API key not found',
      solution: 'The server administrator needs to set the OPENAI_API_KEY environment variable.'
    });
  }
  next();
};

// Input validation middleware
const validateUrlInput = (req, res, next) => {
  const { text, urls, oldUrls, newUrls, oldUrl, newUrl } = req.body;
  
  // Validate single text input
  if (text !== undefined) {
    if (typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid input: Text must be a non-empty string',
        solution: 'Please provide a valid text string for embedding.'
      });
    }
  }
  
  // Validate URL arrays
  if (urls !== undefined) {
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid input: URLs must be a non-empty array',
        solution: 'Please provide an array of URL strings.'
      });
    }
    
    for (const url of urls) {
      if (typeof url !== 'string' || url.trim() === '') {
        return res.status(400).json({ 
          error: 'Invalid input: Each URL must be a non-empty string',
          solution: 'Please ensure all URLs in the array are valid strings.'
        });
      }
    }
  }
  
  // Validate old and new URL arrays
  if (oldUrls !== undefined || newUrls !== undefined) {
    if (!Array.isArray(oldUrls) || oldUrls.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid input: Old URLs must be a non-empty array',
        solution: 'Please provide an array of old URL strings.'
      });
    }
    
    if (!Array.isArray(newUrls) || newUrls.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid input: New URLs must be a non-empty array',
        solution: 'Please provide an array of new URL strings.'
      });
    }
    
    for (const url of [...oldUrls, ...newUrls]) {
      if (typeof url !== 'string' || url.trim() === '') {
        return res.status(400).json({ 
          error: 'Invalid input: Each URL must be a non-empty string',
          solution: 'Please ensure all URLs in both arrays are valid strings.'
        });
      }
    }
  }
  
  // Validate single old and new URLs
  if (oldUrl !== undefined || newUrl !== undefined) {
    if (typeof oldUrl !== 'string' || oldUrl.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid input: Old URL must be a non-empty string',
        solution: 'Please provide a valid old URL string.'
      });
    }
    
    if (typeof newUrl !== 'string' || newUrl.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid input: New URL must be a non-empty string',
        solution: 'Please provide a valid new URL string.'
      });
    }
  }
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);
  
  // Handle OpenAI API errors
  if (err.name === 'OpenAIError') {
    return res.status(500).json({
      error: `OpenAI API Error: ${err.message}`,
      solution: 'This may be due to rate limits or invalid API key. Please check your API key or try again later.'
    });
  }
  
  // Handle rate limit errors
  if (err.statusCode === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      solution: 'Please reduce the frequency of requests or try again later.',
      retryAfter: err.headers['retry-after'] || '15 minutes'
    });
  }
  
  // Handle other errors
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    solution: 'Please try again later or contact the administrator if the problem persists.'
  });
};

// Endpoint for generating embeddings
app.post('/api/embeddings', checkApiKey, validateUrlInput, async (req, res, next) => {
  try {
    const { text } = req.body;
    
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    res.json({ embedding: response.data[0].embedding });
  } catch (error) {
    next(error);
  }
});

// Endpoint for generating explanations
app.post('/api/explanations', checkApiKey, validateUrlInput, async (req, res, next) => {
  try {
    const { oldUrl, newUrl, confidence } = req.body;
    
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
    next(error);
  }
});

// Endpoint for batch processing URLs
app.post('/api/batch-process', checkApiKey, validateUrlInput, async (req, res, next) => {
  try {
    const { urls, batchSize = 5, delayMs = 1000 } = req.body;
    
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
          results.push({ 
            url, 
            error: error.message,
            solution: 'This URL could not be processed. Try simplifying or shortening it.'
          });
        }
        
        // Add delay between requests if not the last one
        if (i + batchSize < urls.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

// Endpoint for finding best URL matches
app.post('/api/find-matches', checkApiKey, validateUrlInput, async (req, res, next) => {
  try {
    const { oldUrls, newUrls } = req.body;
    
    // Implement retry logic for API calls
    const getEmbeddings = async (urls, retries = 3, delay = 1000) => {
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: urls,
        });
        return response;
      } catch (error) {
        if (retries > 0) {
          console.log(`Retrying API call after ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return getEmbeddings(urls, retries - 1, delay * 2);
        }
        throw error;
      }
    };
    
    // Process old URLs to get embeddings with retry logic
    const oldUrlsResponse = await getEmbeddings(oldUrls);
    
    // Process new URLs to get embeddings with retry logic
    const newUrlsResponse = await getEmbeddings(newUrls);
    
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
    next(error);
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

// Apply error handling middleware
app.use(errorHandler);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    version: '1.1.0'
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Secure OpenAI proxy server running on port ${port}`);
  console.log(`API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});
