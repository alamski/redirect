const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Configure CORS with more permissive settings for debugging
app.use(cors({
  origin: '*', // Allow all origins temporarily for debugging
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Simplified rate limiting for debugging
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased limit for debugging
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

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

// Mock embedding generation function
function generateMockEmbedding(text) {
  // Generate a deterministic but seemingly random embedding based on the text
  // This ensures the same text always gets the same embedding
  const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const embedding = [];
  
  // Generate a 1536-dimensional embedding (same as OpenAI's ada-002)
  for (let i = 0; i < 1536; i++) {
    // Use a simple pseudo-random number generator with the seed
    const value = Math.sin(seed * (i + 1)) * 0.5;
    embedding.push(value);
  }
  
  return embedding;
}

// Mock explanation generation function
function generateMockExplanation(oldUrl, newUrl, confidence) {
  const confidencePercent = (confidence * 100).toFixed(1);
  
  // Extract domains and paths
  let oldDomain = oldUrl.split('/')[2] || '';
  let newDomain = newUrl.split('/')[2] || '';
  
  let oldPath = oldUrl.split('/').slice(3).join('/');
  let newPath = newUrl.split('/').slice(3).join('/');
  
  // Generate different explanations based on confidence
  if (confidence > 0.7) {
    return `These URLs are strongly related (${confidencePercent}% confidence) as they share similar path structures: "${oldPath}" and "${newPath}". The domain change from ${oldDomain} to ${newDomain} is consistent with a site migration pattern.`;
  } else if (confidence > 0.4) {
    return `These URLs show moderate similarity (${confidencePercent}% confidence) with partial path matching between "${oldPath}" and "${newPath}". The content appears to have been reorganized during migration from ${oldDomain} to ${newDomain}.`;
  } else {
    return `These URLs have low similarity (${confidencePercent}% confidence), suggesting a significant restructuring during migration. The path "${oldPath}" on ${oldDomain} may have been consolidated or merged into "${newPath}" on ${newDomain}.`;
  }
}

// Endpoint for generating embeddings
app.post('/api/embeddings', validateUrlInput, async (req, res, next) => {
  try {
    const { text } = req.body;
    
    // Simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate mock embedding
    const embedding = generateMockEmbedding(text);

    res.json({ embedding });
  } catch (error) {
    next(error);
  }
});

// Endpoint for generating explanations
app.post('/api/explanations', validateUrlInput, async (req, res, next) => {
  try {
    const { oldUrl, newUrl, confidence } = req.body;
    
    // Simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock explanation
    const explanation = generateMockExplanation(oldUrl, newUrl, confidence);

    res.json({ explanation });
  } catch (error) {
    next(error);
  }
});

// Endpoint for batch processing URLs
app.post('/api/batch-process', validateUrlInput, async (req, res, next) => {
  try {
    const { urls, batchSize = 5, delayMs = 1000 } = req.body;
    
    // Process URLs in batches
    const results = [];
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      // Process batch sequentially
      for (const url of batch) {
        try {
          // Simulate API processing time
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Generate mock embedding
          const embedding = generateMockEmbedding(url);
          results.push({ url, embedding });
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
          await new Promise(resolve => setTimeout(resolve, delayMs / 5)); // Reduced delay for demo
        }
      }
    }
    
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

// Endpoint for finding best URL matches
app.post('/api/find-matches', validateUrlInput, async (req, res, next) => {
  try {
    const { oldUrls, newUrls } = req.body;
    
    // Simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock embeddings for all URLs
    const oldUrlEmbeddings = oldUrls.map(url => generateMockEmbedding(url));
    const newUrlEmbeddings = newUrls.map(url => generateMockEmbedding(url));
    
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

// Add a basic health check endpoint
app.get('/api/health', (req, res) => {
  try {
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cors: 'enabled',
      rateLimit: 'enabled'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed', details: error.message });
  }
});

// Error handling middleware with detailed logging
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    headers: req.headers
  });

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start the server with error handling
const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS: enabled`);
  console.log(`Rate limiting: enabled`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
