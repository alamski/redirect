# Secure OpenAI Proxy

A secure server-side proxy for OpenAI API calls that protects your API keys from client-side exposure.

## Features

- Securely handles OpenAI API calls server-side
- Provides URL mapping functionality with confidence scores
- Supports CSV file uploads for old and new URLs
- Generates explanations for URL matches
- Includes rate limiting and error handling
- Clean, minimalistic user interface

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- An OpenAI API key (for production use)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   PORT=3000
   ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
   ```

### Running Locally

```
npm start
```

The application will be available at http://localhost:3000

## Deployment

This application is ready to deploy on Vercel. See the [deployment guide](deployment-guide.md) for detailed instructions.

## Usage

1. Upload a CSV file with old URLs
2. Upload a CSV file with new URLs
3. Click "Generate URL Mappings"
4. View the results with confidence scores and explanations
5. Download the mappings as a CSV file

## Security Features

- API keys stored securely as environment variables
- All OpenAI API calls made server-side
- Rate limiting to prevent abuse
- Input validation and sanitization
- Configurable CORS settings

## License

MIT
