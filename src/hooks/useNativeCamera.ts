import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export const useNativeCamera = () => {
  const isNative = Capacitor.isNativePlatform();

  const takePhoto = async (): Promise<{ file: File | null; dataUrl: string | null }> => {
    if (!isNative) {
      return { file: null, dataUrl: null };
    }

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
      });

      if (image.dataUrl) {
        // Convert data URL to File
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        return { file, dataUrl: image.dataUrl };
      }

      return { file: null, dataUrl: null };
    } catch (error) {
      console.error('Camera error:', error);
      return { file: null, dataUrl: null };
    }
  };

  const pickFromGallery = async (): Promise<{ file: File | null; dataUrl: string | null }> => {
    if (!isNative) {
      return { file: null, dataUrl: null };
    }

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (image.dataUrl) {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        return { file, dataUrl: image.dataUrl };
      }

      return { file: null, dataUrl: null };
    } catch (error) {
      console.error('Gallery error:', error);
      return { file: null, dataUrl: null };
    }
  };

  return { isNative, takePhoto, pickFromGallery };
};
