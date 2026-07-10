// Uses native fetch

/**
 * AutoThreads-AI: Instagram Publisher Engine
 * Handles uploading media containers and publishing to Instagram.
 */
export class InstagramPublisher {
  constructor(userId, accessToken) {
    if (!userId || !accessToken) {
      throw new Error("Missing INSTAGRAM_USER_ID or META_ACCESS_TOKEN.");
    }
    this.userId = userId;
    this.accessToken = accessToken;
    this.baseUrl = `https://graph.facebook.com/v19.0/${this.userId}`;
  }

  /**
   * Publishes an image to Instagram using a public URL.
   */
  async publishImage(imageUrl, caption) {
    console.log(`[Instagram] 🚀 Starting publication for URL: ${imageUrl}`);

    // 1. Create Media Container
    const containerId = await this.createMediaContainer(imageUrl, caption);
    
    // 2. Poll Status (Images process quickly, but polling is safe)
    await this.pollContainerStatus(containerId);

    // 3. Publish Container
    const postId = await this.publishContainer(containerId);
    
    console.log(`[Instagram] 🎉 Post published successfully! Post ID: ${postId}`);
    return postId;
  }

  async createMediaContainer(imageUrl, caption) {
    console.log("[Instagram] ── Stage 1: Container Creation ──");
    const url = `${this.baseUrl}/media`;
    const params = new URLSearchParams({
      image_url: imageUrl,
      caption: caption,
      access_token: this.accessToken
    });

    const response = await fetch(`${url}?${params.toString()}`, { method: "POST" });
    const data = await response.json();

    if (data.error) {
      throw new Error(`Meta API Error (Container): ${data.error.message}`);
    }

    console.log(`[Instagram] 📦 Container created: ${data.id}`);
    return data.id;
  }

  async pollContainerStatus(containerId) {
    console.log("[Instagram] ── Stage 2: Processing Verification ──");
    const url = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${this.accessToken}`;
    
    const maxAttempts = 10;
    for (let i = 1; i <= maxAttempts; i++) {
      console.log(`[Instagram] ⏳ Polling status (Attempt ${i}/${maxAttempts})...`);
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(`Meta API Error (Status Check): ${data.error.message}`);
      }

      if (data.status_code === "FINISHED") {
        console.log("[Instagram] ✅ Container processing complete.");
        return true;
      }

      if (data.status_code === "ERROR") {
        throw new Error("Meta API reported container processing ERROR.");
      }

      // Wait 3 seconds before next poll
      await new Promise((res) => setTimeout(res, 3000));
    }
    
    throw new Error("Container processing timed out.");
  }

  async publishContainer(containerId) {
    console.log("[Instagram] ── Stage 3: Live Publication ──");
    const url = `${this.baseUrl}/media_publish`;
    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: this.accessToken
    });

    const response = await fetch(`${url}?${params.toString()}`, { method: "POST" });
    const data = await response.json();

    if (data.error) {
      throw new Error(`Meta API Error (Publishing): ${data.error.message}`);
    }

    return data.id;
  }
}
