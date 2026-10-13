import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';
import type { ImageCropModalProps } from './ImageCropModal';
import ImageUploadField from './ImageUploadField';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/image', () => ({
  default: ({
    fill,
    unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => {
    void fill;
    void unoptimized;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));
vi.mock('./ImageCropModal', () => ({
  default: ({ onCropComplete, initialFocus }: ImageCropModalProps) => (
    <button
      type="button"
      onClick={() => onCropComplete('data:image/png;base64,iVBORw==#focus=50,100')}
    >
      Save alignment from {initialFocus?.x},{initialFocus?.y}
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('saved backdrop alignment', () => {
  it('keeps the saved URL and restores its focus without scheduling another upload', async () => {
    const source = 'https://media.example.test/original.png';
    const fetchImage = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
    });
    vi.stubGlobal('fetch', fetchImage);
    const onChange = vi.fn();
    const onPendingUpload = vi.fn();
    render(
      <ImageUploadField
        label="Backdrop"
        name="backdropUrl"
        imageType="backdrop"
        value={`${source}#focus=25,75`}
        onChange={onChange}
        onPendingUpload={onPendingUpload}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'updateAlignment' }));
    const saveButton = await screen.findByRole('button', { name: 'Save alignment from 25,75' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(`${source}#focus=50,100`));
    expect(fetchImage).toHaveBeenCalledExactlyOnceWith(
      `/api/proxy-image?url=${encodeURIComponent(source)}`
    );
    expect(onPendingUpload).toHaveBeenCalledExactlyOnceWith(null);
  });
});
