import React from 'react';
import { Hand } from 'lucide-react';

const EMOJIS = ['👏', '👍', '❤️', '🎉', '💡', '🎓', '🔥', '🙌'];

export default function ReactionsMenu({
  isOpen,
  onClose,
  onSendReaction,
  isHandRaised,
  onToggleHand
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-24 z-40 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-3 shadow-2xl animate-in zoom-in-95 duration-150">
      <div className="flex items-center gap-1.5 mb-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSendReaction(emoji);
              onClose();
            }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl hover:bg-slate-100 hover:scale-125 transition-all active:scale-95"
            title={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 flex justify-center">
        <button
          onClick={() => {
            onToggleHand();
            onClose();
          }}
          className={`w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            isHandRaised
              ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Hand className="w-4 h-4" />
          <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand 🙋‍♂️'}</span>
        </button>
      </div>
    </div>
  );
}
