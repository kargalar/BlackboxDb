import React, { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { CREATE_REPORT } from '@/services/graphql/report';
import { X } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: string;
  targetTitle: string;
}

const REPORT_REASONS = [
  'Uygunsuz İçerik (Küfür, hakaret vb.)',
  'Yanıltıcı/Spam Bilgi',
  'Telif Hakkı İhlali',
  'Nefret Söylemi',
  'Diğer',
];

export default function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetTitle,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [createReport, { loading }] = useMutation(CREATE_REPORT);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalReason = selectedReason === 'Diğer' ? `Diğer: ${customReason}` : selectedReason;

    try {
      await createReport({
        variables: {
          targetType: targetType,
          targetId: targetId,
          reason: finalReason,
        },
      });
      alert(
        'Raporunuz başarıyla gönderildi. İnceleme ekiplerimiz en kısa sürede değerlendirecektir.'
      );
      onClose();
      setSelectedReason(REPORT_REASONS[0]);
      setCustomReason('');
    } catch (error) {
      console.error('Rapor gönderilirken hata oluştu:', error);
      alert('Raporunuz gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-red-500">Raporla</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            <span className="font-semibold text-white">{targetTitle}</span> ile ilgili kurallarımıza
            aykırı bir durum olduğunu düşünüyorsanız lütfen bildirin.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Raporlama Nedeni
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-4 h-4 text-red-500 bg-gray-800 border-gray-600 focus:ring-red-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-gray-300">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason === 'Diğer' && (
              <div>
                <label
                  htmlFor="customReason"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Lütfen detaylı açıklayın:
                </label>
                <textarea
                  id="customReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Raporlama nedeninizi detaylı bir şekilde açıklayın..."
                  rows={3}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || (selectedReason === 'Diğer' && !customReason.trim())}
                className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                {loading ? 'Gönderiliyor...' : 'Raporla'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
