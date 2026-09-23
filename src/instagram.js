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

  async publishImage(imageUrl, caption) {
    console.log(`[Instagram] 🚀 Starting single-image publication for URL: ${imageUrl}`);

    const containerId = await this.createMediaContainer(imageUrl, caption);
    await this.pollContainerStatus(containerId);
    const postId = await this.publishContainer(containerId);
    
    console.log(`[Instagram] 🎉 Post published successfully! Post ID: ${postId}`);
    return postId;
  }

  /**
   * Publishes a carousel (photo dump) using an array of public URLs.
   */
  async publishCarousel(imageUrls, caption) {
    console.log(`[Instagram] 🚀 Starting carousel publication with ${imageUrls.length} items`);
    
    // 1. Create item containers
    const itemIds = [];
    for (const url of imageUrls) {
      const itemId = await this.createCarouselItem(url);
      itemIds.push(itemId);
    }
    
    // 2. Create parent container
    const parentContainerId = await this.createCarouselContainer(itemIds, caption);
    
    // 3. Poll status
    await this.pollContainerStatus(parentContainerId);
    
    // 4. Publish
    const postId = await this.publishContainer(parentContainerId);
    
    console.log(`[Instagram] 🎉 Carousel published successfully! Post ID: ${postId}`);
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

    if (data.error) throw new Error(`Meta API Error (Container): ${data.error.message}`);
    return data.id;
  }

  async createCarouselItem(imageUrl) {
    console.log(`[Instagram] ── Stage 1a: Carousel Item Creation: ${imageUrl}`);
    const url = `${this.baseUrl}/media`;
    const params = new URLSearchParams({
      image_url: imageUrl,
      is_carousel_item: 'true',
      access_token: this.accessToken
    });

    const response = await fetch(`${url}?${params.toString()}`, { method: "POST" });
    const data = await response.json();

    if (data.error) throw new Error(`Meta API Error (Carousel Item): ${data.error.message}`);
    return data.id;
  }

  async createCarouselContainer(childrenIds, caption) {
    console.log("[Instagram] ── Stage 1b: Parent Carousel Creation ──");
    const url = `${this.baseUrl}/media`;
    const params = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: childrenIds.join(','),
      caption: caption,
      access_token: this.accessToken
    });

    const response = await fetch(`${url}?${params.toString()}`, { method: "POST" });
    const data = await response.json();

    if (data.error) throw new Error(`Meta API Error (Carousel Parent): ${data.error.message}`);
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
