import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { toast } from 'sonner';

export const useBarcodeScanner = () => {
  const isNative = Capacitor.isNativePlatform();

  const checkPermissions = async (): Promise<boolean> => {
    if (!isNative) return false;

    try {
      const { camera } = await BarcodeScanner.checkPermissions();
      
      if (camera === 'granted') {
        return true;
      }
      
      if (camera === 'denied') {
        toast.error('Camera permission denied. Please enable in settings.');
        return false;
      }
      
      // Request permission
      const result = await BarcodeScanner.requestPermissions();
      return result.camera === 'granted';
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  };

  const scanBarcode = async (): Promise<string | null> => {
    if (!isNative) {
      toast.error('Barcode scanning is only available on mobile devices');
      return null;
    }

    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      return null;
    }

    try {
      // Check if Google Barcode Scanner module is available
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      
      if (!available) {
        toast.info('Installing barcode scanner module...');
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        toast.success('Scanner module installed!');
      }

      // Start scanning
      const { barcodes } = await BarcodeScanner.scan({
        formats: [
          BarcodeFormat.QrCode,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.DataMatrix,
        ],
      });

      if (barcodes.length > 0) {
        const scannedValue = barcodes[0].rawValue;
        toast.success('Barcode scanned successfully!');
        return scannedValue || null;
      }

      return null;
    } catch (error: any) {
      console.error('Scan error:', error);
      
      if (error?.message?.includes('canceled')) {
        // User cancelled - no toast needed
        return null;
      }
      
      toast.error('Failed to scan barcode. Please try again.');
      return null;
    }
  };

  return { isNative, scanBarcode, checkPermissions };
};
