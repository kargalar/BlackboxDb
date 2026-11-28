import { useTranslations as useUiTranslations } from 'next-intl';
import React, { useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { X, Upload, CheckCircle, Image as ImageIcon, Monitor } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const GET_CONTENT_IMAGES = gql`
  query GetContentImages($contentId: String!, $contentType: String!) {
    content(id: $contentId, contentType: $contentType) {
      id
      posterImageId
      backdropImageId
      images {
        id
        type
        filePath
      }
    }
    me {
      id
      userContentPreferences(where: { contentId: { equals: $contentId } }) {
        posterImageId
        backdropImageId
      }
    }
  }
`;

const UPLOAD_ALTERNATIVE_IMAGE = gql`
  mutation UploadAlternativeContentImage($file: Upload!, $contentId: String!, $type: String!) {
    uploadAlternativeContentImage(file: $file, contentId: $contentId, type: $type) {
      id
      filePath
      type
    }
  }
`;

const SET_DEFAULT_IMAGE = gql`
  mutation SetContentDefaultImage($contentId: String!, $imageId: Int!, $type: String!) {
    setContentDefaultImage(contentId: $contentId, imageId: $imageId, type: $type)
  }
`;

const SET_USER_PREFERENCE = gql`
  mutation SetUserContentPreference(
    $contentId: String!
    $posterImageId: Int
    $backdropImageId: Int
  ) {
    setUserContentPreference(
      contentId: $contentId
      posterImageId: $posterImageId
      backdropImageId: $backdropImageId
    )
  }
`;

const DELETE_IMAGE = gql`
  mutation DeleteContentImage($imageId: Int!) {
    deleteContentImage(imageId: $imageId)
  }
`;

interface ManageImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: string;
  contentTitle: string;
}

