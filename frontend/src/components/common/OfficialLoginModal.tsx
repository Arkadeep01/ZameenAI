// import React, { useEffect } from 'react';
// import { X } from 'lucide-react';
// import ZameenLogin from './Zameenlogin';
// import ZameenSignup from './Zameensignup';

// interface OfficialLoginModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   view: 'login' | 'signup';
//   onViewChange: (view: 'login' | 'signup') => void;
// }

// export default function OfficialLoginModal({
//   isOpen,
//   onClose,
//   view,
//   onViewChange,
// }: OfficialLoginModalProps) {
//   // Close on Escape
//   useEffect(() => {
//     if (!isOpen) return;
//     const handleKey = (e: KeyboardEvent) => {
//       if (e.key === 'Escape') onClose();
//     };
//     window.addEventListener('keydown', handleKey);
//     return () => window.removeEventListener('keydown', handleKey);
//   }, [isOpen, onClose]);

//   // Lock background scroll while open
//   useEffect(() => {
//     if (!isOpen) return;
//     const original = document.body.style.overflow;
//     document.body.style.overflow = 'hidden';
//     return () => {
//       document.body.style.overflow = original;
//     };
//   }, [isOpen]);

//   if (!isOpen) return null;

//   return (
//     <div
//       className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
//       role="dialog"
//       aria-modal="true"
//       onClick={(e) => {
//         if (e.target === e.currentTarget) onClose();
//       }}
//     >
//       <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
//         <button
//           type="button"
//           onClick={onClose}
//           aria-label="Close"
//           className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
//         >
//           <X className="h-4 w-4" />
//         </button>

//         {view === 'login' ? (
//           <ZameenLogin onSwitchToSignup={() => onViewChange('signup')} />
//         ) : (
//           <ZameenSignup onSwitchToLogin={() => onViewChange('login')} />
//         )}
//       </div>
//     </div>
//   );
// }

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import ZameenLogin from './Zameenlogin';
import ZameenSignup from './Zameensignup';

type UserType = 'government' | 'citizen';

interface OfficialLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  view: 'login' | 'signup';
  onViewChange: (view: 'login' | 'signup') => void;
  /** Called once the demo login or signup flow completes successfully. */
  onAuthSuccess?: (userType: UserType) => void;
}

export default function OfficialLoginModal({
  isOpen,
  onClose,
  view,
  onViewChange,
  onAuthSuccess,
}: OfficialLoginModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Lock background scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginSuccess = (userType: UserType) => {
    onAuthSuccess?.(userType);
    onClose();
  };

  const handleSignupSuccess = (_userType: UserType) => {
    // After a demo signup, drop the user back on the login screen
    // rather than auto-authenticating them.
    onViewChange('login');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {view === 'login' ? (
          <ZameenLogin
            onSwitchToSignup={() => onViewChange('signup')}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <ZameenSignup
            onSwitchToLogin={() => onViewChange('login')}
            onSignupSuccess={handleSignupSuccess}
          />
        )}
      </div>
    </div>
  );
}