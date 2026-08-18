const { execSync } = require('child_process');
const token = 'THAAWjjQL95KVBYlo2Q1diTzZA3NHNfejhOQi1WUmZAmWWpqU3JqUDdyM0FGQy1PQUQ2M01VanFGUEY3N2pMR045SXBac0pRMG1UVWl6TlkxMW9Xa0pRN2tBWFdkYlhmNkp0dGhkaVJoN3lERXpPNl9HeXowUzFtS0hSMEllYlJ0VzVTeGdJcWUwM3ZADTkdPYVU1WEMyT05PQ3E0MUF4dTNrZAk01M0UZD';
const curlCmd = `curl -s -X POST "https://graph.threads.net/v1.0/me/threads" -d "media_type=TEXT&text=Chasing+elusive%2C+high-paying+prompt+engineering+dreams.%0AUnderstood+prompt+engineering+is+not+a+standalone+career.%0AUsing+prompts+to+enhance+my+actual+job+now.%0APrompting+is+a+skill%2C+not+a+career+destination.&access_token=${token}"`;
console.log(execSync(curlCmd, { encoding: 'utf-8' }));
