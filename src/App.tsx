import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './components/layout/MainLayout';
import LibraryView from './views/LibraryView';
import ReaderView from './views/ReaderView';
import ImportLessonView from './views/ImportLessonView';
import EditLessonView from './views/EditLessonView';
import ProfileView from './views/ProfileView';
import MetricsView from './views/MetricsView';
import LoginView from './views/LoginView';
import SignUpView from './views/SignUpView';
import { useReaderStore } from './store/useReaderStore';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  const { isAuthenticated, user, initializeAuth } = useAuthStore();
  const { languageCode, initializeUserState } = useReaderStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthenticated && user?.id && !languageCode) {
      // Peek at URL to see if we have a language prefix like /me/fa
      const match = window.location.pathname.match(/\/me\/([^/]+)/);
      const urlLang = match ? match[1] : undefined;
      
      initializeUserState(user.id, urlLang);
    }
  }, [isAuthenticated, user?.id, languageCode, initializeUserState]);

  const isSyncing = isAuthenticated && !languageCode;

  useEffect(() => {
    if (isSyncing) {
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    };
  }, [isSyncing]);

  if (isSyncing) {
      return (
          <div 
            className="fixed inset-0 z-[999] bg-[#F5F7F9] flex flex-col items-center justify-center gap-4 text-center p-6 select-none touch-none overscroll-none"
            style={{ touchAction: 'none' }}
            onTouchMove={(e) => e.preventDefault()}
          >
              <div className="w-12 h-12 border-4 border-[#3890fc] border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="text-gray-800 font-black text-lg">Synchronizing Profile...</p>
                <p className="text-gray-400 text-sm font-bold mt-1">Getting your language journey ready.</p>
              </div>
          </div>
      );
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route 
        path='/login'
        element={!isAuthenticated ? <LoginView /> : <Navigate to={`/me/${languageCode || 'en'}`} />} 
      />

      <Route 
        path='/signup'
        element={!isAuthenticated ? <SignUpView /> : <Navigate to={`/me/${languageCode || 'en'}`} />} 
      />

      <Route 
        path="/me/:lang" 
        element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
      >
         <Route index element={<Navigate to="library" replace />} />
         <Route path="library/*" element={<LibraryView />} />
         <Route path="my-lessons/*" element={<LibraryView />} />
         <Route path="vocabulary/*" element={<LibraryView />} />
         <Route path="course/:courseId" element={<LibraryView />} />

         <Route path="reader/:lessonId" element={<ReaderView />} />
         <Route path="import" element={<ImportLessonView />} />
         <Route path="import/edit/:lessonId" element={<EditLessonView />} />
         <Route path="metrics" element={<MetricsView />} />
         <Route path="profile" element={<ProfileView />} />
      </Route>

      <Route path="/" element={<Navigate to={`/me/${languageCode || 'en'}`} replace />} />
    </Routes>
    </>
  );
}