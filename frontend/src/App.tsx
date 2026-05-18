import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Home } from '@/routes/Home'
import { ModulePage } from '@/routes/ModulePage'
import { LessonPage } from '@/routes/LessonPage'
import { QuizPage } from '@/routes/QuizPage'
import { LabIndex, LabPage } from '@/routes/LabPage'
import { ProgressPage } from '@/routes/ProgressPage'

function App() {
  // Strip trailing slash so basename matches the URL exactly.
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/modulo/:moduleId" element={<ModulePage />} />
          <Route
            path="/modulo/:moduleId/lezione/:lessonSlug"
            element={<LessonPage />}
          />
          <Route path="/modulo/:moduleId/quiz" element={<QuizPage />} />
          <Route path="/lab" element={<LabIndex />} />
          <Route path="/lab/:slug" element={<LabPage />} />
          <Route path="/progressi" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
