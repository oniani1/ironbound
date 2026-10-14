import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

const Lab = lazy(() => import('./pages/Lab'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/lab" element={<Lab />} />
        <Route path="*" element={<Lab />} />
      </Routes>
    </Suspense>
  )
}
