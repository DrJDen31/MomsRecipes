export const getURL = () => {
    let url =
      process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
      process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
      'http://localhost:3000/';
  
    // Include `https://` when not localhost.
    url = url.includes('http') ? url : `https://${url}`;
  
    // Ensure trailing slash is removed for consistency
    url = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // Client-side override (most robust for making sure it matches the current browser)
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
        url = window.location.origin;
    }

    return url;
  };
