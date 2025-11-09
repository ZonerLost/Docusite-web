import React, { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { XIcon, PlusIcon, TrashIcon } from 'lucide-react';

interface AddPicturesWithNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (pictures: File[], note: string) => void;
}

const AddPicturesWithNotesModal: React.FC<AddPicturesWithNotesModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [pictures, setPictures] = useState<File[]>([]);
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const capturedBlobRef = useRef<Blob | null>(null);

  const stopStream = () => {
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    streamRef.current = null;
  };
  const revokeCaptured = () => {
    if (capturedUrl) {
      try { URL.revokeObjectURL(capturedUrl); } catch {}
      setCapturedUrl(null);
    }
    capturedBlobRef.current = null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: File[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) {
          setError('Unsupported file type. Please select an image.');
          continue;
        }
        if (f.size > 10 * 1024 * 1024) {
          setError('File too large. Max 10MB.');
          continue;
        }
        newFiles.push(f);
      }
      if (newFiles.length) setPictures(prev => [...prev, ...newFiles]);
      setChoiceOpen(false);
      setError(null);
    }
  };

  const removePicture = (index: number) => {
    setPictures(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPictures = () => {
    setChoiceOpen(v => !v);
  };

  const openCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShowCamera(true);
      setChoiceOpen(false);
    } catch (e) {
      // Permission denied / unsupported → fallback to picker
      fileInputRef.current?.click();
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 480;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b || new Blob()), 'image/jpeg', 0.92));
    stopStream();
    revokeCaptured();
    const url = URL.createObjectURL(blob);
    capturedBlobRef.current = blob;
    setCapturedUrl(url);
  };

  const useCapturedPhoto = () => {
    const blob = capturedBlobRef.current;
    if (!blob) return;
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
    setPictures(prev => [...prev, file]);
    revokeCaptured();
    setShowCamera(false);
  };

  const retakePhoto = () => {
    revokeCaptured();
    openCamera();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (capturedUrl) {
      setError('Please tap "Use Photo" to add the captured image, or close camera.');
      return;
    }
    if (pictures.length === 0) {
      setError('Please add at least one image.');
      return;
    }
    onAdd(pictures, note.trim());
    setPictures([]);
    setNote('');
    setError(null);
    stopStream();
    revokeCaptured();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      revokeCaptured();
      setChoiceOpen(false);
      return;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Add Pictures with notes</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Add your pictures & notes to this annotation.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Pictures Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pictures
            </label>
            <div className="flex flex-wrap gap-2 mb-2 relative">
              {pictures.map((picture, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(picture)}
                    alt={`Preview ${index + 1}`}
                    className="w-16 h-16 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removePicture(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-700"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPictures}
                ref={plusBtnRef}
                className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <PlusIcon className="w-6 h-6 text-blue-500" />
              </button>
              {choiceOpen && (
                <div
                  className="absolute z-50 bg-white border border-border-gray rounded-md shadow-lg p-2"
                  style={{ left: (plusBtnRef.current?.offsetLeft || 0), top: (plusBtnRef.current?.offsetTop || 0) + 72 }}
                >
                  <div className="flex flex-col gap-1">
                    <button type="button" className="px-2 py-1 text-sm text-black hover:bg-blue-600 rounded text-left" onClick={openCamera}>Take Photo (Camera)</button>
                    <button type="button" className="px-2 py-1 text-sm text-black hover:bg-blue-600 rounded text-left" onClick={() => { setChoiceOpen(false); fileInputRef.current?.click(); }}>Upload from device</button>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
          </div>

          {/* Notes Section */}
          <div className="mb-4">
            <Textarea
              label="Notes"
              placeholder="Lorem ipsum ipsum dolor @kevinbacker"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="w-full">
            <Button 
              type="submit" 
              variant="primary"
              size="md"
              className="w-full"
            >
              Add
            </Button>
          </div>
        </form>

        {/* Camera overlay inside modal */}
        {showCamera && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-50 p-4">
            {!capturedUrl ? (
              <video ref={videoRef} className="w-full rounded border" playsInline muted />
            ) : (
              <img src={capturedUrl} alt="Captured preview" className="w-full rounded border" />
            )}
            <div className="flex gap-2 w-full">
              {!capturedUrl && (
                <Button type="button" variant="primary" className="flex-1" onClick={capturePhoto}>Capture</Button>
              )}
              {capturedUrl && (
                <>
                  <Button type="button" variant="secondary" className="flex-1" onClick={retakePhoto}>Retake</Button>
                  <Button type="button" variant="primary" className="flex-1" onClick={useCapturedPhoto}>Use Photo</Button>
                </>
              )}
              <Button type="button" variant="ghost" className="flex-1" onClick={() => { stopStream(); revokeCaptured(); setShowCamera(false); }}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPicturesWithNotesModal;
