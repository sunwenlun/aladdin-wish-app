'use client';

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface MediaUploaderProps {
  imageUrl: string | null;
  voiceUrl: string | null;
  onImageChange: (url: string | null) => void;
  onVoiceChange: (url: string | null) => void;
  isZh: boolean;
}

export default function MediaUploader({
  imageUrl,
  voiceUrl,
  onImageChange,
  onVoiceChange,
  isZh,
}: MediaUploaderProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== 图片上传 =====
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证：仅图片，最大5MB
    if (!file.type.startsWith('image/')) {
      alert(isZh ? '请上传图片文件' : 'Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(isZh ? '图片不能超过5MB' : 'Image must be under 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `wish-fulfill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data, error } = await supabase.storage
        .from('wish-media')
        .upload(fileName, file, { contentType: file.type });

      if (error) {
        console.error('Upload error:', error);
        alert(isZh ? '图片上传失败，请重试' : 'Upload failed, please try again');
      } else {
        // 获取公开URL
        const { data: urlData } = supabase.storage
          .from('wish-media')
          .getPublicUrl(fileName);
        onImageChange(urlData.publicUrl);
      }
    } catch (err) {
      console.error('Image upload error:', err);
      alert(isZh ? '图片上传失败' : 'Upload failed');
    }
    setUploadingImage(false);
    // 重置input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ===== 语音录制 =====
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());

        if (audioBlob.size < 1000) {
          // 太短，忽略
          return;
        }

        // 上传
        setUploadingVoice(true);
        const fileName = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webm`;
        const { error } = await supabase.storage
          .from('wish-media')
          .upload(fileName, audioBlob, { contentType: 'audio/webm' });

        if (error) {
          console.error('Voice upload error:', error);
          alert(isZh ? '语音上传失败' : 'Voice upload failed');
        } else {
          const { data: urlData } = supabase.storage
            .from('wish-media')
            .getPublicUrl(fileName);
          onVoiceChange(urlData.publicUrl);
        }
        setUploadingVoice(false);
      };

      recorder.start();
      setRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => {
        setRecordTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      alert(isZh ? '无法访问麦克风，请检查权限' : 'Cannot access microphone');
    }
  }, [isZh, onVoiceChange]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  return (
    <div className="space-y-3">
      {/* ===== 图片上传 ===== */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">
          {isZh ? '📷 上传图片（可选）' : '📷 Upload Image (optional)'}
        </label>
        {imageUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-white/10">
            <img src={imageUrl} alt="upload" className="w-full max-h-48 object-cover" />
            <button
              onClick={() => onImageChange(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-full py-6 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] text-gray-500 text-xs hover:border-amber-400/30 hover:text-gray-400 transition-all disabled:opacity-50"
          >
            {uploadingImage
              ? (isZh ? '上传中...' : 'Uploading...')
              : (isZh ? '点击上传图片（JPG/PNG，最大5MB）' : 'Click to upload (JPG/PNG, max 5MB)')}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* ===== 语音录制 ===== */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">
          {isZh ? '🎤 录制语音（可选，最长60秒）' : '🎤 Record Voice (optional, max 60s)'}
        </label>
        {voiceUrl ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
            <audio src={voiceUrl} controls className="flex-1 h-8" />
            <button
              onClick={() => onVoiceChange(null)}
              className="w-7 h-7 rounded-full bg-white/10 text-white text-xs flex items-center justify-center hover:bg-white/20"
            >
              ✕
            </button>
          </div>
        ) : recording ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-mono">
                {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex-1 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30"
            >
              {isZh ? '⏹ 停止录制' : '⏹ Stop'}
            </button>
          </div>
        ) : (
          <button
            onClick={startRecording}
            disabled={uploadingVoice}
            className="w-full py-4 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] text-gray-500 text-xs hover:border-violet-400/30 hover:text-gray-400 transition-all disabled:opacity-50"
          >
            {uploadingVoice
              ? (isZh ? '上传中...' : 'Uploading...')
              : (isZh ? '🎤 点击开始录音' : '🎤 Click to start recording')}
          </button>
        )}
      </div>
    </div>
  );
}
