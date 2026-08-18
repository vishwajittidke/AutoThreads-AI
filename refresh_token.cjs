const axios = require('axios');

const THREADS_TOKEN = process.env.THREADS_ACCESS_TOKEN;

async function refreshToken() {
  if (!THREADS_TOKEN) {
    console.error('Missing THREADS_ACCESS_TOKEN env variable');
    process.exit(1);
  }

  try {
    const res = await axios.get('https://graph.threads.net/refresh_access_token', {
      params: {
        grant_type: 'th_refresh_token',
        access_token: THREADS_TOKEN
      }
    });
    console.log('New Token:', res.data.access_token);
    console.log('Expires in (seconds):', res.data.expires_in);
  } catch (e) {
    console.error('Error refreshing token:', e.response ? e.response.data : e.message);
  }
}

refreshToken();
