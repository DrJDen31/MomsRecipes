/**
 * Retrieves the current site URL based on environment variables.
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (Production/Custom Domain)
 * 2. NEXT_PUBLIC_VERCEL_URL (Vercel Preview/Deployment - automatically set)
 * 3. Fallback to localhost:3000
 * 
 * @returns {string} The fully formed URL including protocol.
 */
export const getURL = () => {
    let url =
      process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
      process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
      'http://localhost:3000/';
  
    // Make sure to include `https://` when not localhost.
    url = url.includes('http') ? url : `https://${url}`;
  
    // Ensure trailing slash is removed for consistency
    url = url.endsWith('/') ? url.slice(0, -1) : url;
    
    return url;
  };
