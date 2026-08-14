import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { InstagramPublisher } from "./instagram.js";
import fs from "fs/promises";
import { writeState, commitAndPush, recordSuccessfulPost, recordError } from "./state.js";

async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_USER_ID;

  if (!igToken || !igUserId) {
    console.error("❌ Missing Instagram credentials.");
    process.exit(1);
  }

  try {
    const finalBuffer = await fs.readFile("outputs/manual_post.jpg");

    console.log("   📤 Uploading image securely to AWS S3...");
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    const bucketName = process.env.AWS_BUCKET_NAME;
    const objectKey = `ig-posts/manual-post-${Date.now()}.jpg`;

    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: finalBuffer,
      ContentType: 'image/jpeg'
    });
    await s3Client.send(putCommand);

    console.log("   🔗 Generating 1-hour secure pre-signed URL...");
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });
    const publicImageUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    const publisher = new InstagramPublisher(igUserId, igToken);
    
    // Caption from earlier
    const caption = `A Scoop of Joy\n\nA happy family enjoying the exotic flavors of Apsara Ice Creams, celebrating 55 years of bringing people together.\n\n#apsaraicecreams #apsara #contentcreation #ai #contest #rewards #prizes`;

    await publisher.publishImage(publicImageUrl, caption);
    
    console.log("✅ Successfully posted to Instagram.");
    
  } catch (error) {
    console.error(`\n❌ IG PIPELINE ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