export default function ManageImagesModal({
  isOpen,
  onClose,
  contentId,
  contentType,
  contentTitle,
}: ManageImagesModalProps) {
  const translateUi = useUiTranslations('Ui');
  const [activeTab, setActiveTab] = useState<'poster' | 'backdrop'>('poster');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingFromScreenshot, setIsUploadingFromScreenshot] = useState(false);
  const { user } = useAuth();
  const isAdminOrMod = user?.isAdmin || user?.isModerator;

  const { data, loading, refetch } = useQuery<any>(GET_CONTENT_IMAGES, {
    variables: { contentId, contentType },
    skip: !isOpen,
    fetchPolicy: 'network-only',
  });

  const [uploadAlternativeImage] = useMutation(UPLOAD_ALTERNATIVE_IMAGE, {
    onCompleted: () => refetch(),
  });
  const [setContentDefaultImage] = useMutation(SET_DEFAULT_IMAGE, {
    onCompleted: () => refetch(),
  });
  const [setUserPreference] = useMutation(SET_USER_PREFERENCE, {
    onCompleted: () => refetch(),
  });
  const [deleteImage] = useMutation(DELETE_IMAGE, {
    onCompleted: () => refetch(),
  });

  if (!isOpen) return null;

  const content = data?.content;
  const userPref = data?.me?.userContentPreferences?.[0] || {};

  const images = (content?.images || []).filter((img: any) => img.type === activeTab);
  const screenshotImages = (content?.images || []).filter((img: any) => img.type === 'screenshot');
  const defaultImageId = activeTab === 'poster' ? content?.posterImageId : content?.backdropImageId;
  const myPrefImageId = activeTab === 'poster' ? userPref.posterImageId : userPref.backdropImageId;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await uploadAlternativeImage({
        variables: {
          file,
          contentId,
          type: activeTab,
        },
      });
      toast.success(translateUi("resim_basariyla_yuklendi_9789ac4"));
    } catch (error) {
      console.error(error);
      toast.error(translateUi("resim_yuklenirken_bir_hata_olustu_8363728"));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSetDefault = async (imageId: number) => {
    try {
      await setContentDefaultImage({ variables: { contentId, imageId, type: activeTab } });
      toast.success(translateUi("varsayilan_resim_guncellendi_0f3de76"));
    } catch (error) {
      console.error(error);
      toast.error(translateUi("varsayilan_resim_guncellenemedi_e6041a7"));
    }
  };

  const handleSetMyProfile = async (imageId: number) => {
    try {
      const isRemoving = myPrefImageId === imageId;

      const newPosterPref =
        activeTab === 'poster' ? (isRemoving ? null : imageId) : userPref.posterImageId;
      const newBackdropPref =
        activeTab === 'backdrop' ? (isRemoving ? null : imageId) : userPref.backdropImageId;

      await setUserPreference({
        variables: {
          contentId,
          posterImageId: newPosterPref,
          backdropImageId: newBackdropPref,
        },
      });
      toast.success(
        isRemoving ? translateUi("profil_secimi_kaldirildi_2cca937") : translateUi("profiliniz_icin_bhu_resim_ayarlandi_0cb552b")
      );
    } catch (error) {
      console.error(error);
      toast.error(translateUi("profil_tercihi_guncellenemedi_45d0736"));
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!window.confirm(translateUi("bu_resmi_silmek_istediginize_emin_misiniz_8194a69"))) return;
    try {
      if (imageId === defaultImageId) {
        toast.error(translateUi("once_baska_bir_resmi_varsayilan_yapmalisiniz_f781d9b"));
        return;
      }
      await deleteImage({ variables: { imageId } });
      toast.success(translateUi("resim_silindi_5e6083f"));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || translateUi("resim_silinemedi_4a6b485"));
    }
  };

  const handleUseScreenshotAsBackdrop = async (screenshotFilePath: string) => {
    try {
      setIsUploadingFromScreenshot(true);

      // Fetch the screenshot image via proxy
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(screenshotFilePath)}`;
      const res = await fetch(proxyUrl);

      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.statusText}`);
      }

      const blob = await res.blob();
      const fileName = screenshotFilePath.split('/').pop() || 'screenshot-as-backdrop.jpg';
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

      await uploadAlternativeImage({
        variables: {
          file,
          contentId,
          type: 'backdrop',
        },
      });
      toast.success(translateUi("ekran_goruntusu_arkaplan_olarak_eklendi_c6413cb"));
    } catch (error) {
      console.error(error);
      toast.error(translateUi("ekran_goruntusu_arkaplan_olarak_eklenemedi_c784d0a"));
    } finally {
      setIsUploadingFromScreenshot(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-gray-900 border border-white/10 rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">{translateUi("resimleri_yonet_904b4aa") + " "} {contentTitle}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {translateUi("alternatif_kapak_ve_arkaplan_resimleri_ekleyin_1bec9c6")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex px-6 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab('poster')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'poster' ? 'border-primary-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {translateUi("kapaklar_poster_80dc9f6")}
          </button>
          <button
            onClick={() => setActiveTab('backdrop')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'backdrop' ? 'border-primary-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {translateUi("arkaplanlar_backdrop_40b7fb0")}
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-primary-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">
                  {translateUi("ekli_2a2df47") + " "} {activeTab === 'poster' ? translateUi("kapak_5a09c04") : translateUi("arkaplan_bf00a80")} {" " + translateUi("resimleri_e7f6249")}
                </h3>
                {isAdminOrMod && (
                  <div>
                    <label className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors disabled:opacity-50">
                      <Upload className="w-4 h-4" />
                      {isUploading ? translateUi("yukleniyor_317109f") : translateUi("yeni_yukle_a86e14f")}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                )}
              </div>

              {images.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 border-dashed">
                  <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">{translateUi("henuz_hic_resim_eklenmemis_5fff220")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((img: any) => (
                    <div
                      key={img.id}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-colors ${img.id === defaultImageId ? 'border-primary-500' : 'border-transparent'}`}
                    >
                      <Image
                        src={img.filePath}
                        alt={translateUi("content_4f9be05")}
                        width={activeTab === 'poster' ? 640 : 1280}
                        height={activeTab === 'poster' ? 960 : 720}
                        unoptimized
                        className={`w-full object-cover ${activeTab === 'poster' ? 'aspect-[2/3]' : 'aspect-video'}`}
                      />

                      {img.id === defaultImageId && (
                        <div className="absolute top-2 left-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-md font-medium shadow-md">
                          {translateUi("herkese_acik_varsayilan_b04e4f5")}
                        </div>
                      )}

                      {img.id === myPrefImageId && (
                        <div
                          className="absolute top-2 right-2 bg-purple-500 text-white p-1 rounded-full shadow-md"
                          title={translateUi("benim_profilim_8bc29a4")}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-2">
                        {img.id !== defaultImageId && isAdminOrMod && (
                          <button
                            onClick={() => handleSetDefault(img.id)}
                            className="w-full text-xs bg-white/10 hover:bg-primary-500 text-white py-1.5 rounded transition-colors"
                          >
                            {translateUi("varsayilan_yap_59f76d5")}
                          </button>
                        )}
                        <button
                          onClick={() => handleSetMyProfile(img.id)}
                          className={`w-full text-xs py-1.5 rounded transition-colors ${img.id === myPrefImageId ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-white/10 hover:bg-purple-500 text-white'}`}
                        >
                          {img.id === myPrefImageId
                            ? translateUi("benim_profilim_kaldir_0b17f9c")
                            : translateUi("sadece_benim_profilimde_6ec76dc")}
                        </button>
                        {img.id !== defaultImageId && isAdminOrMod && (
                          <button
                            onClick={() => handleDelete(img.id)}
                            className="w-full text-xs bg-red-500/80 hover:bg-red-600 text-white py-1.5 rounded transition-colors"
                          >
                            {translateUi("sil_353ad5e")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Screenshot to Backdrop section - only in backdrop tab */}
              {activeTab === 'backdrop' && screenshotImages.length > 0 && isAdminOrMod && (
                <div className="mt-8">
                  <div className="mb-4 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-medium text-white">{translateUi("ekran_goruntulerinden_sec_7bc0395")}</h3>
                    <span className="text-sm text-gray-400">({screenshotImages.length})</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    {translateUi("mevcut_ekran_goruntulerinden_birini_arkaplan_olarak_7b975d9")}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {screenshotImages.map((img: any) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => handleUseScreenshotAsBackdrop(img.filePath)}
                        disabled={isUploadingFromScreenshot}
                        className="relative group rounded-xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all duration-200 disabled:opacity-50"
                      >
                        <Image
                          src={img.filePath}
                          alt={translateUi("screenshot_60c152d")}
                          width={1280}
                          height={720}
                          unoptimized
                          className="w-full object-cover aspect-video"
                        />
                        <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/30 transition-colors duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-900/90 rounded-full px-3 py-1.5 shadow-lg text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            {translateUi("arkaplan_olarak_kullan_2f91d3a")}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {isUploadingFromScreenshot && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
                      <div className="w-4 h-4 border-2 border-emerald-400 rounded-full animate-spin border-t-transparent"></div>
                      {translateUi("ekran_goruntusu_arkaplan_olarak_yukleniyor_c0279db")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
