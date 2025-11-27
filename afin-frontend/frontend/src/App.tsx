import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import ProcessModels from './pages/ProcessModels'
import ProcessEditor from './pages/ProcessEditor'
import Simulations from './pages/Simulations'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'
import AiAnalysis from './pages/AiAnalysis'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/process-models"
            element={
              <PrivateRoute>
                <ProcessModels />
              </PrivateRoute>
            }
          />
          <Route
            path="/process-models/:id/edit"
            element={
              <PrivateRoute>
                <ProcessEditor />
              </PrivateRoute>
            }
          />
          <Route
            path="/simulations"
            element={
              <PrivateRoute>
                <Simulations />
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Analytics />
              </PrivateRoute>
            }
          />
          <Route
            path="/ai-analysis"
            element={
              <PrivateRoute>
                <AiAnalysis />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

