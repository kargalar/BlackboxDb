import { create } from 'zustand';
import { AddContentFormData, INITIAL_FORM_DATA } from '@/app/add-content/types';
import { PendingImageUpload } from '@/components/molecules/ImageUploadField';

interface AddContentState {
  formData: AddContentFormData;
  pendingPoster: PendingImageUpload | null;
  pendingBackdrop: PendingImageUpload | null;
  contentId: string | null;
  requestId: number | null;
  contributionId: number | null;

  // Actions
  setFormData: (
    data: AddContentFormData | ((prev: AddContentFormData) => AddContentFormData)
  ) => void;
  updateFormField: <K extends keyof AddContentFormData>(
    field: K,
    value: AddContentFormData[K]
  ) => void;
  setPendingPoster: (poster: PendingImageUpload | null) => void;
  setPendingBackdrop: (backdrop: PendingImageUpload | null) => void;
  setContentId: (id: string | null) => void;
  setRequestId: (id: number | null) => void;
  setContributionId: (id: number | null) => void;
  resetForm: () => void;
}

export const useAddContentStore = create<AddContentState>((set) => ({
  formData: INITIAL_FORM_DATA,
  pendingPoster: null,
  pendingBackdrop: null,
  contentId: null,
  requestId: null,
  contributionId: null,

  setFormData: (data: AddContentFormData | ((prev: AddContentFormData) => AddContentFormData)) =>
    set((state: AddContentState) => ({
      formData: typeof data === 'function' ? data(state.formData) : data,
    })),

  updateFormField: <K extends keyof AddContentFormData>(field: K, value: AddContentFormData[K]) =>
    set((state: AddContentState) => ({
      formData: {
        ...state.formData,
        [field]: value,
      },
    })),

  setPendingPoster: (poster: PendingImageUpload | null) => set({ pendingPoster: poster }),
  setPendingBackdrop: (backdrop: PendingImageUpload | null) => set({ pendingBackdrop: backdrop }),
  setContentId: (id: string | null) => set({ contentId: id }),
  setRequestId: (id: number | null) => set({ requestId: id }),
  setContributionId: (id: number | null) => set({ contributionId: id }),

  resetForm: () =>
    set({
      formData: INITIAL_FORM_DATA,
      pendingPoster: null,
      pendingBackdrop: null,
      contentId: null,
      requestId: null,
      contributionId: null,
    }),
}));
