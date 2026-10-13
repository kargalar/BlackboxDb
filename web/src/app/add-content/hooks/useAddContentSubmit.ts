'use client';

import { MutableRefObject } from 'react';
import { useRouter } from 'next/navigation';
import {
  createContent,
  updateContent,
  uploadContentImage,
  approveContentRequest,
  createContentRequest,
  updateContentRequest,
} from '@/services/adminService';
import { PendingImageUpload } from '@/components/molecules/ImageUploadField';
import { getImageFocus, withImageFocus } from '@/lib/image-focus';
import toast from 'react-hot-toast';
import { emitDebugEvent } from '@/lib/debug-events';
import { refreshPendingContentRequestsBadge } from '@/features/admin/hooks/usePendingContentRequestsCount';
import { AddContentFormData } from '../types';
import { buildContentInput } from '../utils/buildContentInput';
import { buildChangedFormPayload, buildPatchInput } from '../utils/buildContentPatch';
import { useMutation } from '@apollo/client/react';
import {
  CREATE_CONTRIBUTION,
  UPDATE_CONTRIBUTION,
  REVIEW_CONTRIBUTION,
} from '@/services/graphql/contribution';
import { compareFormData } from '@/utils/diffUtils';

interface UseAddContentSubmitParams {
  formData: AddContentFormData;
  pendingPoster: PendingImageUpload | null;
  pendingBackdrop: PendingImageUpload | null;
  resetForm: () => void;
  isEditMode: boolean;
  contentId: string | null;
  requestId: number | null;
  contributionId: number | null;
  contributionStatus: string | null;
  canDirectCreate: boolean | undefined;
  originalData?: AddContentFormData | null;
  setLoading: (loading: boolean) => void;
  setUploadProgress: (progress: string) => void;
  validateForm: () => boolean;
}

/**
 * Hook that handles image uploading, content input building, and form submission.
 */
