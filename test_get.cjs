const axios = require('axios');
const token = 'THAAWjjQL95KVBYlo2Q1diTzZA3NHNfejhOQi1WUmZAmWWpqU3JqUDdyM0FGQy1PQUQ2M01VanFGUEY3N2pMR045SXBac0pRMG1UVWl6TlkxMW9Xa0pRN2tBWFdkYlhmNkp0dGhkaVJoN3lERXpPNl9HeXowUzFtS0hSMEllYlJ0VzVTeGdJcWUwM3ZADTkdPYVU1WEMyT05PQ3E0MUF4dTNrZAk01M0UZD';
axios.get('https://graph.threads.net/v1.0/me/threads?fields=id,text&access_token=' + token)
  .then(r => console.log('Success GET:', r.data))
  .catch(e => console.error('Error GET:', e.response ? e.response.data : e.message));
