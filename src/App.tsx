import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './components/layout/MainLayout';
import LibraryView from './views/LibraryView';
import ReaderView from './views/ReaderView';
import ImportLessonView from './views/ImportLessonView';
import EditLessonView from './views/EditLessonView';
import ProfileView from './views/ProfileView';
import LoginView from './views/LoginView';
import SignUpView from './views/SignUpView';
import { useReaderStore } from './store/useReaderStore';
import { useEffect } from 'react';

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

  if (isAuthenticated && !languageCode) {
      return (
          <div className="min-h-screen bg-[#F5F7F9] flex flex-col items-center justify-center gap-4 text-center p-6 animate-pulse">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="text-gray-800 font-black text-lg">Synchronizing Profile...</p>
                <p className="text-gray-400 text-sm font-bold mt-1">Getting your language journey ready.</p>
              </div>
          </div>
      );
  }

  return (
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
         <Route path="profile" element={<ProfileView />} />
      </Route>

      <Route path="/" element={<Navigate to={`/me/${languageCode || 'en'}`} replace />} />
    </Routes>
  );
}