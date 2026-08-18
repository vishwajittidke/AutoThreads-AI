const axios = require('axios');
const token = 'THAAWjjQL95KVBYllwbEpHZATdNSjNQX3cyRjBBekxncTBIUktNWFo2MDNnN2I3NjF4NFlWbW5MdXVKRGRsY3MtVC15MW1JZAHNBRjZAKNGV6Y1NzVnUwazlucWZAzY2NDbEFjcjFOZAnBYVmtrMEw1Rms0ZAlRsMWZAhT25pS3JKSlZAaNHgxUQZDZD';

async function testToken() {
  try {
    const resGet = await axios.get('https://graph.threads.net/v1.0/me/threads?fields=id,text&access_token=' + token);
    console.log('GET Success:', resGet.data);
    
    // We will not post a full post to avoid spam, but if GET works, the token is un-banned.
  } catch(e) {
    console.error('Error:', e.response ? e.response.data : e.message);
  }
}
testToken();