// Dosyayı base64'e çeviren yardımcı fonksiyon
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function useAddContentSubmit({
  formData,
  pendingPoster,
  pendingBackdrop,
  resetForm,
  isEditMode,
  contentId,
  requestId,
  contributionId,
  contributionStatus,
  canDirectCreate,
  originalData,
  setLoading,
  setUploadProgress,
  validateForm,
}: UseAddContentSubmitParams) {
  const router = useRouter();
  const [createContribution] = useMutation(CREATE_CONTRIBUTION);
  const [updateContribution] = useMutation(UPDATE_CONTRIBUTION);
  const [reviewContribution] = useMutation(REVIEW_CONTRIBUTION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🚀 [AddContent] Form submitted:', formData);

    if (!validateForm()) {
      console.log('❌ [AddContent] Validation failed');
      toast.error('Lütfen zorunlu alanları doldurunuz');
      return;
    }

    try {
      setLoading(true);

      // === PHASE 1: Görselleri upload et ===
      let posterUrl = formData.posterUrl;
      let backdropUrl = formData.backdropUrl;

      // Debug: Log current state
      console.log('🔍 [AddContent] Image upload check:', {
        posterUrl: posterUrl?.substring(0, 50) + ((posterUrl?.length || 0) > 50 ? '...' : ''),
        posterIsBase64: posterUrl?.startsWith('data:'),
        pendingPoster: pendingPoster
          ? {
              fileName: pendingPoster.fileName,
              imageType: pendingPoster.imageType,
            }
          : null,
        backdropUrl: backdropUrl?.substring(0, 50) + ((backdropUrl?.length || 0) > 50 ? '...' : ''),
        backdropIsBase64: backdropUrl?.startsWith('data:'),
        pendingBackdrop: pendingBackdrop
          ? {
              fileName: pendingBackdrop.fileName,
              imageType: pendingBackdrop.imageType,
            }
          : null,
      });

      // Poster upload (eğer base64 ise)
      if (posterUrl?.startsWith('data:') && pendingPoster) {
        setUploadProgress('📤 Poster yükleniyor...');
        console.log('📤 [AddContent] Uploading poster...');
        try {
          posterUrl = await uploadContentImage(
            pendingPoster.base64,
            pendingPoster.fileName,
            'poster'
          );
          console.log('✅ [AddContent] Poster uploaded:', posterUrl);
        } catch (err: any) {
          console.error('❌ [AddContent] Poster upload failed:', err);
          toast.error('Poster yüklenemedi: ' + err.message);
          setLoading(false);
          setUploadProgress('');
          return;
        }
      } else if (posterUrl?.startsWith('data:') && !pendingPoster) {
        console.warn(
          '⚠️ [AddContent] Poster is base64 but pendingPoster is null - upload will be skipped!'
        );
      }

      // Backdrop upload (eğer base64 ise)
      if (backdropUrl?.startsWith('data:') && pendingBackdrop) {
        setUploadProgress('📤 Arka plan görseli yükleniyor...');
        console.log('📤 [AddContent] Uploading backdrop...');
        try {
          backdropUrl = await uploadContentImage(
            pendingBackdrop.base64,
            pendingBackdrop.fileName,
            'backdrop'
          );
          console.log('✅ [AddContent] Backdrop uploaded:', backdropUrl);
        } catch (err: any) {
          console.error('❌ [AddContent] Backdrop upload failed:', err);
          toast.error('Arka plan görseli yüklenemedi: ' + err.message);
          setLoading(false);
          setUploadProgress('');
          return;
        }
      } else if (backdropUrl?.startsWith('data:') && !pendingBackdrop) {
        console.warn(
          '⚠️ [AddContent] Backdrop is base64 but pendingBackdrop is null - upload will be skipped!'
        );
      }

      // Screenshots upload (yeni olanlar için)
      const newScreenshots =
        formData.contentTypeId === '4'
          ? []
          : formData.screenshots.filter((s) => s.isNew && (s.base64 || s.file));
      if (newScreenshots.length > 0) {
        setUploadProgress(`📤 Ekran görüntüleri yükleniyor (0/${newScreenshots.length})...`);
        console.log(`📤 [AddContent] Uploading ${newScreenshots.length} screenshots...`);

        let completedCount = 0;
        const chunkSize = 3; // Upload 3 images at a time

        for (let i = 0; i < newScreenshots.length; i += chunkSize) {
          const chunk = newScreenshots.slice(i, i + chunkSize);

          try {
            await Promise.all(
              chunk.map(async (screenshot, chunkIndex) => {
                // JIT (Just In Time) Base64 conversion to avoid OOM
                let base64Data = screenshot.base64;
                if (!base64Data && screenshot.file) {
                  base64Data = await fileToBase64(screenshot.file);
                }

                const uploadedUrl = await uploadContentImage(
                  base64Data!,
                  screenshot.fileName ||
                    screenshot.file?.name ||
                    `screenshot-${i + chunkIndex + 1}.jpg`,
                  'screenshot'
                );

                // Eğer varsa ObjectURL belleğini temizle
                if (screenshot.imageUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(screenshot.imageUrl);
                }

                // Update the screenshot URL in formData
                const idx = formData.screenshots.findIndex((s) => s === screenshot);
                if (idx !== -1) {
                  formData.screenshots[idx] = {
                    ...formData.screenshots[idx],
                    imageUrl: uploadedUrl,
                    base64: undefined,
                    file: undefined,
                    fileName: undefined,
                    isNew: false,
                  };
                }

                completedCount++;
                setUploadProgress(
                  `📤 Ekran görüntüleri yükleniyor (${completedCount}/${newScreenshots.length})...`
                );
                console.log(
                  `✅ [AddContent] Screenshot ${i + chunkIndex + 1} uploaded:`,
                  uploadedUrl
                );
              })
            );
          } catch (err: any) {
            console.error(`❌ [AddContent] Screenshot chunk upload failed:`, err);
            toast.error(`Ekran görüntüleri yüklenemedi: ${err.message}`);
            setLoading(false);
            setUploadProgress('');
            return;
          }
        }
      }

      // Alternative Images upload (yeni olanlar için)
      const newImages = formData.images?.filter((img) => img.isNew && img.file) || [];
      if (newImages.length > 0) {
        setUploadProgress(`📤 Alternatif görseller yükleniyor (0/${newImages.length})...`);
        console.log(`📤 [AddContent] Uploading ${newImages.length} alternative images...`);

        let completedImagesCount = 0;
        const imgChunkSize = 3;

        for (let i = 0; i < newImages.length; i += imgChunkSize) {
          const chunk = newImages.slice(i, i + imgChunkSize);

          try {
            await Promise.all(
              chunk.map(async (img, chunkIndex) => {
                let base64Data = await fileToBase64(img.file!);
                if (img.type === 'backdrop')
                  base64Data = withImageFocus(base64Data, getImageFocus(img.filePath));
                const uploadedUrl = await uploadContentImage(
                  base64Data,
                  img.file?.name || `image-${i + chunkIndex + 1}.jpg`,
                  img.type === 'poster' ? 'poster' : 'backdrop'
                );

                if (img.filePath.startsWith('blob:')) {
                  URL.revokeObjectURL(img.filePath);
                }

                // Update the image URL in formData
                const idx = formData.images!.findIndex((s) => s === img);
                if (idx !== -1) {
                  formData.images![idx] = {
                    ...formData.images![idx],
                    filePath: uploadedUrl,
                    file: undefined,
                    isNew: false,
                  };
                }

                completedImagesCount++;
                setUploadProgress(
                  `📤 Alternatif görseller yükleniyor (${completedImagesCount}/${newImages.length})...`
                );
                console.log(
                  `✅ [AddContent] Alternative image ${i + chunkIndex + 1} uploaded:`,
                  uploadedUrl
                );
              })
            );
          } catch (err: any) {
            console.error(`❌ [AddContent] Alternative image chunk upload failed:`, err);
            toast.error(`Alternatif görseller yüklenemedi: ${err.message}`);
            setLoading(false);
            setUploadProgress('');
            return;
          }
        }
      }

      const publicationsWithPendingCover =
        formData.contentTypeId === '4'
          ? formData.bookPublications.filter((publication) => publication.coverBase64)
          : [];

      if (publicationsWithPendingCover.length > 0) {
        setUploadProgress(
          `Kitap yayin kapaklari yukleniyor (0/${publicationsWithPendingCover.length})...`
        );

        for (let i = 0; i < publicationsWithPendingCover.length; i++) {
          const publication = publicationsWithPendingCover[i];
          try {
            setUploadProgress(
              `Kitap yayin kapaklari yukleniyor (${i + 1}/${publicationsWithPendingCover.length})...`
            );

            const uploadedUrl = await uploadContentImage(
              publication.coverBase64!,
              publication.coverFileName || `book-publication-${i + 1}.jpg`,
              'poster'
            );

            const idx = formData.bookPublications.findIndex((item) => item === publication);
            if (idx !== -1) {
              formData.bookPublications[idx] = {
                ...formData.bookPublications[idx],
                coverUrl: uploadedUrl,
                coverBase64: undefined,
                coverFileName: undefined,
              };
            }
          } catch (err: any) {
            console.error(`[AddContent] Book publication cover ${i + 1} upload failed:`, err);
            toast.error(`Kitap yayin kapagi ${i + 1} yuklenemedi: ${err.message}`);
            setLoading(false);
            setUploadProgress('');
            return;
          }
        }
      }

      setUploadProgress('💾 İçerik kaydediliyor...');

      // === PHASE 2: Build input and save ===
      const { input, allScreenshots } = buildContentInput({
        formData,
        posterUrl: posterUrl || '',
        backdropUrl: backdropUrl || '',
        isEditMode,
      });
      const changedKeys =
        isEditMode && originalData
          ? compareFormData(originalData, formData).map((diff) => diff.key)
          : [];
      const patchInput = isEditMode && originalData ? buildPatchInput(input, changedKeys) : input;

      if (isEditMode && originalData) {
        console.log('PATCH INPUT TO SEND:', JSON.stringify(patchInput, null, 2));
      }

      const normalizedPayloadFormData = {
        ...formData,
        posterUrl,
        backdropUrl,
        screenshots: allScreenshots,
      };
      const contributionPayload = {
        ...buildChangedFormPayload(normalizedPayloadFormData, changedKeys),
        __updateInput: patchInput,
      };

      console.log('📤 [AddContent] Sending data:', isEditMode ? patchInput : input);

      // Normal kullanıcı için içerik talebi oluştur, admin/mod için direkt içerik oluştur
      if (!canDirectCreate && !isEditMode) {
        // Normal kullanıcı - talep olarak kaydet
        console.log('📝 [AddContent] Normal user - creating content request');
        const payload = {
          ...formData,
          // Ensure screenshots are persisted as uploaded-only list
          ...(allScreenshots.length > 0 ? { screenshots: allScreenshots } : {}),
        };
        const requestInput = {
          title: formData.title.trim(),
          contentTypeId: parseInt(formData.contentTypeId),
          description: formData.description.trim() || undefined,
          releaseDate: formData.releaseDate || undefined,
          reason: undefined,
          payload,
        };
        const requestResult = requestId
          ? await updateContentRequest(requestId, requestInput)
          : await createContentRequest(requestInput);

        if (requestResult.error) {
          console.error('❌ [AddContent] Content request failed:', requestResult.error);
          emitDebugEvent({
            level: 'error',
            scope: 'AddContent',
            message: 'Content request oluşturulamadı',
            data: requestResult.error,
          });
          toast.error('İçerik talebi gönderilemedi');
          return;
        }

        console.log('✅ [AddContent] Content request created');
        refreshPendingContentRequestsBadge();
        emitDebugEvent({
          level: 'success',
          scope: 'AddContent',
          message: 'Content request oluşturuldu',
          data: { requestId: requestResult.data?.id },
        });
        toast.success('🎉 İçerik talebiniz gönderildi! Onay bekliyor.');

        setTimeout(() => {
          router.push('/content-request' as any);
        }, 1500);
        return;
      }

      // Normal kullanıcı için içerik düzenleme talebi oluştur (Contribution)
      if (!canDirectCreate && isEditMode) {
        console.log('📝 [AddContent] Normal user - creating edit content contribution');
        const formPayload = originalData
          ? buildChangedFormPayload(normalizedPayloadFormData, changedKeys)
          : normalizedPayloadFormData;
        const payload = { ...formPayload, __updateInput: patchInput };

        if (Object.keys(formPayload).filter((key) => key !== 'contentTypeId').length === 0) {
          toast.error('Gönderilecek değişiklik bulunamadı');
          setLoading(false);
          setUploadProgress('');
          return;
        }

        try {
          if (contributionId && contributionStatus === 'PENDING') {
            await updateContribution({ variables: { id: contributionId, payload } });
          } else {
            await createContribution({
              variables: {
                type: 'EDIT_CONTENT',
                payload,
                contentId,
              },
            });
          }

          refreshPendingContentRequestsBadge();
          console.log('✅ [AddContent] Edit contribution created');
          emitDebugEvent({
            level: 'success',
            scope: 'AddContent',
            message: 'Edit contribution oluşturuldu',
          });
          toast.success('🎉 Düzenleme talebiniz gönderildi! Onay bekliyor.');

          setTimeout(() => {
            // Başarılı olduktan sonra içeriğe veya profile geri dön
            router.push('/content-request' as any);
          }, 1500);
          return;
        } catch (error) {
          console.error('❌ [AddContent] Edit contribution failed:', error);
          toast.error('Düzenleme talebi gönderilemedi');
          setLoading(false);
          setUploadProgress('');
          return;
        }
      }

      let result;
      if (isEditMode && contentId) {
        if (Object.keys(patchInput).length === 0) {
          toast.error('Kaydedilecek değişiklik bulunamadı');
          setLoading(false);
          setUploadProgress('');
          return;
        }
        console.log('✏️ [AddContent] Edit mode - calling updateContent');
        result = await updateContent(contentId as any, patchInput as any);
      } else {
        console.log('➕ [AddContent] Add mode - calling createContent');
        result = await createContent(input);
      }

      const { data, error } = result;

      if (error) {
        const action = isEditMode ? 'İçerik güncelleme' : 'İçerik oluşturma';
        console.error(`❌ [AddContent] ${action} başarısız:`, error);
        toast.error(`${action} başarısız oldu`);
        return;
      }

      const successMessage = isEditMode
        ? '✅ [AddContent] Content updated successfully'
        : '✅ [AddContent] Content created successfully';
      const successToast = isEditMode
        ? '📝 İçerik başarıyla güncellendi!'
        : '🎉 İçerik başarıyla oluşturuldu!';

      console.log(successMessage, data);
      toast.success(successToast);

      // Eğer bir talepten gelindiyse, talebi onayla
      if (requestId && !isEditMode) {
        console.log(
          '✅ [AddContent] Approving content request:',
          requestId,
          'with contentId:',
          data?.id
        );
        try {
          await approveContentRequest(requestId, data?.id);
          refreshPendingContentRequestsBadge();
          console.log('✅ [AddContent] Content request approved');
          toast.success('Talep onaylandı!');
        } catch (approveError) {
          console.error('⚠️ [AddContent] Failed to approve request:', approveError);
          // İçerik eklendi ama talep onaylanamadı - kritik değil
        }
      }

      // Eğer bir contribution (düzenleme) talebinden gelindiyse, onu onayla
      if (contributionId && isEditMode) {
        console.log('✅ [AddContent] Approving contribution request:', contributionId);
        try {
          await reviewContribution({
            variables: {
              id: contributionId,
              status: 'APPROVED',
              pointsEarned: 1, // Edit earns 1 point
              updatedPayload: contributionPayload,
            },
          });
          refreshPendingContentRequestsBadge();
          console.log('✅ [AddContent] Contribution approved');
          toast.success('Düzenleme talebi başarıyla onaylandı!');
        } catch (approveError) {
          console.error('⚠️ [AddContent] Failed to approve contribution:', approveError);
        }
      }

      // Başarıdan sonra content sayfasına yönlendir
      const savedContentId = isEditMode ? contentId : data?.id;

      // contentTypeId -> slug dönüşümü (URL'de /content/tv/ kullanılmalı, /content/2/ değil)
      const typeSlugMap: Record<string, string> = {
        '1': 'movie',
        '2': 'tv',
        '3': 'game',
        '4': 'book',
        '5': 'music',
      };
      const typeSlug = typeSlugMap[formData.contentTypeId] || 'movie';

      setTimeout(() => {
        if (savedContentId) {
          router.push(`/content/${typeSlug}/${savedContentId}`);
        } else {
          router.push('/explore');
        }
      }, 1500);

      resetForm();
    } catch (error) {
      console.error('❌ [AddContent] Exception:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return { handleSubmit };
}
