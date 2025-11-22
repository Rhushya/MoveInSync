import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Vendors from './pages/Vendors'
import Trips from './pages/Trips'
import Invoices from './pages/Invoices'
import Reports from './pages/Reports'
import BillingModels from './pages/BillingModels'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/clients"
          element={
            <ProtectedRoute roles={['admin', 'finance', 'operations']}>
              <Clients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors"
          element={
            <ProtectedRoute roles={['admin', 'finance', 'operations']}>
              <Vendors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips"
          element={
            <ProtectedRoute roles={['admin', 'vendor', 'operations']}>
              <Trips />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute roles={['admin', 'finance']}>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing-models"
          element={
            <ProtectedRoute roles={['admin', 'finance']}>
              <BillingModels />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['admin', 'finance', 'operations']}>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
