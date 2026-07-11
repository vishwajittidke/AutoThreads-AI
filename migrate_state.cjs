const fs = require('fs');
const state = JSON.parse(fs.readFileSync('state.json', 'utf8'));

// Create new isolated tracking
state.ig_total_posts = state.total_posts;
state.threads_total_posts = state.total_posts;
state.ig_history = [];
state.threads_history = [];

for (const entry of state.history || []) {
  if (entry.topic.startsWith('IG:')) {
    const parts = entry.topic.split(' | Threads: ');
    
    state.ig_history.push({
      date: entry.date,
      postId: entry.postId,
      topic: parts[0],
      contentPreview: entry.contentPreview,
      timestamp: entry.timestamp
    });

    if (parts[1]) {
      state.threads_history.push({
        date: entry.date,
        postId: entry.postId,
        topic: parts[1],
        contentPreview: entry.contentPreview,
        timestamp: entry.timestamp
      });
    }
  } else {
    // Old threads-only posts
    state.threads_history.push({
      date: entry.date,
      postId: entry.postId,
      topic: entry.topic,
      contentPreview: entry.contentPreview,
      timestamp: entry.timestamp
    });
  }
}

// Clean up old fields
delete state.total_posts;
delete state.history;
delete state.last_post_date;
delete state.last_post_id;
delete state.last_topic;
delete state.last_content_preview;

fs.writeFileSync('state.json', JSON.stringify(state, null, 2), 'utf8');
console.log('Migration complete');
