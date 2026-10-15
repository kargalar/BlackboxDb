import { Resolver, Mutation, Arg, Ctx, Authorized } from 'type-graphql';
import { GraphQLUpload, FileUpload } from 'graphql-upload-minimal';
import { GraphQLContext } from '../context';
import { requireAuth, requireAdminOrModerator } from '../lib/authGuard';
import { ContentImage } from '../types/ContentImage';
import { saveLocalScreenshot } from '../lib/localScreenshot';
import { saveLocalContentImage, type ContentImageKind } from '../lib/localContentImage';

@Resolver()
export class UploadResolver {
  // ==========================================
  // UPLOAD ALTERNATIVE CONTENT IMAGE
  // ==========================================

  @Authorized()
  @Mutation(() => ContentImage, {
    description: 'Upload alternative content image (poster or backdrop) without setting as default',
  })
  async uploadAlternativeContentImage(
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Arg('contentId', () => String) contentId: string,
    @Arg('type', () => String) type: string, // 'poster' or 'backdrop'
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<any> {
    requireAdminOrModerator(user);

    try {
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: { id: true },
      });

      if (!content) {
        throw new Error('Content not found');
      }

      if (type !== 'poster' && type !== 'backdrop') {
        throw new Error('Alternative content images must be posters or backdrops');
      }
      const uploadResult = await saveLocalContentImage(
        file,
        contentId,
        type as ContentImageKind,
      );

      const contentImage = await prisma.contentImage.create({
        data: {
          contentId,
          type,
          version: 'original',
          filePath: uploadResult.url,
        },
      });

      return contentImage;
    } catch (error) {
      console.error('❌ [Upload] Alternative content image upload failed:', error);
      throw error instanceof Error ? error : new Error('Failed to upload alternative content image');
    }
  }

  // ==========================================
  // PROFILE PICTURE UPLOAD
  // ==========================================

  @Authorized()
  @Mutation(() => String, {
    description: 'Upload profile picture and update user',
  })
  async uploadProfilePicture(
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<string> {
    requireAuth(user);

    try {


      // Get current user data
      const currentUser = await prisma.appUser.findUnique({
        where: { id: user.id },
        select: { picturePath: true },
      });

      const uploadResult = await saveLocalContentImage(file, user.id, 'profile');
      const imageUrl = uploadResult.url;

      // Update user in database
      await prisma.appUser.update({
        where: { id: user.id },
        data: { picturePath: imageUrl },
      });


      return imageUrl;
    } catch (error) {
      console.error('❌ [Upload] Profile picture upload failed:', error);
      throw error instanceof Error ? error : new Error('Failed to upload profile picture');
    }
  }

  // ==========================================
  // COVER PHOTO UPLOAD
  // ==========================================

  @Authorized()
  @Mutation(() => String, {
    description: 'Upload cover photo and update user',
  })
  async uploadCoverPhoto(
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<string> {
    requireAuth(user);

    try {
      // Get current user data
      const currentUser = await prisma.appUser.findUnique({
        where: { id: user.id },
        select: { coverPhotoUrl: true },
      });

      const uploadResult = await saveLocalContentImage(file, user.id, 'cover');
      const imageUrl = uploadResult.url;

      // Update user in database
      await prisma.appUser.update({
        where: { id: user.id },
        data: { coverPhotoUrl: imageUrl },
      });

      console.log('✅ [Upload] Cover photo uploaded:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('❌ [Upload] Cover photo upload failed:', error);
      throw error instanceof Error ? error : new Error('Failed to upload cover photo');
    }
  }

  // ==========================================
  // CONTENT POSTER UPLOAD
  // ==========================================

  @Authorized()
  @Mutation(() => String, {
    description: 'Upload content poster image',
  })
  async uploadContentPoster(
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Arg('contentId', () => String) contentId: string,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<string> {
    requireAdminOrModerator(user);

    try {


      // Check if content exists
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: { id: true },
      });

      if (!content) {
        throw new Error('Content not found');
      }

      const uploadResult = await saveLocalContentImage(file, contentId, 'poster');

      // Save to ContentImage table

      const contentImage = await prisma.contentImage.create({
        data: {
          contentId,
          type: 'poster',
          version: 'original',
          filePath: uploadResult.url,
        },
      });


      // Update posterImageId
      await prisma.content.update({
        where: { id: contentId },
        data: { posterImageId: contentImage.id },
      });


      return uploadResult.url;
    } catch (error) {
      console.error('❌ [Upload] Content poster upload failed:', error);
      throw error instanceof Error ? error : new Error('Failed to upload content poster');
    }
  }

  // ==========================================
  // CONTENT BACKDROP UPLOAD
  // ==========================================

  @Authorized()
  @Mutation(() => String, {
    description: 'Upload content backdrop image',
  })
  async uploadContentBackdrop(
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Arg('contentId', () => String) contentId: string,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<string> {
    requireAdminOrModerator(user);

    try {


      // Check if content exists
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: { id: true },
      });

      if (!content) {
        throw new Error('Content not found');
      }

      const uploadResult = await saveLocalContentImage(file, contentId, 'backdrop');

      // Save to ContentImage table

      const contentImage = await prisma.contentImage.create({
        data: {
          contentId,
          type: 'backdrop',
          version: 'original',
          filePath: uploadResult.url,
        },
      });


      // Update backdropImageId
      await prisma.content.update({
        where: { id: contentId },
        data: { backdropImageId: contentImage.id },
      });


      return uploadResult.url;
    } catch (error) {
      console.error('❌ [Upload] Content backdrop upload failed:', error);
      throw error instanceof Error ? error : new Error('Failed to upload content backdrop');
    }
  }

  // ==========================================
  // CONTENT IMAGE UPLOAD (GENERIC - BASE64)
  // ==========================================

  @Authorized()
  @Mutation(() => String, {
    description: 'Upload content image (poster, backdrop, screenshot, or profile) from base64 string',
  })
  async uploadContentImage(
    @Arg('file', () => String) fileBase64: string,
    @Arg('fileName', () => String) fileName: string,
    @Arg('imageType', () => String) imageType: string,
    @Arg('contentId', () => String, { nullable: true }) contentId: string,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<string> {
    requireAdminOrModerator(user);

    try {
      console.log(`📸 [Upload] User ${user.id} uploading ${imageType}:`, fileName);

      // Extract focus hash if present
      const hashMatch = fileBase64.match(/(#focus=[\d.,]+)/);
      const hash = hashMatch ? hashMatch[1] : '';
      const cleanBase64 = fileBase64.replace(/(#focus=[\d.,]+)/, '');

      const imageKind = imageType === 'screenshot' ? 'screenshot' : imageType;
      const uploadResult = imageKind === 'screenshot'
        ? await saveLocalScreenshot(cleanBase64, contentId, fileName)
        : await saveLocalContentImage(
            cleanBase64,
            contentId || user.id,
            imageKind as ContentImageKind,
          );

      if (!uploadResult) {
        throw new Error('Upload failed: No result returned');
      }

      const primaryUrl = uploadResult.url + hash;
      console.log(`✅ [Upload] Success for ${imageType}:`, primaryUrl);

      // Optional: link it to the Content if contentId is provided
      if (contentId) {
        try {
          // Generate ContentImage record
          const savedImage = await prisma.contentImage.create({
            data: {
              contentId,
              type: imageType,
              version: 'original',
              filePath: primaryUrl,
            },
          });

          // Update Content references based on type
          if (imageType === 'poster') {
            await prisma.content.update({
              where: { id: contentId },
              data: { posterImageId: savedImage.id },
            });
          } else if (imageType === 'backdrop') {
            await prisma.content.update({
              where: { id: contentId },
              data: { backdropImageId: savedImage.id },
            });
          } else if (imageType === 'screenshot') {
            const content = await prisma.content.findUnique({
              where: { id: contentId },
              select: { screenshotImageIds: true },
            });
            const existingIds = content?.screenshotImageIds || [];
            await prisma.content.update({
              where: { id: contentId },
              data: { screenshotImageIds: [...existingIds, savedImage.id] },
            });
          }
        } catch (dbError) {
          console.error(`❌ [Upload] DB reference linking error:`, dbError);
        }
      }

      return primaryUrl;
    } catch (error) {
      console.error(`❌ [Upload] Error:`, error);
      throw error instanceof Error ? error : new Error(`Image upload failed`);
    }
  }
}
