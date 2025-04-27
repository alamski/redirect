# Deployment Documentation

## Application Details

- **Application Name**: Secure OpenAI Proxy - URL Mapping Tool
- **Deployment Date**: April 27, 2025
- **Permanent URL**: https://safrtvmk.manus.space
- **Deployment Platform**: Vercel (Static Site Hosting)

## Application Architecture

This application consists of two main components:

1. **Frontend**: A static HTML/CSS/JavaScript application that provides the user interface for uploading CSV files, processing URLs, and displaying results.

2. **Simulated Backend**: JavaScript functions that simulate API calls to OpenAI's embedding and explanation services without requiring a real API key.

## Deployment Configuration

The application was deployed using the following configuration:

- **Deployment Type**: Static website
- **Source Directory**: `/home/ubuntu/secure-openai-proxy-demo/public`
- **Framework**: None (vanilla HTML/CSS/JavaScript)
- **Build Command**: None (pre-built static files)
- **Environment Variables**: None required for the demo version

## Features Implemented

1. **File Upload Interface**:
   - Drag-and-drop functionality for CSV files
   - Validation for file types and content

2. **URL Mapping Algorithm**:
   - Simulated embedding-based similarity matching
   - Confidence score calculation
   - Visual indicators for match quality

3. **Advanced Settings**:
   - Batch size configuration
   - Processing delay controls
   - Optional explanation generation

4. **Results Display**:
   - Sortable table of URL mappings
   - Color-coded confidence indicators
   - Natural language explanations for matches

5. **Export Functionality**:
   - CSV download of mapping results
   - Includes all metadata and explanations

## Sample Data

The application includes sample data for testing:

- **Sample Old URLs**: Available at `/sample_old_urls.csv`
- **Sample New URLs**: Available at `/sample_new_urls.csv`

## Future Enhancements

To upgrade this demo to a production version with real API integration:

1. Deploy the full Node.js application (server.js) instead of just the static frontend
2. Configure environment variables for your OpenAI API key
3. Update the CORS settings to match your production domain

## Maintenance

This is a permanent deployment that will remain accessible at the provided URL. No regular maintenance is required for the demo version.

If you wish to update the application in the future:

1. Make changes to the source code
2. Redeploy using the same process
3. The URL will remain the same, but the content will be updated

## Support

For any issues or questions about the deployment, please refer to the documentation or contact the developer who assisted with the deployment.
